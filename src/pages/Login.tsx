import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';

type LoginType = 'employee' | 'admin';

const TYPES: { value: LoginType; label: string; submit: string }[] = [
  { value: 'employee', label: '직원', submit: '직원으로 로그인' },
  { value: 'admin', label: '담당자', submit: '담당자로 로그인' }
];

// 냥대리 프로토타입의 로그인 화면 구성: 상단 로고 바 · 왼쪽 고양이와 인사 · 오른쪽 직원/담당자 로그인
export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<LoginType>('employee');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(loginId, password);
      // 담당자로 들어오면 관리자 화면부터 연다 (권한이 없으면 챗봇 화면으로 돌아간다)
      navigate(type === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const current = TYPES.find((t) => t.value === type)!;

  return (
    <div className="login-shell">
      <header className="login-header">
        <img src="/cat/tilon-logo.webp" alt="Tilon" width={88} height={24} />
        <span className="login-header-name">Knowly</span>
      </header>
      <div className="login-subbar">로그인</div>

      <main className="login-page">
        <section className="login-intro">
          <Mascot size={180} bob />
          <p className="login-eyebrow">나의 업무 도우미</p>
          <h1>Knowly에 오신 걸 환영해요.</h1>
          <p>사내 규정과 매뉴얼에서 근거를 찾아 출처와 함께 알려드려요.</p>
        </section>

        <form className="login-form" onSubmit={submit}>
          <div className="login-types" role="group" aria-label="로그인 유형">
            {TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)}>{t.label}</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="login-id">아이디</label>
            <input id="login-id" className="input" autoComplete="username" placeholder={`${current.label} 아이디`}
              value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="login-pw">비밀번호</label>
            <input id="login-pw" className="input" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="login-error" role="alert">{error}</div>
          <button type="submit" className="btn btn-primary login-submit" disabled={busy}>{busy ? '확인 중…' : current.submit}</button>
          <p className="login-note">계정은 관리자가 발급해요.<br />아이디나 비밀번호를 모르면 관리자에게 문의해 주세요.</p>
        </form>
      </main>
    </div>
  );
}
