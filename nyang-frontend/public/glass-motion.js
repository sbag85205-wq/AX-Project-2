// 몽글 글래스 움직임 (glass.css와 짝)
// 화면 코드(app.js)는 건드리지 않고, 이미 그려진 화면 위에 움직임만 더한다.
// 이 파일을 빼면 움직임만 사라지고 기능은 그대로다.
// - 화면이 바뀔 때: 제목이 아래에서 드러나고, 내용이 차례로 떠오른다
// - 위쪽 메뉴: 선택 표시가 고무줄처럼 늘어나며 미끄러진다
// - 배경: 마우스를 따라다니는 은은한 빛이 유리창 뒤에서 번진다
// - 주요 버튼: 마우스가 가까이 오면 살짝 끌려온다
// - 대화: 새 말풍선이 부드럽게 들어온다
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
    if (first) {
      rise(document.querySelector('.workspace-header'), 0);
      rise(document.querySelector('.workspace-toolbar'), 1);
    }
    const home = main.querySelector('.chat-home');
    if (home) {
      reveal(home.querySelector('.resident-speech h1'));
      rise(home.querySelector('.resident-speech p'), 1, 120);
      rise(home.querySelector('.resident-portrait'), 2, 120);
      [...home.querySelectorAll('.chat-home-below > *')].forEach((el, i) => rise(el, i + 3, 120));
      rise(main.querySelector('.chat-history'), 0);
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

  /* 2. 위쪽 메뉴의 선택 표시 */
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

  /* 3. 마우스를 따라다니는 빛 */
  const glow = document.createElement('div'); glow.className = 'glass-glow'; glow.setAttribute('aria-hidden', 'true');
  document.body.prepend(glow);
  const GX = S(innerWidth * .3, 60, 14), GY = S(innerHeight * .2, 60, 14);
  addEventListener('pointermove', e => { GX.t = e.clientX; GY.t = e.clientY; }, { passive: true });

  /* 4. 끌려오는 버튼 */
  const MAG = '.send-button, .primary-button, .chat-treat-button, .workspace-utilities > button';
  let magEl = null; const MX = S(0, 300, 20), MY = S(0, 300, 20);
  addEventListener('pointermove', e => {
    if (off()) return;
    const el = e.target.closest?.(MAG);
    if (el !== magEl) { if (magEl) magEl.style.translate = ''; magEl = el; MX.x = MY.x = 0; MX.v = MY.v = 0; }
    if (!el) { MX.t = MY.t = 0; return; }
    const r = el.getBoundingClientRect();
    MX.t = (e.clientX - (r.left + r.width / 2)) * .22; MY.t = (e.clientY - (r.top + r.height / 2)) * .3;
  }, { passive: true });

  /* 5. 새 말풍선 */
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

  // 화면이 다시 그려질 때마다 살핀다
  let first = true;
  const mo = new MutationObserver(() => {
    const k = keyNow();
    if (k !== viewKey) { const was = viewKey; viewKey = k; requestAnimationFrame(() => { enter(first || !was); first = false; placePill(false); }); }
    newMessages();
  });
  function start() {
    const app = document.getElementById('app'); if (!app) return;
    mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    viewKey = keyNow(); if (document.getElementById('main')) { enter(true); first = false; placePill(true); }
    // 처음 그려진 대화는 다시 움직이지 않게 표시만 해 둔다
    document.querySelectorAll('.chat-room .user-message, .chat-room .answer-content').forEach(el => { seen.add(el); el.dataset.glassSeen = '1'; });
  }
  addEventListener('resize', () => placePill(true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  let last = performance.now();
  (function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    for (let i = 0; i < 4; i++) [L, R, PY, GX, GY, MX, MY].forEach(s => step(s, dt / 4));
    if (pill && pill.isConnected) { pill.style.translate = `${L.x.toFixed(1)}px ${PY.x.toFixed(1)}px`; pill.style.width = Math.max(0, R.x - L.x).toFixed(1) + 'px'; }
    else if (document.querySelector('.workspace-nav')) placePill(true);
    glow.style.translate = `${(GX.x - 300).toFixed(1)}px ${(GY.x - 300).toFixed(1)}px`;
    glow.style.opacity = off() ? 0 : 1;
    if (magEl && magEl.isConnected) magEl.style.translate = `${MX.x.toFixed(2)}px ${MY.x.toFixed(2)}px`;
    requestAnimationFrame(frame);
  })(last);
})();
