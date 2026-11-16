// 예전에는 냥대리 활동 데이터(포인트·출석·츄르·꾸미기·질문 게시판)를 이 브라우저에만 저장했다.
// 지금은 서버(supabase/functions/nyang)에 저장한다. 이 파일은 브라우저에 남아 있는 예전 기록을 읽어
// 서버로 한 번 올릴 때만 쓴다(transport.ts). 브라우저에 있는 기록은 지우지 않고 그대로 둔다.
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { runOnce } from './local-db.mjs';
import { exportLocal } from './local-export.mjs';

export interface NyangAccount { id: string; username: string; name: string; department: string; role: 'staff' | 'employee' }

// 원래 냥대리 서버와 같은 SQLite 스키마
const files = Object.entries(import.meta.glob('../../nyang-frontend/drizzle/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  .map(([path, text]) => [path.split('/').pop()!, text] as [string, string]);

const DB_NAME = 'knowly-nyang';
const STORE = 'files';
const KEY = 'community.sqlite';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function load(): Promise<Uint8Array | null> {
  try {
    const db = await idb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Uint8Array | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null; // 개인정보 보호 모드 등 IndexedDB를 못 쓰면 올릴 기록도 없다.
  }
}

let engine: Promise<SqlJsStatic> | null = null;

/**
 * 이 브라우저에 남아 있는 예전 활동 기록 중 이 계정이 한 일만 골라 돌려준다(없으면 null).
 * 저장된 기록이 없으면 SQLite 엔진도 불러오지 않는다.
 */
export async function localExport(account: NyangAccount): Promise<Record<string, unknown> | null> {
  const bytes = await load();
  if (!bytes) return null;
  engine ??= initSqlJs({ locateFile: () => wasmUrl });
  const { result } = await runOnce(await engine, bytes, files, (db: unknown) => exportLocal(db, account.id, account.role));
  return result as Record<string, unknown> | null;
}
