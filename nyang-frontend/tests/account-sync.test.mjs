import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountSync,isSyncKey,mergeFirst} from '../public/account-sync.js';
import {STATE_KEY} from '../../supabase/functions/_shared/nyang/server.mjs';

// 브라우저 저장소와 서버를 흉내 낸다. 서버 값은 계정별 {이름: JSON 글자}.
function fixture(server={}){
 const map=new Map(),storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v));},get length(){return map.size;},key:i=>[...map.keys()][i]??null};
 const timers=[],calls=[];let offline=false;
 const keyFor=(account,key)=>key==='om-cat-motion'||key==='nyang-color-theme'?key:`nyang-account:${account}:${key}`;
 const sync=createAccountSync({keyFor,storage,delay:10,retryDelay:20,later:(fn)=>{timers.push(fn);return timers.length;},cancel:()=>{},
  send:async body=>{calls.push(body);if(offline)throw Error('offline');
   if(body.action==='state'){const all={...(server[current]||{})};return {state:body.keys?Object.fromEntries(Object.entries(all).filter(([k])=>body.keys.includes(k))):all};}
   if(body.value&&body.value.length>200)throw Object.assign(Error('big'),{status:413});
   server[current]??={};if(body.value===null)delete server[current][body.key];else server[current][body.key]=body.value;return {saved:[body.key]};}});
 let current=null;
 return {map,server,calls,sync,keyFor,start:(a,...rest)=>{current=a;return sync.start(a,...rest);},offline:v=>{offline=v;},local:(a,k)=>map.get(keyFor(a,k))??null,put:(a,k,v)=>map.set(keyFor(a,k),v)};
}

test('서버와 맞추는 기록 이름은 서버 함수와 같다',()=>{
 for(const k of ['om-tasks','om-question-history','om-seen-replies','om-chat-sessions','om-personality','om-cat-motion','om-bg-theme-cat','om-bg-theme-work','om-bg-uploads-cat','om-docs','om-chat-active','nyang-color-theme','om-bg-theme-','om-bg-theme-CAT','om-bg-uploads-','sb-localhost-auth-token','nyang-sync-dirty:a','x'])
  assert.equal(isSyncKey(k),STATE_KEY.test(k),k);
 assert.equal(isSyncKey('om-tasks'),true);assert.equal(isSyncKey('om-bg-uploads-cat'),true);assert.equal(isSyncKey('nyang-color-theme'),true);assert.equal(isSyncKey('sb-localhost-auth-token'),false);
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
 await f.start('a');f.put('a','om-tasks','[1]');f.sync.changed('om-tasks');f.sync.changed('sb-localhost-auth-token');f.sync.changed('nyang-sync-dirty:a');
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
 assert.equal(f.server.a['om-bg-uploads-cat'],'[{"id":"img"}]'); // 직접 올린 배경 이미지도 올린다
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
 const g=fixture();g.put('a','om-tasks','[{"id":"local"}]');
 const promise=g.sync.start('a',{'om-tasks':'[{"id":"given"}]','om-personality':'"warm"','nyang-color-theme':'"dark"'},{});
 // 기다리기 전에 이미 들어가 있다(첫 화면부터 서버 기록으로 그린다)
 assert.equal(g.local('a','om-tasks'),'[{"id":"given"},{"id":"local"}]');assert.equal(g.local('a','om-personality'),'"warm"');assert.equal(g.map.get('nyang-color-theme'),'"dark"');
 assert.equal(await promise,false);assert.equal(g.calls.filter(c=>c.action==='state').length,0); // 나중에 더 바뀐 것은 없다
 await g.sync.flush();assert.deepEqual(g.calls.map(c=>c.key),['om-tasks']); // 합친 일정만 올린다
});

