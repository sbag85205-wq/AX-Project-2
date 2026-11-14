// src/lib/supabase.ts 대신 쓰인다(vite.embed.config.ts). Knowly와 같은 Supabase 클라이언트(세션을 브라우저에 저장·자동 갱신)이고,
// 주소와 publishable key만 빌드 환경 변수 대신 냥대리 서버(/api/knowly-config)에서 받아 온다. 둘 다 공개 값이다.
import { createClient } from '@supabase/supabase-js';

const config = await fetch('/api/knowly-config', { cache: 'no-store' })
  .then((res) => (res.ok ? res.json() : null))
  .catch(() => null) as { url?: string; key?: string } | null;

const url = typeof config?.url === 'string' ? config.url : '';
const key = typeof config?.key === 'string' ? config.key : '';

export const supabaseConfigured = !!url && !!key;

export const supabase = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true }
});

/** 로그인 아이디를 Supabase Auth 이메일로 바꾼다 (관리자 발급 계정은 <아이디>@knowly.local). */
export const loginEmail = (loginId: string) =>
  loginId.includes('@') ? loginId.trim() : `${loginId.trim().toLowerCase()}@knowly.local`;
