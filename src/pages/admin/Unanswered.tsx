import { useState } from 'react';
import { ALL, CategoryChips } from '../../components/CategoryChips';
import { SearchIcon } from '../../components/Icons';
import { LoadError } from '../../components/LoadError';
import { FaqForm, isFaqDraftValid } from '../../components/FaqForm';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/api';
import { CATEGORIES } from '../../lib/constants';
import { createFaqFromGroup, FaqLeftBehindError, setQuestionGroupStatus, type FaqDraft } from '../../lib/db';
import { relativeDay } from '../../lib/format';
import type { GroupStatus } from '../../lib/types';
import { GroupDetail, PILL } from './GroupDetail';
import { UnansweredKpis, UnansweredTrends } from './UnansweredPanels';
import { GROUP_LIMIT, useUnanswered } from './useUnanswered';

const STATUSES: ('전체' | GroupStatus)[] = ['전체', '신규', '검토 중', 'FAQ 등록 완료', '보류'];
const COLS = '48px minmax(0, 1fr) 96px 150px 80px 124px';

export default function Unanswered() {
  const toast = useToast();
  const { items, stats, loading, error, truncated, reload } = useUnanswered();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('전체');
  const [cat, setCat] = useState(ALL);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = items
    .filter((i) => status === '전체' || i.status === status)
    .filter((i) => cat === ALL || i.category === cat)
    .filter((i) => !q.trim() || i.question.includes(q.trim()) || i.question_variants.some((v) => v.text.includes(q.trim())))
    .sort((a, b) => b.count - a.count || b.last_asked_at.localeCompare(a.last_asked_at));
  const max = Math.max(1, ...filtered.map((i) => i.count));
  const selected = items.find((i) => i.id === selectedId) ?? filtered[0];

  const setGroupStatus = async (s: GroupStatus, msg: string) => {
    if (!selected) return;
    try {
      await setQuestionGroupStatus(selected.id, s);
    } catch (e) {
      return toast(errorMessage(e));
    }
    toast(msg);
    reload();
  };

  const saveFaq = async () => {
    if (!selected || !draft || !isFaqDraftValid(draft)) return;
    setSaving(true);
    try {
      await createFaqFromGroup(selected.id, draft);
    } catch (e) {
      if (e instanceof FaqLeftBehindError) {
        // FAQ는 이미 만들어졌으므로 등록 창을 닫아 같은 FAQ를 또 만들지 않게 한다
        setDraft(null);
        window.alert(e.message);
        reload();
      } else {
        toast(errorMessage(e));
      }
      return;
    } finally {
      setSaving(false);
    }
    setDraft(null);
    toast('FAQ에 등록했어요. 직원 챗봇에 바로 반영돼요.');
    reload();
  };

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>미등록 질문 모음</h1>
          <p>챗봇이 근거를 찾지 못했거나 직원이 '도움 안 됨'을 누른 질문을 비슷한 것끼리 묶어 보여줘요.</p>
        </div>
        <div className="hint">
          기준: 최근 30일 · {relativeDay(new Date().toISOString())} 기준
          {truncated && ` · 최근 질문 묶음 ${GROUP_LIMIT}개 기준`}
        </div>
      </div>

      <UnansweredKpis stats={stats} truncated={truncated} />

      <div className="split">
        <section className="card" aria-label="자주 묻는 미등록 질문" style={{ flex: '999 1 560px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', display: 'flex', flexDirection: 'column', gap: 14, borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h2 style={{ fontSize: 19 }}>자주 묻는 미등록 질문</h2>
              <div style={{ position: 'relative', flex: '0 1 280px' }}>
                <label htmlFor="q-search" className="sr">질문 검색</label>
                <input id="q-search" type="search" className="input" style={{ paddingLeft: 40 }} placeholder="질문 검색" value={q} onChange={(e) => setQ(e.target.value)} />
                <span style={{ position: 'absolute', left: 13, top: 13, color: 'var(--faint)' }}><SearchIcon /></span>
              </div>
            </div>
            <div role="group" aria-label="처리 상태" className="tabs">
              {STATUSES.map((s) => (
                <button key={s} type="button" className="tab" aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {s}<span>{s === '전체' ? items.length : items.filter((i) => i.status === s).length}</span>
                </button>
              ))}
            </div>
            <CategoryChips value={cat} onChange={setCat} />
          </div>
          <div className="table-scroll">
            <div className="grid-table">
              <div className="grid-row grid-head" style={{ gridTemplateColumns: COLS }}>
                <div>순위</div><div>질문</div><div>카테고리</div><div>질문 횟수</div><div>최근</div><div>상태</div>
              </div>
              {error && <LoadError className="empty" message={error} onRetry={reload} />}
              {loading && <div className="empty">불러오는 중…</div>}
              {!loading && !error && filtered.length === 0 && <div className="empty">조건에 맞는 질문이 없어요.</div>}
              {filtered.map((i, idx) => (
                <button key={i.id} type="button" className="grid-row" style={{ gridTemplateColumns: COLS }} aria-pressed={selected?.id === i.id} onClick={() => setSelectedId(i.id)}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--muted)' }}>{idx + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{i.question}</div>
                    <div className="hint">비슷한 표현 {i.count}개 · 이번 주 +{i.week}</div>
                  </div>
                  <div style={{ fontSize: 14 }}>{i.category}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ minWidth: 28 }}>{i.count}</b>
                    <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.round((i.count / max) * 100)}%` }} /></span>
                  </div>
                  <div className="hint" style={{ fontSize: 14 }}>{relativeDay(i.last_asked_at)}</div>
                  <div><span className={`pill ${PILL[i.status]}`}>{i.status}</span></div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <GroupDetail
          selected={selected}
          onRegister={(g) => setDraft({ question: g.question, answer: '', category: CATEGORIES.includes(g.category as never) ? g.category : '기타', active: true })}
          onSetStatus={setGroupStatus}
        />
      </div>

      <UnansweredTrends stats={stats} />

      {draft && selected && (
        <FaqForm
          title="FAQ로 등록하기"
          draft={draft}
          onChange={setDraft}
          onSubmit={saveFaq}
          onClose={() => setDraft(null)}
          saving={saving}
          submitLabel="등록하기"
          savingLabel="등록 중…"
          answerPlaceholder="직원들이 바로 이해할 수 있게 답변을 작성해 주세요."
          answerHint="등록하면 직원 챗봇에 바로 반영되고, 비슷한 질문에도 이 답변이 쓰여요."
        />
      )}
    </main>
  );
}
