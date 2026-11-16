import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { CATEGORY_MAX_LENGTH, categoryNameProblem, loadCategories, renameCategory, saveCategories } from '../../lib/categories';
import { supabase } from '../../lib/supabase';

/** 분야 관리: 문서 관리에서 고르는 분야(카테고리)를 추가·이름 수정·삭제한다. 저장하면 문서 관리에 바로 쓰인다. */
export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ from: string; name: string; error: string } | null>(null);

  const load = useCallback(async () => {
    const [{ categories, error }, { data }] = await Promise.all([
      loadCategories(),
      supabase.from('documents').select('category')
    ]);
    const next: Record<string, number> = {};
    for (const d of (data as { category: string }[] | null) ?? []) next[d.category] = (next[d.category] ?? 0) + 1;
    setCategories(categories);
    setCounts(next);
    setLoadError(error);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (next: string[], message: string) => {
    setSaving(true);
    try {
      await saveCategories(next);
      setCategories(next);
      toast(message);
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
    if (await save([...categories, value], `'${value}' 분야를 추가했어요. 문서 관리에서 바로 고를 수 있어요.`)) setName('');
  };

  const remove = async () => {
    if (!removing) return;
    const target = removing;
    if (await save(categories.filter((c) => c !== target), `'${target}' 분야를 삭제했어요.`)) setRemoving(null);
  };

  // 이름 수정: 목록의 같은 자리에서 이름만 바꾸고, 그 분야를 쓰던 문서도 새 이름으로 옮긴다.
  const rename = async () => {
    if (!renaming) return;
    const { from } = renaming, to = renaming.name.trim();
    if (to === from) return setRenaming(null);
    const problem = categoryNameProblem(to, categories.filter((c) => c !== from));
    if (problem) return setRenaming({ ...renaming, error: problem });
    setSaving(true);
    try {
      const { categories: next, moved } = await renameCategory(categories, from, to);
      setCategories(next);
      setCounts((prev) => { const copy = { ...prev }; copy[to] = (copy[to] ?? 0) + (copy[from] ?? 0); delete copy[from]; return copy; });
      setRenaming(null);
      toast(`'${from}' 분야 이름을 '${to}'(으)로 바꿨어요.${moved ? ` 문서 ${moved}개의 분야도 함께 바꿨어요.` : ''}`);
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
          <p>문서 관리에서 문서에 붙이는 분야(카테고리)를 추가하거나, 이름을 고치거나, 삭제해요. 바꾸면 문서 관리에 바로 적용돼요.</p>
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
        {loaded && categories.map((c) => (
          <div key={c} className="list-row">
            <div className="list-main">
              <div className="list-title">{c}</div>
              <div className="list-meta">문서 {counts[c] ?? 0}개</div>
            </div>
            <button type="button" className="btn btn-sm" disabled={saving}
              onClick={() => setRenaming({ from: c, name: c, error: '' })} aria-label={`${c} 분야 이름 수정`}>이름 수정</button>
            <button type="button" className="btn btn-sm btn-danger" disabled={saving || categories.length <= 1}
              title={categories.length <= 1 ? '분야는 하나 이상 있어야 해요.' : undefined}
              onClick={() => setRemoving(c)} aria-label={`${c} 분야 삭제`}>삭제</button>
          </div>
        ))}
      </section>

      {renaming && (
        <Modal
          title="분야 이름 수정"
          onClose={() => setRenaming(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setRenaming(null)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={saving || !renaming.name.trim()} onClick={rename}>{saving ? '저장 중…' : '저장'}</button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="category-rename">새 이름</label>
            <input id="category-rename" className="input" value={renaming.name} maxLength={CATEGORY_MAX_LENGTH} autoFocus
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value, error: '' })}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); rename(); } }} />
            <span className="hint">
              {(counts[renaming.from] ?? 0) > 0
                ? `이 분야를 쓰는 문서 ${counts[renaming.from]}개의 분야도 새 이름으로 함께 바뀌어요.`
                : '이 분야를 쓰는 문서는 없어요.'}
            </span>
          </div>
          {renaming.error && <div className="error-box" role="alert">{renaming.error}</div>}
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
          <p>새 문서를 올릴 때 이 분야를 더 고를 수 없게 돼요.</p>
          {used > 0 && (
            <p className="hint">이 분야를 쓰는 문서 {used}개는 지워지지 않고 분야 이름도 그대로 남아요. 문서 관리의 톱니바퀴에서 다른 분야로 바꿔 주세요.</p>
          )}
        </Modal>
      )}
    </main>
  );
}
