import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Citation } from '../lib/types';
import { Modal } from './Modal';
import { docFileType, pageLabel } from '../lib/sheet';

interface ChunkView {
  content: string;
  section_title: string | null;
  documents: { file_path: string | null; effective_from: string | null } | null;
}

/** 서버가 검증한 chunk_id로 원문 조각을 다시 불러와 보여준다 (모델이 만든 링크는 쓰지 않는다). */
export function SourceModal({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const [chunk, setChunk] = useState<ChunkView | null>(null);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('chunks')
      .select('content, section_title, documents(file_path, effective_from)')
      .eq('id', citation.chunk_id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          setError('이 출처는 더 이상 열람할 수 없어요. 문서가 교체되었거나 삭제되었을 수 있어요.');
          return;
        }
        const view = data as unknown as ChunkView;
        setChunk(view);
        if (view.documents?.file_path) {
          const { data: signed } = await supabase.storage.from('documents').createSignedUrl(view.documents.file_path, 600);
          if (signed) setFileUrl(signed.signedUrl);
        }
      });
  }, [citation]);

  const type = docFileType(chunk?.documents?.file_path);
  const pages = pageLabel(citation.page_start, citation.page_end, chunk?.documents?.file_path);
  return (
    <Modal
      title={citation.document_title}
      onClose={onClose}
      actions={
        <>
          {fileUrl && type === 'pdf' && <a className="btn" href={`${fileUrl}#page=${citation.page_start}`} target="_blank" rel="noreferrer">원본 PDF 열기</a>}
          {chunk && <Link className="btn" to={`/docs/${citation.document_id}?chunk=${citation.chunk_id}`}>문서 전체 보기</Link>}
          <button type="button" className="btn btn-primary" onClick={onClose}>닫기</button>
        </>
      }
    >
      <div className="hint">
        {citation.version} · {pages}
        {chunk?.section_title ? ` · ${chunk.section_title}` : ''}
        {chunk?.documents?.effective_from ? ` · 시행일 ${chunk.documents.effective_from}` : ''}
      </div>
      {error ? <div className="error-box">{error}</div> : <div className="source-text">{chunk ? chunk.content : '불러오는 중…'}</div>}
    </Modal>
  );
}
