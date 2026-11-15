// 냥대리 원본 JS 모듈(타입 없음)을 TypeScript에서 불러오기 위한 선언.
declare module '*/live-account.mjs' {
  /** 로그인한 Knowly 프로필에서 만든 계정(local-store.ts NyangAccount와 같은 모양) */
  export interface LiveAccount { id: string; username: string; name: string; department: string; role: 'staff' | 'employee' }
  export const TABLES: Record<string, string>;
  export function accountCommunity(db: unknown, account: LiveAccount, action?: string | null, input?: Record<string, unknown>): Promise<unknown>;
  export function statistics(db: unknown, account: LiveAccount): Promise<unknown>;
}
declare module '*/local-db.mjs' {
  import type { SqlJsStatic } from 'sql.js';
  export function runOnce<T>(SQL: SqlJsStatic, bytes: Uint8Array | null, files: [string, string][], work: (db: unknown) => Promise<T>): Promise<{ result: T; changed: boolean; bytes: Uint8Array }>;
  export function createSerializer(name: string, locks?: { request(name: string, fn: () => Promise<unknown>): Promise<unknown> }): <T>(fn: () => Promise<T>) => Promise<T>;
}
declare module '*/nyang-frontend/lib/knowly-answer.mjs' {
  export interface NyangKnowlyAnswer {
    answered: boolean; status: string; mode: string; summary: string[]; steps: string[]; details: string; warnings: string[];
    citations: { title: string; version: string; pages: string; document_id: string; chunk_id: string }[];
    attachments: { name: string; read: boolean }[];
    outside_category?: true;
  }
  export function pageLabel(start: unknown, end: unknown): string;
  export function normalizeKnowlyAnswer(answer: unknown): NyangKnowlyAnswer;
}
