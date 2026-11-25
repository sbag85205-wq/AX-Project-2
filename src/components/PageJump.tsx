import { useState } from 'react';

/** 문서 보기 위쪽 '페이지 바로가기': 쪽 번호를 넣고 이동하면 onJump(쪽)을 부른다(범위 밖이면 처음·끝 쪽으로 맞춘다). */
export function PageJump({ total, onJump }: { total: number; onJump: (page: number) => void }) {
  const [value, setValue] = useState('');
  if (total < 2) return null;
  return (
    <form
      className="page-jump"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number.parseInt(value, 10);
        if (!Number.isFinite(n)) return;
        const page = Math.min(total, Math.max(1, n));
        setValue(String(page));
        onJump(page);
      }}
    >
      <label htmlFor="page-jump-input">페이지</label>
      <input id="page-jump-input" className="input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={5} value={value} placeholder="쪽" onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))} />
      <span className="hint">/ {total}</span>
      <button type="submit" className="btn">이동</button>
    </form>
  );
}
