import { useState } from 'react';
import type { Citation, Message } from '../lib/types';
import { DocIcon, ThumbDown, ThumbUp } from './Icons';

const LABEL = {
  faq: { text: 'FAQ 답변', color: 'var(--ok)' },
  llm: { text: '문서 기반 답변', color: 'var(--primary-ink)' },
  search: { text: '관련 문서 내용', color: 'var(--primary-ink)' },
  none: { text: '등록된 답변 없음', color: 'var(--warn)' },
  partial: { text: '딱 맞는 기준 없음', color: 'var(--warn)' },
  conflict: { text: '문서 내용이 서로 달라요', color: 'var(--warn)' }
};

const pages = (c: Citation) => (c.page_start === c.page_end ? `p.${c.page_start}` : `p.${c.page_start}-${c.page_end}`);

interface Props {
  message: Message;
  onVote: (vote: 'up' | 'down' | null) => void;
  onOpenSource: (c: Citation) => void;
}

export function AnswerCard({ message, onVote, onOpenSource }: Props) {
  const [open, setOpen] = useState(false);
  const a = message.answer;
  if (!a) return <div className="bot-card">{message.content}</div>;

  const label =
    a.status === 'insufficient_evidence' ? (a.citations.length ? LABEL.partial : LABEL.none) : a.status === 'conflicting_sources' ? LABEL.conflict : LABEL[a.mode];
  const hasDetails = !!a.details && a.mode !== 'faq' && a.status !== 'insufficient_evidence';
  const vote = message.vote;

  return (
    <div className="bot-card">
      <div className="answer-label" style={{ color: label.color }}>{label.text}</div>

      {a.mode === 'faq' ? (
        <div style={{ whiteSpace: 'pre-line' }}>{a.details || a.summary.join('\n')}</div>
      ) : a.summary.length > 1 ? (
        <ul className="answer-summary">{a.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
      ) : (
        <div>{a.summary[0]}</div>
      )}

      {a.steps.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>절차</div>
          <ol className="answer-steps">{a.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}

      {/* 필수 주의사항은 접지 않는다 */}
      {a.warnings.map((w, i) => <div key={i} className="answer-warn">⚠ {w}</div>)}

      {a.status === 'insufficient_evidence' && (
        <>
          <div>{a.details}</div>
          <div className="answer-note">이 질문은 <b>익명으로</b> 관리자에게 전달되어 FAQ를 보강하는 데 쓰여요.</div>
        </>
      )}

      {hasDetails && (
        <>
          <button type="button" className="details-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? '상세 설명 접기 ▲' : '상세 설명 보기 ▼'}
          </button>
          {open && <div className="details-body">{a.details}</div>}
        </>
      )}

      {a.citations.length > 0 && (
        <div className="citations" aria-label="출처">
          {a.citations.map((c) => (
            <button type="button" key={c.source_id} className="citation" onClick={() => onOpenSource(c)}>
              <DocIcon /> <span><b>{c.document_title}</b> · {c.version} · {pages(c)}</span>
            </button>
          ))}
        </div>
      )}

      {a.status !== 'insufficient_evidence' && (
        <>
          <div className="feedback">
            <span>도움이 되었나요?</span>
            <button type="button" className="vote up" aria-pressed={vote === 'up'} aria-label="도움이 됐어요" onClick={() => onVote(vote === 'up' ? null : 'up')}>
              <ThumbUp />
            </button>
            <button type="button" className="vote down" aria-pressed={vote === 'down'} aria-label="도움이 안 됐어요" onClick={() => onVote(vote === 'down' ? null : 'down')}>
              <ThumbDown />
            </button>
          </div>
          {vote === 'down' && <div className="status-warn" role="status">의견 고마워요. 이 질문을 관리자에게 익명으로 전달해 답변을 개선할게요.</div>}
          {vote === 'up' && <div className="status-ok" role="status">도움이 되었다니 다행이에요.</div>}
        </>
      )}
    </div>
  );
}
