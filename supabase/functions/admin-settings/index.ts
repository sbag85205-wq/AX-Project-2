// 관리자 설정: 답변 모델·검색 기준 조회/저장, 모델 목록, 모델 테스트, 검색 미리보기
import { adminClient, corsHeaders, errorResponse, getCaller, json } from '../_shared/http.ts';
import { searchTerms } from '../_shared/text.ts';
import { chatCompletion, defaultModel, embed, embeddingConfigured, llmBaseUrl, llmConfigured } from '../_shared/providers.ts';
import { loadSettings, parseSettings } from '../_shared/settings.ts';

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
        const terms = searchTerms(question);
        const [queryEmbedding] = (await embed([question]).catch(() => null)) ?? [null];
        const { data: rows, error } = await db.rpc('search_chunks', {
          terms: terms.length ? terms : [question],
          query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
          match_count: 8,
          vector_weight: settings.vector_weight
        });
        if (error) throw error;
        const results = (rows ?? []).map((r: Record<string, any>) => ({
          document_title: r.document_title,
          section_title: r.section_title,
          page_start: r.page_start,
          page_end: r.page_end,
          keyword_score: r.keyword_score,
          vector_score: r.vector_score,
          passed: r.keyword_score >= settings.keyword_min || (r.vector_score ?? 0) >= settings.vector_min,
          snippet: String(r.content).slice(0, 140)
        }));
        return json({ terms, results });
      }

      default:
        return errorResponse(400, 'bad_action', '알 수 없는 요청이에요.');
    }
  } catch (e) {
    console.error('admin-settings failed', (e as Error).message);
    return errorResponse(500, 'internal', '설정을 처리하는 중 문제가 생겼어요.', true);
  }
});
