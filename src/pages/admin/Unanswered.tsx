import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchIcon } from '../../components/Icons';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { CATEGORIES } from '../../lib/constants';
import { daysAgo, fmt, relativeDay, shortDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { GroupStatus, QuestionGroup } from '../../lib/types';

const STATUSES: ('전체' | GroupStatus)[] = ['전체', '신규', '검토 중', 'FAQ 등록 완료', '보류'];
const PILL: Record<GroupStatus, string> = { 신규: 'pill-new', '검토 중': 'pill-review', 'FAQ 등록 완료': 'pill-done', 보류: 'pill-hold' };
const COLS = '48px minmax(0, 1fr) 96px 150px 80px 124px';

type Group = QuestionGroup & { faqs: { answer: string; created_at: string } | null };

export default function Unanswered() {
  const toast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('전체');
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ question: string; answer: string; category: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('question_groups')
      .select('*, question_variants(text, reason, created_at), faqs(answer, created_at)')
      .order('last_asked_at', { ascending: false })
      .limit(500);
    if (error) toast('미등록 질문을 불러오지 못했어요.');
    setGroups((data as Group[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const weekAgo = daysAgo(7).toISOString();
  const items = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        count: g.question_variants.length,
        week: g.question_variants.filter((v) => v.created_at >= weekAgo).length
      })),
    [groups, weekAgo]
  );

  const filtered = items
    .filter((i) => status === '전체' || i.status === status)
    .filter((i) => cat === '전체' || i.category === cat)
    .filter((i) => !q.trim() || i.question.includes(q.trim()) || i.question_variants.some((v) => v.text.includes(q.trim())))
    .sort((a, b) => b.count - a.count || b.last_asked_at.localeCompare(a.last_asked_at));
  const max = Math.max(1, ...filtered.map((i) => i.count));
  const selected = items.find((i) => i.id === selectedId) ?? filtered[0];

  // 요약 지표
  const allVariants = groups.flatMap((g) => g.question_variants);
  const last30 = allVariants.filter((v) => v.created_at >= daysAgo(30).toISOString()).length;
  const prev30 = allVariants.filter((v) => v.created_at >= daysAgo(60).toISOString() && v.created_at < daysAgo(30).toISOString()).length;
  const change = prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : null;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const doneThisMonth = groups.filter((g) => g.status === 'FAQ 등록 완료' && g.faqs && g.faqs.created_at >= monthStart).length;

  // 최근 8주 추이
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = daysAgo((7 - i) * 7);
    const start = daysAgo((8 - i) * 7);
    const n = allVariants.filter((v) => v.created_at >= start.toISOString() && v.created_at < end.toISOString()).length;
    return { label: shortDate(start), n };
  });
  const wmax = Math.max(1, ...weeks.map((w) => w.n));

  const catTotals = CATEGORIES.map((c) => ({ c, n: items.filter((i) => i.category === c).reduce((a, i) => a + i.count, 0) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const cmax = Math.max(1, ...catTotals.map((x) => x.n));

  const setGroupStatus = async (s: GroupStatus, msg: string) => {
    if (!selected) return;
    const { error } = await supabase.from('question_groups').update({ status: s }).eq('id', selected.id);
    if (error) return toast('상태를 바꾸지 못했어요.');
    toast(msg);
    load();
  };

  const saveFaq = async () => {
    if (!selected || !draft || !draft.answer.trim() || !draft.question.trim()) return;
    setSaving(true);
    const { data: faq, error } = await supabase
      .from('faqs')
      .insert({ question: draft.question.trim(), answer: draft.answer.trim(), category: draft.category })
      .select('id')
      .single();
    if (!error) {
      await supabase.from('question_groups').update({ status: 'FAQ 등록 완료', faq_id: faq.id, category: draft.category }).eq('id', selected.id);
    }
    setSaving(false);
    if (error) return toast('FAQ를 등록하지 못했어요.');
    setDraft(null);
    toast('FAQ에 등록했어요. 직원 챗봇에 바로 반영돼요.');
    load();
  };

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>미등록 질문 모음</h1>
          <p>챗봇이 근거를 찾지 못했거나 직원이 '도움 안 됨'을 누른 질문을 비슷한 것끼리 묶어 보여줘요.</p>
        </div>
        <div className="hint">기준: 최근 30일 · {relativeDay(new Date().toISOString())} 기준</div>
      </div>

      <section className="stats-row" aria-label="요약">
        <div className="card stat">
          <div className="stat-label">미등록 질문 수 (30일)</div>
          <div className="stat-value">{fmt(last30)}<small>건</small></div>
          <div className="stat-sub" style={{ color: change && change > 0 ? 'var(--warn)' : undefined }}>
            {change === null ? '이전 30일 데이터 없음' : `이전 30일 대비 ${change > 0 ? '+' : ''}${change}%`}
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">질문 유형 (묶음)</div>
          <div className="stat-value">{groups.length}<small>개</small></div>
          <div className="stat-sub">비슷한 표현을 자동으로 묶음</div>
        </div>
        <div className="card stat">
          <div className="stat-label">처리 대기</div>
          <div className="stat-value" style={{ color: 'var(--warn)' }}>{groups.filter((g) => g.status === '신규' || g.status === '검토 중').length}<small>개</small></div>
          <div className="stat-sub">신규 + 검토 중</div>
        </div>
        <div className="card stat">
          <div className="stat-label">FAQ로 등록됨</div>
          <div className="stat-value" style={{ color: 'var(--ok)' }}>{doneThisMonth}<small>개</small></div>
          <div className="stat-sub">이번 달 새로 추가된 FAQ</div>
        </div>
      </section>

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
            <div role="group" aria-label="카테고리" className="chips">
              {['전체', ...CATEGORIES].map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="table-scroll">
            <div className="grid-table">
              <div className="grid-row grid-head" style={{ gridTemplateColumns: COLS }}>
                <div>순위</div><div>질문</div><div>카테고리</div><div>질문 횟수</div><div>최근</div><div>상태</div>
              </div>
              {loading && <div className="empty">불러오는 중…</div>}
              {!loading && filtered.length === 0 && <div className="empty">조건에 맞는 질문이 없어요.</div>}
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
                <div style={{ background: '#eef8f2', border: '1px solid #bfe3ce', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ok)', marginBottom: 4 }}>등록된 FAQ 답변</div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{selected.faqs?.answer ?? '(삭제된 FAQ)'}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" className="btn btn-primary" style={{ minHeight: 48, fontSize: 16 }}
                    onClick={() => setDraft({ question: selected.question, answer: '', category: CATEGORIES.includes(selected.category as never) ? selected.category : '기타' })}>
                    FAQ로 등록하기
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selected.status !== '검토 중' && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setGroupStatus('검토 중', '검토 중으로 표시했어요.')}>검토 중으로 표시</button>}
                    {selected.status !== '보류' && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setGroupStatus('보류', '보류로 옮겼어요.')}>보류</button>}
                    {selected.status !== '신규' && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setGroupStatus('신규', '신규로 되돌렸어요.')}>신규로</button>}
                  </div>
                </div>
              )}
              <div className="hint" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>질문한 직원의 이름과 아이디는 저장하지 않고 익명으로 집계해요.</div>
            </>
          )}
        </aside>
      </div>

      <div className="split">
        <section className="card panel" aria-label="주별 추이" style={{ flex: '3 1 520px', minWidth: 0 }}>
          <h2>주별 미등록 질문 수</h2>
          <p className="panel-sub">최근 8주</p>
          <div className="columns" style={{ ['--n' as string]: 8 }}>
            {weeks.map((w, i) => (
              <div key={i} className={`column${i === weeks.length - 1 ? ' latest' : ''}`}>
                <b>{w.n}</b>
                <i style={{ height: `${Math.max(2, Math.round((w.n / wmax) * 140))}px` }} />
                <span>{w.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card panel" aria-label="카테고리별 분포" style={{ flex: '2 1 340px', minWidth: 0 }}>
          <h2>카테고리별 분포</h2>
          <p className="panel-sub">어느 영역의 FAQ가 부족한지 한눈에</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {catTotals.length === 0 && <div className="hint">아직 데이터가 없어요.</div>}
            {catTotals.map((x) => (
              <div key={x.c} className="hbar">
                <span style={{ fontWeight: 500 }}>{x.c}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.round((x.n / cmax) * 100)}%` }} /></span>
                <b style={{ textAlign: 'right' }}>{x.n}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      {draft && selected && (
        <Modal
          title="FAQ로 등록하기"
          onClose={() => setDraft(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setDraft(null)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={saving || !draft.answer.trim() || !draft.question.trim()} onClick={saveFaq}>
                {saving ? '등록 중…' : '등록하기'}
              </button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="dlg-q">질문</label>
            <input id="dlg-q" className="input" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="dlg-cat">카테고리</label>
            <select id="dlg-cat" className="select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="dlg-ans">답변</label>
            <textarea id="dlg-ans" className="textarea" rows={5} placeholder="직원들이 바로 이해할 수 있게 답변을 작성해 주세요."
              value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
            <span className="hint">등록하면 직원 챗봇에 바로 반영되고, 비슷한 질문에도 이 답변이 쓰여요.</span>
          </div>
        </Modal>
      )}
    </main>
  );
}
