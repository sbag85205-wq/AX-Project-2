// 미등록 질문 화면의 데이터: 질문 묶음 불러오기와 요약 지표·추이 계산.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../../lib/api';
import { CATEGORIES } from '../../lib/constants';
import { listQuestionGroups, type QuestionGroupRow } from '../../lib/db';
import { daysAgo, shortDate } from '../../lib/format';

/**
 * 한 번에 불러오는 질문 묶음 수(최근에 물어본 순). DB를 바꾸지 않고 브라우저에서 집계하므로,
 * 묶음이 이보다 많으면 아래 지표·추이는 최근 GROUP_LIMIT개 묶음만으로 계산된다(화면에 "최근 500개 기준" 표시).
 */
export const GROUP_LIMIT = 500;

export type GroupItem = QuestionGroupRow & {
  /** 비슷한 표현(질문) 수 */
  count: number;
  /** 최근 7일 동안 들어온 수 */
  week: number;
};

export interface UnansweredStats {
  last30: number;
  /** 이전 30일 대비 증감(%). 이전 30일 데이터가 없으면 null */
  change: number | null;
  groupCount: number;
  pending: number;
  doneThisMonth: number;
  weeks: { key: string; label: string; n: number }[];
  categories: { label: string; n: number }[];
}

/** 불러온 시각(now) 기준으로 지표를 계산한다. now를 고정해 두어야 렌더링마다 다시 계산하지 않는다. */
export function computeStats(items: GroupItem[], now: number): UnansweredStats {
  const iso = (n: number) => daysAgo(n, now).toISOString();
  const all = items.flatMap((g) => g.question_variants);
  const last30 = all.filter((v) => v.created_at >= iso(30)).length;
  const prev30 = all.filter((v) => v.created_at >= iso(60) && v.created_at < iso(30)).length;
  const today = new Date(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  return {
    last30,
    change: prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : null,
    groupCount: items.length,
    pending: items.filter((g) => g.status === '신규' || g.status === '검토 중').length,
    doneThisMonth: items.filter((g) => g.status === 'FAQ 등록 완료' && g.faqs && g.faqs.created_at >= monthStart).length,
    // 최근 8주 추이
    weeks: Array.from({ length: 8 }, (_, i) => {
      const end = iso((7 - i) * 7);
      const start = daysAgo((8 - i) * 7, now);
      const n = all.filter((v) => v.created_at >= start.toISOString() && v.created_at < end).length;
      return { key: start.toISOString(), label: shortDate(start), n };
    }),
    categories: CATEGORIES.map((c) => ({ label: c, n: items.filter((i) => i.category === c).reduce((a, i) => a + i.count, 0) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
  };
}

export function useUnanswered() {
  const [groups, setGroups] = useState<QuestionGroupRow[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const list = await listQuestionGroups(GROUP_LIMIT);
      setNow(Date.now());
      setGroups(list);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const items = useMemo<GroupItem[]>(() => {
    const weekAgo = daysAgo(7, now).toISOString();
    return (groups ?? []).map((g) => ({
      ...g,
      count: g.question_variants.length,
      week: g.question_variants.filter((v) => v.created_at >= weekAgo).length
    }));
  }, [groups, now]);

  const stats = useMemo(() => computeStats(items, now), [items, now]);

  return {
    items,
    stats,
    loading: groups === null && !error,
    error,
    /** 불러온 묶음이 한도에 닿아 지표가 일부만으로 계산됐을 수 있다 */
    truncated: (groups?.length ?? 0) >= GROUP_LIMIT,
    reload
  };
}
