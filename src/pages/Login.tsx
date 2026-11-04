import { useState, type FormEvent } from 'react';
import { Mascot } from '../components/Mascot';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';

export default function Login() {
  const { signIn } = useAuth();
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
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-cat"><Mascot size={128} bob /></div>
        <div style={{ textAlign: 'center' }}>
          <h1>Knowly</h1>
          <div className="hint">사내 문서를 근거로 답하는 업무 도우미</div>
        </div>
        <div className="field">
          <label htmlFor="login-id">아이디</label>
          <input id="login-id" className="input" autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="login-pw">비밀번호</label>
          <input id="login-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button>
        <p className="hint" style={{ margin: 0 }}>계정은 관리자가 발급해요. 아이디나 비밀번호를 모르면 관리자에게 문의해 주세요.</p>
      </form>
    </main>
  );
}
