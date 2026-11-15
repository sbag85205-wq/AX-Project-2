import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/supabase', () => ({ supabase: {} }));
import { CATEGORIES } from '../src/lib/constants';
import { computeStats, type GroupItem } from '../src/pages/admin/useUnanswered';

// 카테고리 이름은 냥대리 분야와 맞춰 바뀔 수 있으므로 목록에서 꺼내 쓴다
const [A, B] = CATEGORIES;

const DAY = 864e5;
const now = Date.UTC(2026, 10, 14, 12);
const at = (daysBefore: number) => new Date(now - daysBefore * DAY).toISOString();
const group = (id: string, status: GroupItem['status'], category: string, variantDays: number[], faqCreated?: string): GroupItem => ({
  id, question: id, category, status, faq_id: null, created_at: at(90), last_asked_at: at(0),
  question_variants: variantDays.map((d) => ({ text: id, reason: 'no_answer', created_at: at(d) })),
  faqs: faqCreated ? { answer: '답', created_at: faqCreated } : null,
  count: variantDays.length, week: variantDays.filter((d) => d < 7).length
});

describe('미등록 질문 지표', () => {
  it('불러온 시각을 기준으로 30일·이전 30일·처리 대기·카테고리를 센다', () => {
    const items = [
      group('a', '신규', A, [1, 2, 40]),
      group('b', '검토 중', B, [10]),
      group('c', 'FAQ 등록 완료', A, [45, 50], at(1)),
      group('d', '보류', A, [])
    ];
    const s = computeStats(items, now);
    expect(s.last30).toBe(3);
    expect(s.change).toBe(0); // 3건 vs 이전 30일 3건
    expect(s.pending).toBe(2);
    expect(s.groupCount).toBe(4);
    expect(s.categories).toEqual([{ label: A, n: 5 }, { label: B, n: 1 }]);
    expect(s.weeks).toHaveLength(8);
    expect(s.weeks[7].n).toBe(2);
  });
  it('같은 입력이면 같은 결과다 (렌더링마다 기준 시각이 바뀌지 않는다)', () => {
    const items = [group('a', '신규', A, [1])];
    expect(computeStats(items, now)).toEqual(computeStats(items, now));
  });
});
