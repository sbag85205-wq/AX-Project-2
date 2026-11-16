import { FunctionsHttpError } from '@supabase/supabase-js';
import { loginEmail, supabase, supabaseConfigured } from '../lib/supabase';
import { callFunction, type AskResult } from '../lib/api';
import { localExport, type NyangAccount } from './local-store';

// 냥대리 활동(포인트·출석·게시판)과 개인 기록은 서버 함수(nyang)가 저장한다. 어느 PC로 로그인해도 같은 기록이 보인다.
// 계정·역할은 요청 본문이 아니라 서버가 로그인한 Knowly 프로필에서 가져온다.
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

/** nyang 서버 함수를 호출한다. 실패하면 서버가 보낸 메시지와 상태 번호(status)를 가진 예외를 던진다. */
async function callNyang<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('nyang', { body });
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    const payload = await error.context.json().catch(() => null);
    throw Object.assign(new Error(payload?.error?.message ?? '요청을 처리하지 못했어요.'), { status: error.context.status });
  }
  throw new Error('서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.');
}

// ── 이 브라우저에만 있던 예전 기록을 서버로 올리기 ─────────────────────
// 계정마다 이 브라우저에서 한 번 올린다. 글쓴이가 아직 올리지 않아 미뤄진 것(유익해요·답변)이 있으면 다음 로그인 때 다시 올린다.
const IMPORT_TRIES = 20;
const stored = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 저장을 못 하면 다음에 다시 시도한다 */ } } };
function browserImportId(): string {
  let id = stored.get('nyang-server-import-id');
  if (!id) { id = crypto.randomUUID(); stored.set('nyang-server-import-id', id); }
  return id;
}
/** 올릴 기록이 있으면 올리고 서버의 최신 상태를 돌려준다. 올릴 것이 없거나 이미 끝났으면 null. */
async function importLocalOnce(account: NyangAccount): Promise<Record<string, unknown> | null> {
  const flag = `nyang-server-import:${account.id}`, state = stored.get(flag);
  if (state === 'done') return null;
  const tries = Number(state) || 0;
  try {
    const data = await localExport(account);
    if (!data) { stored.set(flag, 'done'); return null; }
    const { imported, ...snapshot } = await callNyang<{ imported?: { pending: number } } & Record<string, unknown>>({ action: 'import', id: browserImportId(), data });
    stored.set(flag, !imported?.pending || tries + 1 >= IMPORT_TRIES ? 'done' : String(tries + 1));
    return snapshot;
  } catch {
    stored.set(flag, tries + 1 >= IMPORT_TRIES ? 'done' : String(tries + 1)); // 실패해도 로그인은 계속한다. 다음 로그인 때 다시 올린다.
    return null;
  }
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
    if (action === null) {
      // 화면을 처음 불러올 때: 이 브라우저에만 있던 예전 기록이 있으면 먼저 서버로 올린다
      const moved = await importLocalOnce(await currentAccount(session.user.id));
      if (moved) return Response.json(moved);
    }
    const result = await callNyang({ ...input, action });
    if (action === 'stats') return Response.json(await withLoginIds(result));
    return Response.json(result);
  } catch (e) {
    const status = (e as { status?: number }).status;
    return Response.json({ error: e instanceof Error ? e.message : '요청을 처리하지 못했어요.' }, { status: status && status >= 400 && status < 500 ? status : 400 });
  }
}
