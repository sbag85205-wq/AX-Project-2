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
