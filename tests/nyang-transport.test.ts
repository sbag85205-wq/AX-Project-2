import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
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
  it('logs in with the individual Knowly credentials and verifies the profile role', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'employee-a' } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee', login_id: 'alice', display_name: '직원 A', department_id: null } });
    mocks.exportLocal.mockResolvedValue(null);mocks.invoke.mockResolvedValue({ data: { member: true }, error: null });
    const r = await request('/api/account', post({ action: 'login', username: 'alice', password: 'fixture', role: 'employee' }));
    expect(r.ok).toBe(true);expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'alice@knowly.local', password: 'fixture' });
    expect(mocks.invoke).toHaveBeenCalledWith('nyang', { body: { action: null } });
    expect(mocks.call).not.toHaveBeenCalled();
  });
  it('rejects a role mismatch and signs out before loading community data', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'employee-a' } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee' } });
    expect((await request('/api/account', post({ action: 'login', username: 'alice', password: 'fixture', role: 'staff' }))).ok).toBe(false);
    expect(mocks.signOut).toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('keeps Nyang activity on the server function, which decides the role from the signed-in profile', async () => {
    mocks.invoke.mockResolvedValue({ data: { ranking: [] }, error: null });
    await request('/api/account?view=stats', { method: 'GET' });
    expect(mocks.invoke).toHaveBeenLastCalledWith('nyang', { body: { action: 'stats' } });
    await request('/api/account', post({ action: 'reply', post: 'p1' }));
    expect(mocks.invoke).toHaveBeenLastCalledWith('nyang', { body: { action: 'reply', post: 'p1' } });
    expect(mocks.exportLocal).not.toHaveBeenCalled(); // 기록 올리기는 화면을 처음 불러올 때만
    // 서버가 거절하면 그 메시지와 상태 번호를 그대로 돌려준다
    mocks.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError({ status: 403, json: async () => ({ error: { message: '담당자만 이 작업을 할 수 있어요.' } }) }) });
    const r = await request('/api/account', post({ action: 'question', question: 'x' }));
    expect(r.status).toBe(403);expect(await r.json()).toEqual({ error: '담당자만 이 작업을 할 수 있어요.' });expect(mocks.call).not.toHaveBeenCalled();
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('network') });
    expect(await (await request('/api/account', post({ action: 'attendance' }))).json()).toEqual({ error: '서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.' });
  });
  it('uploads records that only lived in this browser once per account, and retries what had to wait', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-b' } } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee', login_id: 'bob', display_name: '직원 B', department_id: null } });
    const data = { wallet: '{"points":30}', questions: [{ id: 'q1' }], likes: [{ post: 'p1' }] };
    mocks.exportLocal.mockResolvedValue(data);
    // 글쓴이가 아직 올리지 않아 유익해요 하나가 미뤄졌다 → 다음에 다시 올린다
    mocks.invoke.mockResolvedValue({ data: { member: true, wallet: { points: 30 }, imported: { first: true, pending: 1 } }, error: null });
    expect(await (await request('/api/account', { method: 'GET' })).json()).toEqual({ member: true, wallet: { points: 30 } });
    expect(mocks.exportLocal).toHaveBeenCalledWith({ id: 'employee-b', username: 'bob', name: '직원 B', department: '', role: 'employee' });
    const id = store.get('nyang-server-import-id');expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.invoke).toHaveBeenCalledWith('nyang', { body: { action: 'import', id, data } });expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(store.get('nyang-server-import:employee-b')).toBe('1');
    mocks.invoke.mockResolvedValue({ data: { member: true, imported: { first: false, pending: 0 } }, error: null });
    await request('/api/account', { method: 'GET' });
    expect(mocks.invoke).toHaveBeenLastCalledWith('nyang', { body: { action: 'import', id, data } });expect(store.get('nyang-server-import:employee-b')).toBe('done');
    // 끝난 뒤에는 브라우저 기록을 다시 읽지 않고 서버에서만 불러온다
    mocks.exportLocal.mockClear();mocks.invoke.mockResolvedValue({ data: { member: true }, error: null });
    await request('/api/account', { method: 'GET' });
    expect(mocks.exportLocal).not.toHaveBeenCalled();expect(mocks.invoke).toHaveBeenLastCalledWith('nyang', { body: { action: null } });
    vi.unstubAllGlobals();
  });
  it('still signs in when the upload fails or there is nothing to upload', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-c' } } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee', login_id: 'carol', display_name: '직원 C', department_id: null } });
    mocks.exportLocal.mockResolvedValue({ wallet: '{}' });
    mocks.invoke.mockImplementation(async (_name: string, { body }: { body: { action: string | null } }) => body.action === 'import' ? { data: null, error: new Error('network') } : { data: { member: true, from: 'server' }, error: null });
    expect(await (await request('/api/account', { method: 'GET' })).json()).toEqual({ member: true, from: 'server' });
    expect(store.get('nyang-server-import:employee-c')).toBe('1'); // 다음 로그인 때 다시 올린다
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-d' } } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee', login_id: 'dave', display_name: '직원 D', department_id: null } });
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
