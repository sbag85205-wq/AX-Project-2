import test from 'node:test';
import assert from 'node:assert/strict';
import {isPersonalQuestion,newQuestion,resolveQuestion} from '../public/core.js';

test('개인 정보 질문을 알아보고, Knowly 질문 결과에 personal로 남긴다', () => {
 for (const q of ['내 비밀번호를 잊어버렸는데 알려주세요', '비번 바꾸는 법', '잔여 연차 알려줘', '남은 연차가 며칠이야?', '내 급여가 얼마예요?', '내 월급 얼마야'])
  assert.equal(isPersonalQuestion(q), true, q);
 for (const q of ['Linker Client 설치 방법을 알려주세요', '연차는 어떻게 신청하나요?', '급여일이 언제예요?'])
  assert.equal(isPersonalQuestion(q), false, q);
 const personal = newQuestion('내 비밀번호를 잊어버렸는데 알려주세요', 'client', 'm1');
 assert.deepEqual(personal, {q: '내 비밀번호를 잊어버렸는데 알려주세요', category: 'client', messageId: 'm1', personal: true});
 assert.deepEqual(newQuestion('VM이 느릴 경우 무엇을 확인하나요?', 'trouble', 'm2'), {q: 'VM이 느릴 경우 무엇을 확인하나요?', category: 'trouble', messageId: 'm2'});
 assert.match(newQuestion('질문', 'server').messageId, /^[0-9a-f-]{36}$/);
 // 예전 샘플 분류기도 같은 규칙을 쓴다.
 assert.deepEqual(resolveQuestion('내 급여가 얼마예요?', 'pay'), {kind: 'unknown', personal: true});
});

test('개인 정보 질문을 게시판에 올리려 하면 안내를 보여주고 질문을 채우지 않는다', async t => {
 const originalDocument = globalThis.document;
 globalThis.document = {addEventListener() {}};
 t.after(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });
 const {initCommunity, refreshCommunity, showPostDialog} = await import('../public/community-ui.js');
 t.mock.method(globalThis, 'fetch', async () => ({ok: true, json: async () => ({member: true, me: {role: 'employee'}, posts: []})}));
 const modals = [];
 initCommunity({update() {}, render() {}, toast() {}, show() {}, close() {}, modal: html => modals.push(html)});
 await refreshCommunity();
 showPostDialog({...newQuestion('내 비밀번호를 잊어버렸는데 알려주세요', 'client', 'm1'), kind: 'unknown'});
 assert.match(modals[0], /개인별 정보는 공개 게시판에서 확인할 수 없어요/);
 assert.match(modals[0], /<textarea name="body"[^>]*><\/textarea>/);
 showPostDialog({...newQuestion('VM이 느릴 경우 무엇을 확인하나요?', 'trouble', 'm2'), kind: 'unknown'});
 assert.doesNotMatch(modals[1], /개인별 정보는/);
 assert.match(modals[1], /<textarea name="body"[^>]*>VM이 느릴 경우 무엇을 확인하나요\?<\/textarea>/);
});
