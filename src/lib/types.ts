export type Role = 'employee' | 'admin';

export interface Profile {
  id: string;
  login_id: string;
  display_name: string;
  department_id: string | null;
  role: Role;
  created_at?: string;
}

export interface Department {
  id: string;
  name: string;
}

// 답변·출처·첨부 기록 모양은 서버(chat 함수)와 같은 정의를 그대로 쓴다. 따로 베끼면 서로 달라진다.
export type { Answer, AnswerStatus, AttachmentNote, Citation } from '../../supabase/functions/_shared/answer';
import type { Answer, AttachmentNote } from '../../supabase/functions/_shared/answer';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer: Answer | null;
  vote: 'up' | 'down' | null;
  created_at: string;
  pending?: boolean;
  error?: string;
  /** 사용자 메시지에 붙인 첨부 (표시용 이름·미리보기, 다시 시도할 때 다시 보낼 내용) */
  attachments?: ChatAttachment[];
}

/** 화면에서 다루는 첨부: 서버 기록(AttachmentNote)의 이름·종류에 미리보기·추출 글자를 더한다 */
export interface ChatAttachment extends Omit<AttachmentNote, 'read'> {
  id: string;
  /** 파일에서 뽑은 글자 */
  text?: string;
  /** 사진 (줄인 JPEG data URL) */
  dataUrl?: string;
  /** 서버가 내용을 읽었는지 (답변을 받은 뒤에 채워진다) */
  read?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  title: string;
  category: string;
  version: string;
  effective_from: string | null;
  page_count: number;
  status: 'processing' | 'ready' | 'failed' | 'archived';
  error: string | null;
  embedding_model: string | null;
  file_path: string | null;
  created_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  active: boolean;
  updated_at: string;
}

export type GroupStatus = '신규' | '검토 중' | 'FAQ 등록 완료' | '보류';

export interface QuestionGroup {
  id: string;
  question: string;
  category: string;
  status: GroupStatus;
  faq_id: string | null;
  created_at: string;
  last_asked_at: string;
  question_variants: { text: string; reason: string; created_at: string }[];
  faqs?: { answer: string } | null;
}

/** 관리자 설정. supabase/functions/_shared/settings.ts의 AppSettings와 같은 모양으로 유지한다
 *  (settings.ts는 프론트엔드 tsconfig include에 없어 여기서는 그대로 둔다) */
export interface AppSettings {
  llm_model: string | null;
  keyword_min: number;
  vector_min: number;
  vector_weight: number;
}

export interface ModelOption {
  id: string;
  name: string;
  context_length: number | null;
  prompt_price: string | null;
  completion_price: string | null;
}

export interface PreviewRow {
  document_title: string;
  section_title: string | null;
  page_start: number;
  page_end: number;
  keyword_score: number;
  vector_score: number | null;
  passed: boolean;
  /** 기준을 넘고 순위 안(상위 5개)에 들어 실제 답변에 쓰이는지 */
  used?: boolean;
  /** 어떤 질문 모양(원래 질문·질문 문장·AI 정리)으로 찾았는지 */
  via?: string;
  snippet: string;
}

export interface PreviewQuery {
  label: string;
  text: string;
  terms: string[];
}
