import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PdfViewer } from '../components/PdfViewer';
import { useAuth } from '../lib/auth';
import { stripOverlap } from '../lib/docText';
import { supabase } from '../lib/supabase';
import type { DocumentRow } from '../lib/types';

interface ChunkRow {
  id: string;
  seq: number;
  section_title: string | null;
  page_start: number;
  page_end: number;
  content: string;
}

export default function DocumentView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const focusChunk = params.get('chunk');
  const { profile } = useAuth();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [missing, setMissing] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<'text' | 'pdf'>('text');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('documents').select('*').eq('id', id).maybeSingle(),
      supabase.from('chunks').select('id, seq, section_title, page_start, page_end, content').eq('document_id', id).order('seq')
    ]).then(async ([{ data: d }, { data: c }]) => {
      if (!d) return setMissing(true);
      setDoc(d as DocumentRow);
      setChunks((c as ChunkRow[]) ?? []);
      if (d.file_path) {
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 3600);
        if (signed) setFileUrl(signed.signedUrl);
      }
    });
  }, [id]);

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
  const isPdf = !!fileUrl && !!doc?.file_path?.toLowerCase().endsWith('.pdf');

  if (missing) {
    return (
      <main className="admin-main">
        <div className="card empty">문서를 찾을 수 없어요. 삭제되었거나 검색 대상에서 제외된 문서일 수 있어요.</div>
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
            {doc.category} · {doc.version} · {doc.page_count}페이지
            {doc.effective_from ? ` · 시행 ${doc.effective_from}` : ''}
            {doc.status !== 'ready' && <> · <span className="pill pill-new">{doc.status === 'archived' ? '검색 제외됨' : doc.status}</span></>}
          </p>
        </div>
        {fileUrl && <a className="btn" href={fileUrl} target="_blank" rel="noreferrer">원본 파일 열기</a>}
      </div>

      {isPdf && (
        <div className="tabs" role="group" aria-label="보기 방식">
          <button type="button" className="tab" aria-pressed={tab === 'text'} onClick={() => setTab('text')}>텍스트</button>
          <button type="button" className="tab" aria-pressed={tab === 'pdf'} onClick={() => setTab('pdf')}>원본 PDF</button>
        </div>
      )}

      {tab === 'pdf' && isPdf && fileUrl ? (
        <PdfViewer url={fileUrl} page={focusPage ?? 1} title={doc.title} />
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
                {b.newPage && <div className="doc-page">p.{b.page_start}{b.page_end !== b.page_start ? `–${b.page_end}` : ''}</div>}
                <div className="doc-text">{b.text}</div>
              </section>
            ))}
          </article>
        </div>
      )}
    </main>
  );
}