test('큰 기록(배경 이미지)은 이름·시각만 받고, 없거나 다른 기기에서 바뀌었을 때만 따로 받는다',async()=>{
 const f=fixture({a:{'om-bg-uploads-cat':'[{"id":"img1"}]'}});
 assert.equal(await f.start('a',{},{'om-bg-uploads-cat':'t1'}),true);assert.equal(f.local('a','om-bg-uploads-cat'),'[{"id":"img1"}]');
 assert.deepEqual(f.calls.map(c=>c.action+':'+(c.keys||[]).join()),['state:om-bg-uploads-cat']);
 // 같은 시각이면 다시 받지 않는다
 assert.equal(f.sync.refresh({},{'om-bg-uploads-cat':'t1'}),false);await new Promise(r=>setTimeout(r,0));assert.equal(f.calls.length,1);
 // 다른 기기에서 바뀌면(시각이 다르면) 받아서 알려 준다
 f.server.a['om-bg-uploads-cat']='[{"id":"img1"},{"id":"img2"}]';let told=0;
 f.sync.refresh({},{'om-bg-uploads-cat':'t2'},()=>told++);await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
 assert.equal(told,1);assert.equal(f.local('a','om-bg-uploads-cat'),'[{"id":"img1"},{"id":"img2"}]');
 // 처음 맞출 때 큰 기록을 '서버에 없는 기록'으로 잘못 올리지 않는다
 const g=fixture({b:{'om-bg-uploads-cat':'[{"id":"server"}]'}});g.put('b','om-bg-uploads-cat','[{"id":"local"}]');
 await g.start('b',{},{'om-bg-uploads-cat':'t1'});
 assert.equal(g.local('b','om-bg-uploads-cat'),'[{"id":"server"},{"id":"local"}]'); // 합친다
});

test('창으로 돌아오면 다른 기기에서 바꾼 기록을 넣고, 이 브라우저에서 아직 못 보낸 기록은 지킨다',async()=>{
 const f=fixture({a:{'om-tasks':'[1]','om-personality':'"cold"'}});
 await f.start('a',{'om-tasks':'[1]','om-personality':'"cold"'},{});
 assert.equal(f.sync.refresh({'om-tasks':'[1]','om-personality':'"cold"'},{}),false); // 그대로면 다시 그리지 않는다
 f.offline(true);f.put('a','om-tasks','[1,2]');f.sync.changed('om-tasks');await f.sync.flush(); // 이 기기에서 바꿨지만 아직 못 보냄
 assert.equal(f.sync.refresh({'om-tasks':'[9]','om-personality':'"warm"'},{}),true); // 다른 기기에서 바꾼 성격은 들어온다
 assert.equal(f.local('a','om-personality'),'"warm"');assert.equal(f.local('a','om-tasks'),'[1,2]'); // 못 보낸 일정은 지킨다
 f.offline(false);await f.sync.flush();assert.equal(f.server.a['om-tasks'],'[1,2]');
 assert.equal(f.sync.refresh(null,{}),false);
});

test('서버가 받지 않는 기록(4xx)은 계속 다시 보내지 않고, 로그인 만료(401)는 다시 보낸다',async()=>{
 const calls=[];let reply=null;
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),length:0,key:()=>null};
 const sync=createAccountSync({keyFor:(a,k)=>a+':'+k,storage,delay:1,retryDelay:1,later:()=>0,cancel:()=>{},send:async b=>{calls.push(b);if(b.action==='state')return {state:{}};if(reply)throw reply;return {};}});
 await sync.start('a',{},{});map.set('a:om-tasks','[1]');map.set('a:om-personality','"warm"');
 reply=Object.assign(Error('bad'),{status:400});sync.changed('om-tasks');sync.changed('om-personality');await sync.flush();
 assert.equal(calls.length,2);await sync.flush();assert.equal(calls.length,2); // 다음 기록까지 막지 않고, 다시 보내지도 않는다
 reply=Object.assign(Error('expired'),{status:401});sync.changed('om-tasks');await sync.flush();assert.deepEqual(sync.pending(),['om-tasks','om-personality']);
 reply=null;await sync.flush();assert.deepEqual(sync.pending(),['om-personality']); // 401이었던 일정은 다시 보내 성공, 400인 성격은 이번 화면에서 보류
});

