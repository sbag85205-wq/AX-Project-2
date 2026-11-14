import { describe, expect, it } from 'vitest';
import { docFileType, pageCountLabel, pageLabel, sheetToText } from '../src/lib/sheet';
import { decodeText } from '../src/lib/extract';
import { chunkPages, coreQuestion, keywordScore, mergeEvidence, rankEvidence, searchTerms, similarity, termSimilarity } from '../supabase/functions/_shared/text';
import { ATTACH_LIMITS, SYSTEM_PROMPT, buildUserPrompt, noMatchingRuleAnswer, parseAttachments, parseModelAnswer, parseRewrite, type Evidence } from '../supabase/functions/_shared/answer';
import { parseSettings } from '../supabase/functions/_shared/settings';

describe('searchTerms', () => {
  it('질문 어미와 조사를 걸러 핵심 바이그램만 남긴다', () => {
    const terms = searchTerms('연차는 어떻게 신청하나요?');
    expect(terms).toContain('연차');
    expect(terms).toContain('신청');
    expect(terms).not.toContain('나요');
    expect(terms).not.toContain('어떻');
  });
  it('자연스러운 질문에서 내용 단어만 남긴다', () => {
    expect(searchTerms('반차는 어떻게 쓰나요? 몇 시간 단위예요?')).toEqual(['반차', '시간', '단위']);
    expect(searchTerms('법인카드를 분실했어요')).toEqual(expect.arrayContaining(['법인카드', '분실']));
    expect(searchTerms('법인카드를 분실했어요')).not.toContain('했어');
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

describe('parseSettings', () => {
  it('값을 0~1로 검사하고 빈 모델은 기본값(null)으로 둔다', () => {
    expect(parseSettings({ llm_model: ' ', keyword_min: 0.3, vector_min: '0.5', vector_weight: 1 }))
      .toEqual({ llm_model: null, keyword_min: 0.3, vector_min: 0.5, vector_weight: 1 });
    expect(parseSettings({ llm_model: 'qwen/qwen3-4b:free', keyword_min: 0.35, vector_min: 0.55, vector_weight: 0.6 }).llm_model)
      .toBe('qwen/qwen3-4b:free');
  });
  it('범위를 벗어나거나 형식이 틀리면 거부한다', () => {
    expect(() => parseSettings({ keyword_min: 1.5, vector_min: 0.5, vector_weight: 0.5 })).toThrow();
    expect(() => parseSettings({ llm_model: 'bad model; drop', keyword_min: 0.3, vector_min: 0.5, vector_weight: 0.5 })).toThrow();
  });
});

import { chunkPages as chunkForView } from '../supabase/functions/_shared/text';
import { stripOverlap } from '../src/lib/docText';

describe('stripOverlap', () => {
  it('청크 겹침을 떼어 내면 원문을 중복 없이 이어 읽을 수 있다', () => {
    const para = (n: number) => `${n}번 문단입니다. 연차는 사용 예정일 3영업일 전까지 신청하고 팀장 승인을 받아야 합니다. `.repeat(4);
    const chunks = chunkForView([{ page: 1, text: [1, 2, 3, 4, 5, 6].map(para).join('\n\n') }], 600, 120);
    expect(chunks.length).toBeGreaterThan(2);
    const joined = chunks.map((c, i) => (i ? stripOverlap(chunks[i - 1].content, c.content) : c.content)).join('\n');
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(joined.split(`${n}번 문단입니다.`).length - 1).toBe(4);
    }
  });
  it('겹침이 없으면 그대로 둔다', () => {
    expect(stripOverlap('가나다라마바사아자차카타파하'.repeat(3), '완전히 다른 내용으로 시작하는 다음 조각입니다')).toBe('완전히 다른 내용으로 시작하는 다음 조각입니다');
  });
});

describe('sheetToText', () => {
  it('머리글을 찾아 행마다 "머리글: 값"으로 적는다', () => {
    const text = sheetToText({
      name: '출장비',
      rows: [['2026 출장비 기준표'], ['직급', '일비', '숙박비'], ['사원', '30,000', '70,000'], ['과장', '40,000', '']]
    });
    expect(text.split('\n')).toEqual([
      '# 출장비',
      '2026 출장비 기준표',
      '직급 | 일비 | 숙박비',
      '직급: 사원, 일비: 30,000, 숙박비: 70,000',
      '직급: 과장, 일비: 40,000'
    ]);
  });
  it('머리글이 없으면 칸을 | 로 잇는다', () => {
    expect(sheetToText({ name: 'S', rows: [['메모'], [], ['한 줄']] })).toBe('# S\n메모\n한 줄');
  });
  it('엑셀 문서는 시트로 표시한다', () => {
    expect(docFileType('2026-11-07/abc.xlsx')).toBe('sheet');
    expect(pageLabel(2, 2, 'a.csv')).toBe('시트 2');
    expect(pageLabel(3, 4, 'a.pdf')).toBe('3–4쪽');
    expect(pageLabel(5, 5, 'a.pdf')).toBe('5쪽');
    expect(pageLabel(1, 2)).toBe('1–2쪽');
    expect(pageLabel(2, 3, 'a.xlsx')).toBe('시트 2–3');
    expect(pageCountLabel(3, 'a.xls')).toBe('시트 3개');
  });
});

describe('decodeText', () => {
  it('UTF-8과 CP949(EUC-KR) 텍스트를 모두 읽는다', () => {
    expect(decodeText(new TextEncoder().encode('﻿연차 신청').buffer)).toBe('연차 신청');
    expect(decodeText(Uint8Array.from([0xbf, 0xac, 0xc2, 0xf7]).buffer)).toBe('연차');
  });
});

describe('parseAttachments', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  it('파일 글자와 사진을 받아 길이를 제한한다', () => {
    const out = parseAttachments([
      { name: '오류\n화면.png', kind: 'image', data_url: png },
      { name: '기준표.xlsx', kind: 'file', text: '가'.repeat(ATTACH_LIMITS.textChars + 10) }
    ]);
    expect(out[0]).toEqual({ name: '오류 화면.png', kind: 'image', data_url: png });
    expect(out[1].text).toHaveLength(ATTACH_LIMITS.textChars);
    expect(parseAttachments(undefined)).toEqual([]);
  });
  it('개수·형식이 틀리면 이유를 알려 준다', () => {
    expect(() => parseAttachments(Array(4).fill({ name: 'a', kind: 'file', text: 'x' }))).toThrow('3개까지');
    expect(() => parseAttachments([{ name: 'a.svg', kind: 'image', data_url: 'data:image/svg+xml;base64,PHN2Zz4=' }])).toThrow('사진 형식');
    expect(() => parseAttachments([{ name: 'big.jpg', kind: 'image', data_url: 'data:image/jpeg;base64,' + 'A'.repeat(ATTACH_LIMITS.imageChars) }])).toThrow('너무 커요');
    expect(() => parseAttachments([{ name: 'empty.pdf', kind: 'file', text: '  ' }])).toThrow('글자를 찾지 못했어요');
  });
});

describe('buildUserPrompt', () => {
  it('첨부는 출처와 따로 <attachments>에 넣는다', () => {
    const prompt = buildUserPrompt('이거 처리돼요?', [], [{ name: '영수증.jpg', text: '식대 12,000원' }]);
    expect(prompt).toContain('<attachments>\n[첨부: 영수증.jpg]\n식대 12,000원\n</attachments>');
    expect(prompt.indexOf('<attachments>')).toBeGreaterThan(prompt.indexOf('</sources>'));
    expect(buildUserPrompt('질문', [])).not.toContain('<attachments>');
  });
});

describe('검색 품질 개선 (진단 보고서 C3·C4·C5)', () => {
  it('구어체 연결 어미 조각을 검색어에서 뺀다', () => {
    const terms = searchTerms('QA 결과 등록하고 배포 시작했으면 되돌릴 수 있나요?');
    expect(terms).toEqual(expect.arrayContaining(['qa', '결과', '등록', '배포', '시작']));
    for (const junk of ['록하', '하고', '작했', '했으', '으면']) expect(terms).not.toContain(junk);
    expect(searchTerms('잠깐 안 만졌는데 비밀번호를 또 넣으래요')).not.toEqual(expect.arrayContaining(['는데']));
    expect(searchTerms('잠깐 안 만졌는데 비밀번호를 또 넣으래요')).not.toContain('으래');
  });

  it('긴 질문도 키워드 점수가 깎이지 않는다', () => {
    expect(keywordScore(3 / 16, 16)).toBeCloseTo(0.5);
    expect(keywordScore(1 / 2, 2)).toBeCloseTo(0.5);
    expect(keywordScore(1, 20)).toBe(1);
  });

  it('후보 8개 중 기준을 넘은 앞의 5개만 근거로 쓴다', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ id: i, keyword_score: 0, vector_score: 0.9 - i * 0.06 }));
    const ranked = rankEvidence(rows, 4, { keyword_min: 0.35, vector_min: 0.55, vector_weight: 0.6 });
    expect(ranked.filter((r) => r.used).map((r) => r.id)).toEqual([0, 1, 2, 3, 4]);
    expect(ranked.find((r) => r.id === 5)).toMatchObject({ passed: true, used: false });
    expect(ranked.find((r) => r.id === 7)).toMatchObject({ passed: false, used: false });
  });

  it('새 절이 시작되면 앞 절 내용을 겹쳐 붙이지 않는다', () => {
    const steps = Array.from({ length: 4 }, (_, i) => `${i + 1}단계 내용을 자세히 적습니다. `.repeat(8)).join('\n');
    const chunks = chunkPages([{ page: 1, text: `■ 배포 절차\n${steps}\n■ 5. 완료 시\n완료 보고서를 올린다.` }]);
    const done = chunks.find((c) => c.section_title === '■ 5. 완료 시');
    expect(done?.content.startsWith('■ 5. 완료 시')).toBe(true);
    expect(done?.content).not.toContain('단계 내용');
  });
});

