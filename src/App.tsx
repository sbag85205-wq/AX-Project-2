import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { AuthProvider, useAuth } from './lib/auth';
import { supabaseConfigured } from './lib/supabase';
import Chat from './pages/Chat';
import DocumentList from './pages/DocumentList';
import DocumentView from './pages/DocumentView';
import Login from './pages/Login';

const Admin = lazy(() => import('./pages/admin/AdminLayout'));

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
    </>
  );
}

function Routed() {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="empty">불러오는 중…</div>;
  if (!session) return <Login />;
  if (!profile) return <div className="empty">계정 정보를 찾을 수 없어요. 관리자에게 문의해 주세요.</div>;
  return (
    <Routes>
      <Route path="/" element={<Shell><Chat /></Shell>} />
      <Route path="/docs" element={<Shell><DocumentList /></Shell>} />
      <Route path="/docs/:id" element={<Shell><DocumentView /></Shell>} />
      <Route
        path="/admin/*"
        element={profile.role === 'admin'
          ? <Shell><Suspense fallback={<div className="empty">불러오는 중…</div>}><Admin /></Suspense></Shell>
          : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!supabaseConfigured) {
    return <div className="empty">VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY 환경변수를 설정해 주세요.</div>;
  }
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
    </AuthProvider>
  );
}
