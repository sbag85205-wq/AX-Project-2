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

// 사용자 통계의 순위 목록(포인트·유익해요·연속 출석): uid를 로그인 아이디로만 바꾼다(이름·부서는 보여 주지 않는다). 프로필은 담당자만 읽을 수 있다.
type StatsRow = { uid: string; username: string } & Record<string, unknown>;
type StatsLists = { ranking?: StatsRow[]; rankings?: Record<string, StatsRow[]>; helpful?: Record<string, StatsRow[]>; streaks?: StatsRow[] };
async function withLoginIds(stats: unknown): Promise<unknown> {
  const s = stats as StatsLists | null;
  if (!s || typeof s !== 'object') return stats;
  const all = [s.ranking, ...Object.values(s.rankings ?? {}), ...Object.values(s.helpful ?? {}), s.streaks].filter(Array.isArray).flat() as StatsRow[];
  if (!all.length) return stats;
  const ids = [...new Set(all.map((r) => r.uid).filter((id) => !id.startsWith('demo-')))];
  const { data } = ids.length ? await supabase.from('profiles').select('id, login_id').in('id', ids) : { data: [] };
  const loginIds = new Map(((data ?? []) as { id: string; login_id: string }[]).map((p) => [p.id, p.login_id]));
  const named = (list?: StatsRow[]) => list?.map(({ uid, username, ...rest }) => ({ username: username || loginIds.get(uid) || '(알 수 없는 계정)', ...rest }));
  const each = (group?: Record<string, StatsRow[]>) => group && Object.fromEntries(Object.entries(group).map(([k, list]) => [k, named(list)]));
  return { ...s, ranking: named(s.ranking), rankings: each(s.rankings), helpful: each(s.helpful), streaks: named(s.streaks) };
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
    // 냥대리 테스트 화면의 검색·모델 설정 (관리자인지는 서버 함수가 확인한다)
    if (path === '/api/knowly-settings') return Response.json(await callFunction('admin-settings', input));
    // 채팅의 '분야 변경' 목록 (분야 관리에서 정한 분야)
    if (path === '/api/knowly-categories') return Response.json(await callFunction('chat', { action: 'categories' }));
    if (path === '/api/knowly') {
      if (input.action === 'feedback') return Response.json(await callFunction('chat', input));
      const data = await callFunction<AskResult>('chat', input);
      const a = data.answer;
      return Response.json({ answer: { ...a, answered: a.status === 'answered', message_id: data.message_id, conversation_id: data.conversation_id,
        citations: a.citations.map(c => ({ ...c, title: c.document_title, pages: c.page_start ? `${c.page_start}–${c.page_end}쪽` : '' })) } });
    }
    const action = path.includes('view=stats') ? 'stats' : input.action ?? null;
    const result = await localNyang(await currentAccount(session.user.id), action, input);
    if (action === 'stats') return Response.json(await withLoginIds(result));
    return Response.json(result);
  } catch (e) {
    const status = (e as { status?: number }).status;
    return Response.json({ error: e instanceof Error ? e.message : '요청을 처리하지 못했어요.' }, { status: status && status >= 400 && status < 500 ? status : 400 });
  }
}
