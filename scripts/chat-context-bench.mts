// 대화 맥락(후속 질문) 시험: 같은 5쌍의 질문을 "예전 방식(맥락 없음)"과 "새 방식(최근 대화 함께)"으로 처리해
// 검색 결과와 AI 호출 토큰을 비교한다. 서버(chat 함수)와 같은 지시문·검색 순위 코드(supabase/functions/_shared)를 그대로 쓴다.
// 문서는 tests/fixtures/chat-context-docs.json의 가상 문서이고, 검색은 search_chunks SQL과 같은 키워드 점수를 흉내 낸다(임베딩 없음).
//
// 실행:
//   node --experimental-strip-types scripts/chat-context-bench.mts
//     AI 없이: 질문 정리·답변을 정해 둔 모범 출력으로 대신하고, 토큰은 AI에 보낼 글을 토크나이저로 센다(근사).
//     TOKENIZER_DIR=<js-tiktoken이 설치된 폴더>를 주면 o200k 토크나이저로 세고, 없으면 글자 수로 어림한다.
//   LLM_API_KEY=... [LLM_BASE_URL=https://openrouter.ai/api/v1] [LLM_MODEL=openai/gpt-6-luna] node --experimental-strip-types scripts/chat-context-bench.mts
//     실제 모델을 불러 실제 토큰 사용량(usage)과 AI가 바꾼 질문·답변 상태를 보여 준다.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { CANDIDATE_COUNT, EVIDENCE_COUNT, coreQuestion, mergeEvidence, rankEvidence, searchTerms } from '../supabase/functions/_shared/text.ts';
import { REWRITE_PROMPT, buildUserPrompt, parseModelAnswer, parseRewrite, systemPromptFor, type Evidence } from '../supabase/functions/_shared/answer.ts';
import { CONTEXT_REWRITE_PROMPT, buildRewriteInput, historyBlock, parseContextRewrite, parseHistory, type Turn } from '../supabase/functions/_shared/context.ts';
import { DEFAULT_SETTINGS } from '../supabase/functions/_shared/settings.ts';

const REWRITE_MIN_CHARS = 15; // chat/index.ts와 같다
type Chunk = { id: string; document_id: string; document_title: string; version: string; page_start: number; page_end: number; section_title: string; content: string };
const { chunks } = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/chat-context-docs.json', import.meta.url), 'utf8')) as { chunks: Chunk[] };

// ── 시험 5쌍: 첫 질문(+ 그 답변 요약) → 후속 질문. scripted는 AI 없이 돌릴 때 쓰는 모범 질문 정리 결과 ──
interface Case {
  id: string; first: Turn; follow: string;
  scripted: { context: { query: string; keywords: string[]; uses_context: boolean }; plain?: { query: string; keywords: string[] } };
  expect: { chunk?: string; insufficient?: boolean; note: string };
}
const CASES: Case[] = [
  { id: '1 등급 바꿔 묻기', first: { q: 'S1 결함은 최초 대응을 언제까지 착수해야 하나요?', a: 'S1 결함은 접수 후 30분 이내에 최초 대응에 착수해야 합니다.' }, follow: '그럼 S2는?',
    scripted: { context: { query: 'S2 결함의 최초 대응 착수 기한은?', keywords: ['S2 결함', '최초 대응', '착수 기한'], uses_context: true } },
    expect: { chunk: 'c2', note: 'S2 최초 대응 착수 기한(4시간) 조항' } },
  { id: '2 조건 추가', first: { q: 'S1 결함이 생기면 누구에게 보고하나요?', a: '서비스 운영팀장과 품질보증 책임자에게 즉시 전화와 메신저로 보고합니다.' }, follow: '주말에도 똑같아?',
    scripted: { context: { query: '주말·공휴일에 S1 결함이 발생하면 누구에게 보고하나요?', keywords: ['주말', '공휴일', 'S1 결함', '보고', '당직 책임자'], uses_context: true } },
    expect: { chunk: 'c5', note: '업무 시간 외(주말·공휴일) 보고 조항' } },
  { id: '3 다음 단계', first: { q: 'VM이 느릴 때 무엇을 확인하나요?', a: 'CPU·메모리 사용률과 스토리지 지연 시간을 확인합니다.' }, follow: '그래도 안 되면요?',
    scripted: { context: { query: 'VM 성능 저하가 해결되지 않을 때 다음 조치는?', keywords: ['VM', '성능 저하', '해결되지 않으면', '이관'], uses_context: true } },
    expect: { chunk: 'c7', note: '성능 저하가 계속될 때(이동·재부팅·2차 지원 이관) 조항' } },
  { id: '4 관계없는 새 주제', first: { q: '계정이 잠겼을 때 해제 방법은?', a: '30분 뒤 자동으로 풀리며, 급하면 IT 헬프데스크에 해제를 요청합니다.' }, follow: 'VDI 접속할 때 인증서 오류가 나면 어떻게 하나요?',
    scripted: { context: { query: 'VDI 접속 시 인증서 오류 조치 방법은?', keywords: ['VDI', '인증서 오류', '접속'], uses_context: false }, plain: { query: 'VDI 접속 시 인증서 오류 조치 방법은?', keywords: ['VDI', '인증서 오류', '접속'] } },
    expect: { chunk: 'c8', note: '앞 대화(계정 잠금)를 섞지 않고 인증서 오류 조항' } },
  { id: '5 문서에 없는 후속', first: { q: 'S3 결함 해결 기한은 얼마인가요?', a: 'S3 결함은 접수 후 5영업일 이내에 해결합니다.' }, follow: '그거 연장할 수 있어?',
    scripted: { context: { query: 'S3 결함 해결 기한을 연장할 수 있나요?', keywords: ['S3 결함', '해결 기한', '연장'], uses_context: true } },
    expect: { insufficient: true, note: '연장 규정이 문서에 없음 → 앞 대화와 상관없이 근거 부족이어야 함(실제 모델로만 확인 가능)' } }
];

