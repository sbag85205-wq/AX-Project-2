import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALL, CategoryChips } from '../components/CategoryChips';
import { SearchIcon } from '../components/Icons';
import { LoadError } from '../components/LoadError';
import { errorMessage } from '../lib/api';
import { listReadyDocuments } from '../lib/db';
import type { DocumentRow } from '../lib/types';
import { pageCountLabel } from '../lib/sheet';

export default function DocumentList() {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [cat, setCat] = useState(ALL);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let cancelled = false;
    setError('');
    setDocs(null);
    listReadyDocuments()
      .then((list) => !cancelled && setDocs(list))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const shown = (docs ?? [])
    .filter((d) => cat === ALL || d.category === cat)
    .filter((d) => !q.trim() || d.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>문서</h1>
          <p>챗봇이 답변 근거로 쓰는 문서예요. 원문을 직접 읽어볼 수 있어요.</p>
        </div>
        <div style={{ position: 'relative', flex: '0 1 300px' }}>
          <label htmlFor="doc-search" className="sr">문서 검색</label>
          <input id="doc-search" type="search" className="input" style={{ paddingLeft: 40 }} placeholder="문서명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <span style={{ position: 'absolute', left: 13, top: 13, color: 'var(--faint)' }}><SearchIcon /></span>
        </div>
      </div>

      <CategoryChips value={cat} onChange={setCat} />

      {error && <LoadError message={error} onRetry={load} />}
      {docs === null && !error && <div className="empty">불러오는 중…</div>}
      {docs !== null && shown.length === 0 && <div className="card empty">{docs.length ? '조건에 맞는 문서가 없어요.' : '아직 등록된 문서가 없어요.'}</div>}
      <div className="doc-grid">
        {shown.map((d) => (
          <Link key={d.id} to={`/docs/${d.id}`} className="card doc-card">
            <span className="pill pill-hold" style={{ alignSelf: 'flex-start' }}>{d.category}</span>
            <div className="list-title">{d.title}</div>
            <div className="list-meta">
              {d.version} · {pageCountLabel(d.page_count, d.file_path)}{d.effective_from ? ` · 시행 ${d.effective_from}` : ''}
              {d.file_path ? ' · 원본 있음' : ''}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
