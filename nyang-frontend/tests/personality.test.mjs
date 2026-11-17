import test from 'node:test';
import assert from 'node:assert/strict';
import {answers} from '../public/core.js';
import {normalizePersonality,personalities,personalityAnswer,personalityText,petAppearance} from '../public/personality.js';
import {createReactionPicker,reactionPoses} from '../public/reaction-variety.js';

test('cosmetic reactions do not repeat consecutively or invent rewards',()=>{
 for(const mode of ['cold','warm'])for(const kind of ['like','dislike','bonus']){
  const pick=createReactionPicker(()=>0);let previous;
  for(let n=0;n<12;n++){
   const pose=pick(mode,kind);
   assert.notEqual(pose.line,previous);previous=pose.line;
   assert.ok(reactionPoses[mode][kind].some(p=>p.line===pose.line));
   assert.equal('points' in pose,false);
   if(kind==='dislike'){assert.notEqual(pose.eyes,'happy');assert.equal(pose.wag,false);}
  }
 }
 assert.equal(createReactionPicker()('warm','unknown'),null);
});
test('tone preserves factual numbers, source ids and original answers',()=>{
 for(const mode of ['cold','warm'])for(const answer of Object.values(answers)){
  const before=structuredClone(answer),shown=personalityAnswer(answer,mode);
  const values=x=>[x.title,x.text,...(x.steps||[])].join(' ').match(/[0-9,]+/g);
  assert.deepEqual(values(shown),values(answer));assert.deepEqual(shown.refs,answer.refs);assert.deepEqual(answer,before);
 }
});
test('cold and warm language differs while uncertainty remains explicit',()=>{
 assert.equal(personalityAnswer(answers.annual,'warm').title,'사용일 3영업일 전까지 연차를 신청해 주세요.');
 assert.equal(personalityAnswer(answers.annual,'cold').title,answers.annual.title);
 assert.match(personalities.warm.unknown,/찾지 못/);assert.match(personalities.cold.unknown,/없다/);
 assert.notDeepEqual(personalities.warm.dislike,personalities.cold.dislike);
 assert.equal(normalizePersonality('invalid'),'cold');
 assert.equal(personalityText('숙박비는 1박 100,000원까지, 초과 비용은 별도 사전 승인이 필요해.','warm'),'숙박비는 1박 100,000원까지, 초과 비용은 별도 사전 승인이 필요해요.');
});

test('warm and cold reactions have distinct expressions without changing the result',()=>{
 const result={reaction:'like'};
 assert.deepEqual(petAppearance('warm',result),{expression:'happy',wag:true});
 assert.deepEqual(petAppearance('cold',result),{expression:'',wag:false});
 assert.deepEqual(result,{reaction:'like'});
 assert.equal(petAppearance('warm',{reaction:'dislike'}).expression,'');
 assert.equal(petAppearance('cold',{reaction:'dislike'}).expression,'');
 for(const mode of ['warm','cold'])assert.deepEqual(petAppearance(mode,{reaction:'bonus'}),{expression:'happy',wag:true});
 assert.equal(petAppearance('warm',{happy:true}).wag,true);
 assert.equal(petAppearance('cold',{happy:true}).wag,false);
 assert.equal(petAppearance('warm').expression,'');
});

test('each personality uses only its own reaction pictures',async()=>{
 const {companionAppearance}=await import('../public/companion-behavior.js');
 const arts={warm:['joy','pet','shy','wink'],cold:['shoo','stop','sulk','think','tsun']};
 for(const mode of ['warm','cold']){
  for(const kind of ['like','dislike','bonus'])for(const pose of reactionPoses[mode][kind]){assert.ok(arts[mode].includes(pose.art),mode+' '+kind+': '+pose.line);assert.equal(pose.wag,false);}
  // 반응 개수(=같은 그림·멘트가 나올 확률)는 예전과 같다: 좋아함 4, 쉬고 싶음 3, 보너스 2
  assert.deepEqual(['like','dislike','bonus'].map(k=>reactionPoses[mode][k].length),[4,3,2]);
  // 그림이 모두 어딘가에서 쓰인다
  const phases=['welcome','stretch','cozy','snack','savor','tasty','sleepy','peek','hesitate'];
  const used=new Set([...Object.values(reactionPoses[mode]).flat().map(p=>p.art),...phases.map(phase=>companionAppearance(mode,{phase}).art).filter(Boolean)]);
  assert.deepEqual([...used].sort(),arts[mode]);
  for(const phase of phases){const art=companionAppearance(mode,{phase}).art;if(art)assert.ok(arts[mode].includes(art),mode+' '+phase);}
 }
 assert.ok(reactionPoses.warm.dislike.every(p=>p.art==='shy'));
 assert.ok(reactionPoses.cold.dislike.every(p=>['stop','sulk','shoo'].includes(p.art)));
 assert.equal(companionAppearance('cold',{phase:'sleepy'}).art,undefined);
 assert.equal(companionAppearance('warm',{phase:'idle'}).art,undefined);
 assert.equal(companionAppearance('cold',{phase:'peek',reaction:'like'}).art,undefined);
});
