import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { LoadError } from '../components/LoadError';
import { PdfViewer } from '../components/PdfViewer';
import { SheetViewer } from '../components/SheetViewer';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getDocument, listChunks, signedDocUrl, SIGNED_URL_TTL, type ChunkRow } from '../lib/db';
import { stripOverlap } from '../lib/docText';
import { docFileType, pageCountLabel, pageLabel } from '../lib/sheet';
import type { DocumentRow } from '../lib/types';

export default function DocumentView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const focusChunk = params.get('chunk');
  const { profile } = useAuth();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [missing, setMissing] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<'text' | 'original'>('text');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    let cancelled = false;
    setError('');
    setMissing(false);
    setDoc(null);
    setChunks([]);
    setFileUrl(null);
    (async () => {
      const [d, c] = await Promise.all([getDocument(id), listChunks(id)]);
      if (cancelled) return;
      if (!d) return setMissing(true);
      setDoc(d);
      setChunks(c);
      if (d.file_path) {
        // 원본 주소를 못 만들어도 텍스트는 그대로 보여준다 (원본 버튼만 빠진다)
        const url = await signedDocUrl(d.file_path, SIGNED_URL_TTL.documentView).catch((e) => {
          console.warn(e);
          return null;
        });
        if (!cancelled) setFileUrl(url);
      }
    })().catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  // 인용에서 들어왔으면 해당 조각으로 스크롤
  useEffect(() => {
    if (!focusChunk || !chunks.length || tab !== 'text') return;
    document.getElementById(`chunk-${focusChunk}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusChunk, chunks, tab]);

  const blocks = useMemo(
    () =>
      chunks.map((c, i) => ({
        ...c,
        text: i === 0 ? c.content : stripOverlap(chunks[i - 1].content, c.content),
        newPage: i === 0 || c.page_start !== chunks[i - 1].page_start
      })),
    [chunks]
  );

  const sections = useMemo(() => {
    const seen = new Set<string>();
    return blocks.filter((b) => b.section_title && !seen.has(b.section_title) && seen.add(b.section_title));
  }, [blocks]);

  const focusPage = chunks.find((c) => c.id === focusChunk)?.page_start;
  const type = docFileType(doc?.file_path);
  const hasViewer = !!fileUrl && (type === 'pdf' || type === 'sheet');

  if (missing) {
    return (
      <main className="admin-main">
        <div className="card empty">문서를 찾을 수 없어요. 삭제되었거나 검색 대상에서 제외된 문서일 수 있어요.</div>
        <Link to="/docs" className="btn" style={{ alignSelf: 'flex-start' }}>문서 목록으로</Link>
      </main>
    );
  }
  if (error) {
    return (
      <main className="admin-main">
        <LoadError message={error} onRetry={load} />
        <Link to="/docs" className="btn" style={{ alignSelf: 'flex-start' }}>문서 목록으로</Link>
      </main>
    );
  }
  if (!doc) return <div className="empty">불러오는 중…</div>;

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <Link to={profile?.role === 'admin' && doc.status !== 'ready' ? '/admin/documents' : '/docs'} className="hint">← 목록으로</Link>
          <h1 style={{ marginTop: 6 }}>{doc.title}</h1>
          <p>
            {doc.category} · {doc.version} · {pageCountLabel(doc.page_count, doc.file_path)}
            {doc.effective_from ? ` · 시행 ${doc.effective_from}` : ''}
            {doc.status !== 'ready' && <> · <span className="pill pill-new">{doc.status === 'archived' ? '검색 제외됨' : doc.status}</span></>}
          </p>
        </div>
        {fileUrl && (type === 'sheet'
          ? <a className="btn" href={`${fileUrl}&download=${encodeURIComponent(doc.file_path?.split('/').pop() ?? '')}`}>원본 파일 받기</a>
          : <a className="btn" href={fileUrl} target="_blank" rel="noreferrer">원본 파일 열기</a>)}
      </div>

      {hasViewer && (
        <div className="tabs" role="group" aria-label="보기 방식">
          <button type="button" className="tab" aria-pressed={tab === 'text'} onClick={() => setTab('text')}>텍스트</button>
          <button type="button" className="tab" aria-pressed={tab === 'original'} onClick={() => setTab('original')}>{type === 'sheet' ? '원본 표' : '원본 PDF'}</button>
        </div>
      )}

      {tab === 'original' && hasViewer && fileUrl ? (
        type === 'sheet'
          ? <SheetViewer url={fileUrl} path={doc.file_path ?? ''} sheet={focusPage ?? 1} title={doc.title} />
          : <PdfViewer url={fileUrl} page={focusPage ?? 1} title={doc.title} />
      ) : (
        <div className="doc-layout">
          {sections.length > 1 && (
            <nav className="card doc-toc" aria-label="목차">
              <div className="hint" style={{ fontWeight: 600, marginBottom: 6 }}>목차</div>
              {sections.map((s) => (
                <a key={s.id} href={`#chunk-${s.id}`} onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`chunk-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}>
                  {s.section_title}
                </a>
              ))}
            </nav>
          )}
          <article className="card doc-body">
            {blocks.length === 0 && <div className="empty">표시할 텍스트가 없어요.</div>}
            {blocks.map((b) => (
              <section key={b.id} id={`chunk-${b.id}`} className={`doc-chunk${b.id === focusChunk ? ' focused' : ''}`}>
                {b.newPage && <div className="doc-page">{pageLabel(b.page_start, b.page_end, doc.file_path)}</div>}
                <div className="doc-text">{b.text}</div>
              </section>
            ))}
          </article>
        </div>
      )}
    </main>
  );
}
