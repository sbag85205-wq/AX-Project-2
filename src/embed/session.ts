import { supabase, supabaseConfigured } from '../lib/supabase';
export class EmbedError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export async function embedSession() {
 if (!supabaseConfigured) throw new EmbedError('Supabase 연결 설정을 확인해 주세요.', 503);
 const { data: { session } } = await supabase.auth.getSession();
 if (!session) throw new EmbedError('냥대리 화면에서 로그인해 주세요.', 401);
 return session;
}
