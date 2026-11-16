import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHistory,recordAnswer,toggleSaved,unseenReplies,questionLevels,levelLadder} from '../public/activity-history.js';
import {levelFor} from '../lib/community.mjs';
const result=id=>({kind:'answer',id:'annual',q:'연차 신청',category:'hr',messageId:id,decision:'added',items:[{id:'task'}],expandedPanel:'detail'});
test('records a completed answer once and excludes live schedule/UI state',()=>{
 let rows=recordAnswer([],result('a'),10);
 rows=toggleSaved(rows,'a');rows=recordAnswer(rows,result('a'),20);
 assert.equal(rows.length,1);assert.equal(rows[0].saved,true);
 assert.equal(rows[0].result.decision,undefined);assert.equal(rows[0].result.items,undefined);
 assert.equal(rows[0].result.expandedPanel,undefined);
});
test('retention keeps saved answers even after more than 100 recent questions',()=>{
 let rows=toggleSaved(recordAnswer([],result('saved'),1),'saved');
 for(let i=2;i<160;i++)rows=recordAnswer(rows,result(String(i)),i);
 assert.equal(rows.length,101);assert.equal(rows.find(x=>x.id==='saved').saved,true);
 assert.deepEqual(normalizeHistory({broken:true}),[]);
 assert.deepEqual(normalizeHistory([null,{result:{kind:'bad'}}]),[]);
});
test('unknown responses cannot be bookmarked and only new replies to own posts notify',()=>{
 const rows=recordAnswer([],{...result('u'),kind:'unknown'},10);
 assert.equal(toggleSaved(rows,'u')[0].saved,false);
 const posts=[{id:'a',mine:true,replies:[{},{}]},{id:'b',mine:false,replies:[{}]},{id:'c',mine:true,replies:[]}];
 assert.deepEqual(unseenReplies(posts,{a:1}).map(p=>p.id),['a']);
 assert.deepEqual(unseenReplies(posts,{a:2}),[]);
});
test('내 레벨 목록의 단계는 서버 레벨 계산과 같다',()=>{
 questionLevels.forEach((l,i)=>{assert.deepEqual([levelFor(l.at).level,levelFor(l.at).name],[i+1,l.name]);if(l.at)assert.equal(levelFor(l.at-1).level,i);});
 assert.equal(levelFor(999).level,questionLevels.length);
});
test('내 레벨 목록은 달성·현재·남은 단계를 표시한다',()=>{
 assert.deepEqual(levelLadder(7).map(x=>x.state),['done','current','locked','locked','locked']);
 assert.equal(levelLadder(7)[2].left,8);
 assert.deepEqual(levelLadder(0).map(x=>x.state),['current','locked','locked','locked','locked']);
 assert.deepEqual(levelLadder(80).map(x=>x.state),['done','done','done','done','current']);
});
