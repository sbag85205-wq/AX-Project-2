// 냥대리 통합 앱의 계정별 활동(포인트·출석·게시판·통계) 처리. 브라우저 안 SQLite(local-store.ts)에서 실행된다.
// 계정은 로그인한 Knowly 프로필에서 만든 객체 하나뿐이다(transport.ts currentAccount):
//   {id: Knowly 사용자 UUID, username: 로그인 아이디, name, department, role: 'employee'|'staff'}
// 보상·게시판 규칙은 원래 냥대리 서버와 같은 nyang-frontend/lib/community.mjs를 그대로 쓴다.
import {AppError,community,seoulDay,wallet} from '../../nyang-frontend/lib/community.mjs';
import {categoryCounts} from '../../nyang-frontend/public/common.js';

/** 데이터가 들어 있는 테이블. 원래 냥대리 서버의 계정 데모(demo_*) 테이블과 같은 스키마(drizzle 0003·0005)를 쓴다. */
export const TABLES={members:'demo_members',wallets:'demo_wallets',questions:'demo_questions',posts:'demo_posts',likes:'demo_likes',
 replies:'demo_replies',attendance:'demo_attendance',operations:'demo_operations',deletedPosts:'demo_deleted_posts'};
const T=TABLES;
const COMMUNITY_TABLES=['members','wallets','questions','posts','likes','replies','attendance','operations'];

const fail=(message,status)=>{throw new AppError(message,status);};
const one=(db,q,...args)=>db.prepare(q).bind(...args).first();
const run=(db,q,...args)=>db.prepare(q).bind(...args).run();
const rows=async(db,q,...args)=>(await db.prepare(q).bind(...args).all()).results;

/**
 * community.mjs는 기본 테이블 이름(members, posts …)으로 SQL을 쓴다. 그 SQL을 위 TABLES로 바꿔 실행하고,
 * 삭제된 질문은 게시판·보상 계산에서 보이지 않게 한다. 이 파일의 다른 SQL은 TABLES 이름을 직접 쓴다.
 */
function communityDatabase(db){
 const names=new RegExp(`\\b(FROM|INTO|UPDATE|JOIN)\\s+(${COMMUNITY_TABLES.join('|')})\\b`,'gi');
 const visiblePosts=`(SELECT * FROM ${T.posts} WHERE id NOT IN (SELECT post FROM ${T.deletedPosts}))`;
 return {
  prepare(q){
   const scoped=q.replace(names,(_,k,t)=>`${k} ${T[t.toLowerCase()]}`);
   return db.prepare(scoped.replace(new RegExp(`\\b(FROM|JOIN)\\s+${T.posts}\\b`,'gi'),(_,k)=>`${k} ${visiblePosts}`));
  },
  batch:s=>db.batch(s)
 };
}

function checkAccount(account){
 if(!account||typeof account.id!=='string'||!account.id||!['employee','staff'].includes(account.role))fail('로그인 후 이용해 주세요.',401);
 return account;
}

