import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveQuestion} from '../public/core.js';
import {scheduleTypeFor} from '../public/companion.js';
// app.js ask()와 같은 방식: 분야가 달라도 질문 내용으로 일정 종류를 정한다
const typeOf=q=>{const r=resolveQuestion(q,'server');return scheduleTypeFor(r.kind==='scope'?resolveQuestion(q,r.target):r);};
test('연차를 쓰겠다는 여러 말투를 연차 일정으로 알아본다',()=>{
 for(const q of ['연차 이번주 수요일에 쓰고싶어','이번 주 수요일에 연차 쓰고 싶어','다음 주 금요일에 연차 쓰려면 언제까지 신청해야 해?','금요일에 연차 내고 싶어','휴가 쓰고 싶어','연차 사용하려면?','연차 신청 방법'])assert.equal(typeOf(q),'annual',q);
});
test('반차·취소·남은 연차·출산휴가는 연차 일정으로 잡지 않는다',()=>{
 assert.equal(typeOf('내일 반차 쓸래'),'half');
 assert.equal(typeOf('연차 취소하고 싶어'),null);
 assert.equal(typeOf('남은 연차 며칠이야?'),null);
 assert.equal(typeOf('출산휴가 쓰고 싶어'),null);
 assert.equal(typeOf('Linker Client 설치 방법'),null);
});
