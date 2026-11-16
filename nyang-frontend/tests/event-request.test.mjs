import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEventRequest,timeLabel,eventTask} from '../public/event-request.js';
const today='2026-11-16'; // 월요일
const p=q=>parseEventRequest(q,today);
test('요청 문장에서 제목·날짜·시간을 나눈다',()=>{
 assert.deepEqual(p('내 일정에 내일 오후 3시에 미팅 추가해줘'),{title:'미팅',date:'2026-11-17',time:'15:00'});
 assert.deepEqual(p('모레 오전 10시 30분 팀 회의 잡아줘'),{title:'팀 회의',date:'2026-11-18',time:'10:30'});
 assert.deepEqual(p('다음 주 금요일 2시에 거래처 미팅 일정 넣어줘'),{title:'거래처 미팅',date:'2026-11-27',time:'14:00'});
 assert.deepEqual(p('이번 주 수요일 저녁 7시 반 회식 등록해 주세요'),{title:'회식',date:'2026-11-18',time:'19:30'});
 assert.deepEqual(p('12월 3일 15:30 보고서 마감 캘린더에 추가해줘'),{title:'보고서 마감',date:'2026-12-03',time:'15:30'});
 assert.deepEqual(p('금요일에 치과 예약 넣어줘'),{title:'치과 예약',date:'2026-11-20',time:''});
 assert.deepEqual(p('오후 4시에 고객 전화 일정 추가'),null); // 부탁 말투가 없으면 일정으로 보지 않는다
 assert.deepEqual(p('오후 4시에 고객 전화 일정 추가해'),{title:'고객 전화',date:'2026-11-16',time:'16:00'}); // 날짜 없으면 오늘
 assert.deepEqual(p('11월 2일 워크숍 추가해줘'),{title:'워크숍',date:'2027-11-02',time:''}); // 지난 날짜면 내년
 assert.deepEqual(p('내일 일정 추가해줘'),{title:'새 일정',date:'2026-11-17',time:''});
});
test('문서 질문·방법 묻기·날짜 없는 부탁은 일정 추가로 보지 않는다',()=>{
 for(const q of ['내일 연차 쓰려면 어떻게 신청하나요?','일정은 어떻게 추가하나요?','캘린더에 일정 추가하는 방법 알려줘','미팅 추가해줘','Linker Client 설치 방법','VD 접속이 안 돼요','서버 OS 설치 및 기본설정은 어떻게 하나요?'])assert.equal(p(q),null,q);
});
test('시간 표시와 내 일정 할 일',()=>{
 assert.equal(timeLabel('15:00'),'오후 3:00');assert.equal(timeLabel('09:05'),'오전 9:05');assert.equal(timeLabel('00:30'),'오전 12:30');assert.equal(timeLabel(''),'');
 const t=eventTask({title:'미팅',date:'2026-11-17',time:'15:00'},'x');
 assert.equal(t.ref,null);assert.equal(t.deadline,null);assert.equal(t.done,false);assert.equal(t.date,'2026-11-17');assert.equal(t.note,'');assert.equal(t.time,'15:00');assert.equal(t.planType,'event');
});
test('일정 추가 답변도 대화 기록·질문 기록에 남는다(새로고침 뒤에도 카드가 보인다)',async()=>{
 const {normalizeChats}=await import('../public/chat-history.js');const {recordAnswer}=await import('../public/activity-history.js');
 const result={kind:'event',messageId:'m1',category:'server',q:'내일 오후 3시 미팅 추가해줘',event:{title:'미팅',date:'2026-11-17',time:'15:00'},decision:'added'};
 const chats=normalizeChats([{id:'c',category:'server',messages:[{role:'user',text:result.q,at:1},{role:'assistant',result,at:2}]}]);
 assert.deepEqual(chats[0].messages[1].result.event,result.event);
 assert.deepEqual(recordAnswer([],result,3)[0].result.event,result.event);
});
