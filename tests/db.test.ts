import { beforeEach, describe, expect, it, vi } from 'vitest';

// supabase.from(...)은 부를 때마다 results에서 결과를 하나씩 꺼내는 가짜 쿼리를 돌려준다.
const mocks = vi.hoisted(() => ({
  results: [] as { data?: unknown; error?: unknown; count?: number | null }[],
  calls: [] as string[][],
  remove: vi.fn()
}));
vi.mock('../src/lib/supabase', () => {
  const query = (table: string) => {
    const result = mocks.results.shift() ?? { data: null, error: null };
    const log: string[] = [table];
    mocks.calls.push(log);
    const q: Record<string, unknown> = {
      then: (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(ok, fail)
    };
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single', 'maybeSingle']) {
      q[m] = (...args: unknown[]) => {
        log.push(`${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
        return q;
      };
    }
    return q;
  };
  return { supabase: { from: query, storage: { from: () => ({ remove: mocks.remove }) } } };
});

import { createFaqFromGroup, deleteDocument, FaqLeftBehindError, getChunkView, listReadyDocuments } from '../src/lib/db';

beforeEach(() => {
  mocks.results = [];
  mocks.calls = [];
  mocks.remove.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('db 읽기', () => {
  it('오류를 빈 목록으로 숨기지 않고 예외로 던진다', async () => {
    mocks.results.push({ error: { message: 'network' } });
    await expect(listReadyDocuments()).rejects.toThrow('문서 목록을 불러오지 못했어요.');
  });
  it('출처 조각을 타입 있는 모양으로 바꾼다 (관계 결과가 배열이어도)', async () => {
    mocks.results.push({ data: { content: '본문', section_title: null, documents: [{ file_path: 'a.xlsx', effective_from: '2026-01-01' }] } });
    expect(await getChunkView('c1')).toEqual({ content: '본문', section_title: null, file_path: 'a.xlsx', effective_from: '2026-01-01' });
    mocks.results.push({ data: null });
    expect(await getChunkView('gone')).toBeNull();
  });
});

describe('deleteDocument', () => {
  it('DB 행 삭제가 실패하면 원본 파일을 건드리지 않는다', async () => {
    mocks.results.push({ error: { message: 'denied' } });
    await expect(deleteDocument({ id: 'd1', file_path: 'x/abc.pdf' })).rejects.toThrow('삭제하지 못했어요.');
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('권한에 막혀 0행이 지워져도 실패로 보고 파일은 남긴다', async () => {
    mocks.results.push({ data: [] });
    await expect(deleteDocument({ id: 'd1', file_path: 'x/abc.pdf' })).rejects.toThrow();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('행을 먼저 지우고, 같은 파일을 쓰는 문서가 없을 때만 파일을 지운다', async () => {
    mocks.results.push({ data: [{ id: 'd1' }] }, { count: 0 });
    mocks.remove.mockResolvedValue({ error: null });
    expect(await deleteDocument({ id: 'd1', file_path: 'x/abc.pdf' })).toBe('removed');
    expect(mocks.calls[0]).toContain('delete()');
    expect(mocks.remove).toHaveBeenCalledWith(['x/abc.pdf']);
  });
  it('같은 파일을 다른 문서가 쓰면 파일을 남긴다', async () => {
    mocks.results.push({ data: [{ id: 'd1' }] }, { count: 1 });
    expect(await deleteDocument({ id: 'd1', file_path: 'x/abc.pdf' })).toBe('shared');
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('파일 삭제가 실패해도 문서 삭제는 끝난 것으로 본다', async () => {
    mocks.results.push({ data: [{ id: 'd1' }] }, { count: 0 });
    mocks.remove.mockResolvedValue({ error: { message: 'storage down' } });
    expect(await deleteDocument({ id: 'd1', file_path: 'x/abc.pdf' })).toBe('file-failed');
  });
});

describe('createFaqFromGroup', () => {
  const input = { question: ' 질문 ', answer: ' 답변 ', category: '휴가' };
  it('FAQ를 만들고 묶음을 FAQ 등록 완료로 바꾼다', async () => {
    mocks.results.push({ data: { id: 'f1' } }, { data: [{ id: 'g1' }] });
    await createFaqFromGroup('g1', input);
    expect(mocks.calls[0][0]).toBe('faqs');
    expect(mocks.calls[1].join(' ')).toContain('"faq_id":"f1"');
    expect(mocks.calls).toHaveLength(2);
  });
  it('묶음을 바꾸지 못하면 방금 만든 FAQ를 지워 되돌린다', async () => {
    mocks.results.push({ data: { id: 'f1' } }, { error: { message: 'denied' } }, { error: null });
    await expect(createFaqFromGroup('g1', input)).rejects.toThrow('FAQ 등록을 취소했어요');
    expect(mocks.calls[2]).toEqual(['faqs', 'delete()', 'eq("id","f1")']);
  });
  it('권한에 막혀 0행이 바뀐 것도 실패로 본다', async () => {
    mocks.results.push({ data: { id: 'f1' } }, { data: [] }, { error: null });
    await expect(createFaqFromGroup('g1', input)).rejects.toThrow('FAQ 등록을 취소했어요');
  });
  it('되돌리기도 실패하면 FAQ가 남았다고 알린다', async () => {
    mocks.results.push({ data: { id: 'f1' } }, { error: { message: 'denied' } }, { error: { message: 'down' } });
    await expect(createFaqFromGroup('g1', input)).rejects.toBeInstanceOf(FaqLeftBehindError);
  });
  it('FAQ를 만들지 못하면 묶음은 건드리지 않는다', async () => {
    mocks.results.push({ error: { message: 'down' } });
    await expect(createFaqFromGroup('g1', input)).rejects.toThrow('FAQ를 등록하지 못했어요.');
    expect(mocks.calls).toHaveLength(1);
  });
});
