import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { postgresDatabase } from '../supabase/functions/_shared/nyang/postgres.mjs';
import { accountCommunity, statistics } from '../supabase/functions/_shared/nyang/demo-account.mjs';

test('Knowly identities keep Nyang rewards private; PostgreSQL migration supports all community actions', async () => {
  const pg = new PGlite();
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await pg.exec(fs.readFileSync(new URL('../supabase/migrations/20261114000000_nyang.sql', import.meta.url), 'utf8'));
  const a={id:'user-a',username:'alice',name:'직원 A',department:'개발',role:'employee'};
  const b={id:'user-b',username:'bob',name:'직원 B',department:'개발',role:'employee'};
  const staff={id:'staff-a',username:'manager',name:'담당자',department:'운영',role:'staff'};
  const call=(user,action=null,input={})=>pg.transaction(async tx=>{
    const db=postgresDatabase(async(q,args)=>{const r=await tx.query(q,args);return {rows:r.rows,count:r.affectedRows??r.rows.length};});
    return action==='stats'?statistics(db,user):accountCommunity(db,user,action,input);
  });
  try {
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
    // The HTTP role/id payload cannot replace the trusted profile passed by getCaller.
    await assert.rejects(call(a,'reply',{post:post.id,id:'bad2',body:'무단 답변입니다',source:'위조',idOverride:staff.id,role:'staff'}),/담당자/);
    await pg.exec('SET ROLE authenticated;');
    await assert.rejects(pg.query('SELECT * FROM nyang.wallets'),/permission denied/);
  } finally { await pg.close(); }
});
