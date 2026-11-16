import { afterEach, describe, expect, it, vi } from 'vitest';
// 서버 함수는 DB와 같은 지역(eu-west-1)에서 실행해야 빠르다. 헤더(x-region)는 CORS에 막히므로 주소 뒤 값으로만 지정한다.
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'user-token' } } }) } } }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });
async function load() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk');
  return import('../src/lib/api');
}
describe('callFunction', () => {
  it('runs the function next to the database without a CORS-blocked header', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));vi.stubGlobal('fetch', fetch);
    const { callFunction, FUNCTION_REGION } = await load();
    expect(await callFunction('nyang', { action: null })).toEqual({ ok: 1 });
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(FUNCTION_REGION).toBe('eu-west-1');
    expect(String(url)).toBe('https://example.supabase.co/functions/v1/nyang?forceFunctionRegion=eu-west-1');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', apikey: 'pk', Authorization: 'Bearer user-token' });
    expect(Object.keys(init.headers as object).map((h) => h.toLowerCase())).not.toContain('x-region');
    expect(init.body).toBe('{"action":null}');
  });
  it('throws the server message with its status, or a network message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: '담당자만 볼 수 있어요.' } }), { status: 403 })));
    const { callFunction } = await load();
    await expect(callFunction('nyang', {})).rejects.toMatchObject({ message: '담당자만 볼 수 있어요.', status: 403 });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    await expect(callFunction('nyang', {})).rejects.toThrow('서버에 연결하지 못했어요');
  });
});
