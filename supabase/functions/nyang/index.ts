import postgres from 'npm:postgres@3.4.7';
import { adminClient, corsHeaders, errorResponse, getCaller, json } from '../_shared/http.ts';
import { accountCommunity, statistics } from '../_shared/nyang/demo-account.mjs';
import { postgresDatabase } from '../_shared/nyang/postgres.mjs';

// Supabase supplies SUPABASE_DB_URL. Transaction pooling requires prepare:false.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'method', 'POST만 지원해요.');
  const auth = adminClient();
  const caller = await getCaller(req, auth);
  if (!caller) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
  try {
    const raw = await req.text();
    if (raw.length > 16000) return errorResponse(413, 'too_large', '요청이 너무 커요.');
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return errorResponse(400, 'input', '요청을 확인해 주세요.');
    const profile = caller.profile;
    const department = profile.department_id ? (await auth.from('departments').select('name').eq('id', profile.department_id).single()).data?.name : '';
    // Never trust role, username or user ID from the request body.
    const account = { id: profile.id, username: profile.login_id, name: profile.display_name, department: department || '', role: profile.role === 'admin' ? 'staff' : 'employee' };
    const result = await sql.begin(async tx => {
      // Serialize reward/membership changes, including limits and idempotent operations.
      // Small internal deployments prioritize correctness; shard the lock if usage grows.
      await tx`SELECT pg_advisory_xact_lock(78261401)`;
      const db = postgresDatabase(async (query: string, args: unknown[]) => {
        const rows = await tx.unsafe(query, args as never[]);
        return { rows: Array.from(rows), count: rows.count };
      });
      return input.action === 'stats' ? statistics(db, account) : accountCommunity(db, account, input.action ?? null, input);
    });
    return json(result);
  } catch (e) {
    const error = e as Error & { status?: number };
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error('nyang request failed', error.message);
    return errorResponse(status, 'nyang', status === 500 ? '활동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.' : error.message);
  }
});
