// 냥대리 서버 함수의 요청 처리(실행 환경과 무관한 부분). supabase/functions/nyang/index.ts가 로그인 확인과 DB 연결을 맡고,
// 여기서는 확인된 계정(account)과 요청(input)으로 규칙 코드를 실행한다. 테스트(tests/nyang-server.test.mjs)도 이 함수를 그대로 쓴다.
//   (action 없음)          화면 불러오기: 활동 기록 + 개인 기록(personalState)
//   question·attendance·post·like·reply·reward·delete-post·restore-post → 기존 규칙(demo-account.mjs)
//   stats        담당자 통계
//   state        내 개인 기록(내 일정·대화 기록 등) 모두 읽기
//   state-set    개인 기록 저장(items: [{key,value}], value가 null이면 지운다)
//   import       이 브라우저에만 있던 기존 활동 기록을 한 번 올린다
import { accountCommunity, statistics } from './demo-account.mjs';
import { AppError, HELPFUL_POINTS, seoulDay, wallet } from './community.mjs';
import { PET_BONUS_POINTS, QUESTION_POINTS, TREAT_COST } from './companion.mjs';
import { FIXED_CATEGORY_IDS, isCustomCategoryId } from './shared.mjs';

const fail = (message, status = 400) => { throw new AppError(message, status); };
const one = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const run = (db, sql, ...args) => db.prepare(sql).bind(...args).run();
const rows = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;

/**
 * 서버에 맞추는 개인 기록 이름: 내 일정, 내 활동 기록, 읽은 답변 표시, 대화 기록, 보던 대화, 추가 자료, 성격, 움직임, 화면 테마,
 * 고른 배경·직접 올린 배경 이미지(om-bg-theme-<화면>, om-bg-uploads-<화면>)
 */
export const STATE_KEY = /^(om-tasks|om-question-history|om-seen-replies|om-chat-sessions|om-chat-active|om-docs|om-personality|om-cat-motion|nyang-color-theme|om-bg-(theme|uploads)-[a-z]{1,12})$/;
/** 기록 하나의 최대 크기(JSON 글자 수). 오래 쓴 대화 기록·배경 이미지 8장까지 들어가게 넉넉히 둔다. */
export const STATE_MAX = 8_000_000;
/** 화면 불러오기 응답에 바로 넣는 기록 크기. 이보다 큰 기록(이미지 등)은 이름만 알려 주고 따로 받는다. */
export const STATE_INLINE_MAX = 200_000;
/** 요청 본문 최대 크기: 보통 요청 / 개인 기록 저장·기존 기록 올리기 */
export const BODY_MAX = 16_000, BODY_MAX_LARGE = 9_000_000;
export const isLargeAction = (action) => action === 'state-set' || action === 'import';
/** 같은 사람의 요청을 차례로 처리해야 하는 요청인지(읽기만 하는 통계·개인 기록 읽기는 잠그지 않는다) */
export const needsLock = (action) => action !== 'stats' && action !== 'state';

/**
 * 개인 기록 읽기. keys가 있으면 그 기록만. inline이면 큰 기록은 내용 대신 이름과 마지막 저장 시각(large: {이름: 시각})만 돌려준다.
 * updated: 기록마다 마지막 저장 시각(기기가 '내가 마지막으로 본 판'을 기억해 두었다가 저장할 때 함께 보낸다).
 */
async function readState(db, uid, { keys = null, inline = false } = {}) {
  const wanted = Array.isArray(keys) ? keys.filter((k) => typeof k === 'string' && STATE_KEY.test(k)).slice(0, 20) : null;
  if (wanted && !wanted.length) return { state: {}, large: {}, updated: {} };
  const list = await rows(db, 'SELECT key,value,updated FROM demo_user_state WHERE uid=?', uid);
  const state = {}, large = {}, updated = {};
  for (const r of list) {
    if (wanted && !wanted.includes(r.key)) continue;
    updated[r.key] = r.updated;
    if (inline && r.value.length > STATE_INLINE_MAX) large[r.key] = r.updated; else state[r.key] = r.value;
  }
  return { state, large, updated };
}

/**
 * 개인 기록 저장. 기록마다 ifUpdated(이 기기가 마지막으로 본 서버 저장 시각, 서버에 없었으면 null)를 함께 보내면,
 * 그 사이 다른 기기가 먼저 저장했을 때 덮어쓰지 않고 conflicts로 지금 서버 기록을 돌려준다(기기가 합쳐서 다시 보낸다).
 * ifUpdated를 보내지 않으면 확인 없이 저장한다(예전 화면).
 */
