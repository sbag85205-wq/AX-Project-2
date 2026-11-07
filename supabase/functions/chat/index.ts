// 직원 질문 처리: 인증 → FAQ/문서 검색 → (LLM 요약) → 출처 검증 → 저장·집계
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { adminClient, corsHeaders, errorResponse, getCaller, json, loadSettings, type Caller } from '../_shared/http.ts';
import { searchTerms, similarity } from '../_shared/text.ts';
import {
  REWRITE_SYSTEM_PROMPT, SYSTEM_PROMPT, buildRewritePrompt, buildUserPrompt, noEvidenceAnswer,
  parseModelAnswer, parseRewriteQueries, searchOnlyAnswer,
  type Answer, type Evidence
} from '../_shared/answer.ts';
import { chatCompletion, embed, llmConfigured } from '../_shared/providers.ts';
import type { AppSettings } from '../_shared/settings.ts';

const MAX_QUESTION = 2000;
const FAQ_MIN_SCORE = 0.6;
const FAQ_MIN_SIMILARITY = 0.45;
const GROUP_MIN_SIMILARITY = 0.45;
const REWRITE_TIMEOUT_MS = 15000;
const MAX_EVIDENCE = 5;

interface RawEvidence {
  chunk_id: string;
  document_id: string;
  document_title: string;
  version: string;
  page_start: number;
  page_end: number;
  section_title: string | null;
  content: string;
  score: number;
}

/** 검색어 추출 → 임베딩 → search_chunks RPC → 임계값 필터. 원질문 검색과 재작성 검색에 공통으로 쓴다. */
async function searchEvidence(db: SupabaseClient, settings: AppSettings, queryText: string): Promise<RawEvidence[]> {
  const terms = searchTerms(queryText);
  const [queryEmbedding] = (await embed([queryText]).catch((e) => {
    console.error('embedding failed', e.message);
    return null;
  })) ?? [null];
  const { data: rows, error } = await db.rpc('search_chunks', {
    terms: terms.length ? terms : [queryText],
    query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
    match_count: MAX_EVIDENCE,
    vector_weight: settings.vector_weight
  });
  if (error) throw error;
  return (rows ?? [])
    .filter((r: { keyword_score: number; vector_score: number | null }) =>
      r.keyword_score >= settings.keyword_min || (r.vector_score ?? 0) >= settings.vector_min)
    .map((r: Record<string, unknown>) => ({
      chunk_id: r.id as string,
      document_id: r.document_id as string,
      document_title: r.document_title as string,
      version: r.document_version as string,
      page_start: r.page_start as number,
      page_end: r.page_end as number,
      section_title: (r.section_title as string) ?? null,
      content: r.content as string,
      score: (r.vector_score as number ?? 0) * settings.vector_weight + (r.keyword_score as number) * (1 - settings.vector_weight)
    }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'POST만 지원해요.');

  const db = adminClient();
  const caller = await getCaller(req, db);
  if (!caller) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'bad_request', '요청 형식이 올바르지 않아요.');
  }

  try {
    if (body.action === 'feedback') return await feedback(db, caller, body);
    return await ask(db, caller, body);
  } catch (e) {
    console.error('chat failed', (e as Error).message);
    return errorResponse(500, 'internal', '답변을 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.', true);
  }
});

