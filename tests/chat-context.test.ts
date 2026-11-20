import { describe, expect, it } from 'vitest';
import { CONTEXT_REWRITE_PROMPT, HISTORY_A_CHARS, HISTORY_Q_CHARS, buildRewriteInput, historyBlock, parseContextRewrite, parseHistory } from '../supabase/functions/_shared/context';
import { CONVERSATION_RULE, SYSTEM_PROMPT, buildUserPrompt, systemPromptFor, type Evidence } from '../supabase/functions/_shared/answer';
// @ts-expect-error 냥대리 원본 JS 모듈(타입 없음)
import { recentTurns } from '../nyang-frontend/public/chat-context.js';

const ev: Evidence[] = [{ source_id: 'S1', chunk_id: 'c1', document_id: 'd1', document_title: '결함 처리 규정', version: 'v1', page_start: 3, page_end: 3, section_title: '제5조', content: 'S2 결함은 4시간 이내에 착수한다.' }];

describe('대화 맥락: 서버가 받는 최근 대화', () => {
  it('최근 3턴만, 정해진 길이로 자르고 형식이 틀린 항목은 버린다', () => {
    const raw = [1, 2, 3, 4, 5].map((i) => ({ q: `질문${i} ` + 'ㄱ'.repeat(500), a: `답${i} ` + 'ㄴ'.repeat(900) }));
    const h = parseHistory([...raw, null, 'x', { a: '질문 없음' }]);
    expect(h).toHaveLength(3);
    expect(h[0].q.startsWith('질문3')).toBe(true);
    expect(h.every((t) => t.q.length <= HISTORY_Q_CHARS && t.a.length <= HISTORY_A_CHARS)).toBe(true);
  });
  it('history가 없거나 배열이 아니면 빈 맥락(지금처럼 이번 질문만으로 답한다)', () => {
    expect(parseHistory(undefined)).toEqual([]);
    expect(parseHistory({ q: 'a' })).toEqual([]);
  });
  it('질문 정리에는 최근 대화와 새 질문을 함께 넘긴다', () => {
    const input = buildRewriteInput([{ q: 'S1 결함 최초 대응 착수 기한은?', a: '30분 이내입니다.' }], '그럼 S2는?');
    expect(input).toContain('<conversation>');
    expect(input).toContain('직원: S1 결함 최초 대응 착수 기한은?');
    expect(input.endsWith('새 질문: 그럼 S2는?')).toBe(true);
    expect(CONTEXT_REWRITE_PROMPT).toContain('관계없는 주제면 앞 대화를 섞지 말고');
  });
  it('질문 정리 결과: uses_context가 true일 때만 맥락을 쓴 것으로 본다', () => {
    expect(parseContextRewrite('{"query":"S2 결함의 최초 대응 착수 기한은?","keywords":["S2","최초 대응"],"uses_context":true}'))
      .toEqual({ query: 'S2 결함의 최초 대응 착수 기한은?', keywords: ['S2', '최초 대응'], usesContext: true });
    expect(parseContextRewrite('```json\n{"query":"VDI 인증서 오류 조치","keywords":[],"uses_context":false}\n```')?.usesContext).toBe(false);
    expect(parseContextRewrite('{"query":"x"}')?.usesContext).toBe(false);
    expect(parseContextRewrite('모르겠어요')).toBeNull();
    expect(parseContextRewrite('{"keywords":["a"]}')).toBeNull();
  });
});

describe('대화 맥락: 답변 지시문', () => {
  it('앞 대화가 없으면 시스템 지시문과 질문 글이 예전과 글자 하나까지 같다(토큰이 늘지 않는다)', () => {
    expect(systemPromptFor(false)).toBe(SYSTEM_PROMPT);
    expect(buildUserPrompt('S2 기한은?', ev)).toBe(buildUserPrompt('S2 기한은?', ev, [], undefined));
    expect(buildUserPrompt('S2 기한은?', ev)).not.toContain('<conversation>');
  });
  it('앞 대화가 있으면 대화 규칙(사실은 이번 출처에서만, 근거 없으면 근거 부족)을 JSON 안내 바로 앞에 넣는다', () => {
    const sys = systemPromptFor(true);
    expect(sys).toContain(CONVERSATION_RULE);
    expect(sys).toContain('이번 <sources>에 근거가 없으면 앞 대화에 비슷한 내용이 있었더라도 status를 "insufficient_evidence"');
    expect(sys.indexOf(CONVERSATION_RULE)).toBeLessThan(sys.indexOf('반드시 아래 JSON 하나만 출력합니다'));
    expect(sys.startsWith(SYSTEM_PROMPT.split('\n반드시')[0])).toBe(true);
  });
  it('답변 생성 글에 앞 대화와 바꾼 질문이 함께 들어간다', () => {
    const p = buildUserPrompt('그럼 S2는?', ev, [], { conversation: historyBlock([{ q: 'S1 착수 기한은?', a: '30분 이내.' }]), searchQuestion: 'S2 결함의 최초 대응 착수 기한은?' });
    expect(p.startsWith('<conversation>')).toBe(true);
    expect(p).toContain('질문: 그럼 S2는?');
    expect(p).toContain('(앞 대화를 반영한 질문: S2 결함의 최초 대응 착수 기한은?)');
  });
});

describe('대화 맥락: 화면이 보내는 최근 대화 (chat-context.js)', () => {
  const user = (text: string) => ({ role: 'user', text });
  const bot = (summary: string[], extra = {}) => ({ role: 'assistant', result: { knowly: { summary, ...extra } } });
  it('방금 보낸 질문은 빼고, 답이 있는 최근 3턴만 보낸다', () => {
    const msgs = [user('q1'), bot(['a1']), user('q2'), bot(['a2', 'a2b']), user('q3'), bot(['a3']), user('q4'), bot(['a4']), user('지금 질문')];
    expect(recentTurns(msgs)).toEqual([{ q: 'q2', a: 'a2 a2b' }, { q: 'q3', a: 'a3' }, { q: 'q4', a: 'a4' }]);
  });
  it('연결 오류·일정 카드처럼 문서 답변이 아닌 턴은 맥락에 넣지 않는다', () => {
    const msgs = [user('q1'), bot(['연결 오류'], { error: true }), user('내일 3시 미팅 추가'), { role: 'assistant', result: { kind: 'event' } }, user('지금')];
    expect(recentTurns(msgs)).toEqual([]);
  });
  it('새 대화(메시지 없음)는 맥락이 비어 있다', () => {
    expect(recentTurns([])).toEqual([]);
    expect(recentTurns([user('첫 질문')])).toEqual([]);
  });
});