async function writeState(db, uid, input) {
  const items = Array.isArray(input.items) ? input.items : [{ key: input.key, value: input.value, ...('ifUpdated' in input ? { ifUpdated: input.ifUpdated } : {}) }];
  if (!items.length || items.length > 20) fail('저장할 기록을 확인해 주세요.');
  const now = new Date().toISOString(), saved = [], conflicts = [];
  for (const item of items) {
    if (!item || typeof item.key !== 'string' || !STATE_KEY.test(item.key)) fail('저장할 수 없는 기록이에요.');
    if ('ifUpdated' in item) {
      const current = await one(db, 'SELECT value,updated FROM demo_user_state WHERE uid=? AND key=?', uid, item.key);
      if ((current?.updated ?? null) !== (item.ifUpdated ?? null)) { conflicts.push({ key: item.key, value: current?.value ?? null, updated: current?.updated ?? null }); continue; }
    }
    saved.push(item.key);
    if (item.value === null) { await run(db, 'DELETE FROM demo_user_state WHERE uid=? AND key=?', uid, item.key); continue; }
    if (typeof item.value !== 'string' || item.value.length > STATE_MAX) fail('기록이 너무 커서 저장하지 못했어요.', 413);
    try { JSON.parse(item.value); } catch { fail('기록 형식을 확인해 주세요.'); }
    await run(db, 'INSERT INTO demo_user_state(uid,key,value,updated) VALUES(?,?,?,?) ON CONFLICT(uid,key) DO UPDATE SET value=excluded.value,updated=excluded.updated', uid, item.key, item.value, now);
  }
  // 저장 시각: 기기가 '내가 마지막으로 본 판'으로 기억하고, 큰 기록을 보낸 기기는 자기가 보낸 것을 다시 받지 않는다
  return { saved, updated: now, conflicts };
}

// ── 기존 기록 올리기 ───────────────────────────────────────────────
// 브라우저 저장소에 있던 '내가 한 일'만 받는다: 내 지갑, 내 질문·출석·보상 기록, 내가 올린 글, 내가 누른 유익해요,
// (담당자면) 내가 쓴 답변과 삭제한 글. 누가 했는지(uid)는 요청 본문이 아니라 로그인한 계정으로 정한다.
// 아직 서버에 없는 글에 달린 유익해요·답변은 미뤄 두고(pending), 글쓴이가 자기 기록을 올린 뒤 다시 올린다.
const text = (v, max, min = 1) => (typeof v === 'string' && v.length >= min && v.length <= max ? v : null);
const stamp = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]{8,12}Z$/.test(v) ? v : null);
const dayOf = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const whole = (v, max) => (Number.isSafeInteger(v) && v >= 0 && v <= max ? v : null);
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === 'object') : []);
const LIMITS = { questions: 5000, attendance: 800, operations: 5000, posts: 1000, likes: 5000, replies: 5000, deleted: 1000 };
/** 냥대리를 처음 쓰기 시작한 날. 이보다 이른 날짜의 질문·출석은 꾸며 낸 기록이다. */
const SERVICE_START = '2026-11-01';
/** 근거로 다 셀 수 없는 포인트(같은 PC를 함께 쓴 사람이 누른 유익해요 등)를 위해 더 인정해 주는 여유분 */
const IMPORT_SLACK = 100;
/** 올린 지갑을 믿을 수 있는 만큼: 서버에 남은 근거(질문·출석·유익해요·쓰다듬기 보너스)로 받을 수 있었던 포인트·하트·츄르 이용권 */
async function importCeiling(db, uid) {
  const n = async (sql, ...args) => Number((await one(db, sql, ...args)).n) || 0;
  const questions = await n('SELECT COUNT(*) AS n FROM demo_questions WHERE uid=?', uid);
  const attendance = await n('SELECT COALESCE(SUM(points),0) AS n FROM demo_attendance WHERE uid=?', uid);
  const tokens = await n('SELECT COALESCE(SUM(tokens),0) AS n FROM demo_attendance WHERE uid=?', uid);
  const likes = await n('SELECT COUNT(*) AS n FROM demo_likes l JOIN demo_posts p ON p.id=l.post WHERE p.author=? AND l.uid<>?', uid, uid);
  // 쓰다듬기 보너스는 드물다(약 2%, companion.js). 꾸민 기록으로 부풀리지 못하게 100번까지만 근거로 센다.
  const bonuses = Math.min(100, await n("SELECT COUNT(*) AS n FROM demo_operations WHERE uid=? AND kind='pet' AND json_extract(result,'$.kind')='bonus'", uid));
  const points = questions * QUESTION_POINTS + attendance + likes * HELPFUL_POINTS + bonuses * PET_BONUS_POINTS + IMPORT_SLACK;
  // 하트는 츄르 한 번에 3개: 받을 수 있었던 포인트·츄르 이용권으로 살 수 있었던 츄르 수까지
  return { points, treatTokens: tokens, hearts: 3 * (Math.floor(points / TREAT_COST) + tokens) };
}