async function ask(db: SupabaseClient, caller: Caller, body: Record<string, unknown>): Promise<Response> {
  const started = Date.now();
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return errorResponse(400, 'empty_question', '질문을 입력해 주세요.');
  if (question.length > MAX_QUESTION) return errorResponse(400, 'too_long', `질문은 ${MAX_QUESTION}자 이하로 입력해 주세요.`);

  // 대화 소유권 확인 (없으면 새로 만든다)
  let conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : null;
  if (conversationId) {
    const { data } = await db.from('conversations').select('id').eq('id', conversationId).eq('owner_id', caller.user.id).maybeSingle();
    if (!data) return errorResponse(404, 'not_found', '대화를 찾을 수 없어요.');
    await db.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  } else {
    const { data, error } = await db.from('conversations')
      .insert({ owner_id: caller.user.id, title: question.slice(0, 40) })
      .select('id').single();
    if (error) throw error;
    conversationId = data.id;
  }
  await db.from('messages').insert({ conversation_id: conversationId, owner_id: caller.user.id, role: 'user', content: question });

  const settings = await loadSettings(db);
  const terms = searchTerms(question);
  let answer: Answer | null = null;
  let category: string | null = null;
  let model: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  // 1) 관리자가 등록한 FAQ와 거의 같은 질문이면 FAQ 답변을 그대로 쓴다
  if (terms.length) {
    const { data: faqs } = await db.rpc('search_faqs', { terms, match_count: 3 });
    const best = (faqs ?? [])
      .map((f: { score: number; question: string }) => ({ ...f, sim: similarity(question, f.question) }))
      .filter((f: { score: number; sim: number }) => f.score >= FAQ_MIN_SCORE && f.sim >= FAQ_MIN_SIMILARITY)
      .sort((a: { sim: number }, b: { sim: number }) => b.sim - a.sim)[0];
    if (best) {
      answer = {
        status: 'answered', mode: 'faq', faq_id: best.id,
        summary: best.answer.split('\n').map((s: string) => s.trim()).filter(Boolean).slice(0, 4),
        steps: [], details: best.answer, warnings: [], citations: []
      };
      category = best.category;
    }
  }

  // 2) 문서 검색 → LLM 요약
  if (!answer) {
    let rawEvidence = await searchEvidence(db, settings, question);

    // 검색 결과가 없으면 질문을 공식 용어로 바꿔 다시 검색해 본다
    if (!rawEvidence.length && llmConfigured()) {
      try {
        const rewrite = await chatCompletion(REWRITE_SYSTEM_PROMPT, buildRewritePrompt(question), settings.llm_model, REWRITE_TIMEOUT_MS);
        inputTokens = (inputTokens ?? 0) + (rewrite.input_tokens ?? 0);
        outputTokens = (outputTokens ?? 0) + (rewrite.output_tokens ?? 0);
        const queries = parseRewriteQueries(rewrite.text);

        const resultLists = await Promise.all(queries.map((q) => searchEvidence(db, settings, q)));
        const merged = new Map<string, RawEvidence>();
        for (const list of resultLists) {
          for (const r of list) {
            const prev = merged.get(r.chunk_id);
            if (!prev || r.score > prev.score) merged.set(r.chunk_id, r);
          }
        }
        rawEvidence = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, MAX_EVIDENCE);
        console.log(`rewrite used: ${rawEvidence.length}개 청크 찾음`);
      } catch (e) {
        console.error('query rewrite failed', (e as Error).message);
      }
    }

    const evidence: Evidence[] = rawEvidence.map((r, i) => ({
      source_id: `S${i + 1}`,
      chunk_id: r.chunk_id,
      document_id: r.document_id,
      document_title: r.document_title,
      version: r.version,
      page_start: r.page_start,
      page_end: r.page_end,
      section_title: r.section_title,
      content: r.content
    }));

    if (!evidence.length) {
      answer = noEvidenceAnswer();
    } else {
      const { data: doc } = await db.from('documents').select('category').eq('id', evidence[0].document_id).single();
      category = doc?.category ?? null;
      if (llmConfigured()) {
        try {
          const prompt = buildUserPrompt(question, evidence);
          let result = await chatCompletion(SYSTEM_PROMPT, prompt, settings.llm_model);
          model = result.model;
          inputTokens = (inputTokens ?? 0) + (result.input_tokens ?? 0);
          outputTokens = (outputTokens ?? 0) + (result.output_tokens ?? 0);
          try {
            answer = parseModelAnswer(result.text, evidence);
          } catch (parseError) {
            // 형식이 깨지면 1회만 다시 요청
            result = await chatCompletion(SYSTEM_PROMPT,
              `${prompt}\n\n이전 출력이 규칙에 맞지 않았습니다(${(parseError as Error).message}). 지정한 JSON 형식으로만 다시 답하세요.`,
              settings.llm_model);
            inputTokens = (inputTokens ?? 0) + (result.input_tokens ?? 0);
            outputTokens = (outputTokens ?? 0) + (result.output_tokens ?? 0);
            answer = parseModelAnswer(result.text, evidence);
          }
          if (answer.status === 'insufficient_evidence') answer = { ...noEvidenceAnswer(), mode: 'llm' };
        } catch (e) {
          console.error('llm failed', (e as Error).message);
          answer = searchOnlyAnswer(evidence);
          answer.warnings = ['요약 모델 응답에 문제가 있어 관련 문서 내용을 그대로 보여드려요.'];
        }
      } else {
        answer = searchOnlyAnswer(evidence);
      }
    }
  }

  if (answer.status === 'insufficient_evidence') {
    await recordUnanswered(db, question, category ?? '기타', 'no_answer');
  }

  const { data: message, error: msgError } = await db.from('messages').insert({
    conversation_id: conversationId, owner_id: caller.user.id, role: 'assistant',
    content: answer.summary.join('\n'), answer
  }).select('id, created_at').single();
  if (msgError) throw msgError;

  await db.from('usage_events').insert({
    message_id: message.id,
    user_id: caller.user.id,
    department_id: caller.profile.department_id,
    category,
    status: answer.status === 'insufficient_evidence' ? 'insufficient_evidence' : 'answered',
    mode: answer.mode,
    model,
    latency_ms: Date.now() - started,
    input_tokens: inputTokens,
    output_tokens: outputTokens
  });

  return json({ conversation_id: conversationId, message_id: message.id, created_at: message.created_at, answer });
}

