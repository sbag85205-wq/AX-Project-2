// 냥대리 활동 기록(포인트·출석·질문 게시판·꾸미기)과 개인 기록(내 일정·대화 기록 등)을 서버(nyang 공간)에 저장한다.
// 어느 PC로 로그인해도 같은 기록이 보이게 하기 위한 함수다. 규칙은 _shared/nyang(브라우저 저장소와 같은 코드)이 처리한다.
import postgres from 'npm:postgres@3.4.7';
import { adminClient, corsHeaders, errorResponse, json } from '../_shared/http.ts';
import { postgresDatabase } from '../_shared/nyang/postgres.mjs';
import { BODY_MAX, BODY_MAX_LARGE, handleNyang, isLargeAction, needsLock } from '../_shared/nyang/server.mjs';

// Supabase가 SUPABASE_DB_URL을 넣어 준다. 연결 풀(transaction pooling)에서도 되도록 prepare를 끈다.
// COUNT·SUM 같은 큰 정수(int8)는 규칙 코드가 더할 수 있게 숫자로 받는다.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, {
  prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10,
  types: { int8: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } }
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'method', 'POST만 지원해요.');
  // 로그인 토큰 확인: getClaims는 서명 키(JWKS)로 이 함수 안에서 확인하고, 옛 방식 키면 Auth 서버에 묻는다.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
  const auth = adminClient();
  const { data: claims, error: authError } = await auth.auth.getClaims(token);
  const userId = typeof claims?.claims?.sub === 'string' ? claims.claims.sub : '';
  if (authError || !userId) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
  try {
    const raw = await req.text();
    if (raw.length > BODY_MAX_LARGE) return errorResponse(413, 'too_large', '요청이 너무 커요.');
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return errorResponse(400, 'input', '요청을 확인해 주세요.');
    if (raw.length > BODY_MAX && !isLargeAction(input.action)) return errorResponse(413, 'too_large', '요청이 너무 커요.');
    const result = await sql.begin(async (tx) => {
      // 프로필·부서는 같은 DB 연결에서 한 번에 읽는다(API를 따로 부르지 않아 빠르다).
      // 역할·아이디·사용자 번호는 요청 본문이 아니라 여기서 읽은 프로필에서만 가져온다.
      const [profile] = await tx`SELECT p.id::text AS id, p.login_id, p.display_name, p.role, COALESCE(d.name, '') AS department
        FROM public.profiles p LEFT JOIN public.departments d ON d.id = p.department_id WHERE p.id = ${userId}::uuid`;
      if (!profile) throw Object.assign(new Error('로그인이 필요해요.'), { status: 401 });
      const account = { id: profile.id, username: profile.login_id, name: profile.display_name, department: profile.department, role: profile.role === 'admin' ? 'staff' : 'employee' };
      // 보상 한도·중복 방지가 어긋나지 않게 같은 사람의 요청은 하나씩 처리한다. 다른 사람끼리는 기다리지 않는다.
      if (needsLock(input.action)) await tx`SELECT pg_advisory_xact_lock(78261401, hashtext(${account.id}))`;
      const db = postgresDatabase(async (query: string, args: unknown[]) => {
        const rows = await tx.unsafe(query, args as never[]);
        return { rows: Array.from(rows), count: rows.count };
      });
      return handleNyang(db, account, input);
    });
    return json(result);
  } catch (e) {
    const error = e as Error & { status?: number };
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error('nyang request failed', error.message);
    if (status === 401) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
    return errorResponse(status, 'nyang', status === 500 ? '활동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.' : error.message);
  }
});
