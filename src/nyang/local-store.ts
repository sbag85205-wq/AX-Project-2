// 냥대리 활동 데이터(포인트·출석·츄르·꾸미기·질문 게시판)를 이 브라우저에만 저장한다.
// 운영 DB(Supabase)에는 새 테이블을 만들지 않는다. 다른 기기·브라우저와는 공유되지 않는다.
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { accountCommunity, statistics } from '../../nyang-frontend/lib/demo-account.mjs';
import { runOnce } from './local-db.mjs';

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
    return memory; // 개인정보 보호 모드 등 IndexedDB를 못 쓰면 이 탭에서만 기억한다.
  }
}

async function save(bytes: Uint8Array) {
  memory = bytes;
  try {
    const db = await idb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(bytes, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* 위 load와 같이 메모리에만 남긴다 */
  }
}

let memory: Uint8Array | null = null;
let engine: Promise<SqlJsStatic> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** 원래 nyang 서버 함수와 같은 요청을 브라우저 안에서 처리한다. 요청은 하나씩 차례로 처리한다. */
export function localNyang(account: NyangAccount, action: string | null, input: Record<string, unknown>) {
  const job = queue.then(async () => {
    engine ??= initSqlJs({ locateFile: () => wasmUrl });
    const SQL = await engine;
    // 다른 탭에서 바뀐 내용을 반영하려고 요청마다 저장본을 다시 읽는다.
    const { result, bytes } = await runOnce(SQL, await load(), files, (db: unknown) =>
      action === 'stats' ? statistics(db, account) : accountCommunity(db, account, action, input));
    await save(bytes);
    return result;
  });
  queue = job.catch(() => undefined);
  return job;
}
