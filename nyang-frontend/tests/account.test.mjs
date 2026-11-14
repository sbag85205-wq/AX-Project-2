import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {accountRequest,passwordHash,session} from '../lib/demo-account.mjs';
const env={NYANG_DEMO_PASSWORD_HASH:await passwordHash('test-password')};
function fixture(){
 const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sql.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={sql,prepare(q){return{args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(q).get(...this.args)??null;},async all(){return{results:sql.prepare(q).all(...this.args)};},async run(){return{meta:{changes:Number(sql.prepare(q).run(...this.args).changes)}};}};},async batch(ss){sql.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const call=async(cookie='',body=null,path='',origin='https://nyang.test')=>{
  const r=await accountRequest(db,env,new Request('https://nyang.test/api/account'+path,{method:body?'POST':'GET',headers:{cookie,origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie,headers:r.headers};
 };
 const sign=async(username='user01')=>call('',{action:'login',username,password:'test-password',role:username==='admin01'?'staff':'employee'});
 return{db,call,sign};
}
test('same account has shared wallet across independent sessions, separate accounts stay isolated',async()=>{
 const {db,call,sign}=fixture(),a=await sign(),b=await sign(),admin=await sign('admin01');assert.equal(a.status,200);assert.notEqual(a.cookie,b.cookie);assert.match(a.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);assert.match(a.headers.get('set-cookie'),/Secure/);
 await call(a.cookie,{action:'question',question:'연차 신청은 어떻게 하나요?'});
 assert.equal((await call(b.cookie)).data.wallet.points,10);assert.equal((await call(b.cookie)).data.wallet.questions,1);assert.equal((await call(admin.cookie)).data.wallet.points,0);
 await call(b.cookie,{action:'question',question:'연차 신청은 어떻게 하나요?'});assert.equal((await call(a.cookie)).data.wallet.points,10);
 await call(a.cookie,{action:'attendance'});const w=(await call(a.cookie)).data.wallet;await call(b.cookie,{action:'attendance'});assert.deepEqual((await call(b.cookie)).data.wallet,w);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM visitor_wallets').get().n,0);
 const token=a.cookie.split('=')[1];assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM demo_sessions WHERE token_hash=?').get(token).n,0);
 await call(a.cookie,{action:'logout'});assert.equal((await call(a.cookie)).data.member,false);assert.equal((await call(b.cookie)).data.member,true);
 assert.equal(await session(db,env,new Request('https://nyang.test/api/account',{headers:{cookie:b.cookie}}),Date.now()+86400001),null);
});
test('staff-only stats and replies enforce roles on the server; account switching cannot elevate staff',async()=>{
 const {call,sign}=fixture(),user=await sign(),admin=await sign('admin01');
 assert.equal((await call('',null,'?view=stats')).status,401);assert.equal((await call(user.cookie,null,'?view=stats')).status,403);
 const posted=await call(user.cookie,{action:'post',category:'hr',body:'재택근무는 어떤 절차로 신청하나요?'}),id=posted.data.posts[0].id;
 assert.equal((await call(user.cookie,{action:'reply',role:'staff',username:'admin01',post:id,id:'bad',body:'권한 없이 작성한 답변',source:'가이드'})).status,403);
 assert.equal((await call(admin.cookie,{action:'reply',post:id,id:'good',body:'담당자가 작성한 시연 답변입니다.',source:'더미 가이드'})).status,200);
 await call(user.cookie,{action:'question',question:'연차 신청 절차'});assert.equal((await call(admin.cookie,{action:'like',post:id})).status,403);
 const s=await call(admin.cookie,null,'?view=stats');assert.equal(s.status,200);assert.equal(s.data.questions,1);assert.equal(s.data.posts,1);assert.equal(s.data.answered,1);assert.equal(s.data.waiting,0);assert.equal(s.data.ranking[0].points,10);assert.equal(s.data.ranking.length,1);assert.equal(s.data.accounts,1);assert.equal(s.data.daily.reduce((n,d)=>n+d.n,0),1);assert.equal(s.data.categories[0].n,1);
 assert.equal((await call(admin.cookie,{action:'member',email:'hack@example.test',role:'admin'})).status,403);
 assert.equal(JSON.stringify(s.data).includes('재택근무'),false);
});

test('staff moderation hides and restores posts, preserves rewards, and attributes replies to a server-verified staff account',async()=>{
 const {db,call,sign}=fixture(),employee=await sign(),staff=await sign('admin01');
 for(const action of ['question','post','attendance','like','reward'])assert.equal((await call(staff.cookie,{action,question:'무단 질문',category:'hr',body:'무단으로 작성하는 질문',type:'feed',id:'denied'})).status,403);
 const post=(await call(employee.cookie,{action:'post',category:'hr',body:'담당자 삭제와 복원 시연용 질문입니다.'})).data.posts[0];
 assert.equal((await call('',{action:'delete-post',post:post.id})).status,401);
 const replied=await call(staff.cookie,{action:'reply',post:post.id,id:'named-reply',body:'담당자가 규정을 확인한 답변입니다.',source:'샘플 인사 규정',name:'익명',authorUsername:'forged'});
 assert.equal(replied.data.posts[0].replies[0].authorUsername,'admin01');assert.equal(replied.data.posts[0].replies[0].name,'담당자');assert.equal(replied.data.posts[0].replies[0].authorRole,'staff');
 await call(employee.cookie,{action:'question',question:'새로운 보상 질문'});const balance=(await call(employee.cookie)).data.wallet.points;
 const deleted=await call(staff.cookie,{action:'delete-post',post:post.id});assert.equal(deleted.status,200);assert.equal(deleted.data.posts.length,0);assert.equal(deleted.data.deletedPosts.length,1);
 assert.equal((await call(staff.cookie,{action:'delete-post',post:post.id})).status,200);
 const privateView=(await call(employee.cookie)).data;assert.equal(privateView.posts.length,0);assert.equal(privateView.deletedPosts,undefined);assert.equal(privateView.wallet.points,balance);assert.equal(JSON.stringify(privateView).includes(post.body),false);
 assert.equal((await call(staff.cookie,{action:'reply',post:post.id,id:'deleted-reply',body:'삭제된 글에 답변 쓰기',source:'샘플'})).status,404);
 assert.equal((await call(employee.cookie,{action:'like',post:post.id})).status,404);
 const stats=(await call(staff.cookie,null,'?view=stats')).data;assert.equal(stats.posts,0);assert.equal(stats.answered,0);assert.equal(stats.categories.reduce((n,x)=>n+x.n,0),0);
 assert.equal((await call(employee.cookie,{action:'restore-post',post:post.id})).status,403);
 const restored=await call(staff.cookie,{action:'restore-post',post:post.id});assert.equal(restored.data.deletedPosts.length,0);assert.equal(restored.data.posts.length,1);assert.equal(restored.data.posts[0].replies.length,1);assert.equal((await call(employee.cookie)).data.wallet.points,balance);
 assert.equal((await call(staff.cookie,null,'?view=stats')).data.answered,1);
 assert.equal(db.sql.prepare('SELECT deleted_by FROM demo_deleted_posts').get(),undefined);
});
test('wrong credentials, wrong login type, forged tokens, cross-origin requests, throttling and secret rotation',async()=>{
 const {db,call,sign}=fixture();
 assert.equal((await call('',{action:'login',username:'user01',password:'incorrect',role:'employee'})).status,401);
 assert.equal((await call('',{action:'login',username:'user01',password:'test-password',role:'staff'})).status,401);
 assert.equal((await call('nyang-account='+'a'.repeat(64),{action:'attendance'})).status,401);
 assert.equal((await call('',{action:'login',username:'user01',password:'test-password',role:'employee'},'','https://evil.test')).status,403);
 const user=await sign();assert.equal(await session(db,{NYANG_DEMO_PASSWORD_HASH:await passwordHash('changed')},new Request('https://nyang.test/api/account',{headers:{cookie:user.cookie}})),null);
 db.sql.exec('UPDATE demo_login_limits SET attempts=30');assert.equal((await sign()).status,429);
});

test('employees delete only their own posts across sessions without exposing authors or changing rewards',async()=>{
 const {db,call,sign}=fixture(),owner=await sign(),otherSession=await sign(),staff=await sign('admin01');
 const post=(await call(owner.cookie,{action:'post',category:'hr',body:'본인 질문 삭제 검증용 질문입니다.'})).data.posts[0];
 db.sql.prepare('INSERT INTO demo_posts(id,author,hash,category,body,created) VALUES(?,?,?,?,?,?)').run('other-post','demo-other','other-hash','hr','다른 직원이 작성한 질문입니다.',new Date().toISOString());
 await call(staff.cookie,{action:'reply',post:post.id,id:'owner-reply',body:'질문에 대한 담당자 답변입니다.',source:'샘플 문서'});
 await call(owner.cookie,{action:'question',question:'포인트 유지 검증 질문입니다.'});
 const balance=(await call(owner.cookie)).data.wallet;
 assert.equal((await call('',{action:'delete-post',post:post.id})).status,401);
 assert.equal((await call(owner.cookie,{action:'delete-post',post:'other-post',role:'staff',username:'admin01',mine:true,author:'demo-user01'})).status,403);
 const deleted=await call(owner.cookie,{action:'delete-post',post:post.id});
 assert.equal(deleted.status,200);assert.equal(deleted.data.posts.some(p=>p.id===post.id),false);
 assert.equal(deleted.data.posts.some(p=>p.id==='other-post'),true);
 assert.deepEqual(deleted.data.wallet,balance);
 assert.equal((await call(otherSession.cookie)).data.posts.some(p=>p.id===post.id),false);
 const admin=(await call(staff.cookie)).data;
 assert.equal(admin.posts.some(p=>p.id===post.id),false);
 const archived=admin.deletedPosts.find(p=>p.id===post.id);
 assert.ok(archived);assert.equal(archived.deleted_by,undefined);assert.equal(archived.author,undefined);
 assert.equal(db.sql.prepare('SELECT deleted_by FROM demo_deleted_posts WHERE post=?').get(post.id).deleted_by,'author');
 assert.equal((await call(owner.cookie,{action:'delete-post',post:post.id})).status,200);
 assert.equal((await call(owner.cookie,{action:'restore-post',post:post.id})).status,403);
 assert.equal((await call(owner.cookie,{action:'like',post:post.id})).status,404);
 const restored=await call(staff.cookie,{action:'restore-post',post:post.id});
 assert.equal(restored.data.posts.find(p=>p.id===post.id).replies.length,1);
 assert.deepEqual((await call(owner.cookie)).data.wallet,balance);
});
