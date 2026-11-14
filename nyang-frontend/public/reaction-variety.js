// Cosmetic choices only. The server owns reaction outcomes and all rewards.
const pose=(motion,line,mark,eyes='',wag=false)=>({motion,line,mark,eyes,wag});
export const reactionPoses={
 warm:{
  like:[
   pose('purr','골골… 손길이 딱 좋다냥!','골골골…','closed'),
   pose('bounce','좋아서 가만히 못 있겠다냥!','신난다냥 ♥','happy',true),
   pose('nod','여기 조금만 더 쓰다듬어달라냥.','한 번 더냥!','happy'),
   pose('stretch','쭈욱~ 기분까지 풀렸다냥!','쭈우욱','closed')
  ],
  dislike:[
   pose('tuck','잠깐 충전하고 다시 놀자냥.','잠깐만냥…','closed'),
   pose('backstep','살살 해주면 더 좋겠다냥.','살살 부탁한다냥'),
   pose('nod','지금은 눈만 감고 쉬겠다냥.','쉬는 중이다냥','closed')
  ],
  bonus:[pose('bounce','너무 행복해서 선물도 주겠다냥!','마음 받으라냥 ♥','happy',true),pose('purr','우리 제법 친해졌다냥! 작은 선물이다냥.','골골골 ♥','happy',true)]
 },
 cold:{
  like:[
   pose('nod','흠… 손길은 나쁘지 않다냥.','…합격이다냥'),
   pose('purr','좋아서 눈 감은 건 아니다냥.','잠깐만 이러겠다냥','closed'),
   pose('stretch','그쪽 말고… 여기다냥.','쭈욱…'),
   pose('tuck','조금만 더 해도 된다냥. 딱 조금이다냥.','…더 해달라냥','closed')
  ],
  dislike:[
   pose('backstep','손은 거기까지다냥.','거리 유지다냥','annoyed'),
   pose('tuck','지금은 낮잠 근무 중이다냥.','방해 금지다냥','closed'),
   pose('nod','허락은 받고 만지는 거냥?','흥이다냥.','annoyed')
  ],
  bonus:[pose('nod','꼬리가 먼저 말해버렸다냥. 선물이나 받아라냥.','…비밀이다냥 ♥','happy',true),pose('purr','너, 제법 마음에 든다냥. 이번만이다냥.','특별히 주는 거다냥','happy',true)]
 }
};
export function createReactionPicker(random=Math.random){
 const previous=new Map();
 return (mode,kind)=>{
  const key=(mode==='warm'?'warm':'cold')+':'+kind;
  const pool=reactionPoses[mode==='warm'?'warm':'cold'][kind];
  if(!pool)return null;
  const candidates=pool.filter(item=>item!==previous.get(key));
  const selected=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)))];
  previous.set(key,selected);return {...selected};
 };
}
