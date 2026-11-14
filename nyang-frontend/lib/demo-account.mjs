import {AppError,community,seoulDay,wallet} from './community.mjs';
import {knowlyPublicConfig,verifyKnowlyToken} from './knowly.mjs';
const accounts={user01:{role:'employee',name:'직원',department:''},admin01:{role:'staff',name:'담당자',department:'운영 담당'}};
export const accountRole=username=>accounts[username]?.role||null;
// Knowly가 연결돼 있으면 Knowly 계정(브라우저에서 Knowly 로그인 → 토큰 확인)으로 로그인하고, 계정 정보는 demo_members에 둔다.
// 연결이 없으면 기존 공용 시연 계정(user01·admin01)을 그대로 쓴다.
export const knowlyMode=env=>!!knowlyPublicConfig(env);
async function accountOf(db,env,username){
 if(!username)return null;
 if(!knowlyMode(env))return accounts[username]||null;
 const row=await one(db,'SELECT role,name,department FROM demo_members WHERE uid=?','demo-'+username);
 return row&&['employee','staff'].includes(row.role)?{role:row.role,name:row.name||username,department:row.department||''}:null;
}
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
async function credentialVersion(env){const k=knowlyPublicConfig(env);return digest(k?'knowly|'+k.url:config(env));}
function config(env){const value=env.NYANG_DEMO_PASSWORD_HASH;if(!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(value||''))fail('로그인 설정을 준비 중이에요.',503);return value;}
function tokenFrom(request){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nyang-account='))?.slice(14);}
// 세션 쿠키는 /api 아래 모든 경로(계정·사내 문서 검색 연결)에서 쓴다. 예전 /api/account 경로 쿠키는 지운다.
function cookie(request,token,age=86400,path='/api'){return `nyang-account=${token}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
const legacyCookie=request=>cookie(request,'',0,'/api/account');
export async function login(db,env,request,input,now=Date.now(),verify=verifyKnowlyToken){
 const knowly=knowlyMode(env),expected=knowly?null:config(env),bucket=Math.floor(now/900000),ip=await digest(request.headers.get('cf-connecting-ip')||'local');
 await run(db,'DELETE FROM demo_login_limits WHERE bucket<?',bucket-1);
 await run(db,`INSERT INTO demo_login_limits(ip,bucket,attempts) VALUES(?,?,1) ON CONFLICT(ip,bucket) DO UPDATE SET attempts=attempts+1`,ip,bucket);
 if((await one(db,'SELECT attempts FROM demo_login_limits WHERE ip=? AND bucket=?',ip,bucket)).attempts>30)fail('로그인 시도가 많아요. 15분 후 다시 시도해 주세요.',429);
 let username;
 if(knowly){
  const k=await verify(env,input.access_token);
  if(input.role!==k.role)fail(k.role==='staff'?'담당자 계정이에요. 담당자 탭에서 로그인해 주세요.':'담당자 계정이 아니에요. 직원 탭에서 로그인해 주세요.',401);
  username=k.username;
  await run(accountDatabase(db),`INSERT INTO members(email,uid,role,department,name,active) VALUES(?,?,?,?,?,1) ON CONFLICT(email) DO UPDATE SET role=excluded.role,department=excluded.department,name=excluded.name`,username+'@demo.invalid','demo-'+username,k.role,k.department,k.name);
 }else{
  username=typeof input.username==='string'?input.username.trim().toLowerCase():'';const password=typeof input.password==='string'?input.password:'';
  if(password.length>128)fail('아이디와 비밀번호를 확인해 주세요.',401);
  const actual=await passwordHash(password,expected.split(':')[0]);let diff=0;for(let i=0;i<expected.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);
  const account=accounts[username];
  if(diff||!account||input.role!==account.role)fail('선택한 로그인 유형과 아이디·비밀번호를 확인해 주세요.',401);
 }
 const old=tokenFrom(request);if(/^[a-f0-9]{64}$/.test(old||''))await run(db,'DELETE FROM demo_sessions WHERE token_hash=?',await digest(old));
 await run(db,'DELETE FROM demo_sessions WHERE expires<=?',now);
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 await run(db,'INSERT INTO demo_sessions(token_hash,username,expires,credential_version) VALUES(?,?,?,?)',await digest(token),username,now+86400000,await credentialVersion(env));
 return {username,cookie:cookie(request,token)};
}
export async function session(db,env,request,now=Date.now()){
 const token=tokenFrom(request);if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 const row=await one(db,'SELECT username,expires,credential_version FROM demo_sessions WHERE token_hash=?',await digest(token));
 if(!row||row.expires<=now||row.credential_version!==await credentialVersion(env)||!await accountOf(db,env,row.username))return null;
 return row.username;
}
export async function logout(db,request){const token=tokenFrom(request);if(/^[a-f0-9]{64}$/.test(token||''))await run(db,'DELETE FROM demo_sessions WHERE token_hash=?',await digest(token));return cookie(request,'',0);}
export async function accountCommunity(database,username,action=null,input={},account=accounts[username],knowly=false){if(!account)fail('로그인 후 이용해 주세요.',401);
 const allowed=account.role==='staff'?['reply','delete-post','restore-post']:['question','attendance','post','like','reward','delete-post'];
 if(action&&!allowed.includes(action))fail(account.role==='staff'?'담당자는 게시판 관리와 통계 기능을 이용할 수 있어요.':'담당자만 이 작업을 할 수 있어요.',403);
 const db=accountDatabase(database),uid='demo-'+username,email=username+'@demo.invalid';
 await run(db,`INSERT INTO members(email,uid,role,department,name,active) VALUES(?,?,?,?,?,1) ON CONFLICT(email) DO UPDATE SET role=excluded.role,department=excluded.department,name=excluded.name`,email,uid,account.role,account.department,account.name);
 let notice='';
 if(action==='delete-post'||action==='restore-post'){
  if(typeof input.post!=='string'||input.post.length>100)fail('질문을 확인해 주세요.',400);
  const post=await one(database,'SELECT id,author FROM demo_posts WHERE id=?',input.post);
  if(!post)fail('질문을 찾을 수 없어요.',404);
  if(account.role!=='staff'&&post.author!==uid)fail('본인이 작성한 질문만 삭제할 수 있어요.',403);
  if(action==='delete-post'){
   await run(database,'INSERT OR IGNORE INTO demo_deleted_posts(post,deleted_by,deleted_at) VALUES(?,?,?)',input.post,account.role==='staff'?username:'author',new Date().toISOString());
   notice=account.role==='staff'?'질문을 삭제했어요. 삭제된 글에서 복원할 수 있어요.':'내 질문을 삭제했어요.';
  }else{
   await run(database,'DELETE FROM demo_deleted_posts WHERE post=?',input.post);notice='질문을 복원했어요.';
  }
  action=null;
 }
 const result=await community(db,{userId:uid,email,fullName:account.name},undefined,action,input);
 if(result.partial)return result;
 const authors=await rows(db,'SELECT id,staff FROM replies WHERE post IN (SELECT id FROM posts ORDER BY created DESC LIMIT 200)');
 const byId=new Map(authors.map(r=>[r.id,r.staff]));
 const posts=result.posts.map(p=>({...p,replies:p.replies.map(r=>({...r,authorUsername:String(byId.get(r.id)||'').replace(/^demo-/,''),authorRole:'staff'}))}));
 const deletedPosts=account.role==='staff'?await rows(database,'SELECT p.id,p.category,p.body,p.created,d.deleted_at FROM demo_deleted_posts d JOIN demo_posts p ON p.id=d.post ORDER BY d.deleted_at DESC LIMIT 200'):undefined;
 return {...result,...(notice?{notice}:{}),posts,deletedPosts,demoMode:!knowly,knowlyAccount:knowly,me:{username,...account},members:undefined};
}
export async function statistics(db,username,account=accounts[username],knowly=false){
 if(!account)fail('로그인 후 이용해 주세요.',401);
 if(account.role!=='staff')fail('담당자만 통계를 볼 수 있어요.',403);
 const day=seoulDay(),start=new Date(new Date(day).getTime()-6*86400000).toISOString().slice(0,10);
 const count=async(q,...args)=>(await one(db,q,...args)).n;
 const [questions,posts,answered,attendance,likes,daily,categories,rank]=await Promise.all([
  count("SELECT COUNT(*) AS n FROM demo_questions q JOIN demo_members m ON m.uid=q.uid WHERE m.role='employee'"),count('SELECT COUNT(*) AS n FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts)'),
  count('SELECT COUNT(*) AS n FROM demo_posts p WHERE p.id NOT IN (SELECT post FROM demo_deleted_posts) AND EXISTS(SELECT 1 FROM demo_replies r WHERE r.post=p.id)'),
  count("SELECT COUNT(*) AS n FROM demo_attendance a JOIN demo_members m ON m.uid=a.uid WHERE a.day=? AND m.role='employee'",day),count('SELECT COUNT(*) AS n FROM demo_likes WHERE post NOT IN (SELECT post FROM demo_deleted_posts)'),
  rows(db,"SELECT q.day,COUNT(*) AS n FROM demo_questions q JOIN demo_members m ON m.uid=q.uid WHERE q.day>=? AND m.role='employee' GROUP BY q.day",start),
  rows(db,'SELECT category,COUNT(*) AS n FROM demo_posts WHERE id NOT IN (SELECT post FROM demo_deleted_posts) GROUP BY category'),
  rows(db,"SELECT m.uid,m.name,m.role,w.data FROM demo_members m JOIN demo_wallets w ON w.uid=m.uid WHERE m.role='employee'")]);
 return {day,updatedAt:new Date().toISOString(),accounts:knowly?(await one(db,"SELECT COUNT(*) AS n FROM demo_members WHERE role='employee'")).n:Object.values(accounts).filter(a=>a.role==='employee').length,questions,posts,answered,waiting:posts-answered,attendance,likes,
  daily:Array.from({length:7},(_,i)=>{const d=new Date(new Date(start).getTime()+i*86400000).toISOString().slice(0,10);return {day:d,n:daily.find(x=>x.day===d)?.n||0};}),
  categories:['hr','pay','trip','life'].map(category=>({category,n:categories.find(x=>x.category===category)?.n||0})),
  ranking:rank.map(r=>({username:r.uid.slice(5),name:r.name,role:r.role,points:wallet(r.data).points,questions:wallet(r.data).questions})).sort((a,b)=>b.points-a.points||a.username.localeCompare(b.username)).slice(0,3)};
}
export async function accountRequest(db,env,request){
 let body,status=200,setCookie=null;
 try{
  if(request.method==='GET'){
   const username=await session(db,env,request),account=await accountOf(db,env,username),knowly=knowlyMode(env);
   body=new URL(request.url).searchParams.get('view')==='stats'?await statistics(db,username,account,knowly):username?await accountCommunity(db,username,null,{},account,knowly):{authenticated:false,member:false,knowly};
   if(username&&/(^|;\s*)nyang-account=/.test(request.headers.get('cookie')||''))setCookie=cookie(request,tokenFrom(request));
  }else if(request.method==='POST'){
   if(request.headers.get('origin')!==new URL(request.url).origin)fail('허용되지 않은 요청입니다.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))fail('JSON 요청이 필요합니다.',415);
   const raw=await request.text();if(raw.length>16000)fail('요청이 너무 커요.',413);
   const input=JSON.parse(raw);if(!input||typeof input.action!=='string')fail('요청 내용을 확인해 주세요.',400);
   const knowly=knowlyMode(env);
   if(input.action==='login'){const signed=await login(db,env,request,input);setCookie=signed.cookie;body=await accountCommunity(db,signed.username,null,{},await accountOf(db,env,signed.username),knowly);}
   else if(input.action==='logout'){setCookie=await logout(db,request);body={authenticated:false,member:false,knowly};}
   else{const username=await session(db,env,request);body=await accountCommunity(db,username,input.action,input,await accountOf(db,env,username),knowly);}
  }else fail('지원하지 않는 요청입니다.',405);
 }catch(e){status=e.status||(e instanceof SyntaxError?400:503);body={error:e.status?e.message:e instanceof SyntaxError?'요청 내용을 확인해 주세요.':'연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'};}
 const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
 const out=new Headers(headers);
 if(setCookie){out.append('Set-Cookie',setCookie);out.append('Set-Cookie',legacyCookie(request));}
 return Response.json(body,{status,headers:out});
}
