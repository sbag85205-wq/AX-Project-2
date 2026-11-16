import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { GearIcon } from '../../components/Icons';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import {
  CATEGORY_MAX_LENGTH, EXAMPLE_MAX_COUNT, EXAMPLE_MAX_LENGTH, categoryNameProblem, cleanExamples, exampleProblem, examplesOf,
  loadCategories, movedList, saveCategories, saveCategorySettings, type CategoryExamples
} from '../../lib/categories';
import { supabase } from '../../lib/supabase';

interface Editing {
  from: string;
  tab: 'name' | 'examples';
  name: string;
  examples: string[];
  draft: string;
  /** 수정 중인 예시 질문 자리와 고치는 글 */
  editIndex: number | null;
  editText: string;
  error: string;
}

/**
 * 분야 관리: 문서 관리·채팅에서 고르는 분야(카테고리)를 추가·삭제·순서 변경하고,
 * 분야마다 '설정'에서 이름과 채팅 '질문 예시'에 보여 줄 예시 질문을 고친다. 저장하면 바로 쓰인다.
 */
export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [examples, setExamples] = useState<CategoryExamples>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const load = useCallback(async () => {
    const [{ categories, examples, error }, { data }] = await Promise.all([
      loadCategories(),
      supabase.from('documents').select('category')
    ]);
    const next: Record<string, number> = {};
    for (const d of (data as { category: string }[] | null) ?? []) next[d.category] = (next[d.category] ?? 0) + 1;
    setCategories(categories);
    setExamples(examples);
    setCounts(next);
    setLoadError(error);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 목록·예시를 저장하고 화면에 반영한다. 실패하면 알리고 false. */
  const save = async (next: string[], message: string, nextExamples = examples) => {
    setSaving(true);
    try {
      await saveCategories(next, nextExamples);
      setCategories(next);
      setExamples(nextExamples);
      if (message) toast(message);
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const problem = categoryNameProblem(name, categories);
    if (problem) return setError(problem);
    setError('');
    const value = name.trim();
    if (await save([...categories, value], `'${value}' 분야를 추가했어요. 문서 관리와 채팅에서 바로 고를 수 있어요.`)) setName('');
  };

  const move = (index: number, delta: -1 | 1) => save(movedList(categories, index, delta), '');

  const remove = async () => {
    if (!removing) return;
    const target = removing;
    if (await save(categories.filter((c) => c !== target), `'${target}' 분야를 삭제했어요.`)) setRemoving(null);
  };

  const openSettings = (c: string) =>
    setEditing({ from: c, tab: 'name', name: c, examples: [...examplesOf(c, examples)], draft: '', editIndex: null, editText: '', error: '' });

  // 예시 질문 칸: 새 질문 추가
  const addExample = () => {
    if (!editing) return;
    const problem = exampleProblem(editing.draft, editing.examples.map((q) => q.trim()));
    if (problem) return setEditing({ ...editing, error: problem });
    setEditing({ ...editing, examples: [...editing.examples, editing.draft.trim()], draft: '', error: '' });
  };

  // 예시 질문 '수정' → 확인: 같은 자리의 질문을 고친다 (다른 질문과 같으면 막는다)
  const applyExampleEdit = (state: Editing): Editing | null => {
    if (state.editIndex === null) return state;
    const others = state.examples.filter((_, j) => j !== state.editIndex).map((q) => q.trim());
    const problem = exampleProblem(state.editText, others);
    if (problem) { setEditing({ ...state, tab: 'examples', error: problem }); return null; }
    return { ...state, examples: state.examples.map((q, j) => (j === state.editIndex ? state.editText.trim() : q)), editIndex: null, editText: '', error: '' };
  };
  const confirmExampleEdit = () => { if (editing) { const next = applyExampleEdit(editing); if (next) setEditing(next); } };

  // 설정 저장: 이름(같은 자리에서 바뀜)과 예시 질문을 함께 저장한다. 수정 중인 예시 질문이 있으면 먼저 반영한다.
  const saveSettings = async () => {
    if (!editing) return;
    const applied = applyExampleEdit(editing);
    if (applied) await saveWith(applied);
  };
  const saveWith = async (editing: Editing) => {
    const { from } = editing, to = editing.name.trim();
    if (to !== from) {
      const problem = categoryNameProblem(to, categories.filter((c) => c !== from));
      if (problem) return setEditing({ ...editing, tab: 'name', error: problem });
    }
    if (editing.examples.some((q) => q.trim().length > EXAMPLE_MAX_LENGTH)) {
      return setEditing({ ...editing, tab: 'examples', error: `예시 질문은 ${EXAMPLE_MAX_LENGTH}자 이내로 적어 주세요.` });
    }
    setSaving(true);
    try {
      const result = await saveCategorySettings(categories, examples, from, to, cleanExamples(editing.examples));
      setCategories(result.categories);
      setExamples(result.examples);
      if (to !== from) setCounts((prev) => { const copy = { ...prev }; copy[to] = (copy[to] ?? 0) + (copy[from] ?? 0); delete copy[from]; return copy; });
      setEditing(null);
      toast(to !== from
        ? `'${from}' 분야를 '${to}'(으)로 바꾸고 설정을 저장했어요.${result.moved ? ` 문서 ${result.moved}개의 분야도 함께 바꿨어요.` : ''}`
        : `'${to}' 분야 설정을 저장했어요.`);
    } catch (e) {
      toast((e as Error).message);
      load();
    } finally {
      setSaving(false);
    }
  };

  const used = removing ? counts[removing] ?? 0 : 0;

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>분야 관리</h1>
          <p>문서 관리와 채팅에서 고르는 분야(카테고리)를 추가·삭제하고 순서를 바꿔요. 분야마다 설정에서 이름과 예시 질문을 고칠 수 있어요. 바꾸면 바로 적용돼요.</p>
        </div>
      </div>

      <form className="card panel" onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>새 분야 추가</h2>
        <div className="field">
          <label htmlFor="category-name">분야 이름</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input id="category-name" className="input" value={name} maxLength={CATEGORY_MAX_LENGTH} placeholder="예: 인사·휴가"
              onChange={(e) => { setName(e.target.value); setError(''); }} disabled={!loaded || saving} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={!loaded || saving || !name.trim()}>추가</button>
          </div>
          <span className="hint">{CATEGORY_MAX_LENGTH}자 이내 · 같은 이름은 추가할 수 없어요.</span>
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
      </form>

      <section className="card" aria-label="분야 목록" style={{ overflow: 'hidden' }}>
        {loadError && <div className="error-box" role="alert" style={{ margin: 16 }}>{loadError}</div>}
        {!loaded && <div className="empty">불러오는 중…</div>}
        {loaded && categories.map((c, i) => (
          <div key={c} className="list-row category-row">
            <div className="category-order" role="group" aria-label={`${c} 순서`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button type="button" className="btn btn-sm btn-ghost" disabled={saving || i === 0} onClick={() => move(i, -1)}
                aria-label={`${c} 위로`} title="위로" style={{ padding: '0 8px', minHeight: 22, lineHeight: 1 }}>▲</button>
              <button type="button" className="btn btn-sm btn-ghost" disabled={saving || i === categories.length - 1} onClick={() => move(i, 1)}
                aria-label={`${c} 아래로`} title="아래로" style={{ padding: '0 8px', minHeight: 22, lineHeight: 1 }}>▼</button>
            </div>
            <div className="list-main">
              <div className="list-title">{c}</div>
              <div className="list-meta">문서 {counts[c] ?? 0}개 · 예시 질문 {examplesOf(c, examples).length}개</div>
            </div>
            <button type="button" className="btn btn-sm" disabled={saving} onClick={() => openSettings(c)}
              aria-label={`${c} 분야 설정`} title="이름·예시 질문 수정"><GearIcon /> 설정</button>
            <button type="button" className="btn btn-sm btn-danger" disabled={saving || categories.length <= 1}
              title={categories.length <= 1 ? '분야는 하나 이상 있어야 해요.' : undefined}
              onClick={() => setRemoving(c)} aria-label={`${c} 분야 삭제`}>삭제</button>
          </div>
        ))}
      </section>

      {editing && (
        <Modal
          title={`'${editing.from}' 분야 설정`}
          onClose={() => setEditing(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setEditing(null)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={saving || !editing.name.trim()} onClick={saveSettings}>{saving ? '저장 중…' : '저장'}</button>
            </>
          }
        >
          <div role="tablist" aria-label="분야 설정" style={{ display: 'flex', gap: 8 }}>
            {([['name', '이름 수정'], ['examples', `예시 질문 ${editing.examples.length}`]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" className="chip" aria-selected={editing.tab === id} aria-pressed={editing.tab === id}
                onClick={() => setEditing({ ...editing, tab: id, error: '' })}>{label}</button>
            ))}
          </div>

          {editing.tab === 'name' && (
            <div className="field" role="tabpanel">
              <label htmlFor="category-rename">분야 이름</label>
              <input id="category-rename" className="input" value={editing.name} maxLength={CATEGORY_MAX_LENGTH} autoFocus
                onChange={(e) => setEditing({ ...editing, name: e.target.value, error: '' })}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); saveSettings(); } }} />
              <span className="hint">
                {(counts[editing.from] ?? 0) > 0
                  ? `이름을 바꾸면 이 분야를 쓰는 문서 ${counts[editing.from]}개의 분야도 새 이름으로 함께 바뀌어요.`
                  : '이 분야를 쓰는 문서는 없어요.'}
              </span>
            </div>
          )}

          {editing.tab === 'examples' && (
            <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="hint">채팅에서 이 분야를 고르고 '질문 예시'를 누르면 이 순서대로 보여요. 최대 {EXAMPLE_MAX_COUNT}개, {EXAMPLE_MAX_LENGTH}자 이내.</span>
              {editing.examples.length === 0 && <div className="hint">아직 예시 질문이 없어요. 아래에서 추가해 주세요.</div>}
              <ol className="category-examples" style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                {editing.examples.map((q, i) => editing.editIndex === i ? (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input" value={editing.editText} maxLength={EXAMPLE_MAX_LENGTH} aria-label={`예시 질문 ${i + 1} 고치기`} autoFocus style={{ flex: 1 }}
                      onChange={(e) => setEditing({ ...editing, editText: e.target.value, error: '' })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); confirmExampleEdit(); }
                        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing({ ...editing, editIndex: null, editText: '', error: '' }); }
                      }} />
                    <button type="button" className="btn btn-sm btn-primary" aria-label={`예시 질문 ${i + 1} 수정 확인`} disabled={!editing.editText.trim()} onClick={confirmExampleEdit}>확인</button>
                    <button type="button" className="btn btn-sm" aria-label={`예시 질문 ${i + 1} 수정 취소`}
                      onClick={() => setEditing({ ...editing, editIndex: null, editText: '', error: '' })}>취소</button>
                  </li>
                ) : (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}><span className="hint" style={{ marginRight: 8 }}>{i + 1}</span>{q}</span>
                    <button type="button" className="btn btn-sm" aria-label={`예시 질문 ${i + 1} 수정`} disabled={editing.editIndex !== null}
                      onClick={() => setEditing({ ...editing, editIndex: i, editText: q, error: '' })}>수정</button>
                    <button type="button" className="btn btn-sm btn-danger" aria-label={`예시 질문 ${i + 1} 삭제`} disabled={editing.editIndex !== null}
                      onClick={() => setEditing({ ...editing, examples: editing.examples.filter((_, j) => j !== i), error: '' })}>삭제</button>
                  </li>
                ))}
              </ol>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="category-example-new" className="input" value={editing.draft} maxLength={EXAMPLE_MAX_LENGTH} placeholder="새 예시 질문" style={{ flex: 1 }}
                  disabled={editing.examples.length >= EXAMPLE_MAX_COUNT}
                  onChange={(e) => setEditing({ ...editing, draft: e.target.value, error: '' })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addExample(); } }} />
                <button type="button" className="btn" onClick={addExample} disabled={!editing.draft.trim() || editing.examples.length >= EXAMPLE_MAX_COUNT}>추가</button>
              </div>
            </div>
          )}
          {editing.error && <div className="error-box" role="alert">{editing.error}</div>}
        </Modal>
      )}

      {removing && (
        <Modal
          title={`'${removing}' 분야를 삭제할까요?`}
          onClose={() => setRemoving(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setRemoving(null)}>취소</button>
              <button type="button" className="btn btn-danger" disabled={saving} onClick={remove}>{saving ? '삭제 중…' : '분야 삭제'}</button>
            </>
          }
        >
          <p>새 문서를 올리거나 채팅에서 질문할 때 이 분야를 더 고를 수 없게 돼요. 이 분야의 예시 질문도 함께 지워져요.</p>
          {used > 0 && (
            <p className="hint">이 분야를 쓰는 문서 {used}개는 지워지지 않고 분야 이름도 그대로 남아요. 문서 관리의 톱니바퀴에서 다른 분야로 바꿔 주세요.</p>
          )}
        </Modal>
      )}
    </main>
  );
}
