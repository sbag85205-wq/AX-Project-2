// 냥대리 규칙 코드(SQLite 문법)를 Postgres의 nyang 공간에서 그대로 실행하기 위한 연결부.
// 규칙 코드가 만든 SQL만 실행한다. 브라우저가 보낸 SQL은 받지 않는다.

/** SQLite 문법 SQL 한 줄을 Postgres 문법으로 바꾼다. previousChanges: 바로 앞 문장이 바꾼 행 수(changes() 자리에 넣는다). */
export function translate(sql, previousChanges = 0) {
  const ignore = /INSERT OR IGNORE/i.test(sql);
  let index = 0;
  return sql.replace(/INSERT OR IGNORE/gi, 'INSERT')
    // 삭제된 글을 뺀 게시판 보기: Postgres는 FROM 안의 하위 질의에 이름이 필요하다
    .replace(/\(SELECT \* FROM demo_posts WHERE id NOT IN \(SELECT post FROM demo_deleted_posts\)\)(?!\s+[a-z]\w*\b)/g, '$& AS visible_posts')
    .replace(/\bdemo_(members|wallets|questions|posts|likes|replies|attendance|operations|deleted_posts|user_state)\b/g, 'nyang.$1')
    .replace(/json_extract\(\s*([\w.]+)\s*,\s*'\$\.(\w+)'\s*\)/gi, "($1::jsonb->>'$2')")
    // Postgres의 COUNT·SUM은 큰 정수(bigint)라 드라이버가 글자로 돌려줄 수 있다. 규칙 코드는 숫자로 더하므로 int로 맞춘다.
    .replace(/COUNT\(\*\)/gi, 'COUNT(*)::int')
    .replace(/COALESCE\((SUM\(.*?\)),0\) AS/gi, 'COALESCE($1,0)::int AS')
    .replace(/changes\(\)/gi, String(previousChanges))
    .replace(/\?/g, () => '$' + (++index)) + (ignore ? ' ON CONFLICT DO NOTHING' : '');
}

/**
 * query(sql, args) → {rows, count} 를 받아 규칙 코드가 쓰는 D1 모양(prepare/bind/first/all/run, batch)으로 감싼다.
 * 한 요청은 호출하는 쪽에서 트랜잭션 하나로 묶는다.
 */
export function postgresDatabase(query) {
  let previousChanges = 0;
  const value = (a) => (a === undefined ? null : typeof a === 'boolean' ? Number(a) : a);
  const db = {
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) { this.args = args; return this; },
        async execute() {
          const result = await query(translate(sql, previousChanges), this.args.map(value));
          previousChanges = result.count ?? result.rows.length;
          return result.rows;
        },
        async first() { return (await this.execute())[0] ?? null; },
        async all() { return { results: await this.execute() }; },
        async run() { await this.execute(); return { meta: { changes: previousChanges } }; }
      };
      return statement;
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    }
  };
  return db;
}
