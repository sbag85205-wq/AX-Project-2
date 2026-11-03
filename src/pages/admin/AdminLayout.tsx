import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Documents from './Documents';
import Faqs from './Faqs';
import Settings from './Settings';
import Stats from './Stats';
import Unanswered from './Unanswered';
import Users from './Users';

const LINKS = [
  ['unanswered', '미등록 질문'],
  ['stats', '이용 통계'],
  ['documents', '문서 관리'],
  ['faqs', 'FAQ 관리'],
  ['users', '사용자 관리'],
  ['settings', '검색·모델 설정']
];

export default function AdminLayout() {
  return (
    <>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <nav className="nav" aria-label="관리자 메뉴" style={{ maxWidth: 1320, margin: '0 auto', padding: '6px 20px' }}>
          {LINKS.map(([to, label]) => <NavLink key={to} to={`/admin/${to}`}>{label}</NavLink>)}
        </nav>
      </div>
      <Routes>
        <Route index element={<Navigate to="unanswered" replace />} />
        <Route path="unanswered" element={<Unanswered />} />
        <Route path="stats" element={<Stats />} />
        <Route path="documents" element={<Documents />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </>
  );
}
