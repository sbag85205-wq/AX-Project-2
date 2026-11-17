import { loginEmail, supabase, supabaseConfigured } from '../lib/supabase';
import { callFunction, SESSION_EXPIRED, type AskResult } from '../lib/api';
import { localExport } from './local-store';

// 냥대리 활동(포인트·출석·게시판)과 개인 기록은 서버 함수(nyang)가 저장한다. 어느 PC로 로그인해도 같은 기록이 보인다.
// 계정·역할은 요청 본문이 아니라 서버가 로그인한 Knowly 프로필에서 가져온다.
/** nyang 서버 함수를 호출한다(DB와 같은 지역에서). 실패하면 서버가 보낸 메시지와 상태 번호(status)를 가진 예외를 던진다. */
const callNyang = <T = Record<string, unknown>>(body: Record<string, unknown>) => callFunction<T>('nyang', body);

// ── 비밀번호 변경 ─────────────────────────────────────────────────
/** 새 비밀번호 규칙(관리자 화면·사용자 관리 서버 함수와 같다: 8자 이상) */
export const PASSWORD_MIN = 8;
async function changePassword(email: string, current: unknown, next: unknown): Promise<{ ok: true }> {
  const fail = (message: string) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (typeof current !== 'string' || !current) fail('지금 비밀번호를 입력해 주세요.');
  if (typeof next !== 'string' || next.length < PASSWORD_MIN) fail(`새 비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`);
  if ((next as string).length > 128) fail('새 비밀번호는 128자 이내로 정해 주세요.');
  if (next === current) fail('지금 비밀번호와 다른 비밀번호로 정해 주세요.');
  // 지금 비밀번호 확인: 맞으면 이 기기의 로그인을 새로 받는다(같은 계정이라 화면은 그대로)
  const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current as string });
  if (wrong) fail('지금 비밀번호가 맞지 않아요.');
  const { error } = await supabase.auth.updateUser({ password: next as string });
  if (error) {
    const text = error.message || '';
    fail(/should be different|same/i.test(text) ? '지금 비밀번호와 다른 비밀번호로 정해 주세요.'
      : /weak|characters|length|pwned/i.test(text) ? '더 길거나 추측하기 어려운 비밀번호로 정해 주세요.'
      : '비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return { ok: true };
}

// ── 이 브라우저에만 있던 예전 기록을 서버로 올리기 ─────────────────────
// 계정마다 이 브라우저에서 한 번 올린다. 글쓴이가 아직 올리지 않아 미뤄진 것(유익해요·답변·삭제 표시)이 있으면
// 다음에 페이지를 열 때 그것만 다시 올린다. 한 페이지에서는 한 번만 시도한다(창을 다시 볼 때마다 올리지 않는다).
const IMPORT_TRIES = 20;
const tried = new Set<string>();
const stored = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 저장을 못 하면 다음에 다시 시도한다 */ } } };
const importFlag = (userId: string) => `nyang-server-import:${userId}`;
function browserImportId(): string {
  let id = stored.get('nyang-server-import-id');
  if (!id) { id = crypto.randomUUID(); stored.set('nyang-server-import-id', id); }
  return id;
}
/** 올릴 기록이 있으면 올리고 서버의 최신 상태를 돌려준다. 올릴 것이 없거나 이미 끝났으면 null. */
async function importLocalOnce(userId: string): Promise<Record<string, unknown> | null> {
  const flag = importFlag(userId), state = stored.get(flag) ?? '';
  if (state === 'done' || tried.has(userId)) return null;
  tried.add(userId);
  // 'pending:N' = 한 번 올렸고 미뤄진 것만 남음, 'failed:N'(또는 예전 형식 숫자) = 아직 한 번도 못 올림
  const [kind, count] = state.includes(':') ? state.split(':') : ['failed', state];
  const tries = Number(count) || 0;
  try {
    const data = await localExport(userId);
    if (!data) { stored.set(flag, 'done'); return null; }
    // 미뤄진 것만 남았으면 그 부분만 보낸다(지갑·질문·출석은 이미 올라갔다)
    const body = kind === 'pending' ? { likes: data.likes, replies: data.replies, deleted: data.deleted } : data;
    const { imported, ...snapshot } = await callNyang<{ imported?: { pending: number } } & Record<string, unknown>>({ action: 'import', id: browserImportId(), data: body });
    stored.set(flag, !imported?.pending || tries + 1 >= IMPORT_TRIES ? 'done' : `pending:${tries + 1}`);
    return snapshot;
  } catch {
    // 실패해도 로그인은 계속한다. 다음에 페이지를 열 때 다시 올린다.
    stored.set(flag, tries + 1 >= IMPORT_TRIES ? 'done' : `${kind === 'pending' ? 'pending' : 'failed'}:${tries + 1}`);
    return null;
  }
}

