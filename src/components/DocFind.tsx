/** 문서 보기 위쪽 '문서 안에서 찾기': 찾을 말, 몇 번째/전체, 이전·다음(Enter·Shift+Enter). 찾기 자체는 부모가 한다. */
export function DocFind({ value, onChange, count, index, busy, onPrev, onNext }: {
  value: string;
  onChange: (v: string) => void;
  count: number;
  index: number;
  busy: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const term = value.trim();
  return (
    <div className="doc-find" role="search">
      <label htmlFor="doc-find-input" className="sr">문서 안에서 찾기</label>
      <input
        id="doc-find-input"
        className="input"
        type="search"
        placeholder="문서 안에서 찾기"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
          e.preventDefault();
          if (e.shiftKey) onPrev(); else onNext();
        }}
      />
      <span className="hint doc-find-count" aria-live="polite">{term ? (busy ? '찾는 중…' : count ? `${index + 1} / ${count}` : '없음') : ''}</span>
      <button type="button" className="btn" onClick={onPrev} disabled={!count} aria-label="이전 찾은 곳">이전</button>
      <button type="button" className="btn" onClick={onNext} disabled={!count} aria-label="다음 찾은 곳">다음</button>
    </div>
  );
}

/** 글자 층·본문에서 찾은 곳(mark.find-hit) 가운데 i번째를 '지금 보는 곳'으로 칠하고 화면 가운데로 옮긴다. */
export function showHit(root: ParentNode | null, i: number, fallback?: Element | null) {
  root?.querySelectorAll('mark.find-hit.current').forEach((m) => m.classList.remove('current'));
  const target = root?.querySelectorAll('mark.find-hit')[i] ?? null;
  target?.classList.add('current');
  (target ?? fallback)?.scrollIntoView({ block: 'center' });
}
