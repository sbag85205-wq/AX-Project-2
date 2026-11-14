import { CATEGORIES } from '../lib/constants';

/** 카테고리 거르기에서 "전체"를 뜻하는 값 */
export const ALL = '전체';

/** "전체" + 카테고리 칩 줄. value가 ALL이면 거르지 않는다. */
export function CategoryChips({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className="chips" role="group" aria-label="카테고리">
      {[ALL, ...CATEGORIES].map((c) => (
        <button key={c} type="button" className="chip" aria-pressed={value === c} onClick={() => onChange(c)}>{c}</button>
      ))}
    </div>
  );
}
