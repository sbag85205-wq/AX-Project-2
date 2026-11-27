// 담당자 알림 종. 담당자로 로그인해 있는 동안 오른쪽 위(화면 밝기 버튼 옆)에 종 버튼을 두고 두 가지를 알려 준다.
// 1) 챗봇 미답변: 직원 질문에 냥대리가 답하지 못하면 '신규'로 쌓인다(FAQ로 등록할 후보). 1분마다(창으로 돌아올 때도) 개수를 센다.
//    담당자가 상태를 바꾸면(검토 중·FAQ 등록 완료·보류) 숫자가 줄어든다.
// 2) 질문 게시판: 아직 답변이 없는 글. 게시판 목록은 이미 15초마다 새로 받으므로(community-ui.js) 받은 목록으로 센다.
//    답변을 달면 숫자가 줄어든다.
// 종의 숫자는 둘을 더한 값. 종을 누르면 각각의 개수(누르면 그 화면으로)와 이번 로그인 동안 새로 들어온 기록이 보인다.
// 새로 들어오면 종이 한 번 흔들린다. 같은 숫자는 각 메뉴와 그 묶음('채팅 관리')에도 보인다.
const POLL_MS = 60_000;
const LOG_MAX = 8;
const BELL = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/></svg>';

/** 챗봇 미답변이 늘었을 때의 기록 문구. 로그인 뒤 처음 센 것(previous=null)과 줄어든 것은 기록하지 않는다('') */
export function alertText(previous, count) {
  if (previous === null || !(count > previous)) return '';
  return `챗봇 미답변에 새 질문 ${count - previous}개`;
}

/** 게시판에 전에 없던 답변 대기 글(새 글)이 생겼을 때의 기록 문구. 로그인 뒤 처음 센 것과 줄어든 것은 '' */
export function boardAlertText(previousIds, waitingIds) {
  return boardLogText(newPostIds(previousIds, waitingIds).length);
}
/** 전에 없던 답변 대기 글의 id (로그인 뒤 처음 센 것은 []) */
export const newPostIds = (previousIds, waitingIds) => previousIds === null ? [] : waitingIds.filter(id => !previousIds.has(id));
const boardLogText = n => n ? `질문 게시판에 새 질문 ${n}개` : '';

/** 게시판에서 삭제(영구삭제 포함)되어 목록에 없는 글은 '새로 들어온 것' 기록에서도 뺀다. 남은 글이 없으면 그 기록을 지운다.
 *  답변이 달린 글은 목록에 그대로 있으므로 기록도 남는다. */
export function pruneBoardLog(log, posts) {
  const present = new Set((Array.isArray(posts) ? posts : []).map(p => String(p?.id)));
  return log.flatMap(x => {
    if (!x.ids) return [x];
    const ids = x.ids.filter(id => present.has(id));
    if (!ids.length) return [];
    return ids.length === x.ids.length ? [x] : [{ ...x, ids, text: boardLogText(ids.length) }];
  });
}

/** 게시판 글 가운데 답변을 기다리는 글의 id */
export const waitingPostIds = posts => (Array.isArray(posts) ? posts : []).filter(p => p && !(p.replies?.length)).map(p => String(p.id));

