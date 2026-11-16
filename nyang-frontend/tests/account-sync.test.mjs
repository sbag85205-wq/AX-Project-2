import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountSync,isSyncKey,mergeFirst} from '../public/account-sync.js';
import {STATE_KEY} from '../../supabase/functions/_shared/nyang/server.mjs';

// 브라우저 저장소와 서버를 흉내 낸다. 서버 값은 계정별 {이름: JSON 글자}.
function fixture(server={}){
 const map=new Map(),storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v));},get length(){return map.size;},key:i=>[...map.keys()][i]??null};
 const timers=[],calls=[];let offline=false;
 const keyFor=(account,key)=>key==='om-cat-motion'?key:`nyang-account:${account}:${key}`;
 const sync=createAccountSync({keyFor,storage,delay:10,retryDelay:20,later:(fn)=>{timers.push(fn);return timers.length;},cancel:()=>{},
  send:async body=>{calls.push(body);if(offline)throw Error('offline');
   if(body.action==='state')return {state:{...(server[body.account??current]||{})}};
   if(body.value&&body.value.length>200)throw Object.assign(Error('big'),{status:413});
   server[current]??={};if(body.value===null)delete server[current][body.key];else server[current][body.key]=body.value;return {saved:[body.key]};}});
 let current=null;
 return {map,server,calls,sync,keyFor,start:a=>{current=a;return sync.start(a);},offline:v=>{offline=v;},local:(a,k)=>map.get(keyFor(a,k))??null,put:(a,k,v)=>map.set(keyFor(a,k),v)};
}

test('서버와 맞추는 기록 이름은 서버 함수와 같다',()=>{
 for(const k of ['om-tasks','om-question-history','om-seen-replies','om-chat-sessions','om-personality','om-cat-motion','om-bg-theme-cat','om-bg-theme-work','om-bg-uploads-cat','om-docs','om-chat-active','nyang-color-theme','om-bg-theme-','om-bg-theme-CAT','x'])
  assert.equal(isSyncKey(k),STATE_KEY.test(k),k);
 assert.equal(isSyncKey('om-tasks'),true);assert.equal(isSyncKey('om-bg-uploads-cat'),false);assert.equal(isSyncKey('om-docs'),false);
});

test('다른 PC: 로그인하면 서버 기록이 브라우저에 들어와 화면이 다시 읽는다',async()=>{
 const f=fixture({a:{'om-tasks':'[{"id":"t1"}]','om-personality':'"warm"','om-bg-theme-cat':'"ocean"'}});
 assert.equal(await f.start('a'),true);
 assert.equal(f.local('a','om-tasks'),'[{"id":"t1"}]');assert.equal(f.local('a','om-personality'),'"warm"');assert.equal(f.local('a','om-bg-theme-cat'),'"ocean"');
 assert.deepEqual(f.sync.pending(),[]);
 assert.equal(await f.start('a'),false); // 같은 기록이면 다시 그리지 않는다
 assert.equal(f.calls.filter(c=>c.action==='state-set').length,0);
});

test('저장하면 서버로 보내고, 다른 계정 기록과 섞이지 않는다',async()=>{
 const f=fixture();
 await f.start('a');f.put('a','om-tasks','[1]');f.sync.changed('om-tasks');f.sync.changed('om-docs');f.sync.changed('om-chat-active');
 assert.deepEqual(f.sync.pending(),['om-tasks']);await f.sync.flush();
 assert.deepEqual(f.server.a,{'om-tasks':'[1]'});assert.deepEqual(f.sync.pending(),[]);
 await f.start('b');assert.equal(f.local('b','om-tasks'),null);assert.deepEqual(f.server.b??{},{});
 f.put('b','om-personality','"cold"');f.sync.changed('om-personality');await f.sync.flush();
 assert.deepEqual(f.server,{a:{'om-tasks':'[1]'},b:{'om-personality':'"cold"'}});
 await f.start(null);f.sync.changed('om-tasks');assert.deepEqual(f.sync.pending(),[]); // 로그아웃 상태에서는 보내지 않는다
});

