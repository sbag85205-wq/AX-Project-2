import {normalizeRewards,rewardTransition,petOutcome} from './companion.mjs';
export class AppError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=400)=>{throw new AppError(message,status);};
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const categories=['hr','pay','trip','life'],roles=['employee','staff'];
export const seoulDay=(date=new Date())=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
export function drawReward(roll){
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid random roll');
 return roll<.5?{points:5,tokens:0}:roll<.8?{points:10,tokens:0}:roll<.95?{points:0,tokens:1}:{points:0,tokens:3};
}
export function levelFor(count){
 const levels=[{at:0,name:'호기심 새싹'},{at:5,name:'질문 탐험가'},{at:15,name:'업무 탐정'},{at:30,name:'지식 연결자'},{at:50,name:'질문 마스터'}];
 const index=levels.findLastIndex(l=>count>=l.at),level=levels[Math.max(0,index)],next=levels[index+1];
 return {level:index+1,name:level.name,next:next?.at??null,progress:next?Math.min(100,Math.round((count-level.at)/(next.at-level.at)*100)):100};
}
const rand=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
const text=(value,min,max,label)=>{
 if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(`${label}: ${min}~${max}자로 입력해 주세요.`);
 return value.trim();
};
const id=value=>text(value,1,100,'요청 번호');
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim())))).map(x=>x.toString(16).padStart(2,'0')).join('');
export function wallet(value){const parsed=typeof value==='string'?JSON.parse(value):value;return {...normalizeRewards(parsed),treatTokens:Math.max(0,Number(parsed?.treatTokens)||0)};}
async function memberFor(db,user,adminEmail){
 if(!user)return null;
 const email=user.email.toLowerCase().trim();
 if(adminEmail&&email===adminEmail.toLowerCase().trim()){
  await run(db,`INSERT INTO members(email,uid,role,department,name,active) VALUES(?,?,'admin','관리자',?,1)
   ON CONFLICT(email) DO UPDATE SET uid=excluded.uid,role='admin',active=1`,email,user.userId,user.fullName||'관리자');
 }
 const m=await one(db,'SELECT * FROM members WHERE email=?',email);
 if(!m||!m.active||m.uid&&m.uid!==user.userId)return null;
 if(!m.uid)await run(db,'UPDATE members SET uid=? WHERE email=? AND uid IS NULL',user.userId,email);
 await run(db,'INSERT OR IGNORE INTO wallets(uid,data,version) VALUES(?,?,0)',user.userId,JSON.stringify(wallet(null)));
 return {...m,uid:user.userId};
}
async function snapshot(db,user,m){
 const raw=await one(db,'SELECT data FROM wallets WHERE uid=?',user.userId),w=wallet(raw.data);
 const day=seoulDay(),today=await one(db,'SELECT day,points,tokens FROM attendance WHERE uid=? AND day=?',user.userId,day);
 const records=await rows(db,'SELECT day FROM attendance WHERE uid=? ORDER BY day DESC LIMIT 400',user.userId);
 let streak=0,expected=day;
 if(records[0]?.day!==day)expected=new Date(new Date(day).getTime()-86400000).toISOString().slice(0,10);
 for(const row of records){if(row.day!==expected)break;streak++;expected=new Date(new Date(expected).getTime()-86400000).toISOString().slice(0,10);}
 const list=await rows(db,`SELECT p.id,p.category,p.body,p.created,p.author=? AS mine,
  (SELECT COUNT(*) FROM likes l WHERE l.post=p.id) AS likes,
  EXISTS(SELECT 1 FROM likes l WHERE l.post=p.id AND l.uid=?) AS liked
  FROM posts p ORDER BY created DESC LIMIT 200`,user.userId,user.userId);
 const answers=await rows(db,`SELECT id,post,department,name,body,source,created FROM replies
  WHERE post IN (SELECT id FROM posts ORDER BY created DESC LIMIT 200) ORDER BY created ASC`);
 const likeCount=await one(db,'SELECT COUNT(*) AS n FROM likes l JOIN posts p ON p.id=l.post WHERE p.author=?',user.userId);
 return {authenticated:true,member:true,me:{name:user.fullName||'직원',email:user.email,role:m.role,department:m.department},
  wallet:w,level:levelFor(w.questions),today,day,streak,receivedLikes:likeCount.n,
  posts:list.map(p=>({...p,mine:!!p.mine,liked:!!p.liked,replies:answers.filter(r=>r.post===p.id)})),
  members:m.role==='admin'?await rows(db,'SELECT email,role,department,name,active FROM members ORDER BY email'):undefined};
}
// D1 batches atomically record the operation and compare-and-swap its wallet version.
async function mutateWallet(db,uid,eventId,kind,transform){
 const previous=await one(db,'SELECT kind,result FROM operations WHERE uid=? AND id=?',uid,eventId);
 if(previous){if(previous.kind!==kind)fail('이미 사용한 요청 번호입니다.');return JSON.parse(previous.result);}
 for(let attempt=0;attempt<5;attempt++){
  const row=await one(db,'SELECT data,version FROM wallets WHERE uid=?',uid);
  const {next,result}=transform(wallet(row.data));
  await db.batch([
   db.prepare(`INSERT OR IGNORE INTO operations(uid,id,kind,result,created) SELECT ?,?,?,?,?
    WHERE EXISTS(SELECT 1 FROM wallets WHERE uid=? AND version=?)`).bind(uid,eventId,kind,JSON.stringify(result),new Date().toISOString(),uid,row.version),
   db.prepare(`UPDATE wallets SET data=?,version=version+1 WHERE uid=? AND version=? AND changes()=1
    AND EXISTS(SELECT 1 FROM operations WHERE uid=? AND id=? AND kind=?)`).bind(JSON.stringify(next),uid,row.version,uid,eventId,kind),
  ]);
  const saved=await one(db,'SELECT result FROM operations WHERE uid=? AND id=?',uid,eventId);
  if(saved)return JSON.parse(saved.result);
 }
 fail('다른 활동을 저장 중이에요. 잠시 후 다시 시도해 주세요.',409);
}
export async function community(db,user,adminEmail,action=null,input={}){
 const m=await memberFor(db,user,adminEmail);
 if(!action){
  if(!user)return {authenticated:false,member:false};
  if(!m)return {authenticated:true,member:false,email:user.email,configured:!!adminEmail};
  return snapshot(db,user,m);
 }
 if(!user)fail('로그인 후 이용해 주세요.',401);
 if(!m)fail('관리자에게 직원 등록을 요청해 주세요.',403);
 const uid=user.userId,now=new Date().toISOString(),day=seoulDay();
 let notice='',eventResult=null;
 if(action==='question'){
  const q=text(input.question,2,1000,'질문'),h=await hash(q);
  const out=await run(db,`INSERT OR IGNORE INTO questions(id,uid,hash,day,created)
   SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM questions WHERE uid=? AND day=?)<20`,crypto.randomUUID(),uid,h,day,now,uid,day);
  notice=out.meta.changes?'새 질문 +10 P · 질문 경험치 +1':'같은 질문은 한 번만 보상해요. 하루 보상은 최대 20개예요.';
 }else if(action==='attendance'){
  const reward=drawReward(rand());
  await run(db,'INSERT OR IGNORE INTO attendance(uid,day,points,tokens,created) VALUES(?,?,?,?,?)',uid,day,reward.points,reward.tokens,now);
  eventResult=await one(db,'SELECT day,points,tokens FROM attendance WHERE uid=? AND day=?',uid,day);
  notice=eventResult.tokens?`오늘의 선물, 츄르 ${eventResult.tokens}개!`:`오늘의 선물, ${eventResult.points} P!`;
 }else if(action==='post'){
  if(!categories.includes(input.category))fail('분야를 선택해 주세요.');
  const body=text(input.body,5,2000,'질문'),h=await hash(body);
  const cutoff=new Date(new Date(day+'T00:00:00+09:00')).toISOString();
  const result=await run(db,`INSERT OR IGNORE INTO posts(id,author,hash,category,body,created)
   SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM posts WHERE author=? AND created>=?)<10`,crypto.randomUUID(),uid,h,input.category,body,now,uid,cutoff);
  notice=result.meta.changes?'익명으로 게시했어요. 담당자의 답변을 기다려 주세요.':'이미 게시한 질문이거나 오늘 게시 한도(10개)에 도달했어요.';
 }else if(action==='like'){
  const post=await one(db,'SELECT author FROM posts WHERE id=?',id(input.post));
  if(!post)fail('질문을 찾을 수 없어요.',404);
  if(post.author===uid)fail('내 질문에는 좋아요를 누를 수 없어요.');
  const result=await run(db,'INSERT OR IGNORE INTO likes(post,uid,created) VALUES(?,?,?)',input.post,uid,now);
  notice=result.meta.changes?'질문 작성자에게 5 P를 보냈어요.':'이미 좋아요를 보낸 질문이에요.';
 }else if(action==='reply'){
  if(!['staff','admin'].includes(m.role))fail('등록된 담당자만 답변할 수 있어요.',403);
  const post=id(input.post),body=text(input.body,5,4000,'답변'),source=text(input.source,2,500,'근거 문서·규정'),replyId=id(input.id);
  if(!await one(db,'SELECT id FROM posts WHERE id=?',post))fail('질문을 찾을 수 없어요.',404);
  await run(db,'INSERT OR IGNORE INTO replies(id,post,staff,department,name,body,source,created) VALUES(?,?,?,?,?,?,?,?)',replyId,post,uid,m.department||'담당 부서',m.name,body,source,now);
  notice='담당자 답변을 등록했어요.';
 }else if(action==='member'){
  if(m.role!=='admin')fail('관리자만 직원 권한을 변경할 수 있어요.',403);
  const email=text(input.email,3,254,'이메일').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('이메일을 확인해 주세요.');
  if(email===adminEmail?.trim().toLowerCase())fail('최초 관리자 권한은 이 화면에서 변경할 수 없어요.');
  if(!roles.includes(input.role))fail('권한을 선택해 주세요.');
  const department=input.role==='staff'?text(input.department,2,50,'담당 부서'):'';
  const name=input.role==='staff'?text(input.name,2,50,'답변에 표시할 이름'):'직원';
  await run(db,`INSERT INTO members(email,role,department,name,active) VALUES(?,?,?,?,?)
   ON CONFLICT(email) DO UPDATE SET role=excluded.role,department=excluded.department,name=excluded.name,active=excluded.active`,
  email,input.role,department,name,input.active===false?0:1);
  notice='직원 권한을 저장했어요. 등록한 이메일의 ChatGPT 계정으로 로그인하면 됩니다.';
 }else if(action==='reward'){
  const type=input.type;
  if(!['pet','feed','collect','buy','equip'].includes(type))fail('지원하지 않는 보상 요청입니다.');
  eventResult=await mutateWallet(db,uid,id(input.id),type,w=>{
   let event={type},extra={};
   if(type==='pet'){
    const at=Date.now();if(w.lastPetAt&&at-w.lastPetAt<4200)fail('잠깐, 여운을 즐기는 중이다냥.',429);
    event={type,id:input.id,at,likeRoll:rand(),bonusRoll:rand()};extra.kind=petOutcome(event.likeRoll,event.bonusRoll);
   }
   if(type==='feed'){
    if(w.pending.length)fail('먼저 하트를 모아 주세요.');
    event.ids=Array.from({length:3},()=>crypto.randomUUID());
    if(w.treatTokens>0)return {next:{...w,treatTokens:w.treatTokens-1,treats:w.treats+1,pending:event.ids},result:{}};
   }
   if(type==='collect')event.id=id(input.heart);
   if(type==='buy'||type==='equip')event.id=input.item??null;
   let next;try{next={...rewardTransition(w,event),treatTokens:w.treatTokens};}catch(e){fail(e.message);}
   return {next,result:extra};
  });
 }else fail('지원하지 않는 요청입니다.');
 // Petting only changes the wallet. Keep old clients on the full response,
 // while current clients avoid reloading the board and attendance on every stroke.
 if(action==='reward'&&input.type==='pet'&&input.response==='wallet'){
  const row=await one(db,'SELECT data FROM wallets WHERE uid=?',uid),w=wallet(row.data);
  return {partial:'wallet',wallet:w,level:levelFor(w.questions),notice,eventResult};
 }
 return {...await snapshot(db,user,m),notice,eventResult};
}
