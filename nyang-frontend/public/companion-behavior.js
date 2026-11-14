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

export function companionAppearance(mode,{phase='idle',reaction=null,affection=false}={}){
 const warm=mode==='warm';
 if(reaction)return {sleepy:!warm&&reaction==='like'&&affection,soft:reaction==='dislike',mark:reaction==='like'?(warm?'골골… 좋다냥':affection?'…더 해달라냥.':''):''};
 return {sleepy:['sleepy','cozy','savor'].includes(phase),soft:false,mark:phase==='welcome'?'반갑다냥!':phase==='stretch'?(warm?'쭈욱~ 반갑다냥!':'기지개 켜는 중이다냥.'):phase==='cozy'?'네 옆이 좋다냥.':phase==='savor'?(warm?'천천히 음미한다냥 ♥':'…이 맛은 인정이다냥.'):phase==='tasty'?(warm?'한 입 더 먹고 싶다냥!':'남은 건 없냐옹?'):phase==='sleepy'?'zzz':phase==='peek'?'…왔냐옹?':phase==='hesitate'?'…나 주는 거냥?':phase==='snack'?(warm?'맛있다냥 ♥':'…맛있다냥.') :''};
}
