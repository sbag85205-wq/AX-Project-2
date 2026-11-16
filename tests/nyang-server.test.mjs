import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import initSqlJs from 'sql.js';
import { postgresDatabase, translate } from '../supabase/functions/_shared/nyang/postgres.mjs';
import { handleNyang, needsLock, STATE_MAX } from '../supabase/functions/_shared/nyang/server.mjs';
import { runOnce } from '../src/nyang/local-db.mjs';
import { exportLocal } from '../src/nyang/local-export.mjs';
import { accountCommunity } from '../nyang-frontend/lib/demo-account.mjs';

// 서버 함수(supabase/functions/nyang)와 같은 경로: 요청 하나 = Postgres 트랜잭션 하나, 실제 DB 변경 파일을 그대로 적용한다.
const migration = fs.readFileSync(new URL('../supabase/migrations/20261117000000_nyang.sql', import.meta.url), 'utf8');
async function server() {
  const pg = new PGlite();
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await pg.exec(migration);
  const call = (user, action = null, input = {}) => pg.transaction(async (tx) => {
    const db = postgresDatabase(async (q, args) => { const r = await tx.query(q, args); return { rows: r.rows, count: r.affectedRows ?? r.rows.length }; });
    return handleNyang(db, user, { ...input, action });
  });
  return { pg, call };
}
const a = { id: 'user-a', username: 'alice', name: '직원 A', department: '개발', role: 'employee' };
const b = { id: 'user-b', username: 'bob', name: '직원 B', department: '개발', role: 'employee' };
const staff = { id: 'staff-a', username: 'manager', name: '담당자', department: '운영', role: 'staff' };
const day = (n) => new Date(Date.now() + 9 * 3600000 - n * 86400000).toISOString().slice(0, 10);

