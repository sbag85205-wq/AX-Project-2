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
