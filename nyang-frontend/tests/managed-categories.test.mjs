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
test('분야별 예시 질문을 반영하고, 없으면 기본 예시를 쓴다',()=>{
 assert.equal(applyManagedCategories(['서버 설치 · 설정','인사·휴가'],{'인사·휴가':['연차는 어떻게 쓰나요?',' ',3]}),true);
 assert.deepEqual(categoryOf('custom:인사·휴가').examples,['연차는 어떻게 쓰나요?']);
 assert.equal(categoryOf('server').examples,null); // 저장된 예시가 없으면 기본 faq
 assert.equal(applyManagedCategories(['서버 설치 · 설정','인사·휴가'],{'인사·휴가':['바뀐 질문']}),true); // 예시만 바뀌어도 다시 그린다
 applyManagedCategories(original);
 assert.equal(categories.every(c=>!c.examples),true);
});
test('분야 설명을 반영하고, 없으면 기본 설명을 쓴다',()=>{
 assert.equal(applyManagedCategories(['서버 설치 · 설정','인사'],{},{'인사':'연차·근태 신청','서버 설치 · 설정':''}),true);
 assert.equal(categoryOf('custom:인사').detail,'연차·근태 신청');
 assert.equal(categoryOf('server').detail,''); // 비운 설명은 비운 채로
 assert.equal(applyManagedCategories(['서버 설치 · 설정','인사'],{},{'인사':'바뀐 설명'}),true); // 설명만 바뀌어도 다시 그린다
 assert.equal(categoryOf('server').detail,'OS·도메인부터 서버 설치, 기본 설정까지'); // 저장된 설명이 없어지면 기본 설명
 applyManagedCategories(original);
});
