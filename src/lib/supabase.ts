import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = !!url && !!key;

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true }
});

/** 로그인 아이디를 Supabase Auth 이메일로 바꾼다 (관리자 발급 계정은 <아이디>@knowly.local). */
export const loginEmail = (loginId: string) =>
  loginId.includes('@') ? loginId.trim() : `${loginId.trim().toLowerCase()}@${import.meta.env.VITE_LOGIN_EMAIL_DOMAIN ?? 'knowly.local'}`;
