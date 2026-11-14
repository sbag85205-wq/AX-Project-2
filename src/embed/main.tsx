import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../components/Toast';
import { AuthProvider } from '../lib/auth';
import { supabaseConfigured } from './supabase';
import EmbedApp from './EmbedApp';
import { notifyParent, reportHeight } from './bridge';
import '../styles.css';
import './embed.css';

const root = createRoot(document.getElementById('root')!);
reportHeight();

if (!supabaseConfigured) {
  const message = '사내 문서 검색(Knowly)이 아직 연결되지 않았어요.';
  notifyParent({ type: 'knowly-embed-off', message });
  root.render(<div className="empty">{message}</div>);
} else {
  // 로그인 세션은 Knowly와 같이 브라우저에 저장된 것을 쓴다(냥대리 로그인 화면에서 로그인).
  root.render(<StrictMode><ToastProvider><AuthProvider><EmbedApp /></AuthProvider></ToastProvider></StrictMode>);
}
