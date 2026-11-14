// Run the existing community rules in a single Postgres transaction. No client SQL is accepted.
export function translate(sql, previousChanges = 0) {
  const ignore = /INSERT OR IGNORE/i.test(sql);
  let index = 0;
  return sql.replace(/INSERT OR IGNORE/gi, 'INSERT')
    .replace(/\(SELECT \* FROM demo_posts WHERE id NOT IN \(SELECT post FROM demo_deleted_posts\)\)(?!\s+[a-z]\w*\b)/g, '$& AS visible_posts')
    .replace(/\bdemo_(members|wallets|questions|posts|likes|replies|attendance|operations|deleted_posts)\b/g, 'nyang.$1')
    .replace(/COUNT\(\*\)/gi, 'COUNT(*)::int')
    .replace(/changes\(\)/gi, String(previousChanges))
    .replace(/\?/g, () => '$' + (++index)) + (ignore ? ' ON CONFLICT DO NOTHING' : '');
}
export function postgresDatabase(query) {
  let previousChanges = 0;
  const db = {
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) { this.args = args; return this; },
        async execute() {
          const result = await query(translate(sql, previousChanges), this.args);
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
