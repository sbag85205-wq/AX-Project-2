// Knowly 마스코트: 문서를 찾아주는 고양이. 표정만 바꿔서 상태를 보여준다.
type Mood = 'idle' | 'thinking' | 'happy' | 'sorry';

export function Mascot({ size = 36, mood = 'idle', bob = false }: { size?: number; mood?: Mood; bob?: boolean }) {
  const eyes =
    mood === 'happy' ? (
      <g stroke="#16191F" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M15 27q3-3.5 6 0" />
        <path d="M29 27q3-3.5 6 0" />
      </g>
    ) : mood === 'thinking' ? (
      <g fill="#16191F">
        <circle cx="19" cy="25" r="2.4" />
        <circle cx="33" cy="25" r="2.4" />
      </g>
    ) : (
      <g fill="#16191F">
        <ellipse cx="18" cy="27" rx="2.4" ry={mood === 'sorry' ? 1.6 : 3} />
        <ellipse cx="32" cy="27" rx="2.4" ry={mood === 'sorry' ? 1.6 : 3} />
      </g>
    );
  const mouth = mood === 'sorry' ? 'M22 35q3-2 6 0' : 'M22 33q3 3 6 0';
  return (
    <svg className={`mascot${bob ? ' mascot-bob' : ''}`} width={size} height={size} viewBox="0 0 50 50" role="img" aria-label="Knowly 고양이">
      <circle cx="25" cy="25" r="25" fill="#EAEFFD" />
      <path d="M9 22 11 6l11 9M41 22 39 6l-11 9" fill="#2348C9" />
      <path d="M12.5 11.5 13.5 17 17 14z M37.5 11.5 36.5 17 33 14z" fill="#A9BBF2" />
      <ellipse cx="25" cy="28" rx="17" ry="15" fill="#2348C9" />
      <ellipse cx="25" cy="30" rx="13.5" ry="11.5" fill="#FFFFFF" />
      {eyes}
      <path d="M23.5 30.5h3l-1.5 1.6z" fill="#F29BA8" />
      <path d={mouth} stroke="#16191F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {mood === 'happy' && (
        <g fill="#F7C1CA">
          <ellipse cx="15" cy="32" rx="2.6" ry="1.6" />
          <ellipse cx="35" cy="32" rx="2.6" ry="1.6" />
        </g>
      )}
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#2348C9" />
      <path d="M10 13.5h16M10 18h11M10 22.5h7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
