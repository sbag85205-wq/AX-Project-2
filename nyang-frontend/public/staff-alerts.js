// 담당자 알림: 직원 질문에 냥대리가 답하지 못하면 '챗봇 미답변'에 '신규'로 쌓인다(FAQ로 등록할 후보).
// 담당자로 로그인해 있는 동안 신규 개수를 1분마다 확인해 '챗봇 미답변' 메뉴와 그 묶음('채팅 관리')에 숫자로 보여 주고,
// 로그인했을 때 남아 있거나 새로 들어오면 알림을 띄운다. 담당자가 상태를 바꾸면(검토 중·FAQ 등록 완료·보류) 숫자가 줄어든다.
const POLL_MS = 60_000;

/** 알림 문구: 이번 로그인에서 처음 확인했을 때는 남은 개수, 그 뒤에는 늘어난 개수만 알린다. 알릴 것이 없으면 '' */
export function alertText(previous, count) {
  if (!(count > 0)) return '';
  if (previous === null) return `확인하지 않은 챗봇 미답변 질문이 ${count}개 있어요. FAQ로 등록해 주세요.`;
  if (count > previous) return `새 챗봇 미답변 질문이 ${count - previous}개 들어왔어요. (신규 ${count}개)`;
  return '';
}

export function installStaffAlerts({ fetch, toast }) {
  let active = false, timer = null, last = null, busy = false;

  function badge(el, count) {
    if (!el) return;
    el.hidden = !count; el.textContent = count > 99 ? '99+' : String(count || '');
    el.setAttribute('aria-label', `처리하지 않은 챗봇 미답변 질문 ${count}개`);
  }
  // 메뉴 버튼은 다시 그려지지 않으므로 숫자 칸을 한 번만 붙인다
  function slots() {
    const nav = document.getElementById('nav-unanswered'), group = document.querySelector('#nav-group-chat .nav-group-toggle');
    const make = (host, id, beforeArrow) => {
      if (!host) return null;
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('span'); el.id = id; el.className = 'activity-unread staff-alert-count'; el.hidden = true; host.insertBefore(el, beforeArrow ? host.querySelector(':scope > .icon') : null); } // 묶음 버튼은 오른쪽 화살표 앞에, 메뉴 버튼은 맨 뒤에
      return el;
    };
    return [make(nav, 'unanswered-new', false), make(group, 'unanswered-new-group', true)];
  }
  function show(count) { for (const el of slots()) badge(el, count); }

  async function check() {
    if (!active || busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const res = await fetch('/api/staff-alerts', { method: 'POST', body: '{}' });
      if (!res.ok || !active) return;
      const count = Number((await res.json()).unanswered) || 0;
      const text = alertText(last, count);
      last = count; show(count);
      if (text) toast(text);
    } catch { /* 알림 확인 실패는 조용히 넘기고 다음 확인 때 다시 본다 */ } finally { busy = false; }
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });

  /** app.js의 render()가 부른다: 담당자 로그인 상태가 바뀔 때만 시작·정지한다 */
  return function syncStaffAlerts(staff) {
    if (staff === active) return;
    active = staff; clearInterval(timer); timer = null; last = null; show(0);
    if (!staff) return;
    check(); timer = setInterval(check, POLL_MS);
  };
}
