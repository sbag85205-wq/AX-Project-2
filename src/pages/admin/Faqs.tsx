import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { CATEGORIES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import type { Faq } from '../../lib/types';

type Draft = { id?: string; question: string; answer: string; category: string; active: boolean };

export default function Faqs() {
  const toast = useToast();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [cat, setCat] = useState('전체');
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('faqs').select('*').order('updated_at', { ascending: false });
    setFaqs((data as Faq[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft || !draft.question.trim() || !draft.answer.trim()) return;
    const row = { question: draft.question.trim(), answer: draft.answer.trim(), category: draft.category, active: draft.active, updated_at: new Date().toISOString() };
    const { error } = draft.id ? await supabase.from('faqs').update(row).eq('id', draft.id) : await supabase.from('faqs').insert(row);
    if (error) return toast('저장하지 못했어요.');
    toast(draft.id ? 'FAQ를 수정했어요.' : 'FAQ를 추가했어요.');
    setDraft(null);
    load();
  };

  const remove = async (f: Faq) => {
    if (!window.confirm('이 FAQ를 삭제할까요?')) return;
    const { error } = await supabase.from('faqs').delete().eq('id', f.id);
    if (error) return toast('삭제하지 못했어요.');
    toast('FAQ를 삭제했어요.');
    load();
  };

  const shown = faqs.filter((f) => cat === '전체' || f.category === cat);

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>FAQ 관리</h1>
          <p>등록한 FAQ와 거의 같은 질문이 들어오면 문서 검색보다 먼저 이 답변을 보여줘요.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDraft({ question: '', answer: '', category: CATEGORIES[0], active: true })}>FAQ 추가</button>
      </div>
      <div className="chips" role="group" aria-label="카테고리">
        {['전체', ...CATEGORIES].map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <section className="card" style={{ overflow: 'hidden' }}>
        {shown.length === 0 && <div className="empty">FAQ가 없어요.</div>}
        {shown.map((f) => (
          <div key={f.id} className="list-row">
            <div className="list-main">
              <div className="list-title">{f.question}</div>
              <div className="list-meta" style={{ whiteSpace: 'pre-line' }}>{f.answer}</div>
            </div>
            <span className="pill pill-hold">{f.category}</span>
            {!f.active && <span className="pill pill-new">숨김</span>}
            <button type="button" className="btn btn-sm" onClick={() => setDraft({ ...f })}>수정</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(f)}>삭제</button>
          </div>
        ))}
      </section>

      {draft && (
        <Modal
          title={draft.id ? 'FAQ 수정' : 'FAQ 추가'}
          onClose={() => setDraft(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setDraft(null)}>취소</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!draft.question.trim() || !draft.answer.trim()}>저장</button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="faq-q">질문</label>
            <input id="faq-q" className="input" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="faq-cat">카테고리</label>
            <select id="faq-cat" className="select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="faq-a">답변</label>
            <textarea id="faq-a" className="textarea" rows={5} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> 챗봇에서 사용
          </label>
        </Modal>
      )}
    </main>
  );
}
