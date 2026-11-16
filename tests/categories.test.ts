import { describe, expect, it } from 'vitest';
import {
  CATEGORY_MAX_COUNT, EXAMPLE_MAX_COUNT, categoryNameProblem, cleanExamples, defaultExamples, exampleProblem, examplesFor, examplesOf, movedList, renamedList, withDocumentCategories
} from '../src/lib/categories';
import { CATEGORIES } from '../src/lib/constants';
import sql from '../supabase/migrations/20261116000000_categories.sql?raw';

describe('분야 관리', () => {
  it('새 분야 이름을 검사한다', () => {
    const current = [...CATEGORIES];
    expect(categoryNameProblem('인사·휴가', current)).toBe('');
    expect(categoryNameProblem('  ', current)).toContain('입력');
    expect(categoryNameProblem(' 기타 ', current)).toContain('이미');
    expect(categoryNameProblem('가'.repeat(31), current)).toContain('30자');
    expect(categoryNameProblem('새 분야', Array.from({ length: CATEGORY_MAX_COUNT }, (_, i) => `분야${i}`))).toContain('최대');
  });

  it('이름 수정은 같은 자리에서 이름만 바꾼다', () => {
    expect(renamedList(['서버', '기타', '인사'], '기타', ' 공통 ')).toEqual(['서버', '공통', '인사']);
    // 이름 수정 검사는 자기 자신을 뺀 목록과 비교한다
    expect(categoryNameProblem('서버', ['서버', '인사'].filter((c) => c !== '기타'))).toContain('이미');
  });

  it('순서를 한 칸씩 바꾸고, 끝을 넘으면 그대로 둔다', () => {
    expect(movedList(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(movedList(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(movedList(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(movedList(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('예시 질문: 저장된 것이 없으면 냥대리 기본 예시, 새 분야는 빈 목록', () => {
    expect(defaultExamples('클라이언트 접속').length).toBeGreaterThan(0);
    expect(defaultExamples('인사·휴가')).toEqual([]);
    expect(examplesOf('클라이언트 접속', { '클라이언트 접속': ['내 질문'] })).toEqual(['내 질문']);
    expect(examplesOf('클라이언트 접속', {})).toEqual(defaultExamples('클라이언트 접속'));
    expect(examplesOf('기타', { 기타: [] })).toEqual([]); // 일부러 비운 분야는 비운 채로
  });

  it('예시 질문을 검사·정리하고, 지워진 분야의 예시는 버린다', () => {
    expect(exampleProblem('연차는 어떻게 쓰나요?', [])).toBe('');
    expect(exampleProblem(' ', [])).toContain('입력');
    expect(exampleProblem('같은 질문', ['같은 질문'])).toContain('이미');
    expect(exampleProblem('새 질문', Array.from({ length: EXAMPLE_MAX_COUNT }, (_, i) => `질문${i}`))).toContain('최대');
    expect(cleanExamples([' a ', '', 'a', 'b', 'x'.repeat(201)])).toEqual(['a', 'b']);
    expect(examplesFor(['서버'], { 서버: ['q'], 삭제됨: ['r'] })).toEqual({ 서버: ['q'] });
  });

  it('직원 문서 목록: 지워진 분야를 쓰는 문서가 있으면 그 분야를 뒤에 붙인다', () => {
    expect(withDocumentCategories(['서버', '인사'], ['인사', '옛 분야', '서버', '옛 분야', ''])).toEqual(['서버', '인사', '옛 분야']);
  });

  it('DB 기본 분야는 지금 쓰던 분야(CATEGORIES)와 같다', () => {
    const list = /array\[(.*?)\]::text\[\]/.exec(sql)?.[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
    expect(list).toEqual([...CATEGORIES]);
  });
});