// ── 첫 사용자 가이드 기록 ────────────────────────────────────────
// 다 봤는지·건너뛰었는지를 로그인 계정 정보(Supabase Auth user_metadata.nyang_guide)에 남긴다.
// 본인 계정 정보라 DB 표·서버 함수를 바꾸지 않아도 되고, 다른 PC로 로그인해도 같은 기록을 읽는다.
export const GUIDE_STATES = ['done', 'skipped'] as const;
async function guideRecord(input: { action?: unknown; state?: unknown; version?: unknown }) {
  if (input.action === 'save') {
    if (!GUIDE_STATES.includes(input.state as (typeof GUIDE_STATES)[number])) throw Object.assign(new Error('저장할 수 없는 가이드 기록이에요.'), { status: 400 });
    const version = Math.max(1, Math.min(1000, Math.floor(Number(input.version) || 1)));
    // updateUser의 data는 기존 계정 정보(이름·부서)와 합쳐진다(이 키만 바뀐다)
    const { error } = await supabase.auth.updateUser({ data: { nyang_guide: { version, state: input.state, at: new Date().toISOString() } } });
    if (error) throw new Error('가이드 기록을 저장하지 못했어요.');
    return { ok: true };
  }
  // 다른 PC에서 방금 저장한 기록도 보이게, 이 브라우저에 남은 로그인 정보가 아니라 서버에서 새로 읽는다
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error('가이드 기록을 읽지 못했어요.');
  return { guide: data.user?.user_metadata?.nyang_guide ?? null };
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
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      return Response.json({ authenticated: false, member: false });
    }
    // 로그인: 직원/담당자 탭이 계정과 맞는지는 첫 화면 응답(me.role)으로 확인한다(프로필을 따로 읽지 않아 한 번 덜 오간다)
    let expectedRole: string | null = null;
    if (input.action === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(input.username), password: input.password });
      if (error) throw new Error('아이디 또는 비밀번호를 확인해 주세요.');
      expectedRole = input.role === 'staff' ? 'staff' : 'employee';
      input = { action: null };
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return Response.json({ authenticated: false, member: false }, { status: path.startsWith('/api/account') && !input.action ? 200 : 401 });
    // 비밀번호 변경: 지금 비밀번호로 한 번 더 확인한 뒤 바꾼다(이 기기의 로그인은 이어지고, 다른 기기 로그인도 끊지 않는다)
    if (input.action === 'password') return Response.json(await changePassword(session.user.email ?? '', input.current, input.next));
    if (path === '/api/guide') return Response.json(await guideRecord(input));
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
    // 화면을 처음 불러올 때: 이 브라우저에만 있던 예전 기록이 있으면 먼저 서버로 올린다(그 응답이 곧 첫 화면)
    const result = (action === null ? await importLocalOnce(session.user.id) : null) ?? await callNyang({ ...input, action });
    if (expectedRole && (result as { me?: { role?: string } }).me?.role !== expectedRole) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('계정 유형을 확인하고 직원 또는 담당자 탭에서 로그인해 주세요.');
    }
    if (action === 'stats') return Response.json(await withLoginIds(result));
    return Response.json(result);
  } catch (e) {
    const status = (e as { status?: number }).status;
    // 다시 시도해도 로그인을 받아들이지 않으면(다른 곳에서 로그아웃·만료) 이 기기도 로그아웃 상태로 맞춘다
    if (status === SESSION_EXPIRED) { try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* 로그아웃 표시는 다음 화면 불러오기에서 맞춘다 */ } }
    return Response.json({ error: e instanceof Error ? e.message : '요청을 처리하지 못했어요.' }, { status: status && status >= 400 && status < 500 ? status : 400 });
  }
}
