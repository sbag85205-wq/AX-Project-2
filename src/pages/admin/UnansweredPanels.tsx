// 미등록 질문 화면의 요약 지표 카드와 추이 그래프.
import { ColumnChart, HBars } from '../../components/Charts';
import { fmt } from '../../lib/format';
import type { UnansweredStats } from './useUnanswered';

export function UnansweredKpis({ stats, truncated }: { stats: UnansweredStats; truncated: boolean }) {
  const { last30, change } = stats;
  return (
    <section className="stats-row" aria-label="요약">
      <div className="card stat">
        <div className="stat-label">미등록 질문 수 (30일)</div>
        <div className="stat-value">{fmt(last30)}<small>건</small></div>
        <div className="stat-sub" style={{ color: change && change > 0 ? 'var(--warn)' : undefined }}>
          {change === null ? '이전 30일 데이터 없음' : `이전 30일 대비 ${change > 0 ? '+' : ''}${change}%`}
        </div>
      </div>
      <div className="card stat">
        <div className="stat-label">질문 유형 (묶음)</div>
        <div className="stat-value">{fmt(stats.groupCount)}{truncated ? '+' : ''}<small>개</small></div>
        <div className="stat-sub">비슷한 표현을 자동으로 묶음</div>
      </div>
      <div className="card stat">
        <div className="stat-label">처리 대기</div>
        <div className="stat-value" style={{ color: 'var(--warn)' }}>{stats.pending}<small>개</small></div>
        <div className="stat-sub">신규 + 검토 중</div>
      </div>
      <div className="card stat">
        <div className="stat-label">FAQ로 등록됨</div>
        <div className="stat-value" style={{ color: 'var(--ok)' }}>{stats.doneThisMonth}<small>개</small></div>
        <div className="stat-sub">이번 달 새로 추가된 FAQ</div>
      </div>
    </section>
  );
}

export function UnansweredTrends({ stats }: { stats: UnansweredStats }) {
  return (
    <div className="split">
      <section className="card panel" aria-label="주별 추이" style={{ flex: '3 1 520px', minWidth: 0 }}>
        <h2>주별 미등록 질문 수</h2>
        <p className="panel-sub">최근 8주</p>
        <ColumnChart columns={stats.weeks} />
      </section>
      <section className="card panel" aria-label="카테고리별 분포" style={{ flex: '2 1 340px', minWidth: 0 }}>
        <h2>카테고리별 분포</h2>
        <p className="panel-sub">어느 영역의 FAQ가 부족한지 한눈에</p>
        <HBars rows={stats.categories} />
      </section>
    </div>
  );
}
