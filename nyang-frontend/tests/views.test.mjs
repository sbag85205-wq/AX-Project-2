import test from 'node:test';
import assert from 'node:assert/strict';
import {VIEWS,NAV,HOME,canView,navVisible,navOf} from '../public/views.js';

test('화면 표: 담당자·직원이 볼 수 있는 화면과 메뉴', () => {
 const names = Object.keys(VIEWS);
 assert.deepEqual(names.filter(n => canView(n, true)).sort(), ['board', 'documents', 'faq', 'library', 'model', 'statistics', 'unanswered', 'users']);
 assert.deepEqual(names.filter(n => canView(n, false)).sort(), ['activity', 'board', 'calendar', 'chat', 'library', 'todos']);
 assert.equal(canView('없는 화면', false), false);
 assert.deepEqual(HOME, {employee: 'chat', staff: 'unanswered'});
 assert.deepEqual(NAV.filter(([, who]) => navVisible(who, true)).map(([id]) => id), ['board', 'unanswered', 'statistics', 'faq', 'documents', 'users', 'model']);
 assert.deepEqual(NAV.filter(([, who]) => navVisible(who, false)).map(([id]) => id), ['chat', 'schedule', 'board', 'activity', 'library']);
 assert.equal(navOf('calendar'), 'schedule'); assert.equal(navOf('todos'), 'schedule'); assert.equal(navOf('board'), 'board');
 for (const n of names) { assert.ok(VIEWS[n].title && VIEWS[n].pageTitle, n); }
});
