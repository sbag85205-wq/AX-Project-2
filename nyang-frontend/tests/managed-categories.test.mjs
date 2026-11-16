import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,applyManagedCategories,categoryOf} from '../public/core.js';
import {normalizeChats} from '../public/chat-history.js';
import {normalizeHistory} from '../public/activity-history.js';
const original=categories.map(c=>c.label);
test('분야 관리 목록을 채팅 분야에 반영한다(기존 분야는 그대로, 새 분야는 custom:)',()=>{
 assert.equal(applyManagedCategories(['서버 설치 · 설정','인사·휴가','기타']),true);
 assert.deepEqual(categories.map(c=>c.id),['server','custom:인사·휴가','etc']);
 assert.equal(categoryOf('etc').searchAll,true);
 assert.equal(categoryOf('trouble').id,'server'); // 지워진 분야는 첫 분야로
 assert.equal(applyManagedCategories(['서버 설치 · 설정','인사·휴가','기타']),false); // 같으면 다시 그리지 않음
 assert.equal(applyManagedCategories([]),false);
 applyManagedCategories(original);
 assert.deepEqual(categories.map(c=>c.id),['server','client','trouble','etc']);
});
test('새 분야로 나눈 대화와 질문 기록도 저장된다',()=>{
 const result={kind:'knowly',messageId:'m1',category:'custom:인사·휴가'};
 const chats=normalizeChats([{id:'c1',category:'custom:인사·휴가',messages:[{role:'user',text:'연차',at:1},{role:'assistant',result,at:2}]}]);
 assert.equal(chats.length,1);assert.equal(chats[0].category,'custom:인사·휴가');
 const history=normalizeHistory([{id:'m1',q:'연차',at:2,result}]);
 assert.equal(history.length,1);
});