/** 내 게시판·지갑 상태를 읽거나(action 없음) 활동 하나를 처리한다. */
export async function accountCommunity(db,account,action=null,input={}){
 checkAccount(account);
 const staff=account.role==='staff';
 const allowed=staff?['reply','delete-post','restore-post']:['question','attendance','post','like','reward','delete-post'];
 if(action&&!allowed.includes(action))fail(staff?'담당자는 게시판 관리와 통계 기능을 이용할 수 있어요.':'담당자만 이 작업을 할 수 있어요.',403);
 const uid=account.id,email=account.id+'@knowly.internal';
 // 값이 같으면 행을 바꾸지 않는다(읽기만 한 요청은 저장하지 않도록, local-db.mjs runOnce changed).
 await run(db,`INSERT INTO ${T.members}(email,uid,role,department,name,active) VALUES(?,?,?,?,?,1) ON CONFLICT(email) DO UPDATE SET role=excluded.role,department=excluded.department,name=excluded.name WHERE role IS NOT excluded.role OR department IS NOT excluded.department OR name IS NOT excluded.name`,
  email,uid,account.role,account.department,account.name);
 let notice='';
 if(action==='delete-post'||action==='restore-post'){
  if(typeof input.post!=='string'||input.post.length>100)fail('질문을 확인해 주세요.',400);
  const post=await one(db,`SELECT id,author FROM ${T.posts} WHERE id=?`,input.post);
  if(!post)fail('질문을 찾을 수 없어요.',404);
  if(!staff&&post.author!==uid)fail('본인이 작성한 질문만 삭제할 수 있어요.',403);
  if(action==='delete-post'){
   await run(db,`INSERT OR IGNORE INTO ${T.deletedPosts}(post,deleted_by,deleted_at) VALUES(?,?,?)`,input.post,staff?account.username:'author',new Date().toISOString());
   notice=staff?'질문을 삭제했어요. 삭제된 글에서 복원할 수 있어요.':'내 질문을 삭제했어요.';
  }else{
   await run(db,`DELETE FROM ${T.deletedPosts} WHERE post=?`,input.post);notice='질문을 복원했어요.';
  }
  action=null;
 }
 const result=await community(communityDatabase(db),{userId:uid,email,fullName:account.name},undefined,action,input);
 if(result.partial)return result;
 // 답변 작성자는 담당자 이름(r.name)으로 표시한다. authorUsername은 이전 데모 계정 전용이라 비워 둔다.
 const posts=result.posts.map(p=>({...p,replies:p.replies.map(r=>({...r,authorUsername:'',authorRole:'staff'}))}));
 const deletedPosts=staff?await rows(db,`SELECT p.id,p.category,p.body,p.created,d.deleted_at FROM ${T.deletedPosts} d JOIN ${T.posts} p ON p.id=d.post ORDER BY d.deleted_at DESC LIMIT 200`):undefined;
 return {...result,...(notice?{notice}:{}),posts,deletedPosts,demoMode:false,me:{...account},members:undefined};
}

/** 담당자용 이용통계(이 브라우저에 저장된 직원 계정 활동만). */
export async function statistics(db,account){
 checkAccount(account);
 if(account.role!=='staff')fail('담당자만 통계를 볼 수 있어요.',403);
 const day=seoulDay(),start=new Date(new Date(day).getTime()-6*86400000).toISOString().slice(0,10);
 const count=async(q,...args)=>(await one(db,q,...args)).n;
 const visible=`id NOT IN (SELECT post FROM ${T.deletedPosts})`;
 const [questions,posts,answered,attendance,likes,daily,categories,rank]=await Promise.all([
  count(`SELECT COUNT(*) AS n FROM ${T.questions} q JOIN ${T.members} m ON m.uid=q.uid WHERE m.role='employee'`),
  count(`SELECT COUNT(*) AS n FROM ${T.posts} WHERE ${visible}`),
  count(`SELECT COUNT(*) AS n FROM ${T.posts} p WHERE p.${visible} AND EXISTS(SELECT 1 FROM ${T.replies} r WHERE r.post=p.id)`),
  count(`SELECT COUNT(*) AS n FROM ${T.attendance} a JOIN ${T.members} m ON m.uid=a.uid WHERE a.day=? AND m.role='employee'`,day),
  count(`SELECT COUNT(*) AS n FROM ${T.likes} WHERE post NOT IN (SELECT post FROM ${T.deletedPosts})`),
  rows(db,`SELECT q.day,COUNT(*) AS n FROM ${T.questions} q JOIN ${T.members} m ON m.uid=q.uid WHERE q.day>=? AND m.role='employee' GROUP BY q.day`,start),
  rows(db,`SELECT category,COUNT(*) AS n FROM ${T.posts} WHERE ${visible} GROUP BY category`),
  rows(db,`SELECT m.uid,m.name,m.role,w.data FROM ${T.members} m JOIN ${T.wallets} w ON w.uid=m.uid WHERE m.role='employee'`)]);
 return {day,updatedAt:new Date().toISOString(),accounts:await count(`SELECT COUNT(*) AS n FROM ${T.members} WHERE role='employee' AND active=1`),questions,posts,answered,waiting:posts-answered,attendance,likes,
  daily:Array.from({length:7},(_,i)=>{const d=new Date(new Date(start).getTime()+i*86400000).toISOString().slice(0,10);return {day:d,n:daily.find(x=>x.day===d)?.n||0};}),
  categories:categoryCounts(categories),
  ranking:rank.map(r=>({username:r.name,name:r.name,role:r.role,points:wallet(r.data).points,questions:wallet(r.data).questions})).sort((a,b)=>b.points-a.points||a.username.localeCompare(b.username)).slice(0,3)};
}
