import { describe, expect, it } from 'vitest';
import { CATEGORY_MAX_COUNT, categoryNameProblem, renamedList } from '../src/lib/categories';
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

  it('DB 기본 분야는 지금 쓰던 분야(CATEGORIES)와 같다', () => {
    const list = /array\[(.*?)\]::text\[\]/.exec(sql)?.[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
    expect(list).toEqual([...CATEGORIES]);
  });
});