test('서버 저장: 브라우저 저장소와 같은 규칙(보상·게시판·권한·통계)이 Postgres에서 동작한다', async () => {
  const { pg, call } = await server();
  try {
    assert.equal((await call(a)).me.id, a.id);
    await call(b); await call(staff);
    await call(a, 'question', { question: '연차 신청은 어떻게 하나요?' });
    await call(a, 'question', { question: '연차 신청은 어떻게 하나요?' });
    assert.equal((await call(a)).wallet.points, 10); assert.equal((await call(a)).wallet.questions, 1); assert.equal((await call(b)).wallet.points, 0);
    const attendance = await call(a, 'attendance');
    assert.deepEqual((await call(a, 'attendance')).wallet, attendance.wallet);
    const post = (await call(a, 'post', { category: 'server', body: '휴가 승인 절차가 궁금해요.' })).posts[0];
    await assert.rejects(call(a, 'like', { post: post.id }), /내 질문/);
    await call(b, 'like', { post: post.id }); await call(b, 'like', { post: post.id });
    assert.equal((await call(a)).wallet.points, attendance.wallet.points + 10); // 유익해요 +10 P, 두 번 눌러도 한 번
    const seenByB = (await call(b)).posts[0]; assert.equal(seenByB.liked, true); assert.equal(seenByB.mine, false); assert.equal(seenByB.likes, 1);
    await assert.rejects(call(b, 'reply', { post: post.id, id: 'bad', body: '위조한 관리자 답변', source: '가짜 규정', role: 'staff' }), /담당자/);
    await call(staff, 'reply', { post: post.id, id: 'reply1', body: '담당자가 확인한 답변입니다.', source: '휴가 규정' });
    const view = await call(b); assert.equal(view.posts[0].replies.length, 1); assert.equal(view.posts[0].replies[0].name, '담당자'); assert.equal(view.posts[0].replies[0].department, '운영');
    assert.equal(JSON.stringify(view.posts).includes('user-a'), false); // 글쓴이는 익명
    await assert.rejects(call(b, 'delete-post', { post: post.id }), /본인/);
    await call(staff, 'delete-post', { post: post.id }); assert.equal((await call(a)).posts.length, 0); assert.equal((await call(staff)).deletedPosts.length, 1);
    await call(staff, 'restore-post', { post: post.id }); assert.equal((await call(a)).posts.length, 1);
    await assert.rejects(call(a, 'stats'), /담당자/);
    await assert.rejects(call(staff, 'question', { question: '담당자 보상 위조' }), /담당자/);
    const fed = await call(a, 'reward', { type: 'feed', id: 'feed-1' });
    assert.equal(fed.wallet.pending.length, 3);
    assert.deepEqual((await call(a, 'reward', { type: 'feed', id: 'feed-1' })).wallet, fed.wallet); // 같은 요청 번호는 한 번만
    for (const heart of fed.wallet.pending) await call(a, 'reward', { type: 'collect', id: heart, heart });
    const bought = await call(a, 'reward', { type: 'buy', id: 'buy-1', item: 'ribbon' });
    assert.ok(bought.wallet.owned.includes('ribbon'));
    await call(a, 'reward', { type: 'equip', id: 'equip-1', item: 'ribbon' });
    assert.equal((await call(a)).wallet.equipped, 'ribbon');
    const pet = await call(a, 'reward', { type: 'pet', id: 'pet-1', response: 'wallet' }); assert.equal(pet.partial, 'wallet'); assert.equal(pet.wallet.pettings, 1);
    const before = await call(a); assert.deepEqual(Object.keys(before.earned), ['total', 'recent']); assert.equal(typeof before.earned.total, 'number');
    // 누적 포인트 = 질문 10 + 출석 선물 + 유익해요 10 + 쓰다듬기 보너스(있으면 5). 츄르·옷에 쓴 포인트는 빼지 않는다.
    assert.equal(before.earned.total, 10 + attendance.today.points + 10 + before.wallet.petBonuses * 5);
    for (let i = 0; i < 25; i++) await call(a, 'question', { question: '서로 다른 질문 ' + i });
    assert.equal((await call(a)).wallet.questions, 20); // 하루 20개까지만 보상
    assert.equal((await call(a)).level.level, 3);
    // 담당자 통계(기간별 순위·유익해요 순위·레벨 분포·출석)도 같은 값
    await pg.exec(`INSERT INTO nyang.attendance(uid,day,points,tokens,created) VALUES ('user-a','${day(1)}',5,0,'${new Date(Date.now() - 86400000).toISOString()}'),('user-a','${day(2)}',5,0,'${new Date(Date.now() - 2 * 86400000).toISOString()}')`);
    const s = await call(staff, 'stats');
    assert.equal(s.questions, 20); assert.equal(s.accounts, 2); assert.equal(s.posts, 1); assert.equal(s.answered, 1); assert.equal(s.attendance, 1); assert.equal(s.likes, 1);
    assert.deepEqual(s.rankings.all.map((r) => r.uid), ['user-a', 'user-b']); assert.equal(typeof s.rankings.all[0].points, 'number'); assert.ok(s.rankings.all[0].points >= 220);
    assert.deepEqual(s.ranking, s.rankings.quarter);
    assert.deepEqual(s.helpful.all, [{ uid: 'user-a', username: '', n: 1 }]);
    assert.deepEqual(s.levels.map((l) => l.n), [1, 0, 1, 0, 0]);
    assert.deepEqual(s.streaks, [{ uid: 'user-a', username: '', days: 3 }]); assert.deepEqual(s.attendanceDaily.map((d) => d.n), [0, 0, 0, 0, 1, 1, 1]);
    assert.equal(JSON.stringify(s).includes('휴가 승인'), false); assert.equal(JSON.stringify(s).includes('"name"'), false);
    // 실패한 요청은 아무것도 남기지 않는다(트랜잭션)
    const points = (await call(b)).wallet.points;
    await assert.rejects(call(b, 'like', { post: 'no-such-post' }), /찾을 수 없어요/); assert.equal((await call(b)).wallet.points, points);
    await assert.rejects(handleNyang(null, { role: 'employee' }, {}), /로그인/);
  } finally { await pg.close(); }
});

