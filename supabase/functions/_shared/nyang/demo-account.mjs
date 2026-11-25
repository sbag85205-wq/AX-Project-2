// 자동 복사본입니다. 직접 고치지 말고 nyang-frontend/lib/demo-account.mjs 를 고친 뒤 `npm run sync:nyang-server`를 실행하세요.
import {AppError,community,seoulDay,wallet,earnedPoints,rankingSince,levelFor} from './community.mjs';
import {CURRENT_CATEGORY_IDS} from './shared.mjs';
const accounts={user01:{role:'employee',name:'직원',department:''},admin01:{role:'staff',name:'담당자',department:'운영 담당'}};
export const accountRole=username=>accounts[username]?.role||null;
const hex=a=>Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const one=(db,q,...args)=>db.prepare(q).bind(...args).first();
const run=(db,q,...args)=>db.prepare(q).bind(...args).run();
const rows=async(db,q,...args)=>(await db.prepare(q).bind(...args).all()).results;
const fail=(message,status)=>{throw new AppError(message,status);};
export function accountDatabase(db){return {prepare(q){
 const scoped=q.replace(/\b(FROM|INTO|UPDATE|JOIN)\s+(members|wallets|questions|posts|likes|replies|attendance|operations)\b/gi,(_,k,t)=>`${k} demo_${t.toLowerCase()}`);
 return db.prepare(scoped.replace(/\b(FROM|JOIN)\s+demo_posts\b/gi,(_,k)=>`${k} (SELECT * FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts))`));
},batch:s=>db.batch(s)};}
export async function passwordHash(password,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);
 return `${salt}:${hex(bits)}`;
}
function config(env){const value=env.NYANG_DEMO_PASSWORD_HASH;if(!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(value||''))fail('로그인 설정을 준비 중이에요.',503);return value;}
function tokenFrom(request){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nyang-account='))?.slice(14);}
// 세션 쿠키는 /api 아래 모든 경로(계정·사내 문서 검색 연결)에서 쓴다. 예전 /api/account 경로 쿠키는 지운다.
function cookie(request,token,age=86400,path='/api'){return `nyang-account=${token}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
const legacyCookie=request=>cookie(request,'',0,'/api/account');
export async function login(db,env,request,input,now=Date.now()){
 const expected=config(env),bucket=Math.floor(now/900000),ip=await digest(request.headers.get('cf-connecting-ip')||'local');
 await run(db,'DELETE FROM demo_login_limits WHERE bucket<?',bucket-1);
 await run(db,`INSERT INTO demo_login_limits(ip,bucket,attempts) VALUES(?,?,1) ON CONFLICT(ip,bucket) DO UPDATE SET attempts=attempts+1`,ip,bucket);
 if((await one(db,'SELECT attempts FROM demo_login_limits WHERE ip=? AND bucket=?',ip,bucket)).attempts>30)fail('로그인 시도가 많아요. 15분 후 다시 시도해 주세요.',429);
 const username=typeof input.username==='string'?input.username.trim().toLowerCase():'',password=typeof input.password==='string'?input.password:'';
 if(password.length>128)fail('아이디와 비밀번호를 확인해 주세요.',401);
 const actual=await passwordHash(password,expected.split(':')[0]);let diff=0;for(let i=0;i<expected.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);
 const account=accounts[username];
 if(diff||!account||input.role!==account.role)fail('선택한 로그인 유형과 아이디·비밀번호를 확인해 주세요.',401);
 const old=tokenFrom(request);if(/^[a-f0-9]{64}$/.test(old||''))await run(db,'DELETE FROM demo_sessions WHERE token_hash=?',await digest(old));
 await run(db,'DELETE FROM demo_sessions WHERE expires<=?',now);
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 await run(db,'INSERT INTO demo_sessions(token_hash,username,expires,credential_version) VALUES(?,?,?,?)',await digest(token),username,now+86400000,await digest(expected));
 return {username,cookie:cookie(request,token)};
}
export async function session(db,env,request,now=Date.now()){
 const token=tokenFrom(request);if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 const row=await one(db,'SELECT username,expires,credential_version FROM demo_sessions WHERE token_hash=?',await digest(token));
 if(!row||row.expires<=now||!accounts[row.username]||row.credential_version!==await digest(config(env)))return null;
 return row.username;
}
export async function logout(db,request){const token=tokenFrom(request);if(/^[a-f0-9]{64}$/.test(token||''))await run(db,'DELETE FROM demo_sessions WHERE token_hash=?',await digest(token));return cookie(request,'',0);}
export async function accountCommunity(database,username,action=null,input={}){
 const account=typeof username==='object'&&username?username:accounts[username];if(!account)fail('로그인 후 이용해 주세요.',401);
 const allowed=account.role==='staff'?['reply','edit-reply','delete-reply','delete-post','restore-post']:['question','attendance','post','like','reward','delete-post'];
 if(action&&!allowed.includes(action))fail(account.role==='staff'?'담당자는 게시판 관리와 통계 기능을 이용할 수 있어요.':'담당자만 이 작업을 할 수 있어요.',403);
 const db=accountDatabase(database),uid=account.id||'demo-'+username,email=account.id?account.id+'@knowly.internal':username+'@demo.invalid';
 await run(db,`INSERT INTO members(email,uid,role,department,name,active) VALUES(?,?,?,?,?,1) ON CONFLICT(email) DO UPDATE SET role=excluded.role,department=excluded.department,name=excluded.name`,email,uid,account.role,account.department,account.name);
 let notice='';
 if(action==='delete-post'||action==='restore-post'){
  if(typeof input.post!=='string'||input.post.length>100)fail('질문을 확인해 주세요.',400);
  const post=await one(database,'SELECT id,author FROM demo_posts WHERE id=?',input.post);
  if(!post)fail('질문을 찾을 수 없어요.',404);
  if(account.role!=='staff'&&post.author!==uid)fail('본인이 작성한 질문만 삭제할 수 있어요.',403);
  if(action==='delete-post'){
   await run(database,'INSERT OR IGNORE INTO demo_deleted_posts(post,deleted_by,deleted_at) VALUES(?,?,?)',input.post,account.role==='staff'?(account.username||username):'author',new Date().toISOString());
   notice=account.role==='staff'?'질문을 삭제했어요. 삭제된 글에서 복원할 수 있어요.':'내 질문을 삭제했어요.';
  }else{
   await run(database,'DELETE FROM demo_deleted_posts WHERE post=?',input.post);notice='질문을 복원했어요.';
  }
  action=null;
 }
 // 담당자 답변 고치기·지우기: 답변을 쓴 담당자 본인만(답변 표의 staff 칸 = 쓴 사람 uid). 표 구조는 그대로 쓴다.
 if(action==='edit-reply'||action==='delete-reply'){
  if(typeof input.reply!=='string'||!input.reply||input.reply.length>100)fail('답변을 확인해 주세요.',400);
  const reply=await one(database,'SELECT id,staff FROM demo_replies WHERE id=?',input.reply);
  if(!reply)fail('답변을 찾을 수 없어요. 이미 지워졌을 수 있어요.',404);
  if(reply.staff!==uid)fail('내가 쓴 답변만 고치거나 지울 수 있어요.',403);
  if(action==='edit-reply'){
   const body=typeof input.body==='string'?input.body.trim():'',source=typeof input.source==='string'?input.source.trim():'';
   if(body.length<5||body.length>4000)fail('답변: 5~4000자로 입력해 주세요.');
   if(source.length<2||source.length>500)fail('근거 문서·규정: 2~500자로 입력해 주세요.');
   await run(database,'UPDATE demo_replies SET body=?,source=? WHERE id=? AND staff=?',body,source,reply.id,uid);notice='답변을 고쳤어요.';
  }else{
   await run(database,'DELETE FROM demo_replies WHERE id=? AND staff=?',reply.id,uid);notice='답변을 지웠어요.';
  }
  action=null;
 }
 const result=await community(db,{userId:uid,email,fullName:account.name},undefined,action,input);
 if(result.partial)return result;
 const authors=await rows(db,'SELECT id,staff FROM replies WHERE post IN (SELECT id FROM posts ORDER BY created DESC LIMIT 200)');
 const byId=new Map(authors.map(r=>[r.id,r.staff]));
 const posts=result.posts.map(p=>({...p,replies:p.replies.map(r=>({...r,authorUsername:Object.keys(accounts).find(key=>'demo-'+key===byId.get(r.id))||'',authorRole:'staff',...(account.role==='staff'&&byId.get(r.id)===uid?{own:true}:{})}))}));
 const deletedPosts=account.role==='staff'?await rows(database,'SELECT p.id,p.category,p.body,p.created,d.deleted_at FROM demo_deleted_posts d JOIN demo_posts p ON p.id=d.post ORDER BY d.deleted_at DESC LIMIT 200'):undefined;
 return {...result,...(notice?{notice}:{}),posts,deletedPosts,demoMode:!account.id,me:{username:account.username||username,...account},members:undefined};
}
export async function statistics(db,username){
 const account=typeof username==='object'&&username?username:accounts[username];
 if(!account)fail('로그인 후 이용해 주세요.',401);
 if(account.role!=='staff')fail('담당자만 통계를 볼 수 있어요.',403);
 const day=seoulDay(),start=new Date(new Date(day).getTime()-6*86400000).toISOString().slice(0,10),since=rankingSince(),scoped=accountDatabase(db);
 const count=async(q,...args)=>(await one(db,q,...args)).n;
 const [questions,posts,answered,attendance,likes,daily,categories,rank]=await Promise.all([
  count("SELECT COUNT(*) AS n FROM demo_questions q JOIN demo_members m ON m.uid=q.uid WHERE m.role='employee'"),count('SELECT COUNT(*) AS n FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts)'),
  count('SELECT COUNT(*) AS n FROM demo_posts p WHERE p.id NOT IN (SELECT post FROM demo_deleted_posts) AND EXISTS(SELECT 1 FROM demo_replies r WHERE r.post=p.id)'),
  count("SELECT COUNT(*) AS n FROM demo_attendance a JOIN demo_members m ON m.uid=a.uid WHERE a.day=? AND m.role='employee'",day),count('SELECT COUNT(*) AS n FROM demo_likes WHERE post NOT IN (SELECT post FROM demo_deleted_posts)'),
  rows(db,"SELECT q.day,COUNT(*) AS n FROM demo_questions q JOIN demo_members m ON m.uid=q.uid WHERE q.day>=? AND m.role='employee' GROUP BY q.day",start),
  rows(db,'SELECT category,COUNT(*) AS n FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts) GROUP BY category'),
  rows(db,"SELECT m.uid,w.data FROM demo_members m JOIN demo_wallets w ON w.uid=m.uid WHERE m.role='employee'")]);
 // ── 사용자 통계(담당자): 기간별 순위·유익해요 순위·레벨 분포·출석 현황. 익명성을 위해 이름은 넘기지 않는다(아이디만).
 const who=uid=>({uid,username:uid.startsWith('demo-')?uid.slice(5):''}),back=(d,n=1)=>new Date(new Date(d).getTime()-n*86400000).toISOString().slice(0,10);
 // 순위 기간: 이번 달(한국 시간 1일 0시 이후) · 최근 3개월 · 전체. 받은 포인트 기준이라 츄르·꾸미기로 쓴 포인트는 빼지 않는다.
 const periods={month:new Date(day.slice(0,7)+'-01T00:00:00+09:00').toISOString(),quarter:since,all:''};
 const pointBoard=async from=>(await Promise.all(rank.map(async r=>({...who(r.uid),points:await earnedPoints(scoped,r.uid,from)})))).sort((a,b)=>b.points-a.points||a.uid.localeCompare(b.uid)).slice(0,50);
 // 유익해요 많이 받은 순위: 직원이 올린 글(삭제된 글 제외)이 다른 사람에게 받은 유익해요 수, 상위 10명
 const helpfulBoard=async from=>(await rows(scoped,"SELECT p.author AS uid,COUNT(*) AS n FROM likes l JOIN posts p ON p.id=l.post JOIN members m ON m.uid=p.author WHERE m.role='employee' AND l.uid<>p.author AND l.created>=? GROUP BY p.author ORDER BY n DESC,p.author LIMIT 10",from)).map(r=>({...who(r.uid),n:r.n}));
 const rankings={},helpful={};
 for(const [key,from] of Object.entries(periods)){rankings[key]=await pointBoard(from);helpful[key]=await helpfulBoard(from);}
 // 레벨 분포: 직원 계정을 지금 레벨별로 센다(레벨 규칙은 levelFor 하나)
 const levels=Array.from({length:levelFor(Number.MAX_SAFE_INTEGER).level},(_,i)=>({level:i+1,n:0}));
 for(const r of rank)levels[levelFor(wallet(r.data).questions).level-1].n++;
 // 출석: 최근 7일 날짜별 출석 직원 수와, 지금 이어지고 있는 연속 출석(오늘 또는 어제까지 이어진 날 수) 상위 5명
 const attended=await rows(db,"SELECT a.uid,a.day FROM demo_attendance a JOIN demo_members m ON m.uid=a.uid WHERE m.role='employee' AND a.day>=? ORDER BY a.day DESC",back(day,400));
 const daysBy=new Map();for(const r of attended)daysBy.set(r.uid,[...(daysBy.get(r.uid)||[]),r.day]);
 const streaks=[...daysBy].map(([uid,days])=>{let n=0,expected=days[0]===day?day:back(day);for(const d of days){if(d!==expected)break;n++;expected=back(expected);}return {...who(uid),days:n};}).filter(x=>x.days>0).sort((a,b)=>b.days-a.days||a.uid.localeCompare(b.uid)).slice(0,5);
 return {day,updatedAt:new Date().toISOString(),accounts:await count("SELECT COUNT(*) AS n FROM demo_members WHERE role='employee' AND active=1"),questions,posts,answered,waiting:posts-answered,attendance,likes,
  daily:Array.from({length:7},(_,i)=>{const d=new Date(new Date(start).getTime()+i*86400000).toISOString().slice(0,10);return {day:d,n:daily.find(x=>x.day===d)?.n||0};}),
  categories:[...CURRENT_CATEGORY_IDS.map(category=>({category,n:categories.find(x=>x.category===category)?.n||0})),...categories.filter(x=>!CURRENT_CATEGORY_IDS.includes(x.category)&&x.n).map(x=>({category:x.category,n:x.n}))],
  // 포인트 순위: 최근 3개월 동안 받은 누적 포인트 기준(츄르·꾸미기로 쓴 포인트는 빼지 않는다).
  // 익명성을 위해 이름은 넘기지 않는다. 아이디는 uid로 찾는다(데모 계정은 uid에서, Knowly 계정은 transport가 프로필 아이디로 채운다).
  rankingSince:since,
  ranking:rankings.quarter,
  periods,rankings,helpful,levels,streaks,
  attendanceDaily:Array.from({length:7},(_,i)=>{const d=back(day,6-i);return {day:d,n:attended.filter(x=>x.day===d).length};})};
}
export async function accountRequest(db,env,request){
 let body,status=200,setCookie=null;
 try{
  if(request.method==='GET'){
   const username=await session(db,env,request);
   body=new URL(request.url).searchParams.get('view')==='stats'?await statistics(db,username):username?await accountCommunity(db,username):{authenticated:false,member:false};
   if(username&&/(^|;\s*)nyang-account=/.test(request.headers.get('cookie')||''))setCookie=cookie(request,tokenFrom(request));
  }else if(request.method==='POST'){
   if(request.headers.get('origin')!==new URL(request.url).origin)fail('허용되지 않은 요청입니다.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))fail('JSON 요청이 필요합니다.',415);
   const raw=await request.text();if(raw.length>16000)fail('요청이 너무 커요.',413);
   const input=JSON.parse(raw);if(!input||typeof input.action!=='string')fail('요청 내용을 확인해 주세요.',400);
   if(input.action==='login'){const signed=await login(db,env,request,input);setCookie=signed.cookie;body=await accountCommunity(db,signed.username);}
   else if(input.action==='logout'){setCookie=await logout(db,request);body={authenticated:false,member:false};}
   else body=await accountCommunity(db,await session(db,env,request),input.action,input);
  }else fail('지원하지 않는 요청입니다.',405);
 }catch(e){status=e.status||(e instanceof SyntaxError?400:503);body={error:e.status?e.message:e instanceof SyntaxError?'요청 내용을 확인해 주세요.':'연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'};}
 const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
 const out=new Headers(headers);
 if(setCookie){out.append('Set-Cookie',setCookie);out.append('Set-Cookie',legacyCookie(request));}
 return Response.json(body,{status,headers:out});
}
