import test from 'node:test';
import assert from 'node:assert/strict';

test('a compact pet response updates rewards without losing shared board or activity state',async t=>{
 const originalDocument=globalThis.document;
 globalThis.document={addEventListener(){}};
 t.after(()=>{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});
 const {initCommunity,refreshCommunity,communityAction,communityState}=await import('../public/community-ui.js');
 const original={member:true,visitorMode:true,me:{role:'visitor'},wallet:{points:10},level:{level:1},
  posts:[{id:'existing-question'}],today:{points:5},streak:3,receivedLikes:2};
 const reply={partial:'wallet',wallet:{points:15},level:{level:1},eventResult:{kind:'bonus'}};
 const requests=[],updates=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(options?.method==='POST')requests.push(JSON.parse(options.body));
  return {ok:true,json:async()=>options?.method==='POST'?reply:original};
 });
 initCommunity({update:state=>updates.push(state),toast:()=>{},show:()=>{}});
 await refreshCommunity();
 const result=await communityAction('reward',{type:'pet',id:'one-stroke'});
 assert.equal(requests[0].response,'wallet');assert.equal(result.eventResult.kind,'bonus');
 assert.deepEqual(communityState(),{...original,wallet:reply.wallet,level:reply.level});
 assert.equal(updates.at(-1).member,true);assert.equal(updates.at(-1).posts,original.posts);
});

test('an in-flight reward response cannot restore an account after logout',async t=>{
 const originalDocument=globalThis.document;globalThis.document={addEventListener(){}};
 t.after(()=>{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});
 const {initCommunity,refreshCommunity,communityAction,communityState,logoutAccount}=await import('../public/community-ui.js');
 const signed={member:true,me:{username:'user01',role:'employee'},wallet:{points:10},posts:[]};
 let finishReward;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(!options?.method)return{ok:true,json:async()=>signed};
  if(JSON.parse(options.body).action==='logout')return{ok:true};
  return await new Promise(resolve=>{finishReward=()=>resolve({ok:true,json:async()=>({...signed,wallet:{points:20}})});});
 });
 initCommunity({update(){},close(){},toast(){},show(){},render(){}});await refreshCommunity();
 const pending=communityAction('reward',{type:'collect',id:'pending-heart'});await logoutAccount();finishReward();
 assert.equal(await pending,null);assert.equal(communityState().member,false);
});

