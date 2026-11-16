import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), single: vi.fn(), call: vi.fn(), invoke: vi.fn(), exportLocal: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabaseConfigured: true, loginEmail: (id: string) => `${id}@knowly.local`, supabase: {
  auth: mocks, functions: { invoke: mocks.invoke }, from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) })
} }));
vi.mock('../src/lib/api', () => ({ callFunction: mocks.call }));
vi.mock('../src/nyang/local-store', () => ({ localExport: mocks.exportLocal }));
import { request } from '../src/nyang/transport';
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-a' } } } }); });
describe('main Knowly transport', () => {
  // nyang 서버 함수 호출(callFunction('nyang', 본문))만 골라 본다
  const nyang = () => mocks.call.mock.calls.filter(([name]) => name === 'nyang').map(([, body]) => body);
  const answer = (fn: (body: Record<string, unknown>) => unknown) => mocks.call.mockImplementation(async (name: string, body: Record<string, unknown>) => name === 'nyang' ? fn(body) : { ok: true });
  it('logs in and loads everything in one server call; the tab must match the account role', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'employee-a' } }, error: null });
    mocks.exportLocal.mockResolvedValue(null);answer(() => ({ member: true, me: { role: 'employee' }, personalState: {} }));
    const r = await request('/api/account', post({ action: 'login', username: 'alice', password: 'fixture', role: 'employee' }));
    expect(r.ok).toBe(true);expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'alice@knowly.local', password: 'fixture' });
    expect(nyang()).toEqual([{ action: null }]);
    expect(mocks.single).not.toHaveBeenCalled(); // 프로필을 따로 읽지 않는다(한 번 덜 오간다)
    expect(mocks.exportLocal).toHaveBeenCalledWith('employee-a');
    expect(await r.json()).toEqual({ member: true, me: { role: 'employee' }, personalState: {} });
  });
  it('rejects a role mismatch and signs out', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'employee-a' } }, error: null });
    mocks.exportLocal.mockResolvedValue(null);answer(() => ({ member: true, me: { role: 'employee' } }));
    const r = await request('/api/account', post({ action: 'login', username: 'alice', password: 'fixture', role: 'staff' }));
    expect(r.ok).toBe(false);expect((await r.json()).error).toMatch(/계정 유형/);expect(mocks.signOut).toHaveBeenCalled();
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: new Error('bad') });
    expect((await (await request('/api/account', post({ action: 'login', username: 'alice', password: 'x', role: 'employee' }))).json()).error).toMatch(/아이디 또는 비밀번호/);
  });
  it('keeps Nyang activity on the server function, which decides the role from the signed-in profile', async () => {
    answer(() => ({ ranking: [] }));
    await request('/api/account?view=stats', { method: 'GET' });
    expect(nyang().at(-1)).toEqual({ action: 'stats' });
    await request('/api/account', post({ action: 'reply', post: 'p1' }));
    expect(nyang().at(-1)).toEqual({ action: 'reply', post: 'p1' });
    expect(mocks.exportLocal).not.toHaveBeenCalled(); // 기록 올리기는 화면을 처음 불러올 때만
    // 서버가 거절하면 그 메시지와 상태 번호를 그대로 돌려준다
    mocks.call.mockRejectedValue(Object.assign(new Error('담당자만 이 작업을 할 수 있어요.'), { status: 403 }));
    const r = await request('/api/account', post({ action: 'question', question: 'x' }));
    expect(r.status).toBe(403);expect(await r.json()).toEqual({ error: '담당자만 이 작업을 할 수 있어요.' });
    mocks.call.mockRejectedValue(new Error('서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.'));
    expect(await (await request('/api/account', post({ action: 'attendance' }))).json()).toEqual({ error: '서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.' });
  });
  it('uploads records that only lived in this browser once per account, and retries only what had to wait', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-b' } } } });
    const data = { wallet: '{"points":30}', questions: [{ id: 'q1' }], likes: [{ post: 'p1' }] };
    mocks.exportLocal.mockResolvedValue(data);
    // 글쓴이가 아직 올리지 않아 유익해요 하나가 미뤄졌다 → 다음에 그것만 다시 올린다
    answer(() => ({ member: true, wallet: { points: 30 }, imported: { first: true, pending: 1 } }));
    expect(await (await request('/api/account', { method: 'GET' })).json()).toEqual({ member: true, wallet: { points: 30 } });
    expect(mocks.exportLocal).toHaveBeenCalledWith('employee-b');
    const id = store.get('nyang-server-import-id');expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(nyang()).toEqual([{ action: 'import', id, data }]); // 첫 화면은 올리기 응답으로(따로 불러오지 않는다)
    expect(store.get('nyang-server-import:employee-b')).toBe('pending:1');
    // 같은 페이지에서는 다시 올리지 않는다(창을 다시 볼 때마다 올리지 않게)
    answer(() => ({ member: true }));
    await request('/api/account', { method: 'GET' });
    expect(nyang().at(-1)).toEqual({ action: null });expect(mocks.exportLocal).toHaveBeenCalledTimes(1);
    // 페이지를 새로 열면(모듈을 다시 불러오면) 미뤄진 것(유익해요·답변·삭제 표시)만 다시 올린다
    vi.resetModules();const fresh = (await import('../src/nyang/transport')).request;
    answer(() => ({ member: true, imported: { first: false, pending: 0 } }));
    await fresh('/api/account', { method: 'GET' });
    expect(nyang().at(-1)).toEqual({ action: 'import', id, data: { likes: data.likes, replies: undefined, deleted: undefined } });
    expect(store.get('nyang-server-import:employee-b')).toBe('done');
    // 끝난 뒤에는 브라우저 기록을 다시 읽지 않고 서버에서만 불러온다
    mocks.exportLocal.mockClear();answer(() => ({ member: true }));
    await fresh('/api/account', { method: 'GET' });
    expect(mocks.exportLocal).not.toHaveBeenCalled();expect(nyang().at(-1)).toEqual({ action: null });
    vi.unstubAllGlobals();
  });
  it('still signs in when the upload fails or there is nothing to upload', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-c' } } } });
    mocks.exportLocal.mockResolvedValue({ wallet: '{}' });
    answer((body) => { if (body.action === 'import') throw new Error('network'); return { member: true, from: 'server' }; });
    expect(await (await request('/api/account', { method: 'GET' })).json()).toEqual({ member: true, from: 'server' });
    expect(store.get('nyang-server-import:employee-c')).toBe('failed:1'); // 다음에 페이지를 열 때 다시 올린다(전부)
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-d' } } } });
    mocks.exportLocal.mockResolvedValue(null);
    expect((await request('/api/account', { method: 'GET' })).ok).toBe(true);expect(store.get('nyang-server-import:employee-d')).toBe('done');
    vi.unstubAllGlobals();
  });
  it('forwards conversation and attachments to the existing chat API and retains all evidence', async () => {
    const answer={ status:'insufficient_evidence', summary:['근거 없음'], details:'확인 필요', steps:[], warnings:[], citations:[], attachments:[{name:'a.txt',read:true}] };
    mocks.call.mockResolvedValue({answer,conversation_id:'thread-a',message_id:'answer-a'});
    const body={question:'테스트 질문',conversation_id:'thread-a',attachments:[{kind:'file',name:'a.txt',text:'내용'}]};
    const data=await (await request('/api/knowly',post(body))).json();
    expect(mocks.call).toHaveBeenCalledWith('chat',body);expect(data.answer).toMatchObject({...answer,answered:false,conversation_id:'thread-a',message_id:'answer-a'});
  });
  it('does not substitute a sample answer when the real chat API fails', async () => {
    mocks.call.mockRejectedValue(new Error('검색 실패'));
    const r=await request('/api/knowly',post({question:'휴가 규정'}));
    expect(r.ok).toBe(false);expect(await r.json()).toEqual({error:'검색 실패'});
  });
  it('uses the same chat API for feedback and never serves data after logout', async () => {
    mocks.call.mockResolvedValue({ok:true});
    await request('/api/knowly',post({action:'feedback',message_id:'answer-a',vote:'down'}));
    expect(mocks.call).toHaveBeenCalledWith('chat',{action:'feedback',message_id:'answer-a',vote:'down'});
    await request('/api/account',post({action:'logout'}));expect(mocks.signOut).toHaveBeenCalled();
    mocks.getSession.mockResolvedValue({data:{session:null}});mocks.call.mockClear();
    expect((await request('/api/knowly',post({question:'질문'}))).status).toBe(401);expect(mocks.call).not.toHaveBeenCalled();
  });
});