describe('존댓말·부연 설명 질문', () => {
  const pairs: [string, string][] = [
    ['재택근무 신청', '재택근무 신청은 어떻게 하시면 되나요?'],
    ['연차 신청', '연차는 며칠 전에 신청하셔야 하는지 여쭤봐도 될까요?'],
    ['법인카드 분실 처리', '법인카드를 분실했는데 어떻게 처리해야 하는지 알려주시겠어요?'],
    ['경조사 휴가', '경조사 휴가는 며칠 받을 수 있습니까?'],
    ['배우자 건강검진 지원', '배우자 건강검진도 지원해 주시는지 궁금합니다'],
    ['출장비 정산 제출', '출장비 정산은 언제까지 제출해야 합니까?']
  ];
  it.each(pairs)('존댓말로 물어도 "%s"과 같은 검색어만 남는다', (plain, polite) => {
    expect(new Set(searchTerms(polite))).toEqual(new Set(searchTerms(plain)));
  });

  it('높임 어미 조각이 검색어에 남지 않는다', () => {
    const all = pairs.flatMap(([, polite]) => searchTerms(polite));
    for (const junk of ['하시', '시면', '하셔', '셔야', '주시', '시겠', '시는', '니다', '금합', '여쭤', '있습', '하는지']) {
      expect(all).not.toContain(junk);
    }
  });

  it('부연 설명 뒤의 실제 질문 문장을 뽑는다', () => {
    expect(coreQuestion('제가 다음 달에 결혼을 하게 됐는데요, 경조사 휴가는 며칠 받을 수 있나요?')).toBe('경조사 휴가는 며칠 받을 수 있나요?');
    expect(coreQuestion('팀장님이 확인해 보라고 하셔서요. 출장 일비는 얼마인가요?')).toBe('출장 일비는 얼마인가요?');
    expect(coreQuestion('재택근무는 주에 몇 번 가능하나요?')).toBe('재택근무는 주에 몇 번 가능하나요?');
    expect(coreQuestion('출장 일비는 얼마인가요? 다음 주에 부산 가거든요.')).toBe('출장 일비는 얼마인가요?');
  });

  it('말투가 달라도 같은 FAQ를 찾는다', () => {
    expect(termSimilarity('연차 신청 기한', '연차는 며칠 전에 신청하셔야 하는지 여쭤봐도 될까요?')).toBeGreaterThanOrEqual(0.6);
    expect(termSimilarity('법인카드 분실', '법인카드를 분실했는데 어떻게 처리해야 하는지 알려주시겠어요?')).toBeGreaterThanOrEqual(0.6);
    expect(termSimilarity('재택근무 신청 방법', '법인카드 분실')).toBe(0);
  });

  it('여러 검색 결과를 합쳐 같은 조각은 높은 점수로 한 번만 남긴다', () => {
    const merged = mergeEvidence([
      [{ id: 'a', score: 0.5 }, { id: 'b', score: 0.4 }],
      [{ id: 'b', score: 0.9 }, { id: 'c', score: 0.3 }]
    ]);
    expect(merged).toEqual([{ id: 'b', score: 0.9 }, { id: 'a', score: 0.5 }, { id: 'c', score: 0.3 }]);
  });

  it('AI 질문 정리 결과를 검사한다', () => {
    expect(parseRewrite('{"query":"경조사 휴가 일수","keywords":["경조사","휴가","결혼"]}')).toEqual({ query: '경조사 휴가 일수', keywords: ['경조사', '휴가', '결혼'] });
    expect(parseRewrite('<think>…</think>{"query":"출장 일비","keywords":[]}')?.query).toBe('출장 일비');
    expect(parseRewrite('모르겠어요')).toBeNull();
  });
});

