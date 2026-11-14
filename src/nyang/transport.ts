import { loginEmail, supabase, supabaseConfigured } from '../lib/supabase';
import { callFunction, type AskResult } from '../lib/api';

// Explicit transport, shared by the original vanilla frontend modules. Never patch global fetch.
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    if (!supabaseConfigured) throw new Error('VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 설정해 주세요.');
    let input = typeof init.body === 'string' ? JSON.parse(init.body) : {};
    if (input.action === 'logout') {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return Response.json({ authenticated: false, member: false });
    }
    if (input.action === 'login') {
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
    return Response.json(await callFunction('nyang', { ...input, action: input.action === 'login' ? null : path.includes('view=stats') ? 'stats' : input.action }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '요청을 처리하지 못했어요.' }, { status: 400 });
  }
}
