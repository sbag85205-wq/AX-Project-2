// 냥대리 활동 데이터(포인트·출석·게시판)를 브라우저 안의 SQLite(sql.js)에 저장할 때 쓰는 연결부.
// 원래 냥대리 서버(Cloudflare D1)와 같은 SQLite 스키마(nyang-frontend/drizzle)와
// 같은 규칙 코드(nyang-frontend/lib/community.mjs, 연결부 src/nyang/live-account.mjs)를 그대로 쓰도록 D1과 같은 모양으로 감싼다.

/** sql.js Database를 D1 모양(prepare/bind/first/all/run, batch)으로 감싼다. */
export function d1(sql) {
  const exec = (q, args) => {
    const st = sql.prepare(q);
    try {
      st.bind(args.map((a) => (a === undefined ? null : typeof a === 'boolean' ? Number(a) : a)));
      const rows = [];
      while (st.step()) rows.push(st.getAsObject());
      return rows;
    } finally {
      st.free();
    }
  };
  return {
    prepare(q) {
      return {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() { return exec(q, this.args)[0] ?? null; },
        async all() { return { results: exec(q, this.args) }; },
        async run() { exec(q, this.args); return { meta: { changes: sql.getRowsModified() } }; }
      };
    },
    // D1 batch처럼 한 묶음은 모두 적용되거나 모두 취소된다.
    async batch(statements) {
      sql.exec('SAVEPOINT nyang_batch');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sql.exec('RELEASE nyang_batch');
        return out;
      } catch (e) {
        sql.exec('ROLLBACK TO nyang_batch');
        sql.exec('RELEASE nyang_batch');
        throw e;
      }
    }
  };
}

/**
 * 저장된 DB(bytes, 없으면 새로)를 열어 스키마를 맞추고 work(db)를 한 번 실행한다.
 * 서버의 요청 하나 = 트랜잭션 하나와 같게, 성공했을 때만 결과를 돌려주고 실패하면 아무것도 저장하지 않는다.
 * changed: 스키마 적용이나 work가 행을 하나라도 바꿨는지(트리거 포함, SQLite total_changes).
 * 바뀌지 않았으면 저장할 필요가 없고, bytes는 받은 그대로 돌려준다(읽기 전용 요청이 다른 탭의 변경을 덮어쓰지 않게).
 * SQL: initSqlJs() 결과, files: [이름, SQL][]
 */
export async function runOnce(SQL, bytes, files, work) {
  const sql = bytes ? new SQL.Database(bytes) : new SQL.Database();
  try {
    sql.exec('PRAGMA foreign_keys = ON');
    migrate(sql, files);
    const result = await work(d1(sql));
    const changed = !bytes || sql.exec('SELECT total_changes()')[0].values[0][0] > 0;
    return { result, changed, bytes: changed ? sql.export() : bytes };
  } finally {
    sql.close();
  }
}

/**
 * fn을 한 번에 하나씩 실행한다. Web Locks가 있으면 같은 브라우저의 모든 탭에 걸쳐 차례로 실행하고
 * (불러오기→처리→저장 사이에 다른 탭이 끼어들어 변경을 덮어쓰지 않게), 없으면 이 탭 안에서만 차례로 실행한다.
 */
export function createSerializer(name, locks = globalThis.navigator?.locks) {
  let queue = Promise.resolve();
  return (fn) => {
    if (locks?.request) return locks.request(name, () => fn());
    const job = queue.then(() => fn());
    queue = job.catch(() => undefined);
    return job;
  };
}

/** 아직 적용하지 않은 스키마 파일만 이름 순서대로 적용한다. files: [이름, SQL][] */
export function migrate(sql, files) {
  sql.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  const done = new Set(sql.exec('SELECT name FROM local_migrations')[0]?.values.map((v) => v[0]) ?? []);
  for (const [name, text] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (done.has(name)) continue;
    sql.exec('BEGIN');
    try {
      sql.exec(text);
      sql.run('INSERT INTO local_migrations (name) VALUES (?)', [name]);
      sql.exec('COMMIT');
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  }
}
