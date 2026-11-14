import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { BackIcon } from './Icons';
import { Logo } from './Mascot';

export function TopBar() {
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  // 앱 안에서 이동해 온 기록이 있으면 이전 화면으로, 주소로 바로 들어왔으면 위 단계 화면으로 보낸다.
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(pathname.startsWith('/docs/') ? '/docs' : '/');
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {pathname !== '/' && (
          <button type="button" className="btn btn-sm btn-ghost back-btn" onClick={goBack} aria-label="이전 화면으로 돌아가기">
            <BackIcon /> 뒤로
          </button>
        )}
        <NavLink to="/" className="brand"><Logo /> Knowly</NavLink>
        <nav className="nav" aria-label="주 메뉴">
          <NavLink to="/" end>직원 챗봇</NavLink>
          <NavLink to="/docs">문서</NavLink>
          {isAdmin && <NavLink to="/admin">관리자</NavLink>}
        </nav>
        <div className="topbar-user">
          {profile && <span className="badge">{profile.display_name}{isAdmin ? ' · 관리자' : ''}</span>}
          <button type="button" className="btn btn-sm" onClick={signOut}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}
