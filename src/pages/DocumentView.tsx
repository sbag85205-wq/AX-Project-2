import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PdfViewer } from '../components/PdfViewer';
import { SheetViewer } from '../components/SheetViewer';
import { useAuth } from '../lib/auth';
import { stripOverlap } from '../lib/docText';
import { docFileType, pageCountLabel, pageLabel } from '../lib/sheet';
import { supabase } from '../lib/supabase';
import type { DocumentRow } from '../lib/types';
import Loading from '../components/Loading';

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
  // 원본 주소를 받지 못했으면(파일 없음·권한 문제) 텍스트로 보여 준다
  const [urlFailed, setUrlFailed] = useState(false);

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
        else setUrlFailed(true);
      }
    });
  }, [id]);

  // 원본이 없는 문서(텍스트 문서)에서 인용으로 들어왔으면 해당 조각으로 스크롤
  useEffect(() => {
    if (!focusChunk || !chunks.length) return;
    document.getElementById(`chunk-${focusChunk}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusChunk, chunks]);

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
  // PDF·엑셀 원본이 있으면 원본만 보여 준다(텍스트 보기 없음). 원본이 없는 문서만 텍스트로 보여 준다
  const originalOnly = !!doc?.file_path && (type === 'pdf' || type === 'sheet') && !urlFailed;
  // 내려받을 때 파일 이름: 문서 제목 + 원본 확장자
  const ext = doc?.file_path?.split('.').pop() ?? '';
  const downloadName = doc ? (doc.title.toLowerCase().endsWith(`.${ext.toLowerCase()}`) ? doc.title : `${doc.title}.${ext}`) : '';
  const downloadUrl = fileUrl ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(downloadName)}` : '';

  if (missing) {
    return (
      <main className="admin-main">
        <div className="card empty">문서를 찾을 수 없어요. 삭제되었거나 검색 대상에서 제외된 문서일 수 있어요.</div>
        <Link to="/docs" className="btn" style={{ alignSelf: 'flex-start' }}>문서 목록으로</Link>
      </main>
    );
  }
  if (!doc) return <Loading text="문서를 불러오는 중" boot />;

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
        {fileUrl && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* 다운로드: 원본 파일을 내 PC에 저장한다(원본 파일 열기 왼쪽) */}
            <a className="btn" href={downloadUrl} download={downloadName}>다운로드</a>
            {type !== 'sheet' && <a className="btn" href={fileUrl} target="_blank" rel="noreferrer">원본 파일 열기</a>}
          </div>
        )}
      </div>

      {originalOnly ? (
        !fileUrl
          ? <Loading text="원본을 불러오는 중" boot />
          : type === 'sheet'
            ? <SheetViewer url={fileUrl} path={doc.file_path ?? ''} sheet={focusPage ?? 1} title={doc.title} />
            : <PdfViewer url={fileUrl} page={focusPage} title={doc.title} />
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
