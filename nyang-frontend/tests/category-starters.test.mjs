import test from 'node:test';
import assert from 'node:assert/strict';
import {faq,categories,shortQuestion,startersFor,STARTER_COUNT,applyManagedCategories,categoryOf} from '../public/core.js';
test('기본 예시 질문은 모두 정해 둔 짧은 이름이 있다(16자 이내)',()=>{
 for(const q of Object.values(faq).flat()){const l=shortQuestion(q);assert.notEqual(l,q,q);assert.ok(l.length<=16,l);}
});
test('담당자가 넣은 질문은 끝말을 덜어 짧게 만든다',()=>{
 assert.equal(shortQuestion('연차는 어떻게 신청하나요?'),'연차 신청');
 assert.equal(shortQuestion('출장비 정산 방법을 알려주세요'),'출장비 정산');
 assert.equal(shortQuestion('VPN 접속 절차를 알려주세요'),'VPN 접속');
 assert.equal(shortQuestion('프린터가 안 될 때 무엇을 확인하나요?'),'프린터가 안 될 때');
 assert.equal(shortQuestion('복지 포인트 한도는 얼마나 되나요?'),'복지 포인트 한도');
 assert.equal(shortQuestion('사내 메신저에서 그룹 채팅방을 새로 만들고 사람을 초대하는 방법을 알려주세요').length,16);
});
test('분야를 바꾸면 그 분야 예시 질문 앞에서부터 7개를 보여 준다',()=>{
 const server=startersFor(categoryOf('server'));
 assert.equal(server.length,STARTER_COUNT);assert.equal(server[0].q,faq.server[0]);assert.equal(server[0].category,'server');
 assert.equal(startersFor(categoryOf('etc')).length,faq.etc.length); // 5개뿐이면 5개
 applyManagedCategories(['서버 설치 · 설정','인사'],{'인사':['연차는 어떻게 신청하나요?']});
 assert.deepEqual(startersFor(categoryOf('custom:인사')).map(s=>s.label),['연차 신청']);
 applyManagedCategories(categories.length?['서버 설치 · 설정','클라이언트 접속','장애 조치','기타']:[]);
});