describe('딱 맞는 기준이 없을 때', () => {
  const ev: Evidence[] = [{
    source_id: 'S1', chunk_id: 'c1', document_id: 'd1', document_title: '인사규정', version: 'v1',
    page_start: 50, page_end: 50, section_title: '재택근무', content: '주 최대 2일 재택근무를 신청할 수 있다.'
  }];
  it('관련 출처와 가장 가까운 내용을 함께 보여 준다', () => {
    const model = parseModelAnswer('{"status":"insufficient_evidence","summary":["월 단위 기준은 없고 주 최대 2일이에요."],"citations":["S1"]}', ev);
    const a = noMatchingRuleAnswer(model, ev);
    expect(a.status).toBe('insufficient_evidence');
    expect(a.summary).toEqual(['월 단위 기준은 없고 주 최대 2일이에요.']);
    expect(a.citations.map((c) => c.chunk_id)).toEqual(['c1']);
  });
  it('모델이 출처를 안 주면 검색된 조각을 관련 문서로 붙인다', () => {
    expect(noMatchingRuleAnswer(null, ev).citations).toHaveLength(1);
  });
  it('계산해서 답해도 되는 규칙이 지시문에 있다', () => {
    expect(SYSTEM_PROMPT).toContain('계산해서 답할 수 있습니다');
    expect(SYSTEM_PROMPT).toContain('배경 설명');
  });
});
