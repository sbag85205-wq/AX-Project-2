import { useEffect } from 'react';
import { WALKING_CAT_HTML } from '../../nyang-frontend/public/shared.js';
import { notifyParent } from '../embed/bridge';
import '../../nyang-frontend/public/nyang-loading.css';

// 냥대리 화면 안에 끼워 넣은 화면(iframe)인지. 그렇다면 불러오는 중 표시는 바깥(냥대리 화면)이 하나만 보여 준다.
const embedded = typeof window !== 'undefined' && window.parent !== window;
let busyCount = 0, sent: boolean | null = null, idle: ReturnType<typeof setTimeout> | undefined;
/** 안쪽에서 불러오는 중인 곳이 있는지 바깥에 알린다. 끝났다는 신호는 아주 잠깐(0.04초) 기다렸다 보낸다(같은 순간 이어지는 불러오기에 깜빡이지 않게). */
function report() {
  clearTimeout(idle);
  if (busyCount > 0) { if (sent !== true) { sent = true; notifyParent({ type: 'knowly-embed-busy', busy: true }); } return; }
  idle = setTimeout(() => { if (busyCount === 0 && sent !== false) { sent = false; notifyParent({ type: 'knowly-embed-busy', busy: false }); } }, 40);
}
/** 끼운 화면이 처음 그려진 뒤 불러올 것이 없으면 바로 '준비됨'을 알린다(embed/main.tsx에서 한 번 부른다). */
export function startBusyReporting() { if (embedded) report(); }

/**
 * 불러오는 중 표시: 네 발로 걷는 냥대리 + 글(끝의 '...'은 저절로 움직인다).
 * 냥대리 화면(nyang-frontend/public/shared.js loadingHTML)과 같은 그림·같은 스타일 파일을 쓴다.
 * compact(작은 칸: 출처 창의 원문 한 조각 등)는 냥대리 없이 글만, 바깥 표시도 띄우지 않는다. 화면을 채우는 불러오기에는 쓰지 않는다.
 * boot(앱 시작: 로그인 확인)는 냥대리 화면 안에 끼운 화면에서 빈 자리만 남기고 바깥(냥대리 화면 가운데)에 '불러오는 중'을 알린다.
 * 그 밖의 불러오기(목록·문서·PDF 등)는 끼운 화면에서 그 자리에 냥대리를 그린다: 화면이 한 번 뜨면 바깥 표시는 사라지고 다시 덮지 않는다.
 */
export default function Loading({ text = '불러오는 중', compact = false, boot = false }: { text?: string; compact?: boolean; boot?: boolean }) {
  const quiet = embedded && boot && !compact;
  const inline = embedded && !boot && !compact;
  useEffect(() => {
    if (!quiet) return;
    busyCount++; report();
    return () => { busyCount--; report(); };
  }, [quiet]);
  const words = <>{text.replace(/[.…]+$/, '')}<span className="nyang-loading-dots" aria-hidden="true" /></>;
  if (compact) return <p className="nyang-loading-text" role="status">{words}</p>;
  if (quiet) return <div className="nyang-loading-slot" aria-hidden="true" />;
  return (
    <div className={inline ? 'nyang-loading nyang-loading-inline' : 'nyang-loading'} role="status" aria-live="polite">
      <div className="nyang-loading-track" aria-hidden="true">
        <span className="nyang-loading-walker"><span dangerouslySetInnerHTML={{ __html: WALKING_CAT_HTML }} style={{ display: 'contents' }} /><span className="nyang-loading-shadow" /></span>
      </div>
      <p>{words}</p>
    </div>
  );
}
