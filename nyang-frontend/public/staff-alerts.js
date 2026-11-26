// 담당자 알림. 담당자로 로그인해 있는 동안 두 가지를 메뉴 숫자와 알림으로 알려 준다.
// 1) 챗봇 미답변: 직원 질문에 냥대리가 답하지 못하면 '신규'로 쌓인다(FAQ로 등록할 후보). 1분마다(창으로 돌아올 때도) 개수를 센다.
//    담당자가 상태를 바꾸면(검토 중·FAQ 등록 완료·보류) 숫자가 줄어든다.
// 2) 질문 게시판: 아직 답변이 없는 글. 게시판 목록은 이미 15초마다 새로 받으므로(community-ui.js) 받은 목록으로 센다.
//    답변을 달면 숫자가 줄어든다.
// 로그인했을 때 남아 있으면 한 번, 그 뒤에는 새로 들어온 것만 알린다. 숫자는 각 메뉴와 그 묶음('채팅 관리')에 보인다.
const POLL_MS = 60_000;

/** 챗봇 미답변 알림 문구: 이번 로그인에서 처음 확인했을 때는 남은 개수, 그 뒤에는 늘어난 개수만. 알릴 것이 없으면 '' */
export function alertText(previous, count) {
  if (!(count > 0)) return '';
  if (previous === null) return `확인하지 않은 챗봇 미답변 질문이 ${count}개 있어요. FAQ로 등록해 주세요.`;
  if (count > previous) return `새 챗봇 미답변 질문이 ${count - previous}개 들어왔어요. (신규 ${count}개)`;
  return '';
}

/** 게시판 알림 문구: 처음에는 답변 대기 개수, 그 뒤에는 전에 없던 답변 대기 글(새 글)만 센다. 알릴 것이 없으면 '' */
export function boardAlertText(previousIds, waitingIds) {
  if (!waitingIds.length) return '';
  if (previousIds === null) return `답변을 기다리는 게시판 질문이 ${waitingIds.length}개 있어요.`;
  const added = waitingIds.filter(id => !previousIds.has(id)).length;
  return added ? `질문 게시판에 새 질문이 ${added}개 올라왔어요. (답변 대기 ${waitingIds.length}개)` : '';
}

/** 게시판 글 가운데 답변을 기다리는 글의 id */
export const waitingPostIds = posts => (Array.isArray(posts) ? posts : []).filter(p => p && !(p.replies?.length)).map(p => String(p.id));

export function installStaffAlerts({ fetch, toast }) {
  let active = false, timer = null, busy = false;
  let unanswered = null, boardIds = null; // null: 이번 로그인에서 아직 확인 전

  // 메뉴 버튼은 다시 그려지지 않으므로 숫자 칸을 한 번만 붙인다(묶음 버튼은 오른쪽 화살표 앞에, 메뉴 버튼은 맨 뒤에)
  function slot(host, id, beforeArrow) {
    if (!host) return null;
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('span'); el.id = id; el.className = 'activity-unread staff-alert-count'; el.hidden = true; host.insertBefore(el, beforeArrow ? host.querySelector(':scope > .icon') : null); }
    return el;
  }
  function badge(el, count, label) {
    if (!el) return;
    el.hidden = !count; el.textContent = count > 99 ? '99+' : String(count || '');
    el.setAttribute('aria-label', `${label} ${count}개`);
  }
  function show() {
    const a = unanswered || 0, b = boardIds?.size || 0;
    badge(slot(document.getElementById('nav-unanswered'), 'unanswered-new', false), a, '처리하지 않은 챗봇 미답변 질문');
    badge(slot(document.getElementById('nav-board'), 'board-waiting', false), b, '답변을 기다리는 게시판 질문');
    badge(slot(document.querySelector('#nav-group-chat .nav-group-toggle'), 'unanswered-new-group', true), a + b, '채팅 관리에서 확인할 질문');
  }

  async function check() {
    if (!active || busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const res = await fetch('/api/staff-alerts', { method: 'POST', body: '{}' });
      if (!res.ok || !active) return;
      const count = Number((await res.json()).unanswered) || 0;
      const text = alertText(unanswered, count);
      unanswered = count; show();
      if (text) toast(text);
    } catch { /* 알림 확인 실패는 조용히 넘기고 다음 확인 때 다시 본다 */ } finally { busy = false; }
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });

  return {
    /** app.js의 render()가 부른다: 담당자 로그인 상태가 바뀔 때만 시작·정지한다 */
    sync(staff) {
      if (staff === active) return;
      active = staff; clearInterval(timer); timer = null; unanswered = null; boardIds = null; show();
      if (!staff) return;
      check(); timer = setInterval(check, POLL_MS);
    },
    /** 게시판 목록을 새로 받을 때마다 app.js가 부른다(담당자일 때만 센다) */
    board(posts) {
      if (!active || !Array.isArray(posts)) return; // 목록을 아직 못 받았으면 세지 않는다(받은 뒤 처음 센 것을 '로그인 때 남은 글'로 알린다)
      const ids = waitingPostIds(posts), text = boardAlertText(boardIds, ids);
      boardIds = new Set(ids); show();
      if (text) toast(text);
    },
  };
}
