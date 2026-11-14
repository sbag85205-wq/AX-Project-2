// FAQ 추가·수정 창. FAQ 관리와 미등록 질문(FAQ로 등록하기)이 함께 쓴다.
import { CATEGORIES } from '../lib/constants';
import type { FaqDraft } from '../lib/db';
import { Modal } from './Modal';

/** 질문과 답변이 모두 있어야 저장할 수 있다 */
export const isFaqDraftValid = (d: FaqDraft) => !!d.question.trim() && !!d.answer.trim();

interface Props {
  title: string;
  draft: FaqDraft;
  onChange: (draft: FaqDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  submitLabel?: string;
  savingLabel?: string;
  /** "챗봇에서 사용" 체크 칸을 보일지 (새로 등록할 때는 항상 사용) */
  showActive?: boolean;
  answerPlaceholder?: string;
  answerHint?: string;
}

export function FaqForm({ title, draft, onChange, onSubmit, onClose, saving, submitLabel = '저장', savingLabel = '저장 중…', showActive = false, answerPlaceholder, answerHint }: Props) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="button" className="btn btn-primary" disabled={saving || !isFaqDraftValid(draft)} onClick={onSubmit}>
            {saving ? savingLabel : submitLabel}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="faq-q">질문</label>
        <input id="faq-q" className="input" value={draft.question} onChange={(e) => onChange({ ...draft, question: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="faq-cat">카테고리</label>
        <select id="faq-cat" className="select" value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="faq-a">답변</label>
        <textarea id="faq-a" className="textarea" rows={5} placeholder={answerPlaceholder} value={draft.answer} onChange={(e) => onChange({ ...draft, answer: e.target.value })} />
        {answerHint && <span className="hint">{answerHint}</span>}
      </div>
      {showActive && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={draft.active} onChange={(e) => onChange({ ...draft, active: e.target.checked })} /> 챗봇에서 사용
        </label>
      )}
    </Modal>
  );
}
