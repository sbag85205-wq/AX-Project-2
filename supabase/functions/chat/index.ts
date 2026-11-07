// 직원 질문 처리: 인증 → FAQ/문서 검색 → (LLM 요약) → 출처 검증 → 저장·집계
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { adminClient, corsHeaders, errorResponse, getCaller, json, loadSettings, type Caller } from '../_shared/http.ts';
import { CANDIDATE_COUNT, EVIDENCE_COUNT, coreQuestion, mergeEvidence, rankEvidence, searchTerms, similarity, termSimilarity } from '../_shared/text.ts';
import {
  REWRITE_PROMPT, SYSTEM_PROMPT, buildUserPrompt, noEvidenceAnswer, noMatchingRuleAnswer, parseAttachments, parseModelAnswer,
  parseRewrite, searchOnlyAnswer,
  type Answer, type AttachmentInput, type AttachmentNote, type Evidence
} from '../_shared/answer.ts';
import { chatCompletion, describeImage, embed, llmConfigured, visionModel } from '../_shared/providers.ts';

const MAX_QUESTION = 2000;
// FAQ는 핵심 검색어끼리 비교해 이 이상 비슷하면 쓴다 (말투·부연 설명이 달라도 같은 질문이면 걸린다)
const FAQ_MIN_SIMILARITY = 0.6;
// 이보다 짧은 질문은 AI 질문 정리를 건너뛴다 (이미 핵심만 있어 시간만 늘어난다)
const REWRITE_MIN_CHARS = 15;
const REWRITE_TIMEOUT_MS = 10000;
const GROUP_MIN_SIMILARITY = 0.45;

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
  let attachments: AttachmentInput[];
  try {
    attachments = parseAttachments(body.attachments);
  } catch (e) {
    return errorResponse(400, 'bad_attachments', (e as Error).message);
  }

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
  let answer: Answer | null = null;
  let category: string | null = null;
  let model: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  // 0) 첨부 읽기: 파일은 브라우저가 뽑은 글자를 그대로, 사진은 판독 모델로 글자·설명을 얻는다.
  //    첨부 자체는 저장하지 않고 이번 답변에만 쓴다 (대화에는 파일 이름과 읽었는지만 남는다).
  const read = await Promise.all(attachments.map(async (a): Promise<{ name: string; text: string } | null> => {
    if (a.kind === 'file') return { name: a.name, text: a.text ?? '' };
    if (!visionModel()) return null;
    try {
      const result = await describeImage(a.data_url ?? '');
      inputTokens = (inputTokens ?? 0) + (result.input_tokens ?? 0);
      outputTokens = (outputTokens ?? 0) + (result.output_tokens ?? 0);
      return result.text ? { name: a.name, text: result.text } : null;
    } catch (e) {
      console.error('vision failed', (e as Error).message);
      return null;
    }
  }));
  const notes: AttachmentNote[] = attachments.map((a, i) => ({ name: a.name, kind: a.kind, read: !!read[i] }));
  const attached = read.filter((r): r is { name: string; text: string } => !!r);
  const attachedText = attached.map((a) => a.text).join('\n').slice(0, 1500);

  // 질문을 여러 모양으로 준비한다: 원래 질문 + 실제로 묻는 문장(부연 설명 제외) + AI가 정리한 질문
  const queries: string[] = [question];
  const core = coreQuestion(question);
  if (core !== question) queries.push(core);
  const addTokens = (r: { input_tokens: number | null; output_tokens: number | null }) => {
    inputTokens = (inputTokens ?? 0) + (r.input_tokens ?? 0);
    outputTokens = (outputTokens ?? 0) + (r.output_tokens ?? 0);
  };

  // 1) 관리자가 등록한 FAQ와 같은 질문이면 FAQ 답변을 그대로 쓴다 (첨부가 있으면 첨부까지 보고 답한다)
  const findFaq = async (list: string[]) => {
    const terms = [...new Set(list.flatMap((q) => searchTerms(q)))].slice(0, 40);
    if (!terms.length) return null;
    const { data: faqs } = await db.rpc('search_faqs', { terms, match_count: 5 });
    return (faqs ?? [])
      .map((f: { question: string }) => ({ ...f, sim: Math.max(similarity(question, f.question), ...list.map((q) => termSimilarity(q, f.question))) }))
      .filter((f: { sim: number }) => f.sim >= FAQ_MIN_SIMILARITY)
      .sort((a: { sim: number }, b: { sim: number }) => b.sim - a.sim)[0] ?? null;
  };
  const useFaq = (best: { id: string; answer: string; category: string }) => {
    answer = {
      status: 'answered', mode: 'faq', faq_id: best.id,
      summary: best.answer.split('\n').map((s: string) => s.trim()).filter(Boolean).slice(0, 4),
      steps: [], details: best.answer, warnings: [], citations: []
    };
    category = best.category;
  };
  if (!attachments.length) {
    const best = await findFaq(queries);
    if (best) useFaq(best);
  }

  // AI 질문 정리: 인사·배경 설명·높임 표현을 걷어 내고 규정 용어로 바꾼다. 실패하면 건너뛴다.
  if (!answer && llmConfigured() && question.length >= REWRITE_MIN_CHARS) {
    try {
      const r = await chatCompletion(REWRITE_PROMPT, question.slice(0, 1000), settings.llm_model, REWRITE_TIMEOUT_MS);
      addTokens(r);
      const parsed = parseRewrite(r.text);
      const rewritten = parsed ? [parsed.query, ...parsed.keywords].join(' ').trim() : '';
      if (rewritten && !queries.includes(rewritten)) {
        queries.push(rewritten);
        if (!attachments.length) {
          const best = await findFaq([rewritten]);
          if (best) useFaq(best);
        }
      }
    } catch (e) {
      console.error('rewrite failed', (e as Error).message);
    }
  }

  // 2) 문서 검색 → LLM 요약
  if (!answer) {
    const searchable = queries.filter((q) => searchTerms(q).length);
    const bases = searchable.length ? searchable : [question];
    const embedTexts = attachedText ? [...bases, attachedText] : bases;
    const embeddings = (await embed(embedTexts).catch((e) => {
      console.error('embedding failed', e.message);
      return null;
    })) ?? [];
    type Row = Record<string, unknown> & { id: string; keyword_score: number; vector_score: number | null };
    const search = async (searchTermList: string[], embedding: number[] | null | undefined): Promise<(Row & { score: number })[]> => {
      const { data, error } = await db.rpc('search_chunks', {
        terms: searchTermList,
        query_embedding: embedding ? JSON.stringify(embedding) : null,
        match_count: CANDIDATE_COUNT,
        vector_weight: settings.vector_weight
      });
      if (error) throw error;
      // 관리자 미리보기와 같은 규칙: 후보 8개 → 점수 보정·재정렬 → 기준 통과한 앞의 5개
      return rankEvidence((data ?? []) as Row[], searchTermList.length, settings).filter((r) => r.used);
    };
    // 질문 모양마다, 그리고 첨부 내용으로 따로 찾은 뒤 합친다.
    // 키워드 점수는 검색어 중 맞은 비율이라 한데 섞으면 부연 설명·첨부 때문에 점수가 낮아진다.
    const lists = await Promise.all([
      ...bases.map((q, i) => search(searchTerms(q).length ? searchTerms(q) : [q], embeddings[i])),
      ...(attachedText && searchTerms(attachedText, 16).length ? [search(searchTerms(attachedText, 16), embeddings[bases.length])] : [])
    ]);
    const rows = mergeEvidence(lists);

    const evidence: Evidence[] = rows
      .slice(0, EVIDENCE_COUNT)
      .map((r: Record<string, unknown>, i: number) => ({
        source_id: `S${i + 1}`,
        chunk_id: r.id as string,
        document_id: r.document_id as string,
        document_title: r.document_title as string,
        version: r.document_version as string,
        page_start: r.page_start as number,
        page_end: r.page_end as number,
        section_title: (r.section_title as string) ?? null,
        content: r.content as string
      }));

    if (!evidence.length) {
      answer = noEvidenceAnswer();
    } else {
      const { data: doc } = await db.from('documents').select('category').eq('id', evidence[0].document_id).single();
      category = doc?.category ?? null;
      if (llmConfigured()) {
        try {
          const prompt = buildUserPrompt(question, evidence, attached);
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
          if (answer.status === 'insufficient_evidence') answer = noMatchingRuleAnswer(answer, evidence);
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

  if (notes.length) {
    const unread = notes.filter((n) => !n.read);
    answer = {
      ...answer,
      attachments: notes,
      warnings: unread.length
        ? [...answer.warnings, `${unread.map((n) => n.name).join(', ')}: 첨부 내용을 읽지 못해 질문만 보고 찾았어요.`]
        : answer.warnings
    };
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
