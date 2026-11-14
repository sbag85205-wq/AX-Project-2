// 미등록 질문 화면 오른쪽: 선택한 질문 묶음의 상세와 처리 버튼.
import { relativeDay } from '../../lib/format';
import type { GroupStatus } from '../../lib/types';
import type { GroupItem } from './useUnanswered';

export const PILL: Record<GroupStatus, string> = { 신규: 'pill-new', '검토 중': 'pill-review', 'FAQ 등록 완료': 'pill-done', 보류: 'pill-hold' };

interface Props {
  selected: GroupItem | undefined;
  onRegister: (group: GroupItem) => void;
  onSetStatus: (status: GroupStatus, message: string) => void;
}

export function GroupDetail({ selected, onRegister, onSetStatus }: Props) {
  return (
    <aside className="card panel" aria-label="선택한 질문 상세" style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!selected ? (
        <div className="empty">질문을 선택하세요.</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="hint" style={{ fontWeight: 600 }}>선택한 질문 · {selected.category}</span>
            <span className={`pill ${PILL[selected.status]}`}>{selected.status}</span>
          </div>
          <h2 style={{ fontSize: 20 }}>{selected.question}</h2>
          <div className="mini-stats">
            <div className="mini-stat"><div>총 질문</div><div>{selected.count}회</div></div>
            <div className="mini-stat"><div>이번 주</div><div>+{selected.week}</div></div>
            <div className="mini-stat"><div>최근</div><div>{relativeDay(selected.last_asked_at)}</div></div>
          </div>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>직원들은 이렇게 물어봤어요</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...selected.question_variants]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, 5)
                .map((v, i) => (
                  <li key={i} className="variant">
                    "{v.text}"
                    {v.reason === 'not_helpful' && <span className="hint"> · 도움 안 됨</span>}
                  </li>
                ))}
            </ul>
          </div>
          {selected.status === 'FAQ 등록 완료' ? (
            <div className="faq-answer-box">
              <div>등록된 FAQ 답변</div>
              <div>{selected.faqs?.answer ?? '(삭제된 FAQ)'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="btn btn-primary" style={{ minHeight: 48, fontSize: 16 }} onClick={() => onRegister(selected)}>
                FAQ로 등록하기
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                {selected.status !== '검토 중' && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => onSetStatus('검토 중', '검토 중으로 표시했어요.')}>검토 중으로 표시</button>}
                {selected.status !== '보류' && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => onSetStatus('보류', '보류로 옮겼어요.')}>보류</button>}
                {selected.status !== '신규' && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => onSetStatus('신규', '신규로 되돌렸어요.')}>신규로</button>}
              </div>
            </div>
          )}
          <div className="hint" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>질문한 직원의 이름과 아이디는 저장하지 않고 익명으로 집계해요.</div>
        </>
      )}
    </aside>
  );
}
