import test from 'node:test';
import assert from 'node:assert/strict';
import {createPetInteraction} from '../public/pet-interaction.js';

function setup(){
 let now=1000,calls=0,bonuses=0,errors=0,strokes=0,finish,fail;
 const reactions=[],indicators=[],events=[];
 const interaction=createPetInteraction({
  commit(){calls++;events.push('request');return new Promise((resolve,reject)=>{finish=resolve;fail=reject;});},
  react:kind=>{reactions.push(kind);events.push('expression:'+kind);},
  stroke:()=>{strokes++;events.push('motion');},
  indicate:active=>{indicators.push(active);events.push('pending:'+active);},onBonus:()=>bonuses++,onError:()=>errors++,
  now:()=>now,cooldown:4200
 });
 return {interaction,reactions,indicators,events,get strokes(){return strokes;},get calls(){return calls;},get bonuses(){return bonuses;},get errors(){return errors;},
  advance:ms=>now+=ms,resolve:kind=>finish({eventResult:{kind}}),reject:()=>fail(Error('offline'))};
}

test('starts motion before the request, responds to repeat clicks, and never restarts motion on server confirmation',async()=>{
 const s=setup(),pending=s.interaction.pet();
 assert.equal(s.indicators.at(-1),true);assert.deepEqual(s.reactions,[null]);assert.equal(s.calls,1);assert.equal(s.bonuses,0);
 assert.equal(s.strokes,1);assert.ok(s.events.indexOf('motion')<s.events.indexOf('request'));
 s.advance(10000);await s.interaction.pet();
 assert.deepEqual(s.reactions,[null]);assert.equal(s.calls,1);assert.equal(s.strokes,2);
 s.resolve('like');await pending;
 assert.deepEqual(s.reactions,[null,'like']);assert.equal(s.indicators.at(-1),false);
 assert.equal(s.strokes,2);assert.ok(s.events.indexOf('expression:like')<s.events.indexOf('pending:false'));
 await s.interaction.pet();assert.equal(s.calls,1);assert.equal(s.reactions.at(-1),'like');assert.equal(s.strokes,3);
});

test('fast responses also produce one expression with no temporary reaction',async()=>{
 const reactions=[];
 const interaction=createPetInteraction({commit:async()=>({eventResult:{kind:'dislike'}}),react:kind=>reactions.push(kind),cooldown:4200});
 await interaction.pet();assert.deepEqual(reactions,[null,'dislike']);
});

test('replaying a confirmed bonus never awards or announces it twice',async()=>{
 const s=setup(),pending=s.interaction.pet();
 assert.equal(s.bonuses,0);s.resolve('bonus');await pending;
 assert.equal(s.bonuses,1);assert.equal(s.reactions.at(-1),'bonus');
 await s.interaction.pet();assert.equal(s.reactions.at(-1),'like');assert.equal(s.calls,1);assert.equal(s.bonuses,1);
 s.advance(4200);const next=s.interaction.pet();assert.equal(s.calls,2);assert.equal(s.reactions.at(-1),null);
 s.resolve('dislike');await next;assert.equal(s.reactions.at(-1),'dislike');assert.equal(s.bonuses,1);
});

test('reset prevents a late response from reviving an old reaction',async()=>{
 const s=setup(),pending=s.interaction.pet();
 s.interaction.reset();s.resolve('bonus');await pending;
 assert.deepEqual(s.reactions,[null,null]);assert.equal(s.bonuses,1);assert.equal(s.indicators.at(-1),false);
 assert.equal(s.strokes,1);
 await s.interaction.pet();assert.deepEqual(s.reactions,[null,null]);assert.equal(s.calls,1);
});

test('a failed reward request clears the indicator and allows later retries without a second reaction',async()=>{
 const s=setup(),pending=s.interaction.pet();
 s.reject();await pending;assert.equal(s.errors,1);assert.equal(s.bonuses,0);
 assert.equal(s.indicators.at(-1),false);
 await s.interaction.pet();assert.deepEqual(s.reactions,[null]);assert.equal(s.calls,1);
 s.advance(4200);const next=s.interaction.pet();assert.equal(s.calls,2);
 s.resolve('like');await next;assert.equal(s.reactions.at(-1),'like');
});

test('an empty server response ends waiting without inventing an expression or awarding points',async()=>{
 const s=setup(),pending=s.interaction.pet();
 s.resolve(undefined);await pending;
 assert.equal(s.strokes,1);assert.deepEqual(s.reactions,[null]);assert.equal(s.indicators.at(-1),false);assert.equal(s.bonuses,0);
});
