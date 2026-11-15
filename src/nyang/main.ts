import { request } from './transport';
(window as any).knowlyTransport = { request };
// Legacy Knowly links continue to open the real document/admin route.
if (location.pathname.startsWith('/docs') || location.pathname.startsWith('/admin')) {
  location.replace('/knowly/index.html#' + location.pathname + location.search);
} else {
  // scripts/prepare-nyang.mjs가 index.html에 내용 해시가 붙은 app.js 주소를 적어 둔다(새 배포 뒤 예전 app.js를 쓰지 않도록).
  const app = document.querySelector<HTMLMetaElement>('meta[name="nyang-app"]')?.content || '/nyang/app.js';
  const script = document.createElement('script');
  script.type = 'module'; script.src = app; document.body.append(script);
}
