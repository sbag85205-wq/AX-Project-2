import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from '../components/Icons';
import { loadCategoryNames } from '../lib/categories';
import { CATEGORIES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { DocumentRow } from '../lib/types';
import { pageCountLabel } from '../lib/sheet';
import Loading from '../components/Loading';
import { likePattern, snippet, splitHits } from '../lib/docSearch';

// 내용 키워드로 찾은 문서: 본문에 나온 곳 수와 첫 번째 곳(쪽·조각·미리보기)
interface ContentHit { count: number; chunk: string; page: number; text: string }

export default function DocumentList() {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  // 분야 관리에서 정한 분야(순서 포함). 불러오기 전에는 기본 분야를 보여 준다.
  const [names, setNames] = useState<string[]>([...CATEGORIES]);
  // 내용 키워드 검색 결과(문서 id → 찾은 곳). 2글자 이상일 때 본문 조각(chunks)에서 찾는다
  const [hits, setHits] = useState<Record<string, ContentHit>>({});
  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits({}); setSearching(false); return; }
    let off = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('chunks')
        .select('id, document_id, page_start, content')
        .ilike('content', likePattern(term))
        .order('seq')
        .limit(400);
      if (off) return;
      const next: Record<string, ContentHit> = {};
      for (const c of (data as { id: string; document_id: string; page_start: number; content: string }[]) ?? []) {
        const h = (next[c.document_id] ??= { count: 0, chunk: c.id, page: c.page_start, text: snippet(c.content, term) });
        h.count++;
      }
      setHits(next);
      setSearching(false);
    }, 300);
    return () => { off = true; clearTimeout(timer); };
  }, [q]);

  // 분야 칩은 분야 관리에 있는 분야만 보여 준다. 다른 분야(예전 분야 등)의 문서는 '전체'에서 맨 뒤에 보인다.
  const cats = names;
  const rank = (c: string) => { const i = cats.indexOf(c); return i < 0 ? cats.length : i; };

  // 검색: 문서명에 있거나(앞쪽) 본문에 키워드가 있는 문서(뒤쪽). 그 안에서는 분야 순서 → 문서명 순서
  const term = q.trim();
  const titleHit = (d: DocumentRow) => !!term && d.title.toLowerCase().includes(term.toLowerCase());
  const shown = (docs ?? [])
    .filter((d) => cat === '전체' || d.category === cat)
    .filter((d) => !term || titleHit(d) || !!hits[d.id])
    .sort((a, b) => Number(titleHit(b)) - Number(titleHit(a)) || rank(a.category) - rank(b.category));
  const titleCount = shown.filter(titleHit).length, contentCount = shown.filter((d) => hits[d.id]).length;

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>문서</h1>
        </div>
        <div style={{ position: 'relative', flex: '0 1 300px' }}>
          <label htmlFor="doc-search" className="sr">문서 검색</label>
          <input id="doc-search" type="search" className="input" style={{ paddingLeft: 36 }} placeholder="문서명 또는 내용 키워드 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--faint)' }}><SearchIcon /></span>
        </div>
      </div>

      <div className="chips" role="group" aria-label="카테고리">
        {['전체', ...cats].map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {term && docs !== null && (
        <p className="hint doc-search-status" role="status">
          {searching ? '본문에서 찾는 중…' : `'${term}' 문서명 ${titleCount}건 · 내용 ${contentCount}건`}
          {term.length < 2 && ' (내용 검색은 2글자부터)'}
        </p>
      )}
      {docs === null && <Loading text="문서를 불러오는 중" boot />}
      {docs !== null && shown.length === 0 && !searching && <div className="card empty">{docs.length ? '조건에 맞는 문서가 없어요.' : '아직 등록된 문서가 없어요.'}</div>}
      <div className="doc-grid">
        {shown.map((d) => {
          const hit = hits[d.id];
          return (
          <Link key={d.id} to={hit ? `/docs/${d.id}?chunk=${hit.chunk}&q=${encodeURIComponent(term)}` : `/docs/${d.id}`} className="card doc-card">
            <span className="pill pill-hold" style={{ alignSelf: 'flex-start' }}>{d.category}</span>
            <div className="list-title">{term ? splitHits(d.title, term).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p)) : d.title}</div>
            <div className="list-meta">
              {d.version} · {pageCountLabel(d.page_count, d.file_path)}{d.effective_from ? ` · 시행 ${d.effective_from}` : ''}
              {d.file_path ? ' · 원본 있음' : ''}
            </div>
            {hit && (
              <div className="doc-hit">
                <span className="doc-hit-count">본문 {hit.count}곳 · {hit.page}쪽부터</span>
                <span className="doc-hit-text">{splitHits(hit.text, term).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</span>
              </div>
            )}
          </Link>
          );
        })}
      </div>
    </main>
  );
}
