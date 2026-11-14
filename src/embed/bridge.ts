// 냥대리(부모 창)와 주고받는 메시지. 같은 사이트에서만 주고받는다.
export type EmbedMessage =
  | { type: 'knowly-embed-height'; height: number }
  | { type: 'knowly-embed-route'; route: string }
  | { type: 'knowly-embed-off'; message: string }
  | { type: 'knowly-embed-error'; message: string; status: number };

export function notifyParent(message: EmbedMessage) {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}

/** 내용 높이를 부모에 알려 iframe이 냥대리 화면 안에서 자연스럽게 늘어나게 한다. */
export function reportHeight() {
  let last = 0;
  const send = () => {
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (Math.abs(height - last) > 2) { last = height; notifyParent({ type: 'knowly-embed-height', height }); }
  };
  new ResizeObserver(send).observe(document.body);
  window.addEventListener('load', send);
  send();
}