test('서버 저장: 개인 기록(내 일정·대화 기록 등)은 계정별로 저장되고 정해진 이름·크기만 받는다', async () => {
  const { pg, call } = await server();
  try {
    assert.deepEqual(await call(a, 'state'), { state: {} });
    assert.deepEqual((await call(a)).personalState, {}); assert.deepEqual((await call(a)).personalLarge, {}); // 화면 불러오기에도 개인 기록이 함께 온다
    const tasks = JSON.stringify([{ id: 't1', title: '회의', date: '2026-11-17' }]);
    assert.deepEqual(await call(a, 'state-set', { items: [{ key: 'om-tasks', value: tasks }, { key: 'om-personality', value: '"warm"' }, { key: 'om-bg-theme-cat', value: '"ocean"' }] }), { saved: ['om-tasks', 'om-personality', 'om-bg-theme-cat'] });
    assert.deepEqual((await call(a, 'state')).state, { 'om-tasks': tasks, 'om-personality': '"warm"', 'om-bg-theme-cat': '"ocean"' });
    assert.deepEqual((await call(b, 'state')).state, {}); // 다른 계정에는 보이지 않는다
    assert.deepEqual((await call(a)).personalState, { 'om-tasks': tasks, 'om-personality': '"warm"', 'om-bg-theme-cat': '"ocean"' }); assert.deepEqual((await call(b)).personalState, {});
    assert.equal('personalState' in (await call(a, 'attendance')), false); // 다른 요청 응답에는 넣지 않는다
    await call(a, 'state-set', { key: 'om-tasks', value: '[]' }); await call(a, 'state-set', { key: 'om-personality', value: null });
    assert.deepEqual((await call(a, 'state')).state, { 'om-tasks': '[]', 'om-bg-theme-cat': '"ocean"' });
    await assert.rejects(call(a, 'state-set', { key: 'om-bg-uploads-', value: '[]' }), /저장할 수 없는/);
    await assert.rejects(call(a, 'state-set', { key: 'sb-localhost-auth-token', value: '{}' }), /저장할 수 없는/); // 로그인 토큰 같은 것은 받지 않는다
    await assert.rejects(call(a, 'state-set', { key: 'om-tasks', value: '{잘못된 JSON' }), /형식/);
    await assert.rejects(call(a, 'state-set', { key: 'om-tasks', value: JSON.stringify('x'.repeat(STATE_MAX)) }), /너무 커서/);
    await assert.rejects(call(a, 'state-set', { items: [] }), /확인/);
    assert.deepEqual((await call(a, 'state')).state, { 'om-tasks': '[]', 'om-bg-theme-cat': '"ocean"' });
    // 화면 테마·보던 대화·추가 자료·직접 올린 배경 이미지도 저장한다. 큰 기록은 화면 응답에 이름·시각만 오고 따로 받는다.
    const image = JSON.stringify([{ id: 'img1', url: 'data:image/webp;base64,' + 'A'.repeat(300_000) }]);
    await call(a, 'state-set', { items: [{ key: 'nyang-color-theme', value: '"dark"' }, { key: 'om-chat-active', value: '"c1"' }, { key: 'om-docs', value: '[]' }, { key: 'om-bg-uploads-cat', value: image }] });
    const load = await call(a);
    assert.deepEqual(Object.keys(load.personalState).sort(), ['nyang-color-theme', 'om-bg-theme-cat', 'om-chat-active', 'om-docs', 'om-tasks']);
    assert.deepEqual(Object.keys(load.personalLarge), ['om-bg-uploads-cat']); assert.match(load.personalLarge['om-bg-uploads-cat'], /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(await call(a, 'state', { keys: ['om-bg-uploads-cat', 'nope'] }), { state: { 'om-bg-uploads-cat': image } });
    assert.deepEqual(await call(a, 'state', { keys: [] }), { state: {} });
  } finally { await pg.close(); }
});

// 브라우저 저장소(sql.js)에 실제 규칙 코드로 기록을 만든 뒤, 화면이 쓰는 것과 같은 방법으로 꺼내 서버로 올린다.
const dir = new URL('../nyang-frontend/drizzle/', import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => [f, fs.readFileSync(new URL(f, dir), 'utf8')]);
async function browser() {
  const SQL = await initSqlJs(); let saved = null;
  const run = async (work) => { const r = await runOnce(SQL, saved, files, work); saved = r.bytes; return r.result; };
  return { call: (user, action = null, input = {}) => run((db) => accountCommunity(db, user, action, input)), pick: (user) => run((db) => exportLocal(db, user.id, user.role)) };
}

test('기존 기록 올리기: 브라우저에 있던 포인트·질문·출석·게시판 기록이 서버로 옮겨지고 두 번 올려도 늘지 않는다', async () => {
  const local = await browser(), { pg, call } = await server();
  try {
    await local.call(a); await local.call(b); await local.call(staff);
    for (const q of ['첫 번째 질문입니다', '두 번째 질문입니다', '세 번째 질문입니다']) await local.call(a, 'question', { question: q });
    await local.call(a, 'attendance');
    const post = (await local.call(a, 'post', { category: 'server', body: '서버 백업 주기는 어떻게 정하나요?' })).posts[0];
    const gone = (await local.call(a, 'post', { category: 'etc', body: '지웠던 질문입니다 (삭제 표시도 옮긴다)' })).posts[0];
    await local.call(a, 'delete-post', { post: gone.id });
    await local.call(b, 'question', { question: 'B의 질문입니다' }); await local.call(b, 'like', { post: post.id });
    await local.call(staff, 'reply', { post: post.id, id: 'reply-1', body: '담당자가 확인한 답변입니다.', source: '운영 가이드' });
    const fed = await local.call(a, 'reward', { type: 'feed', id: 'feed-1' });
    for (const heart of fed.wallet.pending) await local.call(a, 'reward', { type: 'collect', id: heart, heart });
    const before = { a: await local.call(a), b: await local.call(b), staff: await local.call(staff) };
    assert.equal(before.a.wallet.questions, 3); assert.equal(before.a.posts.length, 1); assert.equal(before.a.posts[0].likes, 1);

    // 유익해요를 누른 B와 답변을 단 담당자가 글쓴이 A보다 먼저 올리면, 글이 아직 없어서 미뤄 둔다
    const b1 = await call(b, 'import', { id: 'browser-1', data: await local.pick(b) });
    assert.deepEqual(b1.imported, { first: true, pending: 1 }); assert.deepEqual(b1.wallet, before.b.wallet); assert.equal(b1.posts.length, 0);
    assert.deepEqual((await call(staff, 'import', { id: 'browser-1', data: await local.pick(staff) })).imported, { first: true, pending: 1 }); // 답변 1개가 글을 기다린다
    const a1 = await call(a, 'import', { id: 'browser-1', data: await local.pick(a) });
    assert.deepEqual(a1.imported, { first: true, pending: 0 });
    assert.deepEqual(a1.wallet, before.a.wallet); assert.deepEqual(a1.level, before.a.level); assert.deepEqual(a1.earned.total, before.a.earned.total - 10); // 유익해요 10 P는 B가 다시 올리면 채워진다
    assert.equal(a1.posts.length, 1); assert.equal(a1.posts[0].body, post.body); assert.equal(a1.posts[0].likes, 0); assert.equal(a1.streak, before.a.streak); assert.deepEqual(a1.today, before.a.today);
    // 다시 로그인하면 미뤄 둔 것이 올라간다. 지갑은 처음 한 번만 옮긴다(포인트가 두 번 들어가지 않는다).
    const b2 = await call(b, 'import', { id: 'browser-1', data: await local.pick(b) });
    assert.deepEqual(b2.imported, { first: false, pending: 0 }); assert.deepEqual(b2.wallet, before.b.wallet); assert.equal(b2.posts[0].liked, true);
    assert.deepEqual((await call(staff, 'import', { id: 'browser-1', data: await local.pick(staff) })).imported, { first: false, pending: 0 });
    const after = { a: await call(a), b: await call(b), staff: await call(staff) };
    assert.deepEqual(after.a.wallet, before.a.wallet); assert.deepEqual(after.a.earned, before.a.earned); assert.equal(after.a.receivedLikes, 1);
    assert.equal(after.a.posts[0].replies.length, 1); assert.equal(after.a.posts[0].replies[0].name, '담당자'); assert.equal(after.a.posts[0].replies[0].body, '담당자가 확인한 답변입니다.');
    assert.deepEqual(after.b.wallet, before.b.wallet); assert.equal(after.staff.deletedPosts.length, 1); assert.equal(after.staff.deletedPosts[0].body, gone.body);
    // 같은 브라우저 기록을 몇 번 더 올려도 그대로다
    for (let i = 0; i < 2; i++) assert.deepEqual((await call(a, 'import', { id: 'browser-1', data: await local.pick(a) })).wallet, before.a.wallet);
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM nyang.questions')).rows[0].n, 4);
    // 옮긴 뒤에도 규칙이 이어진다: 같은 질문은 다시 보상하지 않고, 새 질문은 +10 P
    assert.equal((await call(a, 'question', { question: '첫 번째 질문입니다' })).wallet.points, before.a.wallet.points);
    assert.equal((await call(a, 'question', { question: '옮긴 뒤 새 질문입니다' })).wallet.points, before.a.wallet.points + 10);
  } finally { await pg.close(); }
});

test('기존 기록 올리기: 서버를 이미 쓰던 계정은 더해서 합치고, 다른 사람 기록이나 담당자 답변은 꾸며 올릴 수 없다', async () => {
  const local = await browser(), { pg, call } = await server();
  try {
    // 새 PC에서 먼저 서버를 썼다(질문 1개, 10 P)
    await call(a, 'question', { question: '새 PC에서 한 질문입니다' });
    // 예전 PC 브라우저에는 질문 2개(20 P)와 같은 질문 하나가 있었다
    await local.call(a); for (const q of ['예전 PC 질문 하나', '새 PC에서 한 질문입니다']) await local.call(a, 'question', { question: q });
    const merged = await call(a, 'import', { id: 'old-pc', data: await local.pick(a) });
    assert.equal(merged.wallet.points, 30); assert.equal(merged.wallet.questions, 2); // 포인트는 더하고, 질문 수는 겹치는 질문을 뺀 실제 기록 수
    assert.equal((await call(a, 'import', { id: 'old-pc', data: await local.pick(a) })).wallet.points, 30);
    // 또 다른 브라우저(다른 올리기 번호)는 한 번 더 더한다
    assert.equal((await call(a, 'import', { id: 'third-pc', data: { wallet: { points: 5 }, questions: [] } })).wallet.points, 35);

    // 꾸며 낸 요청: 남의 uid·남의 글에 대한 삭제·직원이 쓴 '담당자 답변'·잘못된 값은 모두 버린다
    const victim = (await call(b, 'post', { category: 'server', body: 'B가 올린 진짜 질문입니다' })).posts[0];
    const forged = await call(a, 'import', { id: 'forged', data: {
      wallet: { points: -100, owned: ['없는옷'] },
      questions: [{ id: 'q-x', uid: 'user-b', hash: 'f'.repeat(64), day: '2026-11-01', created: '2026-11-01T00:00:00.000Z' }, { id: 'q-bad', hash: 'short', day: '2026-11-01', created: '2026-11-01T00:00:00.000Z' }],
      attendance: [{ day: '2026-11-01', points: 9999, tokens: 0, created: '2026-11-01T00:00:00.000Z' }],
      operations: [{ id: 'import:other', kind: 'import', result: '{}', created: '2026-11-01T00:00:00.000Z' }],
      posts: [{ id: victim.id, hash: 'e'.repeat(64), category: 'server', body: '남의 글 id로 덮어쓰기 시도', created: '2026-11-01T00:00:00.000Z' }, { id: 'p-bad', hash: 'd'.repeat(64), category: '없는분야', body: '분야가 잘못된 글', created: '2026-11-01T00:00:00.000Z' }],
      deleted: [{ post: victim.id, deleted_at: '2026-11-01T00:00:00.000Z' }],
      likes: [{ post: victim.id, uid: 'user-c', created: '2026-11-01T00:00:00.000Z' }],
      replies: [{ id: 'r-x', post: victim.id, body: '직원이 꾸민 담당자 답변', source: '가짜 규정', created: '2026-11-01T00:00:00.000Z' }]
    } });
    assert.equal(forged.wallet.points, 35); assert.deepEqual(forged.wallet.owned, []);
    assert.equal((await pg.query("SELECT uid FROM nyang.questions WHERE id='q-x'")).rows[0].uid, 'user-a'); // uid는 로그인한 계정으로만 남는다
    assert.equal((await pg.query("SELECT COUNT(*)::int AS n FROM nyang.questions WHERE id='q-bad'")).rows[0].n, 0);
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM nyang.attendance')).rows[0].n, 0);
    assert.equal((await pg.query("SELECT COUNT(*)::int AS n FROM nyang.operations WHERE id='import:other'")).rows[0].n, 0);
    const seen = (await call(b)).posts.find((p) => p.id === victim.id);
    assert.equal(seen.body, 'B가 올린 진짜 질문입니다'); assert.equal(seen.replies.length, 0); assert.equal(seen.likes, 1); // 유익해요는 A 자신의 것 하나로만 남는다
    assert.equal((await pg.query('SELECT uid FROM nyang.likes')).rows[0].uid, 'user-a');
    assert.equal((await call(b)).wallet.points, 0); // 올리는 동안에는 유익해요 포인트를 새로 주지 않는다
    assert.equal((await call(staff)).deletedPosts.length, 0);
    await assert.rejects(call(a, 'import', { id: '', data: {} }), /확인/); await assert.rejects(call(a, 'import', { id: 'x' }), /확인/);
  } finally { await pg.close(); }
});

test('SQL 바꾸기: SQLite 문법을 Postgres 문법으로', () => {
  assert.equal(translate('INSERT OR IGNORE INTO demo_likes(post,uid,created) VALUES(?,?,?)'), 'INSERT INTO nyang.likes(post,uid,created) VALUES($1,$2,$3) ON CONFLICT DO NOTHING');
  assert.equal(translate("SELECT COUNT(*) AS n FROM demo_operations WHERE uid=? AND kind='pet' AND json_extract(result,'$.kind')='bonus' AND created>=?"), "SELECT COUNT(*)::int AS n FROM nyang.operations WHERE uid=$1 AND kind='pet' AND (result::jsonb->>'kind')='bonus' AND created>=$2");
  assert.equal(translate('SELECT COALESCE(SUM(CASE WHEN l.created<? THEN 5 ELSE 10 END),0) AS n FROM demo_likes l'), 'SELECT COALESCE(SUM(CASE WHEN l.created<$1 THEN 5 ELSE 10 END),0)::int AS n FROM nyang.likes l');
  assert.match(translate('SELECT id FROM (SELECT * FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts)) ORDER BY created'), /\) AS visible_posts ORDER BY/);
  assert.match(translate('SELECT p.id FROM (SELECT * FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts)) p ORDER BY created'), /deleted_posts\)\) p ORDER BY/);
  assert.equal(translate('UPDATE demo_wallets SET data=? WHERE uid=? AND changes()=1', 1), 'UPDATE nyang.wallets SET data=$1 WHERE uid=$2 AND 1=1');
});

test('서버 함수용 규칙 복사본은 원본과 같다 (다르면 npm run sync:nyang-server)', async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [new URL('../scripts/sync-nyang-server.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
});

test('잠금: 읽기만 하는 통계·개인 기록 읽기는 기다리지 않고, 나머지는 같은 사람끼리 차례로', () => {
  for (const action of ['stats', 'state']) assert.equal(needsLock(action), false);
  for (const action of [null, undefined, 'question', 'attendance', 'like', 'reward', 'post', 'reply', 'delete-post', 'restore-post', 'state-set', 'import']) assert.equal(needsLock(action), true, String(action));
});