/** 기록 시각: 방금 / N분 전 / 오후 3:20 */
export function agoText(at, now = Date.now()) {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  return new Date(at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function installStaffAlerts({ fetch }) {
  let active = false, timer = null, busy = false;
  let unanswered = null, boardIds = null; // null: 이번 로그인에서 아직 확인 전
  let log = []; // 이번 로그인 동안 새로 들어온 기록 [{text, at, view}]

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

  // 종 버튼: 화면 밝기 버튼 바로 앞(왼쪽)에. 담당자일 때만 보인다
  function bell() {
    let b = document.getElementById('staff-bell');
    if (b) return b;
    const theme = document.querySelector('#app .top-icons > .theme-toggle');
    if (!theme) return null;
    b = document.createElement('button');
    b.type = 'button'; b.id = 'staff-bell'; b.className = 'staff-bell'; b.hidden = true;
    b.setAttribute('popovertarget', 'staff-bell-menu'); b.dataset.glassTip = '알림';
    b.innerHTML = `${BELL}<em class="staff-bell-count" hidden></em>`;
    theme.before(b);
    return b;
  }
  function menu() {
    let m = document.getElementById('staff-bell-menu');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'staff-bell-menu'; m.className = 'staff-bell-menu'; m.setAttribute('popover', ''); m.setAttribute('aria-label', '담당자 알림');
    document.body.append(m);
    // 열 때 종 바로 아래 오른쪽 끝에 맞춘다
    m.addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return;
      renderMenu();
      const r = document.getElementById('staff-bell')?.getBoundingClientRect();
      if (r) { m.style.top = Math.round(r.bottom + 8) + 'px'; m.style.right = Math.max(8, Math.round(innerWidth - r.right)) + 'px'; }
    });
    // 항목을 누르면 그 화면으로 가고(동작은 app.js·community-ui.js가 원래대로 한다) 창은 닫는다
    m.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(() => { try { m.hidePopover(); } catch {} }, 0); });
    return m;
  }
  function renderMenu() {
    const m = document.getElementById('staff-bell-menu'); if (!m) return;
    const a = unanswered || 0, b = boardIds?.size || 0, now = Date.now();
    const row = (attrs, label, sub, count) => `<button type="button" class="sb-row" ${attrs}><span><strong>${label}</strong><small>${sub}</small></span><b class="${count ? 'on' : ''}">${count}</b></button>`;
    m.innerHTML = `<div class="sb-head"><h2>알림</h2><small>${a + b ? `확인할 질문 ${a + b}개` : '모두 확인했어요'}</small></div>`
      + row('data-action="unanswered"', '챗봇 미답변', '신규 · FAQ로 등록할 질문', a)
      + row('data-board-filter="waiting"', '질문 게시판', '답변 대기 중인 글', b)
      + `<div class="sb-log"><h3>새로 들어온 것</h3>${log.length
        ? `<ul>${log.map(x => `<li><span>${esc(x.text)}</span><time>${agoText(x.at, now)}</time></li>`).join('')}</ul>`
        : '<p>로그인한 뒤로 새로 들어온 질문이 없어요.</p>'}</div>`;
  }
  function show() {
    const a = unanswered || 0, b = boardIds?.size || 0;
    badge(slot(document.getElementById('nav-unanswered'), 'unanswered-new', false), a, '처리하지 않은 챗봇 미답변 질문');
    badge(slot(document.getElementById('nav-board'), 'board-waiting', false), b, '답변을 기다리는 게시판 질문');
    badge(slot(document.querySelector('#nav-group-chat .nav-group-toggle'), 'unanswered-new-group', true), a + b, '채팅 관리에서 확인할 질문');
    const btn = bell(); if (!btn) return;
    btn.hidden = !active;
    const n = btn.querySelector('.staff-bell-count');
    n.hidden = !(a + b); n.textContent = a + b > 99 ? '99+' : String(a + b);
    btn.setAttribute('aria-label', a + b ? `알림: 확인할 질문 ${a + b}개` : '알림: 확인할 질문 없음');
    if (active) menu();
    if (document.getElementById('staff-bell-menu')?.matches(':popover-open')) renderMenu();
  }
  // 새로 들어오면 기록에 남기고 종을 한 번 흔든다
  function arrived(text, view, ids) {
    if (!text) return;
    log = [{ text, at: Date.now(), view, ...(ids ? { ids } : {}) }, ...log].slice(0, LOG_MAX);
    const btn = document.getElementById('staff-bell'); if (!btn) return;
    btn.classList.remove('ring'); void btn.offsetWidth; btn.classList.add('ring');
  }

  async function check() {
    if (!active || busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const res = await fetch('/api/staff-alerts', { method: 'POST', body: '{}' });
      if (!res.ok || !active) return;
      const count = Number((await res.json()).unanswered) || 0;
      const text = alertText(unanswered, count);
      unanswered = count; show(); arrived(text, 'unanswered');
    } catch { /* 알림 확인 실패는 조용히 넘기고 다음 확인 때 다시 본다 */ } finally { busy = false; }
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });

  return {
    /** app.js의 render()가 부른다: 담당자 로그인 상태가 바뀔 때만 시작·정지한다 */
    sync(staff) {
      if (staff === active) return;
      active = staff; clearInterval(timer); timer = null; unanswered = null; boardIds = null; log = [];
      try { document.getElementById('staff-bell-menu')?.hidePopover(); } catch {}
      show();
      if (!staff) return;
      check(); timer = setInterval(check, POLL_MS);
    },
    /** 게시판 목록을 새로 받을 때마다 app.js가 부른다(담당자일 때만 센다) */
    board(posts) {
      if (!active || !Array.isArray(posts)) return; // 목록을 아직 못 받았으면 세지 않는다
      const ids = waitingPostIds(posts), added = newPostIds(boardIds, ids);
      log = pruneBoardLog(log, posts); // 삭제된 글의 알림 기록은 지운다
      boardIds = new Set(ids); show(); arrived(boardLogText(added.length), 'board', added);
    },
  };
}
