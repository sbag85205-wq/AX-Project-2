// 냥대리 원본 JS 모듈(타입 없음)을 TypeScript에서 불러오기 위한 선언.
declare module '*/local-export.mjs' {
  /** 브라우저 저장소에서 이 계정이 한 일만 골라낸다(없으면 null) */
  export function exportLocal(db: unknown, uid: string): Promise<Record<string, unknown> | null>;
}
declare module '*/local-db.mjs' {
  import type { SqlJsStatic } from 'sql.js';
  export function runOnce<T>(SQL: SqlJsStatic, bytes: Uint8Array | null, files: [string, string][], work: (db: unknown) => Promise<T>): Promise<{ result: T; bytes: Uint8Array }>;
}
declare module '*/nyang-frontend/public/core.js' {
  /** 냥대리 채팅의 기본 질문 예시 (분야 id → 질문) */
  export const faq: Record<string, string[]>;
  /** 냥대리 채팅의 기본 분야 */
  export const categories: { id: string; label: string; detail: string }[];
  /** 담당자가 추가한 분야의 기본 설명 */
  export const customCategoryDetail: string;
}
declare module '*/nyang-frontend/public/shared.js' {
  /** 네 발로 걷는 옆모습 냥대리 그림(SVG 글자) */
  export const WALKING_CAT_SVG: string;
}