// ── AI 호출: 실제(LLM_API_KEY) 또는 모범 출력 ──
const live = !!process.env.LLM_API_KEY;
let encode: ((s: string) => number) | null = null;
if (process.env.TOKENIZER_DIR) {
  const { getEncoding } = createRequire(process.env.TOKENIZER_DIR + '/package.json')('js-tiktoken');
  const enc = getEncoding('o200k_base');
  encode = (s) => enc.encode(s).length;
}
const count = (s: string) => (encode ? encode(s) : Math.ceil(s.length / 1.5)); // 토크나이저가 없으면 어림
interface Call { step: string; input_tokens: number; output_tokens: number; text: string }
async function llm(step: string, system: string, user: string, scripted: string): Promise<Call> {
  if (!live) return { step, input_tokens: count(system) + count(user) + 7, output_tokens: count(scripted), text: scripted };
  const base = (process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LLM_API_KEY}`, 'X-Title': 'Knowly bench' },
    body: JSON.stringify({ model: process.env.LLM_MODEL || 'openai/gpt-6-luna', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 2000, response_format: { type: 'json_object' } })
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { step, input_tokens: data.usage?.prompt_tokens ?? 0, output_tokens: data.usage?.completion_tokens ?? 0, text: data.choices?.[0]?.message?.content ?? '' };
}

// ── 검색: search_chunks SQL과 같은 키워드 점수(검색어 중 들어 있는 비율) → 서버와 같은 순위·합치기 ──
function search(terms: string[]) {
  const rows = chunks
    .map((c) => ({ ...c, keyword_score: terms.filter((t) => c.content.toLowerCase().includes(t.toLowerCase())).length / Math.max(terms.length, 1), vector_score: null }))
    .filter((r) => r.keyword_score > 0)
    .sort((a, b) => b.keyword_score - a.keyword_score)
    .slice(0, CANDIDATE_COUNT);
  return rankEvidence(rows, terms.length, DEFAULT_SETTINGS).filter((r) => r.used);
}
const toEvidence = (rows: (Chunk & { score: number })[]): Evidence[] => rows.slice(0, EVIDENCE_COUNT).map((r, i) => ({
  source_id: `S${i + 1}`, chunk_id: r.id, document_id: r.document_id, document_title: r.document_title, version: r.version,
  page_start: r.page_start, page_end: r.page_end, section_title: r.section_title, content: r.content
}));
const mockAnswer = (ev: Evidence[]) => JSON.stringify({ status: 'answered', summary: [ev[0].content.slice(0, 80)], steps: [], details: ev[0].content.slice(0, 160), warnings: [], citations: ['S1'] });

/** chat/index.ts의 ask()와 같은 순서: (질문 정리) → 검색 → (답변). history가 있으면 새 방식. */
async function ask(question: string, history: Turn[], c: Case | null) {
  const calls: Call[] = [];
  let queries = [question];
  const core = coreQuestion(question);
  if (core !== question) queries.push(core);
  let searchQuestion: string | null = null;
  if (history.length) {
    const sc = c!.scripted.context;
    const r = await llm('질문 정리(맥락)', CONTEXT_REWRITE_PROMPT, buildRewriteInput(history, question), JSON.stringify(sc));
    calls.push(r);
    const parsed = parseContextRewrite(r.text);
    const rewritten = parsed ? [parsed.query, ...parsed.keywords].join(' ').trim() : '';
    if (parsed?.usesContext) { searchQuestion = parsed.query; queries = [parsed.query, ...(rewritten !== parsed.query ? [rewritten] : [])]; }
    else if (rewritten && !queries.includes(rewritten)) queries.push(rewritten);
  } else if (question.length >= REWRITE_MIN_CHARS) {
    const plain = c?.scripted.plain ?? { query: question, keywords: searchTerms(question).slice(0, 4) };
    const r = await llm('질문 정리', REWRITE_PROMPT, question.slice(0, 1000), JSON.stringify(plain));
    calls.push(r);
    const parsed = parseRewrite(r.text);
    const rewritten = parsed ? [parsed.query, ...parsed.keywords].join(' ').trim() : '';
    if (rewritten && !queries.includes(rewritten)) queries.push(rewritten);
  }
  const bases = queries.filter((q) => searchTerms(q).length);
  const lists = (bases.length ? bases : [question]).map((q) => search(searchTerms(q).length ? searchTerms(q) : [q]));
  const evidence = toEvidence(mergeEvidence(lists));
  let status = 'insufficient_evidence (근거 없음, 답변 호출 안 함)';
  if (evidence.length) {
    const context = history.length ? { conversation: historyBlock(history), searchQuestion: searchQuestion ?? undefined } : undefined;
    const r = await llm('답변 생성', systemPromptFor(!!context), buildUserPrompt(question, evidence, [], context), mockAnswer(evidence));
    calls.push(r);
    status = live ? (() => { try { return parseModelAnswer(r.text, evidence).status; } catch (e) { return '형식 오류: ' + (e as Error).message; } })() : '(모범 출력)';
  }
  const sum = (k: 'input_tokens' | 'output_tokens') => calls.reduce((n, x) => n + x[k], 0);
  // 맥락 때문에 답변 호출에 붙는 몫: 같은 근거로 대화 블록·대화 규칙 없이 만든 글과의 차이
  const extra = history.length && evidence.length
    ? count(systemPromptFor(true)) + count(buildUserPrompt(question, evidence, [], { conversation: historyBlock(history), searchQuestion: searchQuestion ?? undefined }))
      - count(systemPromptFor(false)) - count(buildUserPrompt(question, evidence))
    : 0;
  return { queries, searchQuestion, evidence: evidence.map((e) => e.chunk_id), calls, status, input: sum('input_tokens'), output: sum('output_tokens'), extra };
}

// ── 실행 ──
console.log(`# 대화 맥락 시험 (${live ? '실제 모델: ' + (process.env.LLM_MODEL || 'openai/gpt-6-luna') : 'AI 없이 모범 출력, 토큰=' + (encode ? 'o200k 토크나이저' : '글자 수 어림')})\n`);
const rows: string[] = [];
let before = { input: 0, output: 0 }, after = { input: 0, output: 0 }, firstSame = true, pass = 0;
const overhead = { rewrite: 0, answer: 0, n: 0 };
const baseline = { total: 0, n: 0 };
for (const c of CASES) {
  const first = await ask(c.first.q, [], c);        // 첫 질문: 두 방식이 같다(앞 대화 없음)
  baseline.total += first.input + first.output; baseline.n++;
  const old = await ask(c.follow, [], c);           // 예전 방식: 후속 질문만
  const neu = await ask(c.follow, parseHistory([c.first]), c); // 새 방식: 최근 대화 함께
  if (first.input !== (await ask(c.first.q, [], c)).input) firstSame = false;
  const hit = (r: typeof neu) => (c.expect.chunk ? r.evidence[0] === c.expect.chunk : !r.evidence.length || r.status.startsWith('insufficient'));
  const ok = c.expect.chunk ? hit(neu) : true;
  if (ok) pass++;
  before.input += old.input; before.output += old.output; after.input += neu.input; after.output += neu.output;
  console.log(`## ${c.id}\n- 첫 질문: ${c.first.q}\n- 후속 질문: "${c.follow}"`);
  console.log(`- 예전: 검색어 ${JSON.stringify(old.queries)} → 근거 ${JSON.stringify(old.evidence)} · AI 호출 ${old.calls.length}번 · 입력 ${old.input} / 출력 ${old.output} 토큰`);
  console.log(`- 새로: 바꾼 질문 "${neu.searchQuestion ?? '(맥락 안 씀: ' + neu.queries[neu.queries.length - 1] + ')'}" → 근거 ${JSON.stringify(neu.evidence)} · AI 호출 ${neu.calls.length}번 · 입력 ${neu.input} / 출력 ${neu.output} 토큰 · 상태 ${neu.status}`);
  console.log(`- 기대: ${c.expect.note} → ${c.expect.chunk ? (ok ? '통과' : '실패') : '모델 확인 필요'}${c.expect.chunk ? ` (예전 방식 ${hit(old) ? '맞힘' : '못 맞힘'})` : ''}\n`);
  // 맥락 몫 = (맥락 질문 정리 호출 − 예전 질문 정리 호출) + 답변 호출에 붙은 대화 블록·규칙
  const oldRewrite = old.calls.find((x) => x.step === '질문 정리'), newRewrite = neu.calls.find((x) => x.step.startsWith('질문 정리'));
  overhead.rewrite += (newRewrite ? newRewrite.input_tokens + newRewrite.output_tokens : 0) - (oldRewrite ? oldRewrite.input_tokens + oldRewrite.output_tokens : 0);
  overhead.answer += neu.extra; overhead.n++;
  for (const x of neu.calls) rows.push(`${c.id} | ${x.step} | ${x.input_tokens} | ${x.output_tokens}`);
}
const pct = (a: number, b: number) => (b ? `${(((a - b) / b) * 100).toFixed(0)}%` : '-');
console.log('## 토큰 합계 (후속 질문 5개)');
console.log(`- 예전: 입력 ${before.input} · 출력 ${before.output} · 합계 ${before.input + before.output}`);
console.log(`- 새로: 입력 ${after.input} · 출력 ${after.output} · 합계 ${after.input + after.output}`);
console.log(`- 증가: 입력 +${after.input - before.input} (${pct(after.input, before.input)}) · 출력 +${after.output - before.output} · 후속 질문 1개당 평균 +${Math.round((after.input + after.output - before.input - before.output) / CASES.length)} 토큰`);
console.log(`- 주의: 예전 방식은 후속 질문 2개(2·5번)에서 근거를 못 찾아 AI를 부르지 않았다(0 토큰). 위 증가분에는 "답을 못 하던 질문에 이제 답하는" 비용이 섞여 있다.`);
console.log(`- 맥락 자체의 몫(후속 질문 1개당 평균): 질문 정리 +${Math.round(overhead.rewrite / overhead.n)} 토큰, 답변 호출의 대화 블록·규칙 +${Math.round(overhead.answer / overhead.n)} 토큰 → 합계 약 +${Math.round((overhead.rewrite + overhead.answer) / overhead.n)} 토큰`);
console.log(`- 비교 기준: 앞 대화 없는 일반 질문 1개 평균 ${Math.round(baseline.total / baseline.n)} 토큰 (이 사례들의 첫 질문)`);
console.log(`- 첫 질문(앞 대화 없음)은 두 방식이 같음: ${firstSame ? '예' : '아니오'}`);
console.log(`- 검색 기대 통과: ${pass}/${CASES.length}`);
console.log('\n## 새 방식 AI 호출별 토큰\n사례 | 단계 | 입력 | 출력');
console.log(rows.join('\n'));
