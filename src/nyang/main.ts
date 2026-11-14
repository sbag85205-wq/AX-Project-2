import { request } from './transport';
(window as any).knowlyTransport = { request };
// Legacy Knowly links continue to open the real document/admin route.
if (location.pathname.startsWith('/docs') || location.pathname.startsWith('/admin')) {
  location.replace('/knowly/index.html#' + location.pathname + location.search);
} else {
  const script = document.createElement('script');
  script.type = 'module'; script.src = '/nyang/app.js'; document.body.append(script);
}
