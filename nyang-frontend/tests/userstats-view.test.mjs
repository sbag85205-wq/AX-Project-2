import test from 'node:test';
import assert from 'node:assert/strict';
import {statisticsHTML,rankingCSV,periodLabel,STATS_PERIODS} from '../public/account-view.js';

const row=(username,points)=>({username,points});
const stats=(over={})=>({day:'2026-11-16',updatedAt:'2026-11-16T03:00:00.000Z',accounts:4,attendance:2,rankingSince:'2026-08-16T03:00:00.000Z',
 periods:{month:'2026-10-31T15:00:00.000Z',quarter:'2026-08-16T03:00:00.000Z',all:''},
 ranking:[row('kim01',30)],rankings:{month:[row('lee02',20),row('kim01',10)],quarter:[row('kim01',30),row('lee02',20)],all:Array.from({length:12},(_,i)=>row('user'+String(i).padStart(2,'0'),200-i*10))},
 helpful:{month:[],quarter:[{username:'kim01',n:3}],all:[{username:'kim01',n:3},{username:'lee02',n:1}]},
 levels:[{level:1,n:2},{level:2,n:1},{level:3,n:0},{level:4,n:0},{level:5,n:1}],
 attendanceDaily:[0,1,0,2,4,1,2].map((n,i)=>({day:'2026-11-'+(10+i),n})),streaks:[{username:'kim01',days:4},{username:'lee02',days:1}],...over});
const text=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const rows=html=>[...html.matchAll(/<tr><td>.*?<\/tr>/g)].map(m=>text(m[0]).trim());

test('순위 기간을 고르면 포인트 순위와 유익해요 순위가 그 기간 것으로 바뀐다(기본은 최근 3개월)',()=>{
 assert.deepEqual(STATS_PERIODS.map(p=>p[0]),['month','quarter','all']);
 const q=statisticsHTML(stats());assert.deepEqual(rows(q),['1 kim01 30 P','2 lee02 20 P']);assert.match(q,/data-stats-period="quarter" aria-pressed="true"/);assert.match(text(q),/최근 3개월 · 2026-08-16 이후/);assert.match(text(q),/kim01 3개/);
 const m=statisticsHTML(stats(),{period:'month'});assert.deepEqual(rows(m),['1 lee02 20 P','2 kim01 10 P']);assert.match(text(m),/이번 달 · 2026-11-01 이후/);assert.match(text(m),/이 기간에 유익해요를 받은 질문이 없어요/);
 assert.match(text(statisticsHTML(stats(),{period:'all'})),/전체 기간/);
 assert.deepEqual(rows(statisticsHTML(stats(),{period:'없는기간'})),rows(q)); // 모르는 기간이면 기본으로
});
test('포인트 순위는 10명까지만 보여 주고, 더 있으면 모두 보기 버튼으로 펼친다',()=>{
 const closed=statisticsHTML(stats(),{period:'all'});assert.equal(rows(closed).length,10);assert.match(closed,/data-stats-more aria-expanded="false">12명 모두 보기</);
 const open=statisticsHTML(stats(),{period:'all',expanded:true});assert.equal(rows(open).length,12);assert.match(open,/aria-expanded="true">상위 10명만 보기</);
 assert.doesNotMatch(statisticsHTML(stats()),/data-stats-more/); // 10명 이하면 버튼이 없다
});
test('요약 숫자·레벨 분포·출석 현황을 보여 준다',()=>{
 const t=text(statisticsHTML(stats()));
 assert.match(t,/직원 계정 4 명/);assert.match(t,/오늘 출석 2 \/ 4명/);assert.match(t,/최근 7일 출석률 36%/); // 10회 ÷ (7일 × 4명)
 assert.match(t,/최장 연속 출석 4 일/);assert.match(t,/Lv\.1 호기심 새싹 2명 50%/);assert.match(t,/Lv\.5 질문 마스터 1명 25%/);
 assert.match(t,/kim01 4일 연속/);assert.match(statisticsHTML(stats()),/class="stats-bar today"[^>]*aria-label="2026-11-16: 2명 출석"/);
});
test('값이 비어 있거나 예전 응답(ranking만 있음)이어도 그린다',()=>{
 const old=statisticsHTML({day:'2026-11-16',updatedAt:'2026-11-16T03:00:00.000Z',accounts:0,attendance:0,rankingSince:'2026-08-16T03:00:00.000Z',ranking:[row('kim01',30)]});
 assert.deepEqual(rows(old),['1 kim01 30 P']);assert.match(text(old),/최근 7일 출석률 —/);assert.match(text(old),/아직 출석한 직원이 없어요/);
 const empty=statisticsHTML(stats({rankings:{month:[],quarter:[],all:[]},ranking:[]}));assert.match(empty,/data-stats-csv disabled/);assert.match(text(empty),/로그인한 직원 계정의 활동부터 표시됩니다/);
 assert.match(statisticsHTML({loading:true}),/불러오고 있어요/);assert.match(statisticsHTML({error:'담당자만 통계를 볼 수 있어요.'}),/role="alert">담당자만/);
});
test('아이디는 HTML로 해석되지 않게 바꿔서 넣는다',()=>{
 const html=statisticsHTML(stats({rankings:{quarter:[row('<img src=x>',5)]},helpful:{quarter:[{username:'<b>x',n:1}]},streaks:[{username:'"><i>',days:2}]}));
 assert.doesNotMatch(html,/<img src=x>|<b>x|"><i>/);assert.match(html,/&lt;img src=x&gt;/);
});
test('CSV: 엑셀용 BOM·머리글·순위 번호, 쉼표·따옴표와 수식 글자 처리',()=>{
 const csv=rankingCSV([row('kim01',1200),row('a,b"c',5),row('=SUM(A1)',3),row('-x',0)],periodLabel('month','2026-10-31T15:00:00.000Z'));
 assert.equal(csv,'﻿순위,아이디,받은 포인트(이번 달 · 2026-11-01 이후)\r\n1,kim01,1200\r\n2,"a,b""c",5\r\n3,\'=SUM(A1),3\r\n4,\'-x,0\r\n');
 assert.equal(periodLabel('all',''),'전체 기간');assert.equal(periodLabel('quarter','2026-08-16T03:00:00.000Z'),'최근 3개월 · 2026-08-16 이후');
});
