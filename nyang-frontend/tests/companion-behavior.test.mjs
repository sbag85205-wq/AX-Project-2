import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanionBehavior,companionAppearance} from '../public/companion-behavior.js';

function setup(){
 const phases=[],timers=[];
 const behavior=createCompanionBehavior({random:()=>0,change:p=>phases.push(p),schedule:fn=>{timers.push(fn);return timers.length;},cancel:()=>{}});
 return {phases,timers,behavior};
}
test('greetings differ and cold feeding hesitates before accepting',()=>{
 const warm=setup();warm.behavior.greet('warm');assert.equal(warm.phases.at(-1),'welcome');
 warm.timers.shift()();assert.equal(warm.phases.at(-1),'idle');
 const cold=setup();cold.behavior.greet('cold');assert.equal(cold.phases.at(-1),'sleepy');
 cold.timers.shift()();assert.equal(cold.phases.at(-1),'peek');
 cold.behavior.feed('cold');assert.equal(cold.phases.at(-1),'hesitate');
 cold.timers.at(-1)();assert.equal(cold.phases.at(-1),'snack');
 warm.behavior.feed('warm');assert.equal(warm.phases.at(-1),'snack');
});
test('touch, logout and switching modes cancel stale performance callbacks',()=>{
 const s=setup();s.behavior.feed('cold');const delayed=s.timers[0];
 s.behavior.clear();delayed();assert.equal(s.phases.at(-1),'idle');
 s.behavior.greet('warm');delayed();assert.equal(s.phases.at(-1),'welcome');
});

test('repeated greetings and treats choose a different sequence while old timers stay cancelled',()=>{
 for(const mode of ['warm','cold'])for(const event of ['greet','feed']){
  const s=setup();s.behavior[event](mode);const first=s.phases.at(-1),stale=s.timers.at(-1);
  s.behavior[event](mode);
  const before=[...s.phases];stale();assert.deepEqual(s.phases,before);
  if(mode==='warm'||event==='greet')assert.notEqual(s.phases.at(-1),first);
  s.behavior.clear();s.timers.at(-1)();assert.equal(s.phases.at(-1),'idle');
 }
});
test('rare affection is cosmetic and cannot turn dislike into affection',()=>{
 assert.equal(companionAppearance('cold',{reaction:'like',affection:true}).sleepy,true);
 assert.equal(companionAppearance('cold',{reaction:'like'}).sleepy,false);
 assert.equal(companionAppearance('cold',{reaction:'dislike',affection:true}).sleepy,false);
 assert.equal(companionAppearance('warm',{phase:'welcome'}).mark,'반갑다냥!');
 assert.equal(companionAppearance('cold',{phase:'peek'}).mark,'…왔냐옹?');
});
