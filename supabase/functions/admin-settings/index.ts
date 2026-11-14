// 관리자 설정: 답변 모델·검색 기준 조회/저장, 모델 목록, 모델 테스트, 검색 미리보기
import { adminClient, corsHeaders, errorResponse, getCaller, json, loadSettings } from '../_shared/http.ts';
import { CANDIDATE_COUNT, EVIDENCE_COUNT, coreQuestion, rankEvidence, searchTerms } from '../_shared/text.ts';
import { REWRITE_PROMPT, parseRewrite } from '../_shared/answer.ts';
import { chatCompletion, defaultModel, embed, embeddingConfigured, llmBaseUrl, llmConfigured } from '../_shared/providers.ts';
import { parseSettings } from '../_shared/settings.ts';

const MODELS_TTL = 10 * 60 * 1000;
let modelsCache: { at: number; models: unknown[] } | null = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'POST만 지원해요.');

  const db = adminClient();
  const caller = await getCaller(req, db);
  if (!caller) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
  if (caller.profile.role !== 'admin') return errorResponse(403, 'forbidden', '관리자만 사용할 수 있어요.');

  const body = await req.json().catch(() => ({}));

  try {
    switch (body.action) {
      case 'get':
        return json({
          settings: await loadSettings(db),
          default_model: defaultModel(),
          llm_configured: llmConfigured(),
          embedding_configured: embeddingConfigured()
        });

      case 'save': {
        let settings;
        try {
          settings = parseSettings(body.settings ?? {});
        } catch (e) {
          return errorResponse(400, 'bad_settings', (e as Error).message);
        }
        const { error } = await db.from('app_settings')
          .update({ ...settings, updated_at: new Date().toISOString(), updated_by: caller.user.id }).eq('id', 1);
        if (error) throw error;
        return json({ settings });
      }

      case 'models': {
        if (!modelsCache || Date.now() - modelsCache.at > MODELS_TTL) {
          const res = await fetch(`${llmBaseUrl()}/models`, { signal: AbortSignal.timeout(15000) });
          if (!res.ok) return errorResponse(502, 'models_failed', '모델 목록을 불러오지 못했어요. 모델 ID를 직접 입력해 주세요.', true);
          const data = await res.json();
          const models = (data.data ?? []).map((m: Record<string, any>) => ({
            id: m.id,
            name: m.name ?? m.id,
            context_length: m.context_length ?? null,
            prompt_price: m.pricing?.prompt ?? null,
            completion_price: m.pricing?.completion ?? null
          }));
          modelsCache = { at: Date.now(), models };
        }
        return json({ models: modelsCache.models });
      }

      case 'test_model': {
        if (!llmConfigured()) return errorResponse(400, 'llm_not_configured', 'LLM_API_KEY 비밀값이 없어서 테스트할 수 없어요.');
        const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultModel();
        const started = Date.now();
        try {
          const result = await chatCompletion(
            '당신은 사내 업무 도우미입니다. 반드시 JSON 객체로만 답하세요.',
            '{"reply": "..."} 형식으로, 한국어 한 문장으로 인사해 주세요.',
            model, 30000
          );
          return json({ ok: true, model: result.model, latency_ms: Date.now() - started, reply: result.text.slice(0, 300) });
        } catch (e) {
          return json({ ok: false, model, latency_ms: Date.now() - started, error: (e as Error).message.slice(0, 300) });
        }
      }

      case 'preview': {
        const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
        if (!question) return errorResponse(400, 'empty_question', '미리 볼 질문을 입력해 주세요.');
        let settings;
        try {
          settings = parseSettings(body.settings ?? {});
        } catch (e) {
          return errorResponse(400, 'bad_settings', (e as Error).message);
        }
        // 채팅과 같은 방식: 원래 질문 + 실제로 묻는 문장 + AI가 정리한 질문으로 각각 찾아 합친다
        const queries: { label: string; text: string }[] = [{ label: '원래 질문', text: question }];
        const core = coreQuestion(question);
        if (core !== question) queries.push({ label: '질문 문장', text: core });
        if (llmConfigured() && question.length >= 15) {
          const r = await chatCompletion(REWRITE_PROMPT, question, settings.llm_model, 10000).catch(() => null);
          const parsed = r ? parseRewrite(r.text) : null;
          const rewritten = parsed ? [parsed.query, ...parsed.keywords].join(' ').trim() : '';
          if (rewritten) queries.push({ label: 'AI 정리', text: rewritten });
        }
        const bases = queries.filter((q) => searchTerms(q.text).length);
        const used = bases.length ? bases : [queries[0]];
        const embeddings = (await embed(used.map((q) => q.text)).catch(() => null)) ?? [];
        type Row = {
          id: string; document_title: string; section_title: string | null; page_start: number; page_end: number;
          content: string; keyword_score: number; vector_score: number | null;
        };
        const lists = await Promise.all(used.map(async (q, i) => {
          const terms = searchTerms(q.text).length ? searchTerms(q.text) : [q.text];
          const { data: rows, error } = await db.rpc('search_chunks', {
            terms,
            query_embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
            match_count: CANDIDATE_COUNT,
            vector_weight: settings.vector_weight
          });
          if (error) throw error;
          return rankEvidence((rows ?? []) as Row[], terms.length, settings).map((r) => ({ ...r, via: q.label }));
        }));
        // 같은 조각은 가장 높은 점수로 한 번만, 기준을 넘은 것 중 점수 높은 5개가 실제 답변에 쓰인다
        const best = new Map<string, (typeof lists)[number][number]>();
        for (const r of lists.flat()) {
          const prev = best.get(r.id);
          if (!prev || r.score > prev.score) best.set(r.id, { ...r, passed: r.passed || !!prev?.passed });
          else if (r.passed) prev.passed = true;
        }
        let taken = 0;
        const results = [...best.values()].sort((a, b) => b.score - a.score).slice(0, CANDIDATE_COUNT).map((r) => {
          const use = r.passed && taken < EVIDENCE_COUNT;
          if (use) taken++;
          return {
            document_title: r.document_title,
            section_title: r.section_title,
            page_start: r.page_start,
            page_end: r.page_end,
            keyword_score: r.keyword_score,
            vector_score: r.vector_score,
            passed: r.passed,
            used: use,
            via: r.via,
            snippet: String(r.content).slice(0, 140)
          };
        });
        return json({
          terms: [...new Set(used.flatMap((q) => searchTerms(q.text)))],
          queries: queries.map((q) => ({ ...q, terms: searchTerms(q.text) })),
          results
        });
      }

      default:
        return errorResponse(400, 'bad_action', '알 수 없는 요청이에요.');
    }
  } catch (e) {
    console.error('admin-settings failed', (e as Error).message);
    return errorResponse(500, 'internal', '설정을 처리하는 중 문제가 생겼어요.', true);
  }
});