async function feedback(db: SupabaseClient, caller: Caller, body: Record<string, unknown>): Promise<Response> {
  const messageId = typeof body.message_id === 'string' ? body.message_id : '';
  const vote = body.vote === 'up' || body.vote === 'down' ? body.vote : null;
  const { data: msg } = await db.from('messages')
    .select('id, conversation_id, created_at, vote, role, answer')
    .eq('id', messageId).eq('owner_id', caller.user.id).eq('role', 'assistant').maybeSingle();
  if (!msg) return errorResponse(404, 'not_found', '답변을 찾을 수 없어요.');

  await db.from('messages').update({ vote }).eq('id', msg.id);
  await db.from('usage_events').update({ feedback: vote }).eq('message_id', msg.id);

  // '도움 안 됨'이 처음 눌렸을 때 질문을 익명으로 미등록 질문에 모은다
  if (vote === 'down' && msg.vote !== 'down') {
    const { data: q } = await db.from('messages').select('content')
      .eq('conversation_id', msg.conversation_id).eq('role', 'user').lte('created_at', msg.created_at)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: ev } = await db.from('usage_events').select('category').eq('message_id', msg.id).maybeSingle();
    if (q) await recordUnanswered(db, q.content, ev?.category ?? '기타', 'not_helpful');
  }
  return json({ ok: true, vote });
}

/** 비슷한 질문 묶음이 있으면 표현을 추가하고, 없으면 새 묶음을 만든다. 직원 정보는 저장하지 않는다. */
async function recordUnanswered(db: SupabaseClient, text: string, category: string, reason: 'no_answer' | 'not_helpful') {
  const since = new Date(Date.now() - 180 * 864e5).toISOString();
  const { data: groups } = await db.from('question_groups')
    .select('id, question, category, question_variants(text)')
    .gte('last_asked_at', since).order('last_asked_at', { ascending: false }).limit(300);

  let best: { id: string; score: number } | null = null;
  for (const g of groups ?? []) {
    const texts = [g.question, ...((g.question_variants as { text: string }[]) ?? []).slice(0, 20).map((v) => v.text)];
    const score = Math.max(...texts.map((t) => similarity(text, t)));
    if (score >= GROUP_MIN_SIMILARITY && (!best || score > best.score)) best = { id: g.id, score };
  }

  let groupId = best?.id;
  if (groupId) {
    await db.from('question_groups').update({ last_asked_at: new Date().toISOString() }).eq('id', groupId);
  } else {
    const { data, error } = await db.from('question_groups')
      .insert({ question: text.slice(0, 200), category }).select('id').single();
    if (error) throw error;
    groupId = data.id;
  }
  await db.from('question_variants').insert({ group_id: groupId, text: text.slice(0, 500), reason });
}
