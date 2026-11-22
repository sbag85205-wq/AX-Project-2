// 냥대리(부모 창)와 주고받는 메시지. 같은 사이트에서만 주고받는다.
export type EmbedMessage =
  | { type: 'knowly-embed-height'; height: number }
  | { type: 'knowly-embed-route'; route: string }
  | { type: 'knowly-embed-off'; message: string }
  | { type: 'knowly-embed-error'; message: string; status: number }
  | { type: 'knowly-embed-busy'; busy: boolean };

export function notifyParent(message: EmbedMessage) {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}

/** 내용 높이를 부모에 알려 iframe이 냥대리 화면 안에서 자연스럽게 늘어나게 한다. */
export function reportHeight() {
  let last = 0;
  const send = () => {
    // documentElement.scrollHeight는 iframe 자신의 높이보다 작아지지 않아, 한 번 길어지면(목록이 많을 때) 내용이 줄어도
    // 높이가 그대로 남아 아래로 빈 공간만 길게 스크롤됐다. 실제 내용(body) 높이에 위아래 여백을 더해 잰다.
    const body = document.body, cs = getComputedStyle(body);
    const height = Math.ceil(body.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom));
    if (Math.abs(height - last) > 2) { last = height; notifyParent({ type: 'knowly-embed-height', height }); }
  };
  new ResizeObserver(send).observe(document.body);
  window.addEventListener('load', send);
  send();
}
