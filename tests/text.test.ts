import { describe, expect, it } from 'vitest';
import { chunkPages, searchTerms, similarity } from '../supabase/functions/_shared/text';
import { parseModelAnswer, type Evidence } from '../supabase/functions/_shared/answer';

describe('searchTerms', () => {
  it('질문 어미와 조사를 걸러 핵심 바이그램만 남긴다', () => {
    const terms = searchTerms('연차는 어떻게 신청하나요?');
    expect(terms).toContain('연차');
    expect(terms).toContain('신청');
    expect(terms).not.toContain('나요');
    expect(terms).not.toContain('어떻');
  });
  it('영문·숫자 단어는 통째로 쓴다', () => {
    expect(searchTerms('VPN 접속 오류 E401')).toEqual(expect.arrayContaining(['vpn', 'e401', '접속', '오류']));
  });
});

describe('similarity', () => {
  it('비슷한 표현은 높고 다른 주제는 낮다', () => {
    expect(similarity('재택근무 신청은 어디서 하나요?', '재택근무 신청 메뉴가 어디예요?')).toBeGreaterThan(0.45);
    expect(similarity('재택근무 신청은 어디서 하나요?', '법인카드를 분실했어요')).toBeLessThan(0.2);
  });
});

describe('chunkPages', () => {
  it('페이지 번호를 보존하고 길이를 제한한다', () => {
    const long = '가'.repeat(400);
    const chunks = chunkPages([
      { page: 1, text: `제1조 목적\n${long}\n\n${long}` },
      { page: 2, text: `제2조 정의\n${long}` },
      { page: 3, text: '' }
    ], 900, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].page_start).toBe(1);
    expect(chunks.at(-1)!.page_end).toBe(2);
    expect(chunks.every((c) => c.content.length <= 1100)).toBe(true);
    expect(chunks.some((c) => c.section_title === '제2조 정의')).toBe(true);
  });
  it('겹침만 남은 마지막 버퍼로 중복 청크를 만들지 않는다', () => {
    const chunks = chunkPages([{ page: 1, text: '짧은 문단 하나' }]);
    expect(chunks).toHaveLength(1);
  });
});

describe('parseModelAnswer', () => {
  const ev: Evidence[] = [{
    source_id: 'S1', chunk_id: 'c1', document_id: 'd1', document_title: '휴가 규정', version: 'v2',
    page_start: 1, page_end: 2, section_title: null, content: '...'
  }];
  it('허용된 출처만 남기고 생각 태그·코드 블록을 무시한다', () => {
    const a = parseModelAnswer('<think>x</think>```json\n{"status":"answered","summary":["3영업일 전 신청"],"citations":["S1","S9"]}\n```', ev);
    expect(a.citations.map((c) => c.source_id)).toEqual(['S1']);
    expect(a.citations[0].page_start).toBe(1);
  });
  it('근거 없는 answered 응답은 실패로 본다', () => {
    expect(() => parseModelAnswer('{"status":"answered","summary":["a"],"citations":["S7"]}', ev)).toThrow();
  });
  it('insufficient_evidence는 출처 없이 허용한다', () => {
    expect(parseModelAnswer('{"status":"insufficient_evidence","summary":["확인 불가"],"citations":[]}', ev).status).toBe('insufficient_evidence');
  });
});
