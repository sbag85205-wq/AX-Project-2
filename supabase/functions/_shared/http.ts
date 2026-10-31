import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.118.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function errorResponse(status: number, code: string, message: string, retryable = false): Response {
  return json({ error: { code, message, request_id: crypto.randomUUID(), retryable } }, status);
}

export function adminClient(): SupabaseClient {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SECRET_KEY') ?? '';
  return createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } });
}

export interface Caller {
  user: User;
  profile: { id: string; login_id: string; display_name: string; department_id: string | null; role: 'employee' | 'admin' };
}

/** Authorization 헤더의 사용자 토큰을 검증하고 프로필을 불러온다. 실패하면 null. */
export async function getCaller(req: Request, db: SupabaseClient): Promise<Caller | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await db.from('profiles').select('id, login_id, display_name, department_id, role').eq('id', data.user.id).single();
  if (!profile) return null;
  return { user: data.user, profile };
}
