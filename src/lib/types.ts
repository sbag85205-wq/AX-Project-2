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
