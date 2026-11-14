// 냥대리 안에서 Knowly 화면을 띄울 때: 냥대리 로그인 세션으로 서버(/api/knowly-session)에서
// 짧은 Knowly 접속 토큰을 받아 쓴다. 비밀번호·갱신 토큰은 브라우저로 오지 않는다.
export interface EmbedSession {
  url: string;
  key: string;
  access_token: string;
  expires_at: number;
  user_id: string | null;
}

export class EmbedError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let current: EmbedSession | null = null;
let pending: Promise<EmbedSession> | null = null;

async function request(): Promise<EmbedSession> {
  const res = await fetch('/api/knowly-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new EmbedError(data?.error ?? 'Knowly에 연결하지 못했어요.', res.status);
  return data as EmbedSession;
}

/** 만료 1분 전부터 새 토큰을 받는다. */
export async function embedSession(): Promise<EmbedSession> {
  if (current && current.expires_at - Date.now() > 60_000) return current;
  pending ??= request().then((s) => (current = s)).finally(() => { pending = null; });
  return pending;
}

export const sessionNow = () => current;
