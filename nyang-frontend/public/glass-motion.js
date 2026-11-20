// 몽글 글래스 움직임 (glass.css와 짝)
// 화면 코드(app.js)는 건드리지 않고, 이미 그려진 화면 위에 움직임만 더한다.
// 이 파일을 빼면 움직임만 사라지고 기능은 그대로다.
// - 화면이 바뀔 때: 제목이 아래에서 드러나고, 내용이 차례로 떠오른다
// - 사이드바 메뉴: 선택 표시가 고무줄처럼 늘어나며 미끄러진다
// - 대화: 새 말풍선이 부드럽게 들어온다
// - 사이드바: 접기 버튼으로 아이콘만 보이는 줄로 접는다
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const off = () => reduce || !!document.querySelector('.motion-paused');
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const S = (x, k, c) => ({ x, v: 0, t: x, k, c });
  const step = (s, dt) => { const a = -s.k * (s.x - s.t) - s.c * s.v; s.v += a * dt; s.x += s.v * dt; };
  document.documentElement.classList.add('glass-motion');

  /* 1. 화면 등장 */
  function rise(el, i, d = 0) {
    if (!el || off()) return;
    el.animate([{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }],
      { duration: 620, delay: d + i * 60, easing: EASE, fill: 'backwards' });
  }
  function reveal(h) {
    if (!h || off()) return;
    h.animate([{ clipPath: 'inset(0 0 100% 0)', translate: '0 22px' }, { clipPath: 'inset(0 0 0 0)', translate: '0 0' }],
      { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  }
  function enter(first) {
    const main = document.getElementById('main'); if (!main || off()) return;
    if (first) rise(document.querySelector('.app-sidebar'), 0);
    const home = main.querySelector('.chat-home');
    if (home) {
      reveal(home.querySelector('.resident-speech h1'));
      rise(home.querySelector('.resident-speech p'), 1, 120);
      rise(home.querySelector('.resident-portrait'), 2, 120);
      [...home.querySelectorAll('.chat-home-below > *')].forEach((el, i) => rise(el, i + 3, 120));
      rise(document.querySelector('#sidebar-history .chat-history'), 0);
      return;
    }
    const root = main.firstElementChild; if (!root) return;
    const blocks = [...root.children].slice(0, 12);
    const title = root.querySelector('h1, h2');
    reveal(title);
    blocks.forEach((el, i) => { if (!el.contains(title)) rise(el, i, 80); });
  }
  let viewKey = '';
  function keyNow() {
    const nav = document.querySelector('.workspace-nav .active');
    const main = document.getElementById('main');
    const first = main?.firstElementChild;
    return (nav?.id || '') + '|' + (first ? first.className.split(' ').filter(c => /home|room|board|schedule|work|docs|login|account/.test(c)).join('.') : '');
  }

  /* 2. 사이드바 메뉴의 선택 표시 (세로 목록: 위아래로 미끄러진다) */
  const L = S(0, 560, 34), R = S(0, 220, 21), PY = S(0, 400, 30);
  let pill = null, navEl = null, pillReady = false;
  function placePill(instant) {
    const nav = document.querySelector('.workspace-nav'); if (!nav) return;
    if (nav !== navEl || !pill || !pill.isConnected) { navEl = nav; pill?.remove(); pill = document.createElement('span'); pill.className = 'glass-nav-pill'; pill.setAttribute('aria-hidden', 'true'); nav.prepend(pill); pillReady = false; }
    const act = nav.querySelector('.active'); if (!act) { pill.style.opacity = 0; return; }
    const n = nav.getBoundingClientRect(), b = act.getBoundingClientRect();
    const l = b.left - n.left, r = b.right - n.left;
    const goingRight = r > R.t;
    [L, R].forEach(s => { s.k = 220; s.c = 21; });
    (goingRight ? R : L).k = 560; (goingRight ? R : L).c = 34;
    L.t = l; R.t = r; PY.t = b.top - n.top;
    if (instant || !pillReady || off()) { L.x = l; R.x = r; PY.x = PY.t; L.v = R.v = 0; pillReady = true; }
    pill.style.opacity = 1; pill.style.height = b.height + 'px';
  }

  /* 3. 새 말풍선 */
  const seen = new WeakSet();
  function newMessages() {
    if (off()) return;
    document.querySelectorAll('.chat-room .user-message, .chat-room .answer-content, .chat-room .bot-message').forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      if (!el.isConnected || el.dataset.glassSeen) return; el.dataset.glassSeen = '1';
      const mine = el.classList.contains('user-message');
      el.animate([{ opacity: 0, translate: mine ? '12px 8px' : '-10px 10px', scale: .98 }, { opacity: 1, translate: '0 0', scale: 1 }],
        { duration: 520, easing: 'cubic-bezier(.34,1.4,.64,1)' });
    });
  }

  /* 4. 사이드바 접기
     접기 버튼(data-sidebar-toggle)을 누르면 아이콘만 보이는 얇은 줄로 접힌다.
     접힌 상태는 이 기기에만 기억한다(화면 밝기 설정처럼, 계정·서버에는 저장하지 않는다).
     1100px 이하에서는 저장값과 상관없이 접힌 채로 시작하고, 거기서 누른 것은 기억하지 않는다. */
  const SIDE_KEY = 'nyang-sidebar-collapsed';
  const narrow = matchMedia('(max-width: 1100px)');
  const savedCollapsed = () => { try { return localStorage.getItem(SIDE_KEY) === '1'; } catch { return false; } };
  function applySidebar(collapsed) {
    const shell = document.querySelector('.app-shell'), btn = document.querySelector('[data-sidebar-toggle]');
    if (!shell || !btn) return;
    shell.classList.toggle('sidebar-collapsed', collapsed);
    const label = collapsed ? '사이드바 펼치기' : '사이드바 접기';
    btn.setAttribute('aria-expanded', String(!collapsed)); btn.setAttribute('aria-label', label); btn.title = label;
  }
  let sideReady = false, navWatch = null;
  function initSidebar() {
    const shell = document.querySelector('.app-shell');
    if (sideReady || !shell || !document.querySelector('[data-sidebar-toggle]')) return;
    sideReady = true;
    applySidebar(narrow.matches || savedCollapsed());
    // 처음 모습은 움직임 없이 맞추고, 그 뒤부터 접고 펼칠 때만 부드럽게 바뀐다
    requestAnimationFrame(() => requestAnimationFrame(() => shell.classList.add('sidebar-ready')));
    // 사이드바 폭이 바뀌면 메뉴 선택 표시를 새 자리에 맞춘다
    navWatch = new ResizeObserver(() => placePill(true));
    const nav = document.querySelector('.workspace-nav'); if (nav) navWatch.observe(nav);
  }
  document.addEventListener('click', e => {
    if (!e.target.closest?.('[data-sidebar-toggle]')) return;
    const next = !document.querySelector('.app-shell')?.classList.contains('sidebar-collapsed');
    applySidebar(next);
    if (!narrow.matches) { try { localStorage.setItem(SIDE_KEY, next ? '1' : '0'); } catch {} }
  });
  narrow.addEventListener('change', () => { if (sideReady) applySidebar(narrow.matches || savedCollapsed()); });

  // 화면이 다시 그려질 때마다 살핀다
  let first = true;
  const mo = new MutationObserver(() => {
    initSidebar();
    const k = keyNow();
    if (k !== viewKey) { const was = viewKey; viewKey = k; requestAnimationFrame(() => { enter(first || !was); first = false; placePill(false); }); }
    newMessages();
  });
  function start() {
    const app = document.getElementById('app'); if (!app) return;
    mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    initSidebar();
    viewKey = keyNow(); if (document.getElementById('main')) { enter(true); first = false; placePill(true); }
    // 처음 그려진 대화는 다시 움직이지 않게 표시만 해 둔다
    document.querySelectorAll('.chat-room .user-message, .chat-room .answer-content').forEach(el => { seen.add(el); el.dataset.glassSeen = '1'; });
  }
  addEventListener('resize', () => placePill(true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  let last = performance.now();
  (function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    for (let i = 0; i < 4; i++) [L, R, PY].forEach(s => step(s, dt / 4));
    if (pill && pill.isConnected) { pill.style.translate = `${L.x.toFixed(1)}px ${PY.x.toFixed(1)}px`; pill.style.width = Math.max(0, R.x - L.x).toFixed(1) + 'px'; }
    else if (document.querySelector('.workspace-nav')) placePill(true);
    requestAnimationFrame(frame);
  })(last);
})();
