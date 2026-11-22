import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from '../components/Icons';
import { loadCategoryNames } from '../lib/categories';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { DocumentRow } from '../lib/types';
import { pageCountLabel } from '../lib/sheet';
import Loading from '../components/Loading';

export default function DocumentList() {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  // 분야 관리에서 정한 분야(순서 포함). 불러오기 전에는 기본 분야를 보여 준다.
  const [names, setNames] = useState<string[]>([...CATEGORIES]);

  useEffect(() => {
    // 직원에게는 RLS로 검색 가능한(ready) 문서만 보인다
    supabase
      .from('documents')
      .select('*')
      .eq('status', 'ready')
      .order('category')
      .order('title')
      .then(({ data }) => setDocs((data as DocumentRow[]) ?? []));
    loadCategoryNames().then(setNames);
  }, []);

  // 분야 칩은 분야 관리에 있는 분야만 보여 준다. 다른 분야(예전 분야 등)의 문서는 '전체'에서 맨 뒤에 보인다.
  const cats = names;
  const rank = (c: string) => { const i = cats.indexOf(c); return i < 0 ? cats.length : i; };

  const shown = (docs ?? [])
    .filter((d) => cat === '전체' || d.category === cat)
    .filter((d) => !q.trim() || d.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => rank(a.category) - rank(b.category)); // 분야 순서대로 (같은 분야 안에서는 문서명 순서 유지)

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>문서</h1>
        </div>
        <div style={{ position: 'relative', flex: '0 1 300px' }}>
          <label htmlFor="doc-search" className="sr">문서 검색</label>
          <input id="doc-search" type="search" className="input" style={{ paddingLeft: 36 }} placeholder="문서명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--faint)' }}><SearchIcon /></span>
        </div>
      </div>

      <div className="chips" role="group" aria-label="카테고리">
        {['전체', ...cats].map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {docs === null && <Loading text="문서를 불러오는 중" />}
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