async function importLocal(db, account, input) {
  const uid = account.id, staff = account.role === 'staff';
  const importId = text(input.id, 100), data = input.data && typeof input.data === 'object' ? input.data : null;
  if (!uid || !importId || !data) fail('올릴 기록을 확인해 주세요.');
  await accountCommunity(db, account); // 계정·지갑 행을 먼저 만든다
  const opId = 'import:' + importId;
  const first = !(await one(db, 'SELECT 1 AS n FROM demo_operations WHERE uid=? AND id=?', uid, opId));
  // 포인트와 이어지는 기록(지갑·질문·출석·쓰다듬기 결과)은 계정당 처음 한 번만 받는다.
  // (예전에는 브라우저마다 받아서, 올리기 번호만 바꿔 같은 요청을 되풀이하면 포인트를 끝없이 늘릴 수 있었다)
  const rewards = first && !(await one(db, "SELECT 1 AS n FROM demo_operations WHERE uid=? AND kind='import'", uid));
  const today = seoulDay(), inService = (day) => day && day >= SERVICE_START && day <= today;
  // 이 요청(트랜잭션) 안에서는 포인트 트리거를 건너뛴다. 포인트는 아래에서 지갑으로 한 번만 옮긴다.
  await one(db, "SELECT set_config('nyang.importing','1',true) AS on_import");
  let pending = 0;
  const exists = async (post) => (await one(db, 'SELECT author FROM demo_posts WHERE id=?', post));

  // 질문은 화면과 같은 규칙(하루 20개까지)으로, 서비스 시작일~오늘 사이 날짜만 받는다
  if (rewards) for (const q of list(data.questions, LIMITS.questions)) {
    const id = text(q.id, 100), hash = text(q.hash, 64, 64), day = dayOf(q.day), created = stamp(q.created);
    if (id && hash && inService(day) && created) await run(db, `INSERT OR IGNORE INTO demo_questions(id,uid,hash,day,created)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM demo_questions WHERE uid=? AND day=?)<20`, id, uid, hash, day, created, uid, day);
  }
  if (rewards) for (const a of list(data.attendance, LIMITS.attendance)) {
    const day = dayOf(a.day), points = whole(a.points, 10), tokens = whole(a.tokens, 3), created = stamp(a.created);
    if (inService(day) && points !== null && tokens !== null && created) await run(db, 'INSERT OR IGNORE INTO demo_attendance(uid,day,points,tokens,created) VALUES(?,?,?,?,?)', uid, day, points, tokens, created);
  }
  if (rewards) for (const o of list(data.operations, LIMITS.operations)) {
    const id = text(o.id, 100), result = text(o.result, 2000), created = stamp(o.created);
    if (!id || id.startsWith('import:') || !['pet', 'feed', 'collect', 'buy', 'equip'].includes(o.kind) || !result || !created) continue;
    try { JSON.parse(result); } catch { continue; }
    await run(db, 'INSERT OR IGNORE INTO demo_operations(uid,id,kind,result,created) VALUES(?,?,?,?,?)', uid, id, o.kind, result, created);
  }
  for (const p of list(data.posts, LIMITS.posts)) {
    const id = text(p.id, 100), hash = text(p.hash, 64, 64), body = text(p.body, 2000, 5), created = stamp(p.created);
    const category = FIXED_CATEGORY_IDS.includes(p.category) || isCustomCategoryId(String(p.category)) ? p.category : null;
    if (id && hash && body && created && category) await run(db, 'INSERT OR IGNORE INTO demo_posts(id,author,hash,category,body,created) VALUES(?,?,?,?,?,?)', id, uid, hash, category, body, created);
  }
  for (const d of list(data.deleted, LIMITS.deleted)) {
    const post = text(d.post, 100), at = stamp(d.deleted_at);
    if (!post || !at) continue;
    const found = await exists(post);
    if (!found) { pending++; continue; }
    // 직원은 자기 글만, 담당자는 어느 글이든 삭제 표시를 옮길 수 있다
    if (staff) await run(db, 'INSERT OR IGNORE INTO demo_deleted_posts(post,deleted_by,deleted_at) VALUES(?,?,?)', post, account.username || 'staff', at);
    else if (found.author === uid) await run(db, 'INSERT OR IGNORE INTO demo_deleted_posts(post,deleted_by,deleted_at) VALUES(?,?,?)', post, 'author', at);
  }
  if (!staff) for (const l of list(data.likes, LIMITS.likes)) {
    const post = text(l.post, 100), created = stamp(l.created);
    if (!post || !created) continue;
    const found = await exists(post);
    if (!found) { pending++; continue; }
    if (found.author !== uid) await run(db, 'INSERT OR IGNORE INTO demo_likes(post,uid,created) VALUES(?,?,?)', post, uid, created);
  }
  if (staff) for (const r of list(data.replies, LIMITS.replies)) {
    const id = text(r.id, 100), post = text(r.post, 100), body = text(r.body, 4000, 5), source = text(r.source, 500, 2), created = stamp(r.created);
    if (!id || !post || !body || !source || !created) continue;
    if (!(await exists(post))) { pending++; continue; }
    // 답변자 표시는 요청 본문이 아니라 로그인한 담당자 계정으로 남긴다
    await run(db, 'INSERT OR IGNORE INTO demo_replies(id,post,staff,department,name,body,source,created) VALUES(?,?,?,?,?,?,?,?)', id, post, uid, account.department || '담당 부서', account.name, body, source, created);
  }

  if (first) {
    // 지갑은 계정당 한 번만 옮긴다. 서버 지갑을 아직 쓴 적이 없으면 그대로 옮기고, 이미 쓰고 있으면 더한다.
    // 올린 지갑 값은 꾸밀 수 있으므로, 서버에 남은 근거로 받을 수 있었던 만큼까지만 인정한다.
    const row = await one(db, 'SELECT data,version FROM demo_wallets WHERE uid=?', uid), server = wallet(row.data);
    let local = null;
    try { local = rewards && data.wallet ? wallet(data.wallet) : null; } catch { local = null; }
    if (local) {
      const cap = await importCeiling(db, uid), room = (key) => Math.max(0, cap[key] - (row.version === 0 ? 0 : server[key] || 0));
      for (const key of ['points', 'hearts', 'treatTokens']) local[key] = Math.min(Math.max(0, local[key] || 0), room(key));
    }
    if (local) {
      const sum = (key) => Math.min(Number.MAX_SAFE_INTEGER, (server[key] || 0) + (local[key] || 0));
      const merged = row.version === 0 ? { ...local } : { ...server, points: sum('points'), hearts: sum('hearts'), treats: sum('treats'), pettings: sum('pettings'), petBonuses: sum('petBonuses'), treatTokens: sum('treatTokens'), owned: [...new Set([...server.owned, ...local.owned])], equipped: server.equipped ?? local.equipped };
      merged.questions = (await one(db, 'SELECT COUNT(*) AS n FROM demo_questions WHERE uid=?', uid)).n; // 레벨은 실제 질문 기록 수로 맞춘다
      await run(db, 'UPDATE demo_wallets SET data=?,version=version+1 WHERE uid=?', JSON.stringify(wallet(merged)), uid);
    }
    await run(db, 'INSERT OR IGNORE INTO demo_operations(uid,id,kind,result,created) VALUES(?,?,?,?,?)', uid, opId, 'import', JSON.stringify({ pending }), new Date().toISOString());
  }
  await one(db, "SELECT set_config('nyang.importing','0',true) AS on_import");
  return { ...(await accountCommunity(db, account)), imported: { first, pending } };
}

