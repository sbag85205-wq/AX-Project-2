import { useEffect, useState } from 'react';
import { fileKind, readSpreadsheet } from '../lib/extract';
import type { Sheet } from '../lib/sheet';

const MAX_ROWS = 500;

/** 원본 엑셀·CSV를 표로 보여준다. 시트가 여럿이면 시트 탭으로 고른다. */
export function SheetViewer({ url, path, sheet = 1, title }: { url: string; path: string; sheet?: number; title: string }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [active, setActive] = useState(Math.max(0, sheet - 1));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setError('');
    const kind = fileKind(path);
    (async () => {
      if (kind !== 'xlsx' && kind !== 'xls' && kind !== 'csv') throw new Error('not a sheet');
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = await readSpreadsheet(await res.arrayBuffer(), kind);
      if (!cancelled) setSheets(data);
    })().catch(() => !cancelled && setError('원본 표를 불러오지 못했어요. "원본 파일 받기"로 확인해 주세요.'));
    return () => {
      cancelled = true;
    };
  }, [url, path]);

  useEffect(() => setActive(Math.max(0, sheet - 1)), [sheet]);

  if (error) return <div className="card empty">{error}</div>;
  if (!sheets) return <div className="card empty">원본 표를 불러오는 중…</div>;
  const current = sheets[active] ?? sheets[0];
  if (!current) return <div className="card empty">표시할 시트가 없어요.</div>;
  const width = Math.max(1, ...current.rows.slice(0, MAX_ROWS).map((r) => r.length));

  return (
    <div className="card sheet-view">
      {sheets.length > 1 && (
        <div className="tabs sheet-tabs" role="group" aria-label="시트">
          {sheets.map((s, i) => (
            <button type="button" key={s.name} className="tab" aria-pressed={i === active} onClick={() => setActive(i)}>{s.name}</button>
          ))}
        </div>
      )}
      <div className="sheet-scroll">
        <table className="sheet-table" aria-label={`${title} · ${current.name}`}>
          <tbody>
            {current.rows.slice(0, MAX_ROWS).map((row, i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                {Array.from({ length: width }, (_, j) => <td key={j} className={(row[j]?.length ?? 0) > 30 ? 'wrap' : undefined}>{row[j] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {current.rows.length === 0 && <div className="empty">빈 시트예요.</div>}
      {current.rows.length > MAX_ROWS && (
        <div className="hint" style={{ padding: '8px 12px' }}>
          앞의 {MAX_ROWS}행만 보여요 (전체 {current.rows.length}행). 나머지는 원본 파일에서 확인해 주세요.
        </div>
      )}
    </div>
  );
}
