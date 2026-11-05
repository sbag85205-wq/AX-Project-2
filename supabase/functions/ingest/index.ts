// 관리자 문서 등록: 브라우저에서 페이지별로 추출한 텍스트를 받아 청크·임베딩 후 검색 대상으로 활성화
// action: 'reindex'는 이미 등록된 문서의 청크 벡터를 현재 임베딩 모델로 다시 만든다
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { adminClient, corsHeaders, errorResponse, getCaller, json } from '../_shared/http.ts';
import { chunkPages, type PageText } from '../_shared/text.ts';
import { embed, embeddingModel } from '../_shared/providers.ts';

const MAX_PAGES = 400;
const MAX_TOTAL_CHARS = 1_500_000;
const REINDEX_DOCS_PER_CALL = 3;

/** 임베딩할 때 문서명·섹션 제목을 함께 넣어 짧은 청크도 맥락을 갖게 한다 */
function embedText(title: string, c: { section_title: string | null; content: string }): string {
  return `${title}\n${c.section_title ?? ''}\n${c.content}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'POST만 지원해요.');

  const db = adminClient();
  const caller = await getCaller(req, db);
  if (!caller) return errorResponse(401, 'unauthorized', '로그인이 필요해요.');
  if (caller.profile.role !== 'admin') return errorResponse(403, 'forbidden', '관리자만 문서를 등록할 수 있어요.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'bad_request', '요청 형식이 올바르지 않아요.');
  }
  if (body.action === 'reindex') return await reindex(db);

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const pages = Array.isArray(body.pages) ? (body.pages as PageText[]) : [];
  if (!title || !category) return errorResponse(400, 'missing_fields', '문서명과 카테고리를 입력해 주세요.');
  if (!pages.length || pages.length > MAX_PAGES) return errorResponse(400, 'bad_pages', `1~${MAX_PAGES}페이지 문서만 등록할 수 있어요.`);
  const clean = pages
    .filter((p) => Number.isInteger(p.page) && p.page > 0 && typeof p.text === 'string')
    .map((p) => ({ page: p.page, text: p.text }));
  if (clean.reduce((n, p) => n + p.text.length, 0) > MAX_TOTAL_CHARS) return errorResponse(413, 'too_large', '문서가 너무 커요.');
  if (!clean.some((p) => p.text.trim())) {
    return errorResponse(400, 'no_text', '텍스트를 추출하지 못했어요. 스캔 PDF는 아직 지원하지 않아요.');
  }

  const { data: doc, error } = await db.from('documents').insert({
    title,
    category,
    version: typeof body.version === 'string' && body.version.trim() ? body.version.trim() : 'v1',
    effective_from: typeof body.effective_from === 'string' && body.effective_from ? body.effective_from : null,
    file_path: typeof body.file_path === 'string' ? body.file_path : null,
    file_hash: typeof body.file_hash === 'string' ? body.file_hash : null,
    page_count: clean.length,
    status: 'processing',
    created_by: caller.user.id
  }).select('id').single();
  if (error) return errorResponse(500, 'internal', '문서를 저장하지 못했어요.', true);

  try {
    const chunks = chunkPages(clean);
    const vectors = await embed(chunks.map((c) => embedText(title, c)));
    const rows = chunks.map((c, i) => ({
      document_id: doc.id,
      ...c,
      embedding: vectors ? JSON.stringify(vectors[i]) : null
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error: insertError } = await db.from('chunks').insert(rows.slice(i, i + 200));
      if (insertError) throw insertError;
    }
    await db.from('documents').update({
      status: 'ready', embedding_model: vectors ? embeddingModel() : null, updated_at: new Date().toISOString()
    }).eq('id', doc.id);
    return json({ document_id: doc.id, status: 'ready', chunks: rows.length, embedded: !!vectors });
  } catch (e) {
    const message = (e as Error).message ?? 'unknown';
    console.error('ingest failed', message);
    await db.from('chunks').delete().eq('document_id', doc.id);
    await db.from('documents').update({ status: 'failed', error: message.slice(0, 300) }).eq('id', doc.id);
    return errorResponse(502, 'ingest_failed', '문서 처리에 실패했어요. 문서 목록에서 원인을 확인해 주세요.', true);
  }
});

/** 벡터가 없거나 다른 모델로 만든 문서를 몇 개씩 다시 색인하고, 남은 문서 수를 돌려준다 (함수 실행 시간 제한 때문) */
async function reindex(db: SupabaseClient): Promise<Response> {
  const model = embeddingModel();
  if (!model) return errorResponse(400, 'embedding_not_configured', 'EMBEDDING_MODEL 비밀값을 먼저 설정해 주세요.');
  const { data: docs, error } = await db.from('documents')
    .select('id, title, embedding_model').eq('status', 'ready').order('created_at');
  if (error) return errorResponse(500, 'internal', '문서 목록을 불러오지 못했어요.', true);
  const todo = (docs ?? []).filter((d) => d.embedding_model !== model);
  const done: { id: string; title: string; chunks: number }[] = [];
  let current = '';
  try {
    for (const doc of todo.slice(0, REINDEX_DOCS_PER_CALL)) {
      current = doc.title;
      const { data: chunks, error: chunkError } = await db.from('chunks')
        .select('id, section_title, content').eq('document_id', doc.id).order('seq');
      if (chunkError) throw chunkError;
      const vectors = (await embed((chunks ?? []).map((c) => embedText(doc.title, c)))) ?? [];
      if (vectors.length !== (chunks ?? []).length) throw new Error('embedding count mismatch');
      for (let i = 0; i < vectors.length; i += 25) {
        const results = await Promise.all((chunks ?? []).slice(i, i + 25).map((c, j) =>
          db.from('chunks').update({ embedding: JSON.stringify(vectors[i + j]) }).eq('id', c.id)));
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }
      await db.from('documents').update({ embedding_model: model, updated_at: new Date().toISOString() }).eq('id', doc.id);
      done.push({ id: doc.id, title: doc.title, chunks: vectors.length });
    }
  } catch (e) {
    // 관리자 전용 기능이라 원인을 그대로 보여준다 (API 키는 오류 문구에 포함되지 않는다)
    const message = (e as Error).message ?? 'unknown';
    console.error('reindex failed', current, message);
    return errorResponse(502, 'reindex_failed', `'${current}' 색인에 실패했어요: ${message.slice(0, 200)}`, true);
  }
  return json({ model, done, remaining: todo.length - done.length });
}
