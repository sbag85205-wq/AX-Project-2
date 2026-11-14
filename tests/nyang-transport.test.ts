import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), single: vi.fn(), call: vi.fn(), local: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabaseConfigured: true, loginEmail: (id: string) => `${id}@knowly.local`, supabase: {
  auth: mocks, from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) })
} }));
vi.mock('../src/lib/api', () => ({ callFunction: mocks.call }));
vi.mock('../src/nyang/local-store', () => ({ localNyang: mocks.local }));
import { request } from '../src/nyang/transport';
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-a' } } } }); });
describe('main Knowly transport', () => {
  it('logs in with the individual Knowly credentials and verifies the profile role', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'employee-a' } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee', login_id: 'alice', display_name: '직원 A', department_id: null } });mocks.local.mockResolvedValue({ member: true });
    const r = await request('/api/account', post({ action: 'login', username: 'alice', password: 'fixture', role: 'employee' }));
    expect(r.ok).toBe(true);expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'alice@knowly.local', password: 'fixture' });
    expect(mocks.local).toHaveBeenCalledWith({ id: 'employee-a', username: 'alice', name: '직원 A', department: '', role: 'employee' }, null, { action: null });
    expect(mocks.call).not.toHaveBeenCalled();
  });
  it('rejects a role mismatch and signs out before loading community data', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'employee-a' } } });
    mocks.single.mockResolvedValue({ data: { role: 'employee' } });
    expect((await request('/api/account', post({ action: 'login', username: 'alice', password: 'fixture', role: 'staff' }))).ok).toBe(false);
    expect(mocks.signOut).toHaveBeenCalled();expect(mocks.local).not.toHaveBeenCalled();
  });
  it('keeps Nyang activity in the browser store with the trusted profile role, never a body role', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'staff-a' } } } });
    mocks.single.mockResolvedValue({ data: { role: 'admin', login_id: 'manager', display_name: '담당자', department_id: null } });
    mocks.local.mockResolvedValue({ ok: true });
    await request('/api/account?view=stats', { method: 'GET' });
    expect(mocks.local).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'staff' }), 'stats', {});
    await request('/api/account', post({ action: 'reply', role: 'employee', post: 'p1' }));
    expect(mocks.local).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'staff' }), 'reply', { action: 'reply', role: 'employee', post: 'p1' });
    const err = Object.assign(new Error('담당자만 이 작업을 할 수 있어요.'), { status: 403 });
    mocks.local.mockRejectedValue(err);
    const r = await request('/api/account', post({ action: 'question', question: 'x' }));
    expect(r.status).toBe(403);expect(mocks.call).not.toHaveBeenCalled();
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
