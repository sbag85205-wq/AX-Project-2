import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { GearIcon } from '../../components/Icons';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { callFunction, errorMessage } from '../../lib/api';
import { CATEGORIES } from '../../lib/constants';
import { loadCategories } from '../../lib/categories';
import { DOC_ACCEPT, extractPages, sha256 } from '../../lib/extract';
import { pageCountLabel } from '../../lib/sheet';
import { supabase } from '../../lib/supabase';
import type { DocumentRow } from '../../lib/types';

const MAX_MB = 20;
const STATUS: Record<DocumentRow['status'], [string, string]> = {
  processing: ['처리 중', 'pill-review'],
  ready: ['검색 가능', 'pill-done'],
  failed: ['실패', 'pill-fail'],
  archived: ['보관됨', 'pill-hold']
};

export default function Documents() {
  const toast = useToast();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [version, setVersion] = useState('v1');
  const [effective, setEffective] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<{ doc: DocumentRow; title: string; category: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // 분야 관리에서 정한 분야 목록. 불러오기 전에는 기본 분야를 보여준다.
  const [categories, setCategories] = useState<string[]>([...CATEGORIES]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocs((data as DocumentRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    loadCategories().then(({ categories: list }) => {
      setCategories(list);
      // 고른 분야가 삭제됐으면 첫 분야로 맞춘다
      setCategory((current) => (list.includes(current) ? current : list[0]));
    });
  }, [load]);

  // 톱니바퀴: 문서명과 카테고리만 바꾼다. 내용(조각)은 그대로라 다시 올릴 필요가 없다.
  const saveEdit = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return toast('문서명을 입력해 주세요.');
    setSaving(true);
    const { error: e } = await supabase.from('documents')
      .update({ title, category: editing.category, updated_at: new Date().toISOString() })
      .eq('id', editing.doc.id);
    setSaving(false);
    if (e) return toast('문서 정보를 바꾸지 못했어요.');
    toast('문서 정보를 바꿨어요.');
    setEditing(null);
    load();
  };

  // 끌어다 놓은 파일을 파일 입력칸에 그대로 넣어, 선택한 것과 똑같이 동작하게 한다.
  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (progress) return;
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (!DOC_ACCEPT.split(',').some((ext) => dropped.name.toLowerCase().endsWith(ext))) return setError('PDF, 엑셀(XLSX·XLS·CSV), TXT 파일만 올릴 수 있어요.');
    setError('');
    (document.getElementById('doc-file') as HTMLInputElement).files = e.dataTransfer.files;
    setFile(dropped);
  };

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`파일은 ${MAX_MB}MB 이하만 올릴 수 있어요.`);
    try {
      setProgress('텍스트 추출 중…');
      const pages = await extractPages(file);
      if (!pages.some((p) => p.text.trim())) throw new Error('텍스트를 추출하지 못했어요. 스캔 PDF는 아직 지원하지 않아요.');

      setProgress('원본 저장 중…');
      const hash = await sha256(file);
      const ext = file.name.toLowerCase().split('.').pop();
      const path = `${new Date().toISOString().slice(0, 10)}/${hash.slice(0, 16)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw new Error('원본 파일을 저장하지 못했어요.');

      setProgress(`청크 분할·인덱싱 중… (${pageCountLabel(pages.length, file.name)})`);
      const res = await callFunction<{ chunks: number; embedded: boolean }>('ingest', {
        title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
        category, version, effective_from: effective || null, file_path: path, file_hash: hash, pages
      });
      toast(`등록했어요. 청크 ${res.chunks}개${res.embedded ? ' · 임베딩 완료' : ' · 키워드 검색'}`);
      setFile(null);
      setTitle('');
      (document.getElementById('doc-file') as HTMLInputElement).value = '';
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProgress('');
      load();
    }
  };

  const setStatus = async (d: DocumentRow, status: 'ready' | 'archived') => {
    const { error: e } = await supabase.from('documents').update({ status, updated_at: new Date().toISOString() }).eq('id', d.id);
    if (e) return toast('상태를 바꾸지 못했어요.');
    toast(status === 'archived' ? '검색 대상에서 제외했어요.' : '다시 검색 대상에 넣었어요.');
    load();
  };

  const remove = async (d: DocumentRow) => {
    if (!window.confirm(`'${d.title}' 문서를 삭제할까요? 이 문서를 출처로 한 과거 답변의 원문 보기도 막혀요.`)) return;
    if (d.file_path) await supabase.storage.from('documents').remove([d.file_path]);
    const { error: e } = await supabase.from('documents').delete().eq('id', d.id);
    if (e) return toast('삭제하지 못했어요.');
    toast('문서를 삭제했어요.');
    load();
  };

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>문서 관리</h1>
        </div>
      </div>

      <form className="card panel" onSubmit={upload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2>새 문서 등록</h2>
        <div className="answer-warn">⚠ 이 데모는 외부 클라우드(Supabase·OpenRouter)를 사용해요. 실제 사내 문서는 올리지 말고 가상 문서로만 테스트해 주세요.</div>
        <div className="form-grid">
          <div className={`field dropzone${dragging ? ' dragging' : ''}`} style={{ gridColumn: '1 / -1' }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
            onDrop={drop}>
            <label htmlFor="doc-file">파일 (PDF, 엑셀 XLSX·XLS·CSV, TXT · {MAX_MB}MB 이하)</label>
            <input id="doc-file" type="file" accept={DOC_ACCEPT} className="input" style={{ paddingTop: 9 }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            <span className="hint">파일을 이 칸으로 끌어다 놓아도 돼요.</span>
          </div>
          <div className="field">
            <label htmlFor="doc-title">문서명</label>
            <input id="doc-title" className="input" placeholder="비우면 파일 이름" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="doc-cat">카테고리</label>
            <select id="doc-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="doc-ver">버전</label>
            <input id="doc-ver" className="input" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="doc-eff">시행일</label>
            <input id="doc-eff" type="date" className="input" value={effective} onChange={(e) => setEffective(e.target.value)} />
          </div>
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={!file || !!progress}>{progress ? '처리 중…' : '등록하기'}</button>
          {progress && <span className="hint" role="status">{progress}</span>}
        </div>
      </form>

      <section className="card" aria-label="문서 목록" style={{ overflow: 'hidden' }}>
        {docs.length === 0 && <div className="empty">등록된 문서가 없어요.</div>}
        {docs.map((d) => (
          <div key={d.id} className="list-row">
            <div className="list-main">
              <div className="list-title">{d.title}</div>
              <div className="list-meta">
                {d.category} · {d.version} · {pageCountLabel(d.page_count, d.file_path)}{d.effective_from ? ` · 시행 ${d.effective_from}` : ''}
                {' · '}{d.embedding_model ? `임베딩 ${d.embedding_model}` : '키워드 검색'}
              </div>
              {d.status === 'failed' && d.error && <div className="list-meta" style={{ color: 'var(--danger)' }}>원인: {d.error}</div>}
            </div>
            <span className={`pill ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span>
            {d.status !== 'processing' && <Link className="btn btn-sm" to={`/docs/${d.id}`} state={{ from: 'admin' }}>보기</Link>}
            <button type="button" className="btn btn-sm btn-ghost doc-settings" onClick={() => setEditing({ doc: d, title: d.title, category: d.category })} aria-label={`${d.title} 문서명·카테고리 수정`} title="문서명·카테고리 수정"><GearIcon /></button>
            {d.status === 'ready' && <button type="button" className="btn btn-sm" onClick={() => setStatus(d, 'archived')}>검색 제외</button>}
            {d.status === 'archived' && <button type="button" className="btn btn-sm" onClick={() => setStatus(d, 'ready')}>다시 사용</button>}
            <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(d)}>삭제</button>
          </div>
        ))}
      </section>

      {editing && (
        <Modal
          title="문서 정보 수정"
          onClose={() => setEditing(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setEditing(null)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={saving || !editing.title.trim()} onClick={saveEdit}>{saving ? '저장 중…' : '저장'}</button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="edit-title">문서명</label>
            <input id="edit-title" className="input" value={editing.title} maxLength={200} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="edit-cat">카테고리</label>
            <select id="edit-cat" className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              {!categories.includes(editing.doc.category) && <option value={editing.doc.category}>{editing.doc.category} (이전 분류)</option>}
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="hint">채팅에서 고른 분야와 카테고리가 같은 문서를 먼저 찾아요. 파일 내용은 그대로라 다시 올릴 필요가 없어요.</span>
          </div>
        </Modal>
      )}
    </main>
  );
}
