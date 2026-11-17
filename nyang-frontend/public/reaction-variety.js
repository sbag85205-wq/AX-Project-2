// Cosmetic choices only. The server owns reaction outcomes and all rewards.
const pose=(motion,line,mark,eyes='',wag=false,art='')=>({motion,line,mark,eyes,wag,art});
export const reactionPoses={
 // 따뜻한 모드는 반응마다 전용 그림(art)을 쓴다: pet=눈 감고 골골, wink=윙크, shy=수줍게 쉬고 싶음, joy=두 손 모아 신남.
 warm:{
  like:[
   pose('purr','골골… 손길이 딱 좋다냥!','골골골 ♥','closed',false,'pet'),
   pose('nod','쓰다듬어 주니 마음까지 포근하다냥.','한 번 더냥 ♥','closed',false,'pet'),
   pose('stretch','눈이 스르르 감길 만큼 좋다냥!','스르르…','closed',false,'pet'),
   pose('bounce','기분 좋아서 윙크 한 번 날린다냥!','찡긋 ☆','happy',false,'wink')
  ],
  dislike:[
   pose('tuck','잠깐 충전하고 다시 놀자냥.','잠깐만냥…','closed',false,'shy'),
   pose('backstep','살살 해주면 더 좋겠다냥.','살살 부탁한다냥','',false,'shy'),
   pose('nod','조금 쑥스러워서 숨 고르는 중이다냥.','쉬는 중이다냥','closed',false,'shy')
  ],
  bonus:[pose('bounce','너무 행복해서 선물도 주겠다냥!','마음 받으라냥 ♥','happy',false,'joy'),pose('purr','우리 제법 친해졌다냥! 작은 선물이다냥.','신난다냥 ♥','happy',false,'joy')]
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