test('예전 버전을 쓰던 기기: 이 기기에만 있는 대화 기록·올린 배경 이미지도 올리고, 서버에 있던 것과 합친다',async()=>{
 // 예전 버전이 '처음 맞춤'을 끝냈다고 표시해 둔 기기. 대화 기록·배경 이미지는 이 기기에만 있다.
 const f=fixture({a:{'om-chat-sessions':JSON.stringify([{id:'b1',messages:[{at:5}]}]),'om-tasks':'[{"id":"t1"}]'}});
 f.map.set('nyang-sync-first:a','1');
 f.put('a','om-chat-sessions',JSON.stringify([{id:'a1',messages:[{at:9}]}]));f.put('a','om-bg-uploads-cat','[{"id":"img"}]');f.put('a','om-bg-theme-cat','"upload:img"');
 await f.start('a',{'om-chat-sessions':f.server.a['om-chat-sessions'],'om-tasks':'[{"id":"t1"}]'},{});
 await f.sync.flush();
 assert.deepEqual(JSON.parse(f.server.a['om-chat-sessions']).map(x=>x.id),['b1','a1']); // 다른 기기 대화 + 이 기기 대화
 assert.equal(f.server.a['om-bg-uploads-cat'],'[{"id":"img"}]');assert.equal(f.server.a['om-bg-theme-cat'],'"upload:img"');
 assert.equal(f.local('a','om-chat-sessions'),f.server.a['om-chat-sessions']);
 // 한 번 합친 뒤에는 서버를 따른다(다른 기기에서 지운 대화가 되살아나지 않게)
 f.server.a['om-chat-sessions']=JSON.stringify([{id:'a1',messages:[{at:9}]}]);
 assert.equal(await f.start('a',{'om-chat-sessions':f.server.a['om-chat-sessions'],'om-tasks':'[{"id":"t1"}]','om-bg-uploads-cat':'[{"id":"img"}]','om-bg-theme-cat':'"upload:img"'},{}),false);
 assert.equal(f.local('a','om-chat-sessions'),f.server.a['om-chat-sessions']);
});

test('같은 대화가 양쪽에 있으면 더 최근에 이어진 쪽을 남긴다',()=>{
 const server=JSON.stringify([{id:'c',messages:[{at:1},{at:2}]},{id:'d',messages:[{at:7}]}]),local=JSON.stringify([{id:'c',messages:[{at:1},{at:2},{at:3},{at:4}]},{id:'d',messages:[{at:6}]}]);
 assert.deepEqual(JSON.parse(mergeFirst('om-chat-sessions',server,local)).map(x=>[x.id,x.messages.length]),[['c',4],['d',1]]);
 assert.equal(mergeFirst('om-question-history','[{"id":"q","at":5}]','[{"id":"q","at":3}]'),'[{"id":"q","at":5}]');
});

test('저장 공간이 부족해 합친 기록을 넣지 못하면, 서버 기록을 덮어쓰지 않고 다음에 다시 합친다',async()=>{
 const f=fixture({a:{'om-chat-sessions':'[{"id":"server"}]'}});f.put('a','om-chat-sessions','[{"id":"local"}]');
 const real=f.map.set.bind(f.map);let full=true;f.map.set=(k,v)=>{if(full&&k.endsWith(':om-chat-sessions'))throw Error('QuotaExceededError');return real(k,v);};
 await f.start('a',{'om-chat-sessions':'[{"id":"server"}]'},{});await f.sync.flush();
 assert.equal(f.server.a['om-chat-sessions'],'[{"id":"server"}]');assert.equal(f.local('a','om-chat-sessions'),'[{"id":"local"}]');
 full=false;await f.start('a',{'om-chat-sessions':'[{"id":"server"}]'},{});await f.sync.flush();
 assert.equal(f.server.a['om-chat-sessions'],'[{"id":"server"},{"id":"local"}]');
});

