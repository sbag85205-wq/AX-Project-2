import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { getChunkView, signedDocUrl, SIGNED_URL_TTL, type ChunkView } from '../lib/db';
import { docFileType, pageLabel } from '../lib/sheet';
import type { Citation } from '../lib/types';
import { Modal } from './Modal';

/** 서버가 검증한 chunk_id로 원문 조각을 다시 불러와 보여준다 (모델이 만든 링크는 쓰지 않는다). */
export function SourceModal({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const [chunk, setChunk] = useState<ChunkView | null>(null);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setChunk(null);
    setError('');
    setFailed(false);
    setFileUrl(null);
    (async () => {
      const view = await getChunkView(citation.chunk_id);
      if (cancelled) return;
      if (!view) {
        setError('이 출처는 더 이상 열람할 수 없어요. 문서가 교체되었거나 삭제되었을 수 있어요.');
        return;
      }
      setChunk(view);
      if (view.file_path) {
        const url = await signedDocUrl(view.file_path, SIGNED_URL_TTL.sourcePreview).catch((e) => {
          console.warn(e);
          return null;
        });
        if (!cancelled) setFileUrl(url);
      }
    })().catch((e) => {
      if (cancelled) return;
      setError(errorMessage(e));
      setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [citation]);

  useEffect(() => load(), [load]);

  const type = docFileType(chunk?.file_path);
  const pages = pageLabel(citation.page_start, citation.page_end, chunk?.file_path);
  return (
    <Modal
      title={citation.document_title}
      onClose={onClose}
      actions={
        <>
          {failed && <button type="button" className="btn" onClick={load}>다시 시도</button>}
          {fileUrl && type === 'pdf' && <a className="btn" href={`${fileUrl}#page=${citation.page_start}`} target="_blank" rel="noreferrer">원본 PDF 열기</a>}
          {chunk && <Link className="btn" to={`/docs/${citation.document_id}?chunk=${citation.chunk_id}`}>문서 전체 보기</Link>}
          <button type="button" className="btn btn-primary" onClick={onClose}>닫기</button>
        </>
      }
    >
      <div className="hint">
        {citation.version} · {pages}
        {chunk?.section_title ? ` · ${chunk.section_title}` : ''}
        {chunk?.effective_from ? ` · 시행일 ${chunk.effective_from}` : ''}
      </div>
      {error ? <div className="error-box">{error}</div> : <div className="source-text">{chunk ? chunk.content : '불러오는 중…'}</div>}
    </Modal>
  );
}
