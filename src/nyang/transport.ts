import { loginEmail, supabase, supabaseConfigured } from '../lib/supabase';
import { callFunction, type AskResult } from '../lib/api';
import { localNyang, type NyangAccount } from './local-store';

// 냥대리 활동(포인트·출석·게시판)은 운영 DB 대신 이 브라우저에 저장한다(local-store.ts).
// 계정·역할은 요청 본문이 아니라 로그인한 Knowly 프로필에서 가져온다(원래 nyang 서버 함수와 같은 규칙).
let cached: NyangAccount | null = null;
async function currentAccount(userId: string): Promise<NyangAccount> {
  if (cached?.id === userId) return cached;
  const { data: p } = await supabase.from('profiles').select('id, login_id, display_name, role, department_id').eq('id', userId).single();
  if (!p) throw new Error('계정 정보를 찾을 수 없어요. 관리자에게 문의해 주세요.');
  let department = '';
  if (p.department_id) department = (await supabase.from('departments').select('name').eq('id', p.department_id).single()).data?.name ?? '';
  cached = { id: userId, username: p.login_id, name: p.display_name, department, role: p.role === 'admin' ? 'staff' : 'employee' };
  return cached;
}

// Explicit transport, shared by the original vanilla frontend modules. Never patch global fetch.
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    if (!supabaseConfigured) throw new Error('VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 설정해 주세요.');
    let input = typeof init.body === 'string' ? JSON.parse(init.body) : {};
    if (input.action === 'logout') {
      cached = null;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return Response.json({ authenticated: false, member: false });
    }
    if (input.action === 'login') {
      cached = null;
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(input.username), password: input.password });
      if (error) throw new Error('아이디 또는 비밀번호를 확인해 주세요.');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (!profile || (profile.role === 'admin' ? 'staff' : 'employee') !== input.role) {
        await supabase.auth.signOut();
        throw new Error('계정 유형을 확인하고 직원 또는 담당자 탭에서 로그인해 주세요.');
      }
      input = { action: null };
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return Response.json({ authenticated: false, member: false }, { status: path.startsWith('/api/account') && !input.action ? 200 : 401 });
    if (path === '/api/knowly-session') return Response.json({ connected: true });
    if (path === '/api/knowly') {
      if (input.action === 'feedback') return Response.json(await callFunction('chat', input));
      const data = await callFunction<AskResult>('chat', input);
      const a = data.answer;
      return Response.json({ answer: { ...a, answered: a.status === 'answered', message_id: data.message_id, conversation_id: data.conversation_id,
        citations: a.citations.map(c => ({ ...c, title: c.document_title, pages: c.page_start ? `${c.page_start}–${c.page_end}쪽` : '' })) } });
    }
    const action = path.includes('view=stats') ? 'stats' : input.action ?? null;
    return Response.json(await localNyang(await currentAccount(session.user.id), action, input));
  } catch (e) {
    const status = (e as { status?: number }).status;
    return Response.json({ error: e instanceof Error ? e.message : '요청을 처리하지 못했어요.' }, { status: status && status >= 400 && status < 500 ? status : 400 });
  }
}
