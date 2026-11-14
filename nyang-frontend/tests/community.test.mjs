import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {community,drawReward,seoulDay,levelFor} from '../lib/community.mjs';
import {visitorCommunity,visitorSession} from '../lib/visitor.mjs';
const admin={userId:'admin',email:'owner@example.test',fullName:'관리자'};
const author={userId:'author',email:'author@example.test',fullName:'작성자'};
const peer={userId:'peer',email:'peer@example.test',fullName:'동료'};
const staff={userId:'staff',email:'staff@example.test',fullName:'담당자'};
function database(){
 const sql=new DatabaseSync(':memory:');
 for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())
  sql.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={sql,prepare(query){return {args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args)??null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){const r=sql.prepare(query).run(...this.args);return {meta:{changes:Number(r.changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return db;
}
async function fixture(){
 const db=database();await community(db,admin,admin.email);
 for(const user of [author,peer,staff])await community(db,admin,admin.email,'member',{email:user.email,role:user===staff?'staff':'employee',department:'인사팀',name:'김담당'});
 for(const user of [author,peer,staff])await community(db,user,admin.email);
 const call=(user,action,data={})=>community(db,user,admin.email,action,data);
 return {db,call};
}

test('visitor cookie creates a private browser identity without login and reuses it',async()=>{
 const first=await visitorSession(new Request('https://example.test/api/visitor'));
 assert.match(first.cookie,/HttpOnly; SameSite=Lax/);assert.match(first.cookie,/; Secure$/);
 const header=first.cookie.split(';')[0];
 const again=await visitorSession(new Request('https://example.test/api/visitor',{headers:{cookie:header}}));
 assert.equal(again.uid,first.uid);assert.equal(again.cookie,null);
 assert.notEqual(first.uid,header.split('=')[1]);
 assert.notEqual((await visitorSession(new Request('https://example.test/api/visitor'))).uid,first.uid);
 const malformed=await visitorSession(new Request('https://example.test/api/visitor',{headers:{cookie:'nyang-visitor=admin'}}));
 assert.ok(malformed.cookie);assert.match(malformed.uid,/^[a-f0-9]{64}$/);
});

test('visitors can post, reply, like and earn rewards without leaking the employee board',async()=>{
 const db=database(),a='a'.repeat(64),b='b'.repeat(64);
 const privateUser={userId:a,email:admin.email,fullName:'Private admin'};
 const original=await community(db,privateUser,admin.email,'post',{category:'hr',body:'Private employee question'});
 const privatePost=original.posts[0].id;
 let state=await visitorCommunity(db,a);
 assert.equal(state.member,true);assert.equal(state.visitorMode,true);assert.equal(state.me.role,'visitor');
 assert.equal(state.posts.length,0);assert.equal(state.me.email,undefined);assert.equal(state.members,undefined);
 await assert.rejects(visitorCommunity(db,b,'like',{post:privatePost}),e=>e.status===404);
 await assert.rejects(visitorCommunity(db,b,'reply',{id:'wrong',post:privatePost,body:'Unverified answer',source:'Test'}),e=>e.status===404);
 state=await visitorCommunity(db,a,'post',{category:'hr',body:'방문자도 연차 절차를 물어볼 수 있나요?'});
 const post=state.posts[0].id;
 await visitorCommunity(db,b,'like',{post});await visitorCommunity(db,b,'like',{post});
 assert.equal((await visitorCommunity(db,a)).wallet.points,5);
 await assert.rejects(visitorCommunity(db,a,'like',{post}),/내 질문/);
 state=await visitorCommunity(db,b,'reply',{id:'visitor-reply',post,body:'절차는 샘플 문서에서 확인할 수 있어요.',source:'휴가 가이드 제3조'});
 assert.equal(state.posts[0].replies[0].name,'방문자');assert.equal(state.posts[0].replies[0].department,'공개 체험');
 assert.equal(state.posts[0].mine,false);assert.equal(state.notice,'체험 답변을 등록했어요.');
 assert.equal(JSON.stringify(state).includes('@visitor.invalid'),false);
 await assert.rejects(visitorCommunity(db,a,'member',{role:'admin'}),e=>e.status===403);
 const untouched=await community(db,privateUser,admin.email);
 assert.equal(untouched.posts.length,1);assert.equal(untouched.posts[0].id,privatePost);assert.equal(untouched.wallet.points,0);
});

test('visitor attendance, question rewards and customization persist and resist duplicate requests',async()=>{
 const db=database(),a='c'.repeat(64),call=(action,input)=>visitorCommunity(db,a,action,input);
 let state=await call('question',{question:'연차 신청은 어떻게 하나요?'});
 await call('question',{question:' 연차 신청은 어떻게 하나요? '});
 state=await call();assert.equal(state.wallet.questions,1);assert.equal(state.wallet.points,10);
 const attendance=await call('attendance');assert.deepEqual((await call('attendance')).today,attendance.today);
 state=await call('reward',{type:'feed',id:'feed'});
 for(const heart of state.wallet.pending)await call('reward',{type:'collect',id:'collect-'+heart,heart});
 await call('reward',{type:'buy',id:'buy',item:'ribbon'});
 state=await call();assert.equal(state.wallet.equipped,'ribbon');assert.equal(state.wallet.hearts,0);
 assert.equal(state.level.level,1);assert.equal(state.streak,1);
});
test('compact pet responses skip board reads and preserve server rewards, replay protection and legacy responses',async()=>{
 const db=database(),uid='d'.repeat(64),queries=[];
 await visitorCommunity(db,uid);
 const prepare=db.prepare.bind(db);db.prepare=sql=>{queries.push(sql);return prepare(sql);};
 const input={type:'pet',id:'pet-once',response:'wallet',likeRoll:0,bonusRoll:0,points:9999};
 const result=await visitorCommunity(db,uid,'reward',input);
 assert.equal(result.partial,'wallet');assert.equal(result.posts,undefined);assert.equal(result.today,undefined);
 assert.ok(['like','dislike','bonus'].includes(result.eventResult.kind));
 assert.equal(result.wallet.points,result.eventResult.kind==='bonus'?5:0);
 assert.equal(queries.some(sql=>/FROM visitor_(posts|replies|attendance|likes)\b/.test(sql)),false);
 const replay=await visitorCommunity(db,uid,'reward',input);
 assert.deepEqual(replay.eventResult,result.eventResult);assert.deepEqual(replay.wallet,result.wallet);
 await assert.rejects(visitorCommunity(db,uid,'reward',{...input,id:'pet-too-soon'}),e=>e.status===429);
 const legacy=await visitorCommunity(db,uid,'reward',{type:'pet',id:input.id});
 assert.equal(legacy.partial,undefined);assert.ok(Array.isArray(legacy.posts));assert.equal(legacy.member,true);
 assert.deepEqual(legacy.wallet,result.wallet);
});
test('public and uninvited callers cannot read the board or write; staff cannot grant access',async()=>{
 const {call}=await fixture();
 assert.deepEqual(await call(null),{authenticated:false,member:false});
 assert.equal((await call({userId:'outsider',email:'other@test.test'})).member,false);
 await assert.rejects(call(null,'attendance'),e=>e.status===401);
 await assert.rejects(call({userId:'outsider',email:'other@test.test'},'post',{body:'a question'}),e=>e.status===403);
 await assert.rejects(call(staff,'member',{email:'outsider@test.test',role:'staff'}),e=>e.status===403);
});
test('anonymous posts redact identity; likes reward author once, never liker or self',async()=>{
 const {call}=await fixture();
 let result=await call(author,'post',{body:'재택근무 절차가 궁금해요',category:'hr'});
 const id=result.posts[0].id;
 assert.equal(result.posts[0].mine,true);
 assert.equal(JSON.stringify(result.posts).includes('author@example'),false);
 assert.equal('author' in result.posts[0],false);
 await assert.rejects(call(author,'like',{post:id}),/내 질문/);
 result=await call(peer,'like',{post:id});
 assert.equal(result.wallet.points,0);assert.equal(result.posts[0].likes,1);
 await call(peer,'like',{post:id});
 result=await call(author);assert.equal(result.wallet.points,5);assert.equal(result.receivedLikes,1);
 await call(author,'post',{body:'  재택근무 절차가 궁금해요  ',category:'hr'});
 assert.equal((await call(author)).posts.length,1);
});
test('only assigned staff can answer; basis required and revoked staff cannot answer',async()=>{
 const {call}=await fixture();
 const post=(await call(author,'post',{body:'출장 중 조기 복귀하면 어떡하나요',category:'trip'})).posts[0].id;
 const reply={id:'reply1',post,body:'일정을 조정하고 담당자에게 알려 주세요.',source:'출장 규정 제4조'};
 await assert.rejects(call(author,'reply',reply),e=>e.status===403);
 await assert.rejects(call(staff,'reply',{...reply,source:''}),/근거/);
 await call(staff,'reply',reply);await call(staff,'reply',reply);
 const result=await call(author);
 assert.equal(result.posts[0].replies.length,1);assert.equal(result.posts[0].replies[0].department,'인사팀');
 assert.equal('staff' in result.posts[0].replies[0],false);
 await call(admin,'member',{email:staff.email,role:'employee',active:false});
 await assert.rejects(call(staff,'reply',{...reply,id:'reply2'}),e=>e.status===403);
});
test('daily draw uses server Seoul day and duplicate requests return the same award',async()=>{
 const {call}=await fixture();
 const first=await call(author,'attendance',{day:'2099-01-01',points:100000});
 const again=await call(author,'attendance',{day:'1900-01-01'});
 assert.deepEqual(first.today,again.today);assert.deepEqual(first.wallet,again.wallet);assert.equal(again.streak,1);
 assert.equal(first.today.day,seoulDay());
 assert.equal(seoulDay(new Date('2026-10-20T14:59:59Z')),'2026-10-20');
 assert.equal(seoulDay(new Date('2026-10-20T15:00:00Z')),'2026-10-21');
 assert.deepEqual([0,.499,.5,.799,.8,.949,.95,.999].map(drawReward),[
  {points:5,tokens:0},{points:5,tokens:0},{points:10,tokens:0},{points:10,tokens:0},
  {points:0,tokens:1},{points:0,tokens:1},{points:0,tokens:3},{points:0,tokens:3}]);
 assert.throws(()=>drawReward(1));
});
test('unique questions earn levels, repeated questions and daily excess do not',async()=>{
 const {call}=await fixture();
 await call(author,'question',{question:'연차 신청 방법'});
 await call(author,'question',{question:'  연차   신청 방법  '});
 assert.equal((await call(author)).wallet.questions,1);
 for(let i=0;i<25;i++)await call(author,'question',{question:`서로 다른 회사 업무 질문 ${i}`});
 const result=await call(author);assert.equal(result.wallet.questions,20);assert.equal(result.wallet.points,200);
 assert.equal(result.level.level,3);assert.equal(levelFor(5).level,2);assert.equal(levelFor(50).progress,100);
});
test('free treat first, replay-safe wallet events, collect once and no forged points',async()=>{
 const {db,call}=await fixture();
 db.sql.prepare('INSERT INTO attendance(uid,day,points,tokens,created) VALUES(?,?,?,?,?)').run(author.userId,'2020-01-01',20,1,new Date().toISOString());
 let result=await call(author,'reward',{type:'feed',id:'feed1',points:99999});
 assert.equal(result.wallet.points,20);assert.equal(result.wallet.treatTokens,0);assert.equal(result.wallet.pending.length,3);
 const heart=result.wallet.pending[0];
 const again=await call(author,'reward',{type:'feed',id:'feed1'});assert.deepEqual(result.wallet,again.wallet);
 await call(author,'reward',{type:'collect',id:'collect1',heart});
 result=await call(author,'reward',{type:'collect',id:'collect2',heart});assert.equal(result.wallet.hearts,1);
 await assert.rejects(call(author,'reward',{type:'question',id:'evil',points:999}),/지원하지/);
 await assert.rejects(call(author,'reward',{type:'equip',id:'equip',item:'crown'}),/먼저/);
 await assert.rejects(call(author,'reward',{type:'buy',id:'buy',item:'crown'}),/하트/);
});
test('concurrent wallet operations preserve awards and repeated operation spends once',async()=>{
 const {db,call}=await fixture();
 const batch=db.batch.bind(db);let queue=Promise.resolve();
 db.batch=statements=>{const task=queue.then(()=>batch(statements));queue=task.catch(()=>{});return task;};
 db.sql.prepare('INSERT INTO attendance(uid,day,points,tokens,created) VALUES(?,?,?,?,?)').run(author.userId,'2020-01-01',30,0,new Date().toISOString());
 await Promise.all([call(author,'reward',{type:'feed',id:'same-feed'}),call(author,'reward',{type:'feed',id:'same-feed'})]);
 let current=await call(author);assert.equal(current.wallet.points,20);assert.equal(current.wallet.treats,1);
 await Promise.all(current.wallet.pending.map((heart,i)=>call(author,'reward',{type:'collect',heart,id:'heart-'+i})));
 current=await call(author);assert.equal(current.wallet.hearts,3);assert.equal(current.wallet.pending.length,0);
});
