// 화면에서 쓰는 Supabase 읽기·쓰기. 실패하면 예외를 던져, 네트워크·권한(RLS) 오류가
// "등록된 문서가 없어요" 같은 빈 화면으로 보이지 않게 한다. (테이블·함수는 기존 것 그대로)
import { supabase } from './supabase';
import type { Conversation, DocumentRow, Faq, GroupStatus, Message, QuestionGroup } from './types';

/** 원본 파일을 두는 Storage 버킷 */
export const DOC_BUCKET = 'documents';

/** 원본 파일 서명 URL 유효 시간(초) */
export const SIGNED_URL_TTL = {
  /** 문서 보기 화면: 원본 PDF·표를 오래 펼쳐 둘 수 있다 */
  documentView: 3600,
  /** 출처 창의 "원본 PDF 열기" */
  sourcePreview: 600
} as const;

/** 화면에 그대로 보여줄 한국어 메시지를 담는다. 원래 오류는 cause에 남긴다. */
export class DbError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

function check<T>({ data, error }: { data: T; error: unknown }, message: string): T {
  if (error) throw new DbError(message, error);
  return data;
}

// ───────────── 문서 ─────────────

/** 직원 문서 목록: RLS로 검색 가능한(ready) 문서만 보인다 */
export async function listReadyDocuments(): Promise<DocumentRow[]> {
  const res = await supabase.from('documents').select('*').eq('status', 'ready').order('category').order('title');
  return (check(res, '문서 목록을 불러오지 못했어요.') as DocumentRow[] | null) ?? [];
}

/** 관리자 문서 관리: 모든 상태의 문서, 최근 등록 순 */
export async function listAllDocuments(): Promise<DocumentRow[]> {
  const res = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  return (check(res, '문서 목록을 불러오지 못했어요.') as DocumentRow[] | null) ?? [];
}

/** 문서 한 개. 없거나 볼 수 없으면 null */
export async function getDocument(id: string): Promise<DocumentRow | null> {
  const res = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  return check(res, '문서를 불러오지 못했어요.') as DocumentRow | null;
}

export interface ChunkRow {
  id: string;
  seq: number;
  section_title: string | null;
  page_start: number;
  page_end: number;
  content: string;
}

export async function listChunks(documentId: string): Promise<ChunkRow[]> {
  const res = await supabase.from('chunks').select('id, seq, section_title, page_start, page_end, content').eq('document_id', documentId).order('seq');
  return (check(res, '문서 내용을 불러오지 못했어요.') as ChunkRow[] | null) ?? [];
}

/** 출처 창에서 보여줄 원문 조각과 그 문서의 원본 경로·시행일 */
export interface ChunkView {
  content: string;
  section_title: string | null;
  file_path: string | null;
  effective_from: string | null;
}

type ChunkWithDoc = {
  content: string;
  section_title: string | null;
  documents: { file_path: string | null; effective_from: string | null } | { file_path: string | null; effective_from: string | null }[] | null;
};

/** chunk_id로 원문 조각을 불러온다. 문서가 교체·삭제돼 없으면 null */
export async function getChunkView(chunkId: string): Promise<ChunkView | null> {
  const res = await supabase.from('chunks').select('content, section_title, documents(file_path, effective_from)').eq('id', chunkId).maybeSingle();
  const row = check(res, '출처를 불러오지 못했어요.') as ChunkWithDoc | null;
  if (!row) return null;
  // 문서는 조각마다 하나지만, 관계 조회 결과는 배열로 올 수도 있어 둘 다 받는다
  const doc = Array.isArray(row.documents) ? row.documents[0] : row.documents;
  return {
    content: row.content,
    section_title: row.section_title ?? null,
    file_path: doc?.file_path ?? null,
    effective_from: doc?.effective_from ?? null
  };
}

/** 원본 파일의 서명 URL */
export async function signedDocUrl(path: string, ttlSeconds: number): Promise<string> {
  const res = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, ttlSeconds);
  return check(res, '원본 파일 주소를 만들지 못했어요.')!.signedUrl;
}