test('처음 맞출 때: 이 브라우저에만 있던 기록을 올리고, 서버에도 있으면 합친다',async()=>{
 const f=fixture({a:{'om-tasks':'[{"id":"s1"},{"id":"both","v":"server"}]','om-seen-replies':'{"p1":2,"p2":1}','om-personality':'"warm"'}});
 f.put('a','om-tasks','[{"id":"both","v":"local"},{"id":"l1"}]');f.put('a','om-seen-replies','{"p1":1,"p3":4}');f.put('a','om-personality','"cold"');
 f.put('a','om-chat-sessions','[{"id":"c1"}]');f.put('a','om-bg-theme-cat','"nature"');f.put('a','om-bg-uploads-cat','[{"id":"img"}]');
 assert.equal(await f.start('a'),true);
 assert.equal(f.local('a','om-tasks'),'[{"id":"s1"},{"id":"both","v":"server"},{"id":"l1"}]');
 assert.equal(f.local('a','om-seen-replies'),'{"p1":2,"p3":4,"p2":1}');assert.equal(f.local('a','om-personality'),'"warm"'); // 설정은 서버 값
 await f.sync.flush();
 assert.equal(f.server.a['om-tasks'],f.local('a','om-tasks'));assert.equal(f.server.a['om-chat-sessions'],'[{"id":"c1"}]');assert.equal(f.server.a['om-bg-theme-cat'],'"nature"');
 assert.equal('om-bg-uploads-cat' in f.server.a,false); // 올린 배경 이미지는 서버로 보내지 않는다
 // 두 번째부터는 합치지 않고 서버 기록을 그대로 따른다(다른 PC에서 지운 항목이 되살아나지 않게)
 f.server.a['om-tasks']='[{"id":"s1"}]';assert.equal(await f.start('a'),true);assert.equal(f.local('a','om-tasks'),'[{"id":"s1"}]');
});

test('연결이 끊겨 못 보낸 기록은 표시해 두고, 다음에 서버 기록으로 덮어쓰지 않고 다시 보낸다',async()=>{
 const f=fixture({a:{'om-tasks':'[{"id":"old"}]'}});
 await f.start('a');f.offline(true);
 f.put('a','om-tasks','[{"id":"new"}]');f.sync.changed('om-tasks');await f.sync.flush();
 assert.deepEqual(f.sync.pending(),['om-tasks']);assert.equal(f.map.get('nyang-sync-dirty:a'),'["om-tasks"]');
 assert.equal(await f.start('a'),false);assert.equal(f.local('a','om-tasks'),'[{"id":"new"}]'); // 서버에 닿지 못해도 브라우저 기록으로 계속 쓴다
 f.offline(false);
 assert.equal(await f.start('a'),false);assert.equal(f.local('a','om-tasks'),'[{"id":"new"}]'); // 새로고침 뒤에도 더 새것인 브라우저 기록을 지킨다
 await f.sync.flush();assert.equal(f.server.a['om-tasks'],'[{"id":"new"}]');assert.deepEqual(f.sync.pending(),[]);assert.equal(f.map.get('nyang-sync-dirty:a'),'[]');
});

test('너무 큰 기록은 브라우저에만 두고 계속 다시 보내지 않는다. 지운 기록은 서버에서도 지운다',async()=>{
 const f=fixture({a:{'om-personality':'"warm"'}});
 await f.start('a');f.put('a','om-chat-sessions',JSON.stringify('x'.repeat(300)));f.sync.changed('om-chat-sessions');await f.sync.flush();
 const sent=f.calls.length;await f.sync.flush();assert.equal(f.calls.length,sent);assert.equal('om-chat-sessions' in f.server.a,false);
 f.map.delete(f.keyFor('a','om-personality'));f.sync.changed('om-personality');await f.sync.flush();assert.equal('om-personality' in f.server.a,false);
});

test('합치기 규칙',()=>{
 assert.equal(mergeFirst('om-tasks',null,'[1]'),'[1]');assert.equal(mergeFirst('om-tasks','[1]',null),'[1]');
 assert.equal(mergeFirst('om-tasks','[{"id":"a"}]','[{"id":"a"}]'),'[{"id":"a"}]');
 assert.equal(mergeFirst('om-tasks','[{"id":"a"}]','깨진 글자'),'[{"id":"a"}]');
 assert.equal(mergeFirst('om-chat-sessions','[{"id":"a"}]','[{"id":"b"},{"no":"id"},null]'),'[{"id":"a"},{"id":"b"}]');
 assert.equal(mergeFirst('om-cat-motion','false','true'),'false');
});

test('화면을 불러올 때 함께 받은 서버 기록이 있으면 다시 묻지 않고, 기다리지 않고 바로 저장소에 넣는다',async()=>{
 const f=fixture({a:{'om-tasks':'[{"id":"never-asked"}]'}});
 const done=f.start('a');f.sync; // start(a)는 서버에 묻는 경로
 await done;
 const g=fixture();g.put('a','om-tasks','[{"id":"local"}]');
 const promise=g.sync.start('a',{'om-tasks':'[{"id":"given"}]','om-personality':'"warm"'});
 // 기다리기 전에 이미 들어가 있다(첫 화면부터 서버 기록으로 그린다)
 assert.equal(g.local('a','om-tasks'),'[{"id":"given"},{"id":"local"}]');assert.equal(g.local('a','om-personality'),'"warm"');
 assert.equal(await promise,true);assert.equal(g.calls.filter(c=>c.action==='state').length,0);
 await g.sync.flush();assert.deepEqual(g.calls.map(c=>c.key),['om-tasks']); // 합친 일정만 올린다
});
