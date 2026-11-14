import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QUESTION_POINTS,LIKE_POINTS,ATTENDANCE_GIFTS,drawAttendanceGift,rewardHelp,rewardTransition,initialRewards,TREAT_COST,HEARTS_PER_TREAT} from '../public/reward-rules.js';

// 질문·좋아요 포인트는 DB 트리거(drizzle 마이그레이션)가 실제로 지급한다. 화면 안내·규칙 상수와 어긋나면 실패한다.
const dir=new URL('../drizzle/',import.meta.url);
const sql=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort().map(f=>fs.readFileSync(new URL(f,dir),'utf8')).join('\n');
function latestTrigger(name){
 const all=[...sql.matchAll(new RegExp(`CREATE TRIGGER ${name} AFTER INSERT ON \\w+ BEGIN([\\s\\S]*?)END;`,'g'))];
 assert.ok(all.length,`${name} 트리거가 없어요`);
 return all.at(-1)[1];
}
const pointsAdded=body=>Number(body.match(/'\$\.points',json_extract\(data,'\$\.points'\)\+(\d+)/)?.[1]);

test('보상 상수가 DB 트리거의 지급 포인트와 같다(실제 사용하는 demo_ 테이블과 원래 테이블 모두)',()=>{
 for(const name of ['question_reward','demo_question_reward'])assert.equal(pointsAdded(latestTrigger(name)),QUESTION_POINTS,name);
 for(const name of ['like_reward','demo_like_reward'])assert.equal(pointsAdded(latestTrigger(name)),LIKE_POINTS,name);
 for(const name of ['attendance_reward','demo_attendance_reward'])assert.match(latestTrigger(name),/\+NEW\.points/,name);
});

test('출석 선물 확률과 안내 문구가 같은 상수에서 나온다',()=>{
 assert.equal(ATTENDANCE_GIFTS.at(-1).below,1);
 assert.deepEqual([0,.499,.5,.799,.8,.949,.95,.999].map(drawAttendanceGift),[
  {points:5,tokens:0},{points:5,tokens:0},{points:10,tokens:0},{points:10,tokens:0},
  {points:0,tokens:1},{points:0,tokens:1},{points:0,tokens:3},{points:0,tokens:3}]);
 const help=rewardHelp();
 assert.equal(help.attendance.split('.<br>')[0],'5 P 50% · 10 P 30% · 츄르 1개 15% · 츄르 3개 5%');
 assert.ok(help.question.startsWith(`새 질문 +${QUESTION_POINTS} P`));assert.ok(help.question.includes(`+${LIKE_POINTS} P.`));
});

test('출석 츄르로 주는 츄르는 포인트를 쓰지 않고 같은 하트 규칙을 따른다',()=>{
 const ids=Array.from({length:HEARTS_PER_TREAT},(_,i)=>'h'+i);
 const paid=rewardTransition({...initialRewards(),points:TREAT_COST},{type:'feed',ids});
 assert.equal(paid.points,0);assert.equal(paid.treats,1);assert.deepEqual(paid.pending,ids);
 const token=rewardTransition(initialRewards(),{type:'feed',ids,token:true});
 assert.equal(token.points,0);assert.equal(token.treats,1);assert.deepEqual(token.pending,ids);
 assert.throws(()=>rewardTransition(initialRewards(),{type:'feed',ids}),/츄르/);
});
