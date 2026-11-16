// 이 브라우저에만 저장돼 있던 냥대리 활동 기록에서 '내가 한 일'만 골라낸다(서버로 한 번 올리기 위해).
// db: local-db.mjs의 d1() 모양. uid: 로그인한 Knowly 계정 id. 올릴 것이 없으면 null.
const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;

export async function exportLocal(db, uid) {
  const wallet = (await all(db, 'SELECT data FROM demo_wallets WHERE uid=?', uid))[0]?.data ?? null;
  const data = {
    wallet,
    questions: await all(db, 'SELECT id,hash,day,created FROM demo_questions WHERE uid=?', uid),
    attendance: await all(db, 'SELECT day,points,tokens,created FROM demo_attendance WHERE uid=?', uid),
    operations: await all(db, 'SELECT id,kind,result,created FROM demo_operations WHERE uid=?', uid),
    posts: await all(db, 'SELECT id,hash,category,body,created FROM demo_posts WHERE author=?', uid),
    likes: await all(db, 'SELECT post,created FROM demo_likes WHERE uid=?', uid),
    replies: await all(db, 'SELECT id,post,body,source,created FROM demo_replies WHERE staff=?', uid),
    // 삭제 표시: 내 글의 것과 담당자가 지운 글의 것. 서버가 역할에 맞는 것만 받는다(직원은 자기 글, 담당자는 모두).
    deleted: await all(db, "SELECT d.post,d.deleted_at FROM demo_deleted_posts d JOIN demo_posts p ON p.id=d.post WHERE p.author=? OR d.deleted_by<>'author'", uid)
  };
  const empty = !wallet && ['questions', 'attendance', 'operations', 'posts', 'likes', 'replies', 'deleted'].every((k) => !data[k].length);
  return empty ? null : data;
}
