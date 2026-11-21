import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../components/Toast';
import { embedSession, EmbedError } from './session';
import { notifyParent, reportHeight } from './bridge';
import { startBusyReporting } from '../components/Loading';
import '../styles.css';
import './embed.css';
import './glass.css'; // 몽글 글래스 디자인. 이 줄을 빼면 원래 디자인으로 돌아간다

const root = createRoot(document.getElementById('root')!);
reportHeight();

embedSession()
  .then(async () => {
    // 세션을 받은 뒤에 화면 코드를 불러온다 (Supabase 클라이언트가 이 세션으로 만들어진다)
    const { default: EmbedApp } = await import('./EmbedApp');
    root.render(<StrictMode><ToastProvider><EmbedApp /></ToastProvider></StrictMode>);
    // 처음 그린 뒤 불러올 것이 없으면 바로 '준비됨'을 알린다(바깥의 걷는 냥대리가 걷힌다)
    startBusyReporting();
  })
  .catch((e: unknown) => {
    notifyParent({ type: 'knowly-embed-busy', busy: false }); // 연결 실패 안내가 보이도록 불러오는 중 표시를 걷는다
    const status = e instanceof EmbedError ? e.status : 0;
    const message = e instanceof Error ? e.message : 'Knowly에 연결하지 못했어요.';
    notifyParent(status === 503 ? { type: 'knowly-embed-off', message } : { type: 'knowly-embed-error', message, status });
    root.render(<div className="empty">{message} <a href="/" target="_top">로그인 화면으로</a></div>);
  });
