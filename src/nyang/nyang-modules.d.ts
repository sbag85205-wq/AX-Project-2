// 냥대리 원본 JS 모듈(타입 없음)을 TypeScript에서 불러오기 위한 선언.
declare module '*/nyang-frontend/lib/demo-account.mjs' {
  export function accountCommunity(db: unknown, account: unknown, action?: string | null, input?: Record<string, unknown>): Promise<unknown>;
  export function statistics(db: unknown, account: unknown): Promise<unknown>;
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
  }
  export function pageLabel(start: unknown, end: unknown): string;
  export function normalizeKnowlyAnswer(answer: unknown): NyangKnowlyAnswer;
}