test('board rows open a question detail; delete is offered there only for own questions or staff',async()=>{
 const {boardView,boardPostHTML}=await import('../public/board-view.js');
 const post=(id,mine)=>({id,mine,category:'hr',body:id,created:'2026-11-12',likes:0,replies:[]});
 const state={me:{role:'employee'},posts:[post('own',true),post('other',false)]};
 const employee=boardView(state);
 assert.ok(employee.includes('data-open-post="own"')&&employee.includes('data-open-post="other"'));assert.ok(!employee.includes('data-delete-post'));
 assert.ok(boardPostHTML(state,'own').includes('data-delete-post="own"'));assert.ok(!boardPostHTML(state,'other').includes('data-delete-post'));
 assert.ok(boardView(state,'mine').includes('data-open-post="own"')&&!boardView(state,'mine').includes('data-open-post="other"'));
 const staff={...state,me:{role:'staff',username:'admin'}};
 assert.ok(boardPostHTML(staff,'own').includes('data-delete-post="own"'));assert.ok(boardPostHTML(staff,'other').includes('data-delete-post="other"'));
 assert.equal(boardPostHTML(state,'missing'),'');
});
test('question detail offers 유익해요 (+10 P to the author) to other employees only, and the list can sort by it',async()=>{
 const {boardView,boardPostHTML}=await import('../public/board-view.js');
 const post=(id,o={})=>({id,mine:false,liked:false,category:'server',body:'질문 '+id,created:'2026-11-1'+id.length,likes:0,replies:[],...o});
 const state={me:{role:'employee'},posts:[post('a',{likes:1}),post('bb',{likes:5}),post('own',{mine:true}),post('done',{liked:true,likes:2})]};
 const other=boardPostHTML(state,'a');assert.match(other,/data-like="a"(?![^>]*disabled)/);assert.ok(other.includes('글쓴이에게 +10 P'));
 assert.match(boardPostHTML(state,'own'),/data-like="own"[^>]*disabled/);assert.ok(boardPostHTML(state,'own').includes('내게 +10 P'));
 assert.match(boardPostHTML(state,'done'),/data-like="done"[^>]*disabled/);
 assert.ok(!boardPostHTML({...state,me:{role:'staff',username:'admin'}},'a').includes('data-like'));
 const order=html=>[...html.matchAll(/data-open-post="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(order(boardView(state,'all','','all','helpful')),['bb','done','a','own']);
});
test('board can be narrowed to one category, with counts, and keeps old-category posts reachable',async()=>{
 const {boardView}=await import('../public/board-view.js');
 const post=(id,category,replies=[])=>({id,mine:false,category,body:'질문 '+id,created:'2026-11-15',likes:0,replies});
 const state={me:{role:'employee',username:'emp'},posts:[post('a','server'),post('b','client'),post('c','client',[{body:'답',source:'근거',created:'2026-11-15',department:'IT',name:'담당'}]),post('d','hr')]};
 const all=boardView(state);
 for(const id of ['a','b','c','d'])assert.ok(all.includes('id="post-'+id+'"'));
 assert.match(all,/data-board-category="client"[^>]*>클라이언트 접속<span>2<\/span>/);
 assert.match(all,/data-board-category="old"[^>]*>이전 분야<span>1<\/span>/);
 const client=boardView(state,'all','','client');
 assert.ok(client.includes('id="post-b"')&&client.includes('id="post-c"'));assert.ok(!client.includes('id="post-a"')&&!client.includes('id="post-d"'));
 const waiting=boardView(state,'waiting','','client');assert.ok(waiting.includes('id="post-b"')&&!waiting.includes('id="post-c"'));
 assert.ok(boardView(state,'all','','old').includes('id="post-d"'));
 assert.match(all,/data-board-category="etc"[^>]*>기타<span>0<\/span>/);
 assert.ok(boardView({...state,posts:[...state.posts,post('e','etc')]},'all','','etc').includes('id="post-e"'));
 assert.ok(boardView(state,'all','','trouble').includes('이 분야에 해당하는 질문이 없어요.'));
 assert.ok(!boardView({...state,posts:state.posts.slice(0,3)}).includes('data-board-category="old"'));
});

test('지갑만 바뀐 응답(쓰다듬기)은 화면 불러오기 때 받은 개인 기록 묶음을 다시 싣지 않는다',async t=>{
 const originalDocument=globalThis.document;
 globalThis.document={addEventListener(){}};
 t.after(()=>{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});
 const {initCommunity,refreshCommunity,communityAction}=await import('../public/community-ui.js?stale-personal');
 const loaded={member:true,me:{id:'a',role:'employee'},wallet:{points:10},level:{level:1},posts:[],personalState:{'om-chat-active':'"old"'},personalLarge:{}};
 t.mock.method(globalThis,'fetch',async(url,options)=>({ok:true,json:async()=>options?.method==='POST'?{partial:'wallet',wallet:{points:20},level:{level:1}}:loaded}));
 const updates=[];initCommunity({update:state=>updates.push(state),toast:()=>{},show:()=>{}});
 await refreshCommunity();assert.equal(updates.at(-1).personalState['om-chat-active'],'"old"');
 await communityAction('reward',{type:'pet',id:'p1'});
 const last=updates.at(-1);assert.equal('personalState' in last,false);assert.equal('personalLarge' in last,false);assert.equal(last.wallet.points,20);assert.equal(last.me.id,'a');
});

test('내 질문 상세 창을 열면(게시판에서 열어도) 새 답변을 읽은 것으로 알린다',async t=>{
 const originalDocument=globalThis.document;
 globalThis.document={addEventListener(){},getElementById(){return null;},querySelector(){return null;}};
 t.after(()=>{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});
 const {initCommunity,refreshCommunity,showBoardPost}=await import('../public/community-ui.js?seen-replies');
 const mine={id:'p1',category:'server',body:'내 질문입니다',created:'2026-11-17T00:00:00Z',mine:true,likes:0,liked:false,replies:[{id:'r1',body:'답변',source:'규정',created:'2026-11-17T01:00:00Z',department:'운영',name:'담당'}]};
 const other={...mine,id:'p2',mine:false};
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({member:true,me:{id:'a',role:'employee',username:'a'},wallet:{points:0},level:{level:1},posts:[mine,other]})}));
 const seen=[];initCommunity({update(){},toast(){},show(){},modal(){},seen:p=>seen.push(p?.id)});
 await refreshCommunity();showBoardPost('p1');showBoardPost('p2');
 assert.deepEqual(seen,['p1','p2']); // 앱은 내 글(mine)만 읽음 처리한다
});
test('게시판 답변 수정·삭제 버튼: 담당자 본인이 쓴 답변(own)에만, 직원에게는 보이지 않는다',async()=>{
 const {boardPostHTML}=await import('../public/board-view.js');
 const replies=[{id:'mine',department:'운영',name:'담당자',created:'2026-11-25',body:'내가 쓴 답변입니다.',source:'규정',own:true},{id:'theirs',department:'인사',name:'담당자 B',created:'2026-11-25',body:'다른 담당자 답변입니다.',source:'규정'}];
 const post={id:'p',category:'server',body:'질문',created:'2026-11-25',replies};
 const staff=boardPostHTML({me:{role:'staff',username:'manager'},posts:[post]},'p');
 assert.ok(staff.includes('data-edit-reply="mine"'));assert.ok(staff.includes('data-delete-reply="mine"'));assert.ok(staff.includes('data-edit-reply-form="mine"'));
 assert.ok(!staff.includes('data-edit-reply="theirs"'));assert.ok(!staff.includes('data-delete-reply="theirs"'));
 // 고치기 칸에는 지금 답변이 채워져 있고, 등록 버튼은 아래 줄(staff-composer-foot)에 있다
 assert.ok(staff.includes('>내가 쓴 답변입니다.</textarea>'));assert.match(staff,/staff-composer-foot"><p>[^<]+<\/p><button class="primary-button">담당자 답변 등록/);
 const employee=boardPostHTML({me:{role:'employee'},posts:[post]},'p');
 assert.ok(!employee.includes('data-edit-reply'));assert.ok(!employee.includes('data-delete-reply'));
});
