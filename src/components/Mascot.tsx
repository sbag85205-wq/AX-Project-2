// Knowly 마스코트: 냥대리 프로토타입의 회색 고양이. 표정 그림만 바꿔서 상태를 보여준다.
// cat-faces.webp는 2x2 표정 칸(기본 · 눈 감음 / 찡그림 · 웃음), cat-search.webp는 바인더를 보는 모습이다.
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

export function Mascot({ size = 36, mood = 'idle', bob = false, avatar = false }: {
  size?: number; mood?: Mood; bob?: boolean; avatar?: boolean;
}) {
  return (
    <span
      className={`mascot${bob ? ' mascot-bob' : ''}${avatar ? ' mascot-avatar' : ''}`}
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
