// 관리자 계정 발급: 직원 아이디·초기 비밀번호를 만들고 부서·권한을 지정한다 (회원가입은 막아 둔다)
import { adminClient, corsHeaders, errorResponse, getCaller, json } from '../_shared/http.ts';

const LOGIN_DOMAIN = Deno.env.get('LOGIN_EMAIL_DOMAIN') ?? 'knowly.local';
const LOGIN_ID = /^[a-z0-9][a-z0-9._-]{2,31}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'POST만 지원해요.');

  const db = adminClient();
  const caller = await getCaller(req, db);
  if (!caller) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
  if (caller.profile.role !== 'admin') return errorResponse(403, 'forbidden', '관리자만 사용할 수 있어요.');

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';

  switch (body.action) {
    case 'create': {
      const loginId = String(body.login_id ?? '').trim().toLowerCase();
      if (!LOGIN_ID.test(loginId)) return errorResponse(400, 'bad_login_id', '아이디는 영문 소문자·숫자·._- 3~32자로 입력해 주세요.');
      if (password.length < 8) return errorResponse(400, 'weak_password', '비밀번호는 8자 이상이어야 해요.');
      const { data, error } = await db.auth.admin.createUser({
        email: `${loginId}@${LOGIN_DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { display_name: String(body.display_name ?? '').trim() || loginId, department_id: body.department_id ?? '' }
      });
      if (error) {
        const exists = /already|registered|exists/i.test(error.message);
        return errorResponse(exists ? 409 : 400, exists ? 'duplicate' : 'create_failed', exists ? '이미 있는 아이디예요.' : error.message);
      }
      if (body.role === 'admin') await db.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
      return json({ id: data.user.id, login_id: loginId });
    }
    case 'reset_password': {
      if (password.length < 8) return errorResponse(400, 'weak_password', '비밀번호는 8자 이상이어야 해요.');
      const { error } = await db.auth.admin.updateUserById(String(body.user_id), { password });
      if (error) return errorResponse(400, 'update_failed', error.message);
      return json({ ok: true });
    }
    case 'delete': {
      if (body.user_id === caller.user.id) return errorResponse(400, 'self_delete', '본인 계정은 삭제할 수 없어요.');
      const { error } = await db.auth.admin.deleteUser(String(body.user_id));
      if (error) return errorResponse(400, 'delete_failed', error.message);
      return json({ ok: true });
    }
    default:
      return errorResponse(400, 'unknown_action', '알 수 없는 요청이에요.');
  }
});