test('큰 기록을 보낸 기기는 자기가 보낸 것을 다시 받지 않는다',async()=>{
 const big=JSON.stringify([{id:'img',url:'x'.repeat(250_000)}]);
 const calls=[],map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),get length(){return map.size;},key:i=>[...map.keys()][i]??null};
 const sync=createAccountSync({keyFor:(a,k)=>a+':'+k,storage,delay:1,later:()=>0,cancel:()=>{},send:async b=>{calls.push(b.action);return b.action==='state-set'?{saved:[b.key],updated:'T1'}:{state:{}};}});
 await sync.start('a',{},{});map.set('a:om-bg-uploads-cat',big);sync.changed('om-bg-uploads-cat');await sync.flush();
 assert.deepEqual(calls,['state-set']);
 sync.refresh({},{'om-bg-uploads-cat':'T1'});await new Promise(r=>setTimeout(r,0));assert.deepEqual(calls,['state-set']); // 다시 받지 않는다
});

// 두 기기가 같은 서버를 쓰는 상황(서버는 저장 시각을 비교한다: 실제 서버 함수와 같은 규칙)
function sharedServer(){
 const rows={};let clock=0;
 const send=async b=>{
  if(b.action==='state')return {state:Object.fromEntries(Object.entries(rows).map(([k,r])=>[k,r.value])),updated:Object.fromEntries(Object.entries(rows).map(([k,r])=>[k,r.updated]))};
  if(b.action==='state-set'){
   const cur=rows[b.key];
   if('ifUpdated' in b&&(cur?.updated??null)!==(b.ifUpdated??null))return {saved:[],conflicts:[{key:b.key,value:cur?.value??null,updated:cur?.updated??null}]};
   const t='T'+(++clock);if(b.value===null)delete rows[b.key];else rows[b.key]={value:b.value,updated:t};return {saved:[b.key],updated:t,conflicts:[]};
  }
 };
 const device=({onMerged=null,during=null}={})=>{const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),get length(){return map.size;},key:i=>[...map.keys()][i]??null};
  // during(body): 요청이 서버에 가 있는 동안(응답 전에) 이 기기에서 일어나는 일
  const mine=async b=>{const r=await send(b);await during?.(b);return r;};
  return {map,sync:createAccountSync({keyFor:(a,k)=>`nyang-account:${a}:${k}`,send:mine,storage,delay:1,later:()=>0,cancel:()=>{},onMerged}),put:(k,v)=>map.set(`nyang-account:a:${k}`,v),get:k=>map.get(`nyang-account:a:${k}`)??null};};
 return {rows,send,device};
}

test('두 기기가 동시에 일정을 추가해도 둘 다 남는다(먼저 저장된 것을 덮어쓰지 않고 합친다)',async()=>{
 const srv=sharedServer(),pc=srv.device(),phone=srv.device();
 await pc.sync.start('a');await phone.sync.start('a'); // 둘 다 열어 둠(서버에 일정 없음)
 pc.put('om-tasks','[{"id":"meet","title":"미팅"}]');pc.sync.changed('om-tasks');await pc.sync.flush();
 phone.put('om-tasks','[{"id":"check","title":"점검"}]');phone.sync.changed('om-tasks');await phone.sync.flush(); // 폰은 PC 기록을 아직 못 봄
 assert.deepEqual(JSON.parse(srv.rows['om-tasks'].value).map(t=>t.id).sort(),['check','meet']);
 assert.equal(phone.get('om-tasks'),srv.rows['om-tasks'].value); // 폰 화면에도 합친 일정
 // 이어서 PC가 또 바꿔도(폰이 저장한 판을 못 본 채) 폰 일정을 지우지 않는다
 pc.put('om-tasks','[{"id":"meet","title":"미팅","done":true}]');pc.sync.changed('om-tasks');await pc.sync.flush();
 const final=JSON.parse(srv.rows['om-tasks'].value);
 assert.deepEqual(final.map(t=>t.id).sort(),['check','meet']);assert.equal(final.find(t=>t.id==='meet').done,true); // 방금 바꾼 완료 표시도 남는다
});

