import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../components/Toast';
import { embedSession, EmbedError } from './session';
import { notifyParent, reportHeight } from './bridge';
import '../styles.css';
import './embed.css';

const root = createRoot(document.getElementById('root')!);
reportHeight();

embedSession()
  .then(async () => {
    // 세션을 받은 뒤에 화면 코드를 불러온다 (Supabase 클라이언트가 이 세션으로 만들어진다)
    const { default: EmbedApp } = await import('./EmbedApp');
    root.render(<StrictMode><ToastProvider><EmbedApp /></ToastProvider></StrictMode>);
  })
  .catch((e: unknown) => {
    const status = e instanceof EmbedError ? e.status : 0;
    const message = e instanceof Error ? e.message : 'Knowly에 연결하지 못했어요.';
    notifyParent(status === 503 ? { type: 'knowly-embed-off', message } : { type: 'knowly-embed-error', message, status });
    root.render(<div className="empty">{message} <a href="/" target="_top">로그인 화면으로</a></div>);
  });
