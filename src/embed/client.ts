// 냥대리 화면(public/app.js·community-ui.js)이 불러 쓰는 Knowly 기능. 모두 Knowly 코드(lib/auth·lib/api·lib/attach)를 그대로 쓴다.
// 로그인 세션은 Knowly와 같이 브라우저에 저장되고, 같은 사이트의 Knowly 화면(iframe)과 함께 쓴다.
import { signInAs } from '../lib/auth';
import { ask as askKnowly, sendFeedback } from '../lib/api';
import { supabase, supabaseConfigured } from './supabase';
import type { Answer, ChatAttachment, Role } from '../lib/types';

export { prepareAttachment, ATTACH_ACCEPT, ATTACH_MAX, ATTACH_MAX_MB } from '../lib/attach';
export { supabaseConfigured as configured };

/** 냥대리 로그인 유형(직원·담당자)으로 Knowly 계정에 로그인하고, 냥대리 서버에 넘길 접속 토큰을 돌려준다. */
export async function signIn(loginId: string, password: string, nyangRole: 'employee' | 'staff') {
  const expected: Role = nyangRole === 'staff' ? 'admin' : 'employee';
  const session = await signInAs(loginId, password, expected);
  if (!session) throw new Error('로그인하지 못했어요. 다시 시도해 주세요.');
  return session.access_token;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function hasSession() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** 냥대리 답변 카드가 쓰는 모양으로 줄인 Knowly 답변 */
function toNyangAnswer(answer: Partial<Answer> | null | undefined) {
  const a = (answer ?? {}) as Partial<Answer>;
  const status = a.status ?? 'insufficient_evidence';
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
  const summary = list(a.summary), steps = list(a.steps), warnings = list(a.warnings);
  const seen = new Set<string>();
  const citations = [];
  for (const c of a.citations ?? []) {
    if (!c?.document_title) continue;
    const start = Number(c.page_start) || 0, end = Number(c.page_end) || start;
    const pages = start ? (end > start ? `${start}–${end}쪽` : `${start}쪽`) : '';
    const id = `${c.document_title}|${pages}`;
    if (seen.has(id)) continue;
    seen.add(id);
    citations.push({ title: c.document_title, version: c.version ?? '', pages, document_id: c.document_id ?? '', chunk_id: c.chunk_id ?? '' });
    if (citations.length >= 6) break;
  }
  return {
    answered: status === 'answered' && summary.length > 0,
    status,
    mode: a.mode ?? 'search',
    summary, steps, warnings,
    details: steps.length ? '' : (a.details ?? ''),
    citations,
    attachments: (a.attachments ?? []).map((n) => ({ name: n.name, read: n.read === true }))
  };
}

/** Knowly 채팅과 같은 chat 함수 호출. conversationId를 이어 주면 Knowly 대화 기록에도 한 대화로 쌓인다. */
export async function ask(question: string, conversationId: string | null, attachments: ChatAttachment[] = []) {
  const res = await askKnowly(question, conversationId, attachments);
  return { ...toNyangAnswer(res.answer), message_id: res.message_id, conversation_id: res.conversation_id };
}

export const feedback = (messageId: string, vote: 'up' | 'down' | null) => sendFeedback(messageId, vote);