test('겹치지 않으면 지운 항목은 다른 기기에서도 지워지고, 설정은 나중에 바꾼 기기 값이 남는다',async()=>{
 const srv=sharedServer(),pc=srv.device(),phone=srv.device();
 await pc.sync.start('a');pc.put('om-tasks','[{"id":"x"},{"id":"y"}]');pc.put('om-personality','"cold"');pc.sync.changed('om-tasks');pc.sync.changed('om-personality');await pc.sync.flush();
 await phone.sync.start('a');assert.equal(phone.get('om-tasks'),'[{"id":"x"},{"id":"y"}]');
 phone.put('om-tasks','[{"id":"y"}]');phone.sync.changed('om-tasks');await phone.sync.flush(); // 폰에서 x 삭제(PC 판을 보고 나서)
 assert.equal(srv.rows['om-tasks'].value,'[{"id":"y"}]');
 pc.put('om-personality','"warm"');pc.sync.changed('om-personality');await pc.sync.flush(); // PC는 폰이 성격을 바꾸기 전 판을 봤다
 phone.put('om-personality','"cold"');phone.sync.changed('om-personality');await phone.sync.flush();
 assert.equal(srv.rows['om-personality'].value,'"cold"'); // 겹치면 방금 바꾼 기기 값
});

test('합쳐지면 화면이 곧바로 다시 읽어, 화면에 있던 옛 목록으로 저장해도 다른 기기 일정이 지워지지 않는다',async()=>{
 const srv=sharedServer(),pc=srv.device();let screen=[];
 const phone=srv.device({onMerged:key=>{if(key==='om-tasks')screen=JSON.parse(phone.get('om-tasks'));}}); // app.js의 reloadAccountRecords 역할
 await pc.sync.start('a');await phone.sync.start('a');
 pc.put('om-tasks','[{"id":"TA"}]');pc.sync.changed('om-tasks');await pc.sync.flush();
 screen=[{id:'TB'}];phone.put('om-tasks',JSON.stringify(screen));phone.sync.changed('om-tasks');await phone.sync.flush(); // 폰은 PC 일정을 아직 못 봄
 assert.deepEqual(screen.map(t=>t.id).sort(),['TA','TB']); // 화면 목록도 합친 것으로 바뀐다
 // 폰 화면에서 일정을 완료로 표시하면 화면 목록 전체를 저장한다: PC 일정이 남아 있어야 한다
 screen=screen.map(t=>t.id==='TB'?{...t,done:true}:t);phone.put('om-tasks',JSON.stringify(screen));phone.sync.changed('om-tasks');await phone.sync.flush();
 const final=JSON.parse(srv.rows['om-tasks'].value);
 assert.deepEqual(final.map(t=>t.id).sort(),['TA','TB']);assert.equal(final.find(t=>t.id==='TB').done,true);
});

test('저장 요청이 가는 동안 또 고친 내용은, 다른 기기 기록과 합칠 때 사라지지 않는다',async()=>{
 const srv=sharedServer(),pc=srv.device();let edited=false,phone;
 phone=srv.device({during:b=>{
  if(b.action!=='state-set'||edited)return;edited=true;
  // 첫 저장 요청이 서버에 가 있는 동안 일정을 하나 더 추가했다
  phone.put('om-tasks','[{"id":"TB"},{"id":"TB2"}]');phone.sync.changed('om-tasks');
 }});
 await pc.sync.start('a');await phone.sync.start('a');
 pc.put('om-tasks','[{"id":"TA"}]');pc.sync.changed('om-tasks');await pc.sync.flush();
 phone.put('om-tasks','[{"id":"TB"}]');phone.sync.changed('om-tasks');await phone.sync.flush();
 for(let i=0;i<3&&phone.sync.pending().length;i++)await phone.sync.flush();
 assert.deepEqual(JSON.parse(srv.rows['om-tasks'].value).map(t=>t.id).sort(),['TA','TB','TB2']);
 assert.deepEqual(JSON.parse(phone.get('om-tasks')).map(t=>t.id).sort(),['TA','TB','TB2']);
 assert.deepEqual(phone.sync.pending(),[]);
});
