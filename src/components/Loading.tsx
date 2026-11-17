import '../../nyang-frontend/public/nyang-loading.css';

/**
 * 불러오는 중 표시: 옆모습 냥대리가 걸어가는 애니메이션 + 글(끝의 '...'은 저절로 움직인다).
 * 냥대리 화면(nyang-frontend/public/shared.js loadingHTML)과 같은 모양·같은 스타일 파일을 쓴다.
 */
export default function Loading({ text = '불러오는 중', compact = false }: { text?: string; compact?: boolean }) {
  return (
    <div className={`nyang-loading${compact ? ' compact' : ''}`} role="status" aria-live="polite">
      <div className="nyang-loading-track" aria-hidden="true">
        <span className="nyang-loading-walker"><span className="nyang-loading-cat" /><span className="nyang-loading-shadow" /></span>
      </div>
      <p>{text.replace(/[.…]+$/, '')}<span className="nyang-loading-dots" aria-hidden="true" /></p>
    </div>
  );
}
