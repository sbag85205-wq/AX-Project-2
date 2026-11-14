import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import { runOnce } from '../src/nyang/local-db.mjs';
import { accountCommunity, statistics } from '../nyang-frontend/lib/demo-account.mjs';

// 브라우저 저장(src/nyang/local-store.ts)과 같은 경로: 요청마다 저장된 DB를 열고, 성공했을 때만 저장한다.
const dir = new URL('../nyang-frontend/drizzle/', import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => [f, fs.readFileSync(new URL(f, dir), 'utf8')]);

test('브라우저 저장소: Knowly 계정별 보상이 분리되고 게시판·통계·보상 규칙이 서버와 같이 동작한다', async () => {
  const SQL = await initSqlJs();
  let saved = null;
  const a={id:'user-a',username:'alice',name:'직원 A',department:'개발',role:'employee'};
  const b={id:'user-b',username:'bob',name:'직원 B',department:'개발',role:'employee'};
  const staff={id:'staff-a',username:'manager',name:'담당자',department:'운영',role:'staff'};
  const call=async(user,action=null,input={})=>{
    const r=await runOnce(SQL,saved,files,(db)=>action==='stats'?statistics(db,user):accountCommunity(db,user,action,input));
    saved=r.bytes;return r.result;
  };
  assert.equal((await call(a)).me.id, a.id);
    assert.equal((await call(a)).me.id, a.id);
    await call(b);await call(staff);
    await call(a,'question',{question:'연차 신청은 어떻게 하나요?'});
    await call(a,'question',{question:'연차 신청은 어떻게 하나요?'});
    assert.equal((await call(a)).wallet.points,10);
    assert.equal((await call(a)).wallet.questions,1);
    assert.equal((await call(b)).wallet.points,0);
    const attendance=await call(a,'attendance');
    assert.deepEqual((await call(a,'attendance')).wallet,attendance.wallet);
    const post=(await call(a,'post',{category:'hr',body:'휴가 승인 절차가 궁금해요.'})).posts[0];
    await assert.rejects(call(a,'like',{post:post.id}),/내 질문/);
    await call(b,'like',{post:post.id});await call(b,'like',{post:post.id});
    assert.equal((await call(a)).wallet.points,attendance.wallet.points+5);
    await assert.rejects(call(b,'reply',{post:post.id,id:'bad',body:'위조한 관리자 답변',source:'가짜 규정',role:'staff'}),/담당자/);
    await call(staff,'reply',{post:post.id,id:'reply1',body:'담당자가 확인한 답변입니다.',source:'휴가 규정'});
    const view=await call(b);assert.equal(view.posts[0].replies.length,1);
    assert.equal(JSON.stringify(view.posts).includes('user-a'),false);
    await assert.rejects(call(b,'delete-post',{post:post.id}),/본인/);
    await call(staff,'delete-post',{post:post.id});assert.equal((await call(a)).posts.length,0);
    await call(staff,'restore-post',{post:post.id});assert.equal((await call(a)).posts.length,1);
    const stats=await call(staff,'stats');assert.equal(stats.questions,1);assert.equal(stats.accounts,2);assert.equal(stats.answered,1);
    await assert.rejects(call(a,'stats'),/담당자/);
    await assert.rejects(call(staff,'question',{question:'담당자 보상 위조'}),/담당자/);
    const fed=await call(a,'reward',{type:'feed',id:'feed-1'});
    assert.equal(fed.wallet.pending.length,3);
    assert.deepEqual((await call(a,'reward',{type:'feed',id:'feed-1'})).wallet,fed.wallet);
    for(const heart of fed.wallet.pending)await call(a,'reward',{type:'collect',id:heart,heart});
    const bought=await call(a,'reward',{type:'buy',id:'buy-1',item:'ribbon'});
    assert.ok(bought.wallet.owned.includes('ribbon'));
    await call(a,'reward',{type:'equip',id:'equip-1',item:'ribbon'});
    assert.equal((await call(a)).wallet.equipped,'ribbon');
    for(let i=0;i<25;i++)await call(a,'question',{question:'서로 다른 질문 '+i});
    assert.equal((await call(a)).wallet.questions,20);
    await assert.rejects(call(a,'reply',{post:post.id,id:'bad2',body:'무단 답변입니다',source:'위조',idOverride:staff.id,role:'staff'}),/담당자/);
});

test('브라우저 저장소: 실패한 요청은 저장하지 않고, 스키마는 한 번만 적용한다', async () => {
  const SQL = await initSqlJs();
  const a={id:'user-a',username:'alice',name:'직원 A',department:'개발',role:'employee'};
  const first=await runOnce(SQL,null,files,(db)=>accountCommunity(db,a,'question',{question:'연차 신청은 어떻게 하나요?'}));
  await assert.rejects(runOnce(SQL,first.bytes,files,async(db)=>{await accountCommunity(db,a,'question',{question:'저장되면 안 되는 질문'});throw new Error('중간 실패');}),/중간 실패/);
  const after=await runOnce(SQL,first.bytes,files,(db)=>accountCommunity(db,a));
  assert.equal(after.result.wallet.questions,1);
  const again=await runOnce(SQL,after.bytes,files,async()=>null);
  const db=new SQL.Database(again.bytes);
  assert.equal(db.exec('SELECT COUNT(*) FROM local_migrations')[0].values[0][0],files.length);
  db.close();
});