/**
 * 요청 하나를 처리한다. db: 규칙 코드가 쓰는 D1 모양 연결(postgresDatabase), account: 로그인으로 확인한 계정
 * {id, username, name, department, role:'staff'|'employee'}. 역할·아이디는 요청 본문에서 받지 않는다.
 */
export async function handleNyang(db, account, input) {
  if (!account?.id) fail('로그인 후 이용해 주세요.', 401);
  const action = input?.action ?? null;
  if (action === 'stats') return statistics(db, account);
  if (action === 'state') { const { state, updated } = await readState(db, account.id, { keys: input.keys ?? null }); return { state, updated }; }
  if (action === 'state-set') return writeState(db, account.id, input);
  // 화면을 불러올 때는 개인 기록(내 일정·대화 기록 등)도 함께 돌려준다(요청을 한 번 줄인다). 큰 기록은 이름과 저장 시각만(personalLarge: {이름: 시각}).
  const personal = async () => { const { state, large, updated } = await readState(db, account.id, { inline: true }); return { personalState: state, personalLarge: large, personalUpdated: updated }; };
  if (action === 'import') return { ...(await importLocal(db, account, input)), ...(await personal()) };
  if (action === null) return { ...(await accountCommunity(db, account)), ...(await personal()) };
  return accountCommunity(db, account, action, input);
}
