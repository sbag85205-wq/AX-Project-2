import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), call: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabaseConfigured: true, loginEmail: (id: string) => `${id}@knowly.local`, supabase: { auth: mocks } }));
vi.mock('../src/lib/api', () => ({ callFunction: mocks.call, SESSION_EXPIRED: 401 }));
vi.mock('../src/nyang/local-store', () => ({ localExport: vi.fn() }));
import { request } from '../src/nyang/transport';
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

beforeEach(() => { vi.resetAllMocks(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'employee-a' } } } }); });

describe('첫 사용자 가이드 기록 (/api/guide)', () => {
  it('계정 정보(user_metadata.nyang_guide)를 서버에서 새로 읽는다', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: { display_name: '직원 A', nyang_guide: { version: 1, state: 'done' } } } }, error: null });
    const r = await request('/api/guide', post({ action: 'read' }));
    expect(r.ok).toBe(true);
    expect(await r.json()).toEqual({ guide: { version: 1, state: 'done' } });
    expect(mocks.call).not.toHaveBeenCalled(); // 서버 함수(nyang)는 부르지 않는다
  });
  it('기록이 없으면 null', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: { display_name: '직원 A' } } }, error: null });
    expect(await (await request('/api/guide', post({ action: 'read' }))).json()).toEqual({ guide: null });
  });
  it('다 봄·건너뜀만 계정 정보의 nyang_guide 키 하나에 저장한다(이름·부서 등 다른 정보는 건드리지 않는다)', async () => {
    mocks.updateUser.mockResolvedValue({ error: null });
    const r = await request('/api/guide', post({ action: 'save', state: 'skipped', version: 1 }));
    expect(r.ok).toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    const arg = mocks.updateUser.mock.calls[0][0];
    expect(Object.keys(arg)).toEqual(['data']);
    expect(Object.keys(arg.data)).toEqual(['nyang_guide']);
    expect(arg.data.nyang_guide).toMatchObject({ version: 1, state: 'skipped' });
  });
  it('정해진 값이 아니면 저장하지 않는다', async () => {
    const r = await request('/api/guide', post({ action: 'save', state: 'admin', version: 1 }));
    expect(r.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('로그인하지 않았으면 읽지도 저장하지도 않는다', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const r = await request('/api/guide', post({ action: 'save', state: 'done', version: 1 }));
    expect(r.status).toBe(401);
    expect(mocks.updateUser).not.toHaveBeenCalled();expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('저장에 실패하면 오류로 알린다(화면은 이 브라우저에 적어 두고 다음에 다시 저장한다)', async () => {
    mocks.updateUser.mockResolvedValue({ error: new Error('network') });
    const r = await request('/api/guide', post({ action: 'save', state: 'done', version: 1 }));
    expect(r.ok).toBe(false);
    expect((await r.json()).error).toBe('가이드 기록을 저장하지 못했어요.');
  });
});
