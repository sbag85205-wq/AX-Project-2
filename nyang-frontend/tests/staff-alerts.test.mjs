import test from 'node:test';
import assert from 'node:assert/strict';
import {alertText} from '../public/staff-alerts.js';

test('담당자 알림: 로그인 때 남은 신규 질문, 그 뒤에는 늘어난 만큼만 알린다', () => {
  assert.equal(alertText(null, 0), '');
  assert.match(alertText(null, 3), /확인하지 않은 챗봇 미답변 질문이 3개/);
  assert.equal(alertText(3, 3), '');
  assert.equal(alertText(3, 2), '');
  assert.match(alertText(2, 4), /새 챗봇 미답변 질문이 2개 들어왔어요. \(신규 4개\)/);
  assert.match(alertText(0, 1), /새 챗봇 미답변 질문이 1개/);
});

test('담당자 알림: 게시판은 답변 대기 글을 세고, 그 뒤에는 새로 올라온 글만 알린다', async () => {
  const {boardAlertText, waitingPostIds} = await import('../public/staff-alerts.js');
  const posts = [{id: 'a', replies: []}, {id: 'b', replies: [{id: 'r'}]}, {id: 'c'}];
  assert.deepEqual(waitingPostIds(posts), ['a', 'c']);
  assert.deepEqual(waitingPostIds(undefined), []);
  assert.equal(boardAlertText(null, []), '');
  assert.match(boardAlertText(null, ['a', 'c']), /답변을 기다리는 게시판 질문이 2개/);
  assert.equal(boardAlertText(new Set(['a', 'c']), ['a', 'c']), '');
  assert.equal(boardAlertText(new Set(['a', 'c']), ['c']), '', '답변이 달려 줄어든 것은 알리지 않는다');
  // 하나는 답변이 달리고 하나는 새로 올라와 개수가 같아도 새 글은 알린다
  assert.match(boardAlertText(new Set(['a', 'c']), ['c', 'd']), /새 질문이 1개 올라왔어요. \(답변 대기 2개\)/);
});
