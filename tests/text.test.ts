import { describe, expect, it } from 'vitest';
import { docFileType, pageCountLabel, pageLabel, sheetToText } from '../src/lib/sheet';
import { decodeText } from '../src/lib/extract';
import { chunkPages, searchTerms, similarity } from '../supabase/functions/_shared/text';
import { ATTACH_LIMITS, buildUserPrompt, parseAttachments, parseModelAnswer, type Evidence } from '../supabase/functions/_shared/answer';
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
    expect(pageLabel(3, 4, 'a.pdf')).toBe('p.3–4');
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