export async function uploadDocumentFile(path: string, file: File): Promise<void> {
  const { error } = await supabase.storage.from(DOC_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new DbError('원본 파일을 저장하지 못했어요.', error);
}

export async function setDocumentStatus(id: string, status: 'ready' | 'archived'): Promise<void> {
  const { error } = await supabase.from('documents').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new DbError('상태를 바꾸지 못했어요.', error);
}

/**
 * 문서를 지운다. DB 행을 먼저 지우고(실패하면 예외), 그다음 원본 파일을 지운다.
 * 원본 경로는 파일 해시로 정해져 같은 파일을 올린 다른 문서와 겹칠 수 있으므로, 아직 그 경로를 쓰는
 * 문서가 있으면 파일은 남긴다. 파일 삭제가 실패해도 문서 삭제는 끝난 것으로 본다.
 */
export async function deleteDocument(doc: Pick<DocumentRow, 'id' | 'file_path'>): Promise<'removed' | 'shared' | 'no-file' | 'file-failed'> {
  // 권한(RLS)에 막히면 오류 없이 0행이 지워지므로, 지워진 행을 돌려받아 확인한다
  const { data, error } = await supabase.from('documents').delete().eq('id', doc.id).select('id');
  if (error) throw new DbError('삭제하지 못했어요.', error);
  if (!data?.length) throw new DbError('삭제하지 못했어요. 이미 삭제됐거나 권한이 없을 수 있어요.');
  if (!doc.file_path) return 'no-file';
  try {
    const { count, error: countError } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('file_path', doc.file_path);
    if (countError) throw countError;
    if (count) return 'shared';
    const { error: removeError } = await supabase.storage.from(DOC_BUCKET).remove([doc.file_path]);
    if (removeError) throw removeError;
    return 'removed';
  } catch (e) {
    console.warn('원본 파일을 지우지 못했어요.', doc.file_path, e);
    return 'file-failed';
  }
}

// ───────────── 대화 ─────────────

export async function listConversations(): Promise<Conversation[]> {
  const res = await supabase.from('conversations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50);
  return (check(res, '대화 기록을 불러오지 못했어요.') as Conversation[] | null) ?? [];
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const res = await supabase.from('messages').select('id, role, content, answer, vote, created_at').eq('conversation_id', conversationId).order('created_at');
  return (check(res, '대화를 불러오지 못했어요.') as Message[] | null) ?? [];
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw new DbError('삭제하지 못했어요.', error);
}

// ───────────── FAQ ─────────────

export async function listFaqs(): Promise<Faq[]> {
  const res = await supabase.from('faqs').select('*').order('updated_at', { ascending: false });
  return (check(res, 'FAQ를 불러오지 못했어요.') as Faq[] | null) ?? [];
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) throw new DbError('삭제하지 못했어요.', error);
}

// ───────────── 미등록 질문 ─────────────

export type QuestionGroupRow = QuestionGroup & { faqs: { answer: string; created_at: string } | null };

/** 최근에 물어본 순으로 질문 묶음을 limit개까지 불러온다 */
export async function listQuestionGroups(limit: number): Promise<QuestionGroupRow[]> {
  const res = await supabase
    .from('question_groups')
    .select('*, question_variants(text, reason, created_at), faqs(answer, created_at)')
    .order('last_asked_at', { ascending: false })
    .limit(limit);
  return (check(res, '미등록 질문을 불러오지 못했어요.') as QuestionGroupRow[] | null) ?? [];
}

async function updateQuestionGroup(id: string, patch: Record<string, unknown>, message: string): Promise<void> {
  // 권한(RLS)에 막히면 오류 없이 0행이 바뀌므로, 바뀐 행을 돌려받아 확인한다
  const { data, error } = await supabase.from('question_groups').update(patch).eq('id', id).select('id');
  if (error || !data?.length) throw new DbError(message, error);
}

export function setQuestionGroupStatus(id: string, status: GroupStatus): Promise<void> {
  return updateQuestionGroup(id, { status }, '상태를 바꾸지 못했어요.');
}

/** FAQ는 만들어졌는데 묶음 상태도 못 바꾸고 되돌리지도 못한 경우 (다시 등록하면 FAQ가 겹친다) */
export class FaqLeftBehindError extends DbError {}

export interface FaqInput {
  question: string;
  answer: string;
  category: string;
}

/**
 * 미등록 질문 묶음을 FAQ로 등록한다: FAQ를 만들고 묶음을 "FAQ 등록 완료"로 바꾼다.
 * 묶음을 바꾸지 못하면 방금 만든 FAQ를 지워 되돌린다. 그대로 두면 묶음은 "신규"로 남아
 * 다시 등록할 때 같은 FAQ가 두 개 생기고, 챗봇이 두 FAQ 중 아무거나 쓰게 된다.
 */
export async function createFaqFromGroup(groupId: string, input: FaqInput): Promise<void> {
  const res = await supabase
    .from('faqs')
    .insert({ question: input.question.trim(), answer: input.answer.trim(), category: input.category })
    .select('id')
    .single();
  const faq = check(res, 'FAQ를 등록하지 못했어요.') as { id: string } | null;
  if (!faq) throw new DbError('FAQ를 등록하지 못했어요.');
  try {
    await updateQuestionGroup(groupId, { status: 'FAQ 등록 완료', faq_id: faq.id, category: input.category }, '질문 묶음 상태를 바꾸지 못했어요.');
  } catch (e) {
    const { error: undoError } = await supabase.from('faqs').delete().eq('id', faq.id);
    if (undoError) {
      throw new FaqLeftBehindError('FAQ는 만들어졌지만 질문 묶음을 "FAQ 등록 완료"로 바꾸지 못했어요. 다시 등록하지 말고 FAQ 관리에서 확인해 주세요.', e);
    }
    throw new DbError('질문 묶음 상태를 바꾸지 못해 FAQ 등록을 취소했어요. 잠시 후 다시 시도해 주세요.', e);
  }
}
