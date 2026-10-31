import { useEffect, useState } from 'react';
import { fmt } from '../../lib/format';
import { supabase } from '../../lib/supabase';

interface UsageStats {
  total: number;
  active_users: number;
  answered: number;
  insufficient: number;
  errors: number;
  avg_latency_ms: number;
  feedback_up: number;
  feedback_down: number;
  input_tokens: number;
  output_tokens: number;
  daily: { date: string; count: number }[];
  by_department: { name: string; count: number; users: number }[];
  by_category: { name: string; count: number }[];
  by_model: { model: string; count: number; input_tokens: number; output_tokens: number; avg_latency_ms: number }[];
}

const RANGES = [7, 30, 90];

function HBars({ rows, unit = '' }: { rows: { label: string; n: number; extra?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <div className="hint">아직 데이터가 없어요.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((r) => (
        <div key={r.label} className="hbar" style={{ gridTemplateColumns: '84px minmax(0, 1fr) 72px' }}>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.round((r.n / max) * 100)}%` }} /></span>
          <span style={{ textAlign: 'right' }}><b>{fmt(r.n)}</b>{unit}{r.extra && <span className="hint"> {r.extra}</span>}</span>
        </div>
      ))}
    </div>
  );
}

function csvCell(v: string | number): string {
  const s = String(v);
  // 스프레드시트 수식 주입 방지
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export default function Stats() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setStats(null);
    supabase.rpc('admin_usage_stats', { days }).then(({ data, error: e }) => {
      if (e) setError('통계를 불러오지 못했어요.');
      else setStats(data as UsageStats);
    });
  }, [days]);

  const download = () => {
    if (!stats) return;
    const rows: (string | number)[][] = [
      ['구분', '항목', '값'],
      ['요약', '총 질문 수', stats.total],
      ['요약', '이용 직원 수', stats.active_users],
      ['요약', '답변 완료', stats.answered],
      ['요약', '근거 부족', stats.insufficient],
      ['요약', '평균 응답 시간(ms)', stats.avg_latency_ms],
      ['요약', '도움 됨', stats.feedback_up],
      ['요약', '도움 안 됨', stats.feedback_down],
      ...stats.daily.map((d) => ['일별', d.date, d.count]),
      ...stats.by_department.map((d) => ['부서별', d.name, d.count]),
      ...stats.by_category.map((d) => ['카테고리별', d.name, d.count]),
      ...stats.by_model.map((d) => ['모델별', d.model, d.count])
    ];
    const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `knowly-usage-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const rated = stats ? stats.feedback_up + stats.feedback_down : 0;
  const dmax = Math.max(1, ...(stats?.daily.map((d) => d.count) ?? [1]));

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>이용 통계</h1>
          <p>질문 원문 없이 횟수·유형·부서·응답 품질만 집계해요.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="chips" role="group" aria-label="기간">
            {RANGES.map((r) => <button key={r} type="button" className="chip" aria-pressed={days === r} onClick={() => setDays(r)}>최근 {r}일</button>)}
          </div>
          <button type="button" className="btn btn-sm" onClick={download} disabled={!stats}>CSV 다운로드</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!stats && !error && <div className="empty">불러오는 중…</div>}
      {stats && (
        <>
          <section className="stats-row" aria-label="요약">
            <div className="card stat">
              <div className="stat-label">총 질문 수</div>
              <div className="stat-value">{fmt(stats.total)}<small>건</small></div>
              <div className="stat-sub">이용 직원 {fmt(stats.active_users)}명</div>
            </div>
            <div className="card stat">
              <div className="stat-label">답변 성공률</div>
              <div className="stat-value">{stats.total ? Math.round((stats.answered / stats.total) * 100) : 0}<small>%</small></div>
              <div className="stat-sub">근거 부족 {fmt(stats.insufficient)}건</div>
            </div>
            <div className="card stat">
              <div className="stat-label">평균 응답 시간</div>
              <div className="stat-value">{(stats.avg_latency_ms / 1000).toFixed(1)}<small>초</small></div>
              <div className="stat-sub">질문부터 답변 완료까지</div>
            </div>
            <div className="card stat">
              <div className="stat-label">답변 만족도</div>
              <div className="stat-value">{rated ? Math.round((stats.feedback_up / rated) * 100) : '-'}<small>{rated ? '%' : ''}</small></div>
              <div className="stat-sub">평가 {fmt(rated)}건 중 '도움 됨'</div>
            </div>
          </section>

          <section className="card panel" aria-label="일별 이용량">
            <h2>일별 질문 수</h2>
            <p className="panel-sub">최근 {days}일</p>
            {stats.daily.length === 0 ? (
              <div className="hint">아직 데이터가 없어요.</div>
            ) : (
              <div className="columns" style={{ ['--n' as string]: stats.daily.length, gap: stats.daily.length > 31 ? 2 : 8 }}>
                {stats.daily.map((d, i) => (
                  <div key={d.date} className={`column${i === stats.daily.length - 1 ? ' latest' : ''}`} title={`${d.date}: ${d.count}건`}>
                    {stats.daily.length <= 31 && <b>{d.count}</b>}
                    <i style={{ height: `${Math.max(2, Math.round((d.count / dmax) * 140))}px` }} />
                    {stats.daily.length <= 14 && <span>{d.date.slice(5).replace('-', '/')}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="split">
            <section className="card panel" style={{ flex: '1 1 380px', minWidth: 0 }}>
              <h2>부서별 이용량</h2>
              <p className="panel-sub">질문 수 · 이용 직원 수</p>
              <HBars rows={stats.by_department.map((d) => ({ label: d.name, n: d.count, extra: `/${d.users}명` }))} />
            </section>
            <section className="card panel" style={{ flex: '1 1 380px', minWidth: 0 }}>
              <h2>질문 유형</h2>
              <p className="panel-sub">답변 근거 문서의 카테고리 기준</p>
              <HBars rows={stats.by_category.map((d) => ({ label: d.name, n: d.count }))} />
            </section>
          </div>

          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="panel" style={{ paddingBottom: 8 }}>
              <h2>모델 사용량</h2>
              <p className="panel-sub" style={{ marginBottom: 0 }}>답변 방식별 호출 수와 토큰 사용량</p>
            </div>
            <div className="table-scroll">
              <div className="grid-table">
                <div className="grid-row grid-head" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 120px 120px 110px' }}>
                  <div>모델</div><div>호출</div><div>입력 토큰</div><div>출력 토큰</div><div>평균 응답</div>
                </div>
                {stats.by_model.length === 0 && <div className="empty">아직 데이터가 없어요.</div>}
                {stats.by_model.map((m) => (
                  <div key={m.model} className="grid-row" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 120px 120px 110px' }}>
                    <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{m.model}</div>
                    <div>{fmt(m.count)}</div>
                    <div>{fmt(m.input_tokens)}</div>
                    <div>{fmt(m.output_tokens)}</div>
                    <div>{(m.avg_latency_ms / 1000).toFixed(1)}초</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
