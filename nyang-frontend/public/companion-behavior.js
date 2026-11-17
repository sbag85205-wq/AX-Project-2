// Cosmetic sequences only. Currency and reward rolls remain server-owned.
export function createCompanionBehavior({change,schedule=setTimeout,cancel=clearTimeout,random=Math.random}){
 let timer=null,revision=0;
 const previous=new Map();
 function clear(){revision++;cancel(timer);timer=null;change('idle');}
 function play(mode,event){
  clear();const current=revision;
  const options=event==='greet'
   ?mode==='warm'?[[['welcome',2600]],[['stretch',2400]],[['cozy',2600]]]:[[['sleepy',900],['peek',1700]],[['peek',2300]],[['stretch',2400]]]
   :mode==='warm'?[[['snack',4000]],[['savor',4000]],[['tasty',4000]]]:[[['hesitate',850],['snack',3200]],[['hesitate',650],['savor',3400]],[['peek',600],['tasty',3400]]];
  const key=mode+':'+event,choices=options.map((_,i)=>i).filter(i=>i!==previous.get(key));
  const chosen=choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];
  previous.set(key,chosen);const phases=options[chosen];
  function step(index){
   if(current!==revision)return;
   const phase=phases[index];if(!phase){timer=null;change('idle');return;}
   change(phase[0]);timer=schedule(()=>step(index+1),phase[1]);
  }
  step(0);
 }
 return {clear,greet:mode=>play(mode,'greet'),feed:mode=>play(mode,'feed')};
}

// 인사·츄르 장면에 쓰는 성격별 전용 그림(reaction-variety.js의 art와 같은 이름)과 그때의 말풍선
const PHASE_ART={
 warm:{welcome:['wink','반갑다냥!'],stretch:['wink','찡긋, 반갑다냥 ☆'],cozy:['pet','네 옆이 좋다냥 ♥'],snack:['joy','맛있다냥 ♥'],savor:['pet','천천히 음미한다냥 ♥'],tasty:['joy','한 입 더 먹고 싶다냥!']},
 cold:{peek:['think','…왔냐옹?'],stretch:['sulk','흥, 이제야 왔냐옹?'],hesitate:['think','…나 주는 거냥?'],snack:['tsun','…맛있다냥.'],savor:['tsun','…이 맛은 인정이다냥 ♥'],tasty:['think','남은 건 없냐옹?']}
};
export function companionAppearance(mode,{phase='idle',reaction=null,affection=false}={}){
 const warm=mode==='warm';
 const scene=!reaction&&PHASE_ART[warm?'warm':'cold'][phase];
 if(scene)return {sleepy:false,soft:false,art:scene[0],mark:scene[1]};
 if(reaction)return {sleepy:!warm&&reaction==='like'&&affection,soft:reaction==='dislike',mark:reaction==='like'?(warm?'골골… 좋다냥':affection?'…더 해달라냥.':''):''};
 return {sleepy:['sleepy','cozy','savor'].includes(phase),soft:false,mark:phase==='sleepy'?'zzz':''};
}
