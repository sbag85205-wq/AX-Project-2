// 냥대리 화면 안(iframe)에 넣는 Knowly 화면: 관리자 6개 화면과 사내 문서 목록·원문 보기. 화면 코드는 Knowly 것을 그대로 쓴다.
import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import DocumentList from '../pages/DocumentList';
import DocumentView from '../pages/DocumentView';
import Documents from '../pages/admin/Documents';
import Faqs from '../pages/admin/Faqs';
import Settings from '../pages/admin/Settings';
import Stats from '../pages/admin/Stats';
import Unanswered from '../pages/admin/Unanswered';
import Users from '../pages/admin/Users';
import { notifyParent } from './bridge';

function RouteReporter() {
  const location = useLocation();
  useEffect(() => { notifyParent({ type: 'knowly-embed-route', route: location.pathname + location.search }); window.scrollTo(0, 0); }, [location]);
  return null;
}

function Routed() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="empty">불러오는 중…</div>;
  if (!profile) return <div className="empty">연결된 Knowly 계정 정보를 찾을 수 없어요. 관리자에게 연결 계정을 확인해 달라고 알려 주세요.</div>;
  const admin = profile.role === 'admin';
  return (
    <>
      <RouteReporter />
      <Routes>
        <Route path="/docs" element={<DocumentList />} />
        <Route path="/docs/:id" element={<DocumentView />} />
        {admin && <Route path="/admin/unanswered" element={<Unanswered />} />}
        {admin && <Route path="/admin/stats" element={<Stats />} />}
        {admin && <Route path="/admin/documents" element={<Documents />} />}
        {admin && <Route path="/admin/faqs" element={<Faqs />} />}
        {admin && <Route path="/admin/users" element={<Users />} />}
        {admin && <Route path="/admin/settings" element={<Settings />} />}
        <Route path="*" element={admin ? <Navigate to="/admin/unanswered" replace /> : <Navigate to="/docs" replace />} />
      </Routes>
    </>
  );
}

export default function EmbedApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routed />
      </HashRouter>
    </AuthProvider>
  );
}
