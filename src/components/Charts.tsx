// 관리자 화면의 작은 막대그래프. 모양은 styles.css의 .hbar·.columns 규칙이 맡는다.
import type { CSSProperties } from 'react';
import { fmt } from '../lib/format';

export interface HBarRow {
  label: string;
  n: number;
  /** 값 옆에 흐리게 붙는 설명 (예: "/12명") */
  extra?: string;
}

/** 가로 막대: 이름 · 막대 · 값. 값 칸에 설명(extra)이 붙으면 wide로 넓힌다. */
export function HBars({ rows, unit = '', wide = false }: { rows: HBarRow[]; unit?: string; wide?: boolean }) {
  if (!rows.length) return <div className="hint">아직 데이터가 없어요.</div>;
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className={`hbars${wide ? ' hbars-wide' : ''}`}>
      {rows.map((r) => (
        <div key={r.label} className="hbar">
          <span className="hbar-label" title={r.label}>{r.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.round((r.n / max) * 100)}%` }} /></span>
          <span className="hbar-value"><b>{fmt(r.n)}</b>{unit}{r.extra && <span className="hint"> {r.extra}</span>}</span>
        </div>
      ))}
    </div>
  );
}

export interface Column {
  key: string;
  n: number;
  /** 막대 아래 이름 (없으면 비운다) */
  label?: string;
  /** 마우스를 올렸을 때 설명 */
  title?: string;
}

/**
 * 세로 막대: 마지막 막대(가장 최근)를 진하게 칠한다. 막대 최대 높이는 CSS의 --column-bar-max.
 * 막대가 31개를 넘으면 간격을 2px로 좁히고, 그 이하에서는 gap(px, 기본은 CSS의 10px)을 쓴다.
 */
export function ColumnChart({ columns, showValues = true, gap }: { columns: Column[]; showValues?: boolean; gap?: number }) {
  const max = Math.max(1, ...columns.map((c) => c.n));
  const dense = columns.length > 31;
  const style = { '--n': columns.length, ...(!dense && gap !== undefined ? { gap } : {}) } as CSSProperties;
  return (
    <div className={`columns${dense ? ' columns-dense' : ''}`} style={style}>
      {columns.map((c, i) => (
        <div key={c.key} className={`column${i === columns.length - 1 ? ' latest' : ''}`} title={c.title}>
          {showValues && <b>{c.n}</b>}
          <i style={{ '--ratio': c.n / max } as CSSProperties} />
          {c.label && <span>{c.label}</span>}
        </div>
      ))}
    </div>
  );
}
