import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Logo } from './Mascot';

export function TopBar() {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="brand"><Logo /> Knowly</NavLink>
        <nav className="nav" aria-label="주 메뉴">
          <NavLink to="/" end>직원 챗봇</NavLink>
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
