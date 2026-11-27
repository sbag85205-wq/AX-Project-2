import test from 'node:test';
import assert from 'node:assert/strict';
import {alertText, boardAlertText, waitingPostIds, agoText, newPostIds, pruneBoardLog} from '../public/staff-alerts.js';

test('담당자 알림 종: 챗봇 미답변은 로그인 뒤 처음 센 것은 기록하지 않고, 늘어난 만큼만 기록한다', () => {
  assert.equal(alertText(null, 3), '');
  assert.equal(alertText(3, 3), '');
  assert.equal(alertText(3, 2), '');
  assert.equal(alertText(2, 4), '챗봇 미답변에 새 질문 2개');
  assert.equal(alertText(0, 1), '챗봇 미답변에 새 질문 1개');
});

test('담당자 알림 종: 게시판은 답변 대기 글을 세고, 새로 올라온 글만 기록한다', () => {
  const posts = [{id: 'a', replies: []}, {id: 'b', replies: [{id: 'r'}]}, {id: 'c'}];
  assert.deepEqual(waitingPostIds(posts), ['a', 'c']);
  assert.deepEqual(waitingPostIds(undefined), []);
  assert.equal(boardAlertText(null, ['a', 'c']), '');
  assert.equal(boardAlertText(new Set(['a', 'c']), ['a', 'c']), '');
  assert.equal(boardAlertText(new Set(['a', 'c']), ['c']), '', '답변이 달려 줄어든 것은 기록하지 않는다');
  // 하나는 답변이 달리고 하나는 새로 올라와 개수가 같아도 새 글은 기록한다
  assert.equal(boardAlertText(new Set(['a', 'c']), ['c', 'd']), '질문 게시판에 새 질문 1개');
});

test('담당자 알림 종: 기록 시각', () => {
  const now = Date.UTC(2026, 10, 27, 6, 0);
  assert.equal(agoText(now - 20_000, now), '방금');
  assert.equal(agoText(now - 5 * 60_000, now), '5분 전');
  assert.match(agoText(now - 2 * 3600_000, now), /\d/);
});

test('담당자 알림 종: 삭제·영구삭제된 글은 새로 들어온 기록에서도 빠진다', () => {
  assert.deepEqual(newPostIds(null, ['a']), []);
  assert.deepEqual(newPostIds(new Set(['a']), ['a', 'b', 'c']), ['b', 'c']);
  const log = [{text: '질문 게시판에 새 질문 2개', at: 1, view: 'board', ids: ['b', 'c']}, {text: '챗봇 미답변에 새 질문 1개', at: 0, view: 'unanswered'}];
  // c가 삭제됨 → 1개로 줄고, 챗봇 기록은 그대로
  assert.deepEqual(pruneBoardLog(log, [{id: 'a'}, {id: 'b', replies: [{id: 'r'}]}]), [{text: '질문 게시판에 새 질문 1개', at: 1, view: 'board', ids: ['b']}, log[1]]);
  // 둘 다 삭제됨 → 게시판 기록은 사라진다
  assert.deepEqual(pruneBoardLog(log, [{id: 'a'}]), [log[1]]);
  // 그대로면 같은 기록
  assert.equal(pruneBoardLog(log, [{id: 'b'}, {id: 'c'}])[0], log[0]);
});
