// src/lib/supabase.ts 대신 쓰인다(vite.embed.config.ts). 토큰은 냥대리 서버에서 받아 요청마다 붙인다.
import { createClient } from '@supabase/supabase-js';
import { embedSession, sessionNow } from './session';

const first = sessionNow();
if (!first) throw new Error('Knowly 세션을 먼저 불러와야 해요.');

export const supabaseConfigured = true;

export const supabase = createClient(first.url, first.key, {
  accessToken: async () => (await embedSession()).access_token,
  auth: { persistSession: false, autoRefreshToken: false }
});

export const loginEmail = (loginId: string) =>
  loginId.includes('@') ? loginId.trim() : `${loginId.trim().toLowerCase()}@knowly.local`;
