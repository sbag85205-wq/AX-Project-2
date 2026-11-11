import test from 'node:test';
import assert from 'node:assert/strict';
import {completedMessages,normalizeChats,rememberChat,importQuestionHistory,questionsByCategory} from '../public/chat-history.js';
const pair=(at=1)=>[{role:'user',text:'연차 신청',at},{role:'assistant',at:at+1,result:{kind:'answer',id:'annual',category:'hr',messageId:'m'+at,decision:'added',start:'2026-11-12'}}];
test('keeps complete exchanges and ignores an interrupted reply',()=>{
 const input=[...pair(),{role:'user',text:'미완료 질문',at:3}];
 const restored=completedMessages(input);assert.equal(restored.length,2);
 restored[1].result.decision='no';assert.equal(input[1].result.decision,'added');
 assert.deepEqual(completedMessages([{role:'user',at:1,text:'x'},{role:'assistant',at:2,result:{kind:'invalid',messageId:'x'}}]),[]);
});
test('round trips full conversations without duplicating threads or losing schedule decisions',()=>{
 let chats=rememberChat([],'one',pair(),'hr');
 chats=rememberChat(chats,'two',pair(5),'hr');
 chats=rememberChat(chats,'one',[...pair(),...pair(10)],'hr');
 const restored=normalizeChats(JSON.parse(JSON.stringify(chats)));
 assert.deepEqual(restored.map(x=>x.id),['one','two']);
 assert.equal(restored[0].messages.length,4);assert.equal(restored[0].messages[1].result.decision,'added');
 assert.deepEqual(rememberChat(restored,'empty',[],'hr'),restored);
});
test('imports previous question records and retains the latest 100 conversations',()=>{
 const q={id:'old',q:'기존 질문',at:1,result:pair()[1].result};
 const migrated=importQuestionHistory([q]);assert.equal(migrated[0].id,'legacy-old');assert.equal(migrated[0].messages[1].result.messageId,'old');
 const rows=Array.from({length:102},(_,i)=>({id:String(i),messages:pair(i*3),category:'hr'}));
 const stored=normalizeChats([null,...rows]);assert.equal(stored.length,100);assert.equal(stored[0].id,'101');
 assert.deepEqual(normalizeChats({broken:true}),[]);
});

test('category filters select individual questions from mixed-scope threads',()=>{
 const hr=pair(1),trip=pair(4);trip[0].text='출장 준비';trip[1].result.category='trip';
 const chats=rememberChat([],'mixed',[...hr,...trip],'trip');
 const rows=questionsByCategory(chats,'hr');
 assert.equal(rows.length,1);assert.equal(rows[0].title,'연차 신청');assert.equal(rows[0].messageId,'m1');assert.equal(rows[0].threadId,'mixed');
 assert.equal(questionsByCategory(chats,'trip')[0].title,'출장 준비');
 assert.deepEqual(questionsByCategory(chats,'pay'),[]);
 assert.equal(chats[0].messages.length,4);
});
