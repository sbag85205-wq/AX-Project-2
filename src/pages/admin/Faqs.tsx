import { useCallback, useEffect, useState } from 'react';
import { ALL, CategoryChips } from '../../components/CategoryChips';
import { LoadError } from '../../components/LoadError';
import { FaqForm, isFaqDraftValid } from '../../components/FaqForm';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/api';
import { CATEGORIES } from '../../lib/constants';
import { deleteFaq, listFaqs, saveFaq, type FaqDraft } from '../../lib/db';
import type { Faq } from '../../lib/types';

export default function Faqs() {
  const toast = useToast();
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [error, setError] = useState('');
  const [cat, setCat] = useState(ALL);
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setFaqs(await listFaqs());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft || !isFaqDraftValid(draft)) return;
    setSaving(true);
    try {
      await saveFaq(draft);
    } catch (e) {
      return toast(errorMessage(e));
    } finally {
      setSaving(false);
    }
    toast(draft.id ? 'FAQ를 수정했어요.' : 'FAQ를 추가했어요.');
    setDraft(null);
    load();
  };

  const remove = async (f: Faq) => {
    if (!window.confirm('이 FAQ를 삭제할까요?')) return;
    try {
      await deleteFaq(f.id);
    } catch (e) {
      return toast(errorMessage(e));
    }
    toast('FAQ를 삭제했어요.');
    load();
  };

  const shown = (faqs ?? []).filter((f) => cat === ALL || f.category === cat);

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>FAQ 관리</h1>
          <p>등록한 FAQ와 거의 같은 질문이 들어오면 문서 검색보다 먼저 이 답변을 보여줘요.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDraft({ question: '', answer: '', category: CATEGORIES[0], active: true })}>FAQ 추가</button>
      </div>
      <CategoryChips value={cat} onChange={setCat} />
      <section className="card" style={{ overflow: 'hidden' }}>
        {error && <LoadError className="empty" message={error} onRetry={load} />}
        {!error && faqs === null && <div className="empty">불러오는 중…</div>}
        {!error && faqs !== null && shown.length === 0 && <div className="empty">FAQ가 없어요.</div>}
        {shown.map((f) => (
          <div key={f.id} className="list-row">
            <div className="list-main">
              <div className="list-title">{f.question}</div>
              <div className="list-meta" style={{ whiteSpace: 'pre-line' }}>{f.answer}</div>
            </div>
            <span className="pill pill-hold">{f.category}</span>
            {!f.active && <span className="pill pill-new">숨김</span>}
            <button type="button" className="btn btn-sm" onClick={() => setDraft({ id: f.id, question: f.question, answer: f.answer, category: f.category, active: f.active })}>수정</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(f)}>삭제</button>
          </div>
        ))}
      </section>

      {draft && (
        <FaqForm
          title={draft.id ? 'FAQ 수정' : 'FAQ 추가'}
          draft={draft}
          onChange={setDraft}
          onSubmit={save}
          onClose={() => setDraft(null)}
          saving={saving}
          showActive
        />
      )}
    </main>
  );
}
