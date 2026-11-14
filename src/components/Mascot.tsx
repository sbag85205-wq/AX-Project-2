// Knowly 마스코트: 냥대리 프로토타입의 회색 고양이. 표정 그림만 바꿔서 상태를 보여준다.
// cat-faces.webp는 2x2 표정 칸(기본 · 눈 감음 / 찡그림 · 웃음), cat-search.webp는 바인더를 보는 모습이다.
import { useEffect, useRef, useState } from 'react';

type Mood = 'idle' | 'thinking' | 'happy' | 'sorry';

const FACE: Record<Exclude<Mood, 'thinking'>, string> = {
  idle: '0% 0%',
  sorry: '0% 100%',
  happy: '100% 100%'
};

const LABEL: Record<Mood, string> = {
  idle: 'Knowly 고양이',
  thinking: '문서를 찾고 있는 Knowly 고양이',
  happy: '웃고 있는 Knowly 고양이',
  sorry: '근거를 찾지 못한 Knowly 고양이'
};

// 쓰다듬으면(클릭·터치) 잠깐 웃으며 들썩이고 말풍선으로 대답한다.
const PET_LINES = ['골골골… 기분 좋다냥', '헤헤, 간지러워요', '더 쓰다듬어 주세요!', '오늘도 힘내세요 냥', '궁금한 건 뭐든 물어보라냥'];

export function Mascot({ size = 36, mood = 'idle', bob = false, avatar = false, pettable = false }: {
  size?: number; mood?: Mood; bob?: boolean; avatar?: boolean; pettable?: boolean;
}) {
  const [line, setLine] = useState<string | null>(null);
  const count = useRef(0);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pet = () => {
    setLine(PET_LINES[count.current++ % PET_LINES.length]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLine(null), 1800);
  };

  const shown: Mood = line && mood === 'idle' ? 'happy' : mood;
  const cat = <MascotFace size={size} mood={shown} bob={bob && !line} avatar={avatar} petted={!!line} />;
  if (!pettable) return cat;
  return (
    <button type="button" className="mascot-pet" onClick={pet} aria-label="냥대리 쓰다듬기">
      {cat}
      {line && <span className="pet-bubble" role="status">{line}</span>}
    </button>
  );
}

function MascotFace({ size, mood, bob, avatar, petted }: { size: number; mood: Mood; bob: boolean; avatar: boolean; petted: boolean }) {
  return (
    <span
      className={`mascot${bob ? ' mascot-bob' : ''}${avatar ? ' mascot-avatar' : ''}${petted ? ' mascot-petted' : ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={LABEL[mood]}
    >
      {mood === 'thinking'
        ? <span className="cat-frame cat-search" />
        : <span className="cat-frame" style={{ backgroundPosition: FACE[mood] }} />}
      {mood === 'idle' && <span className="cat-frame cat-blink" style={{ backgroundPosition: '100% 0%' }} />}
    </span>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return <span aria-hidden="true"><Mascot size={size} avatar /></span>;
}
