import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHistory,recordAnswer,toggleSaved,unseenReplies} from '../public/activity-history.js';
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
