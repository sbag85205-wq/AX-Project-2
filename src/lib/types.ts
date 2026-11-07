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

export interface Citation {
  source_id: string;
  chunk_id: string;
  document_id: string;
  document_title: string;
  version: string;
  page_start: number;
  page_end: number;
}

export interface Answer {
  status: 'answered' | 'insufficient_evidence' | 'conflicting_sources';
  mode: 'faq' | 'llm' | 'search';
  summary: string[];
  steps: string[];
  details: string;
  warnings: string[];
  citations: Citation[];
  attachments?: AttachmentNote[];
}

/** 질문에 첨부한 파일 (서버는 이름과 읽었는지만 대화에 남긴다) */
export interface AttachmentNote {
  name: string;
  kind: 'file' | 'image';
  read: boolean;
}

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

export interface ChatAttachment {
  id: string;
  name: string;
  kind: 'file' | 'image';
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
