// Cosmetic choices only. The server owns reaction outcomes and all rewards.
const pose=(motion,line,mark,eyes='',wag=false,art='')=>({motion,line,mark,eyes,wag,art});
// 전용 그림(art) 반응: 예전 표정 반응은 그대로 두고 그 옆에 더한다(고를 때 모두 같은 확률).
// 따뜻한 모드: pet=눈 감고 골골, wink=윙크, shy=수줍게 쉬고 싶음, joy=두 손 모아 신남
// 차가운 모드: tsun=곁눈질+볼 빨개짐, think=턱 괴고 생각, stop=손바닥으로 멈춰, sulk=고개 돌리고 삐짐, shoo=콧김+훠이
const art=(motion,line,mark,picture)=>pose(motion,line,mark,'',false,picture);
export const reactionPoses={
 warm:{
  like:[
   pose('purr','골골… 손길이 딱 좋다냥!','골골골…','closed'),
   pose('bounce','좋아서 가만히 못 있겠다냥!','신난다냥 ♥','happy',true),
   pose('nod','여기 조금만 더 쓰다듬어달라냥.','한 번 더냥!','happy'),
   pose('stretch','쭈욱~ 기분까지 풀렸다냥!','쭈우욱','closed'),
   art('purr','쓰다듬어 주니 마음까지 포근하다냥.','골골골 ♥','pet'),
   art('nod','눈이 스르르 감길 만큼 좋다냥!','스르르…','pet'),
   art('bounce','기분 좋아서 윙크 한 번 날린다냥!','찡긋 ☆','wink')
  ],
  dislike:[
   pose('tuck','잠깐 충전하고 다시 놀자냥.','잠깐만냥…','closed'),
   pose('backstep','살살 해주면 더 좋겠다냥.','살살 부탁한다냥'),
   pose('nod','지금은 눈만 감고 쉬겠다냥.','쉬는 중이다냥','closed'),
   art('tuck','조금 쑥스러워서 숨 고르는 중이다냥.','부끄럽다냥…','shy'),
   art('backstep','오늘은 살짝 기운이 없다냥. 조금 뒤에 놀자냥.','조금만 쉬자냥','shy')
  ],
  bonus:[pose('bounce','너무 행복해서 선물도 주겠다냥!','마음 받으라냥 ♥','happy',true),pose('purr','우리 제법 친해졌다냥! 작은 선물이다냥.','골골골 ♥','happy',true),
   art('bounce','오늘 최고로 행복하다냥! 선물 받아달라냥!','신난다냥 ♥','joy'),art('purr','두 손 모아 고맙다냥! 작은 선물이다냥.','고맙다냥 ♥','joy')]
 },
 cold:{
  like:[
   pose('nod','흠… 손길은 나쁘지 않다냥.','…합격이다냥'),
   pose('purr','좋아서 눈 감은 건 아니다냥.','잠깐만 이러겠다냥','closed'),
   pose('stretch','그쪽 말고… 여기다냥.','쭈욱…'),
   pose('tuck','조금만 더 해도 된다냥. 딱 조금이다냥.','…더 해달라냥','closed'),
   art('purr','…좋아서 이러는 건 아니다냥.','…비밀이다냥 ♥','tsun'),
   art('stretch','그, 그만해도 되는데… 조금만 더다냥.','흥, 나쁘지 않다냥','tsun'),
   art('nod','흠… 이 손길, 연구해 볼 가치가 있다냥.','…흠','think')
  ],
  dislike:[
   pose('backstep','손은 거기까지다냥.','거리 유지다냥','annoyed'),
   pose('tuck','지금은 낮잠 근무 중이다냥.','방해 금지다냥','closed'),
   pose('nod','허락은 받고 만지는 거냥?','흥이다냥.','annoyed'),
   art('backstep','손바닥 보이냐옹? 여기까지다냥.','멈추라냥','stop'),
   art('tuck','훠이훠이, 지금은 바쁘다냥.','훠이훠이','shoo'),
   art('nod','흥, 오늘은 삐졌다냥. 말 걸지 마라냥.','흥이다냥','sulk')
  ],
  bonus:[pose('nod','꼬리가 먼저 말해버렸다냥. 선물이나 받아라냥.','…비밀이다냥 ♥','happy',true),pose('purr','너, 제법 마음에 든다냥. 이번만이다냥.','특별히 주는 거다냥','happy',true),
   art('nod','따, 딱히 좋아서 주는 건 아니다냥. 받아라냥.','…착각하지 마라냥 ♥','tsun'),art('purr','볼이 빨개진 건 기분 탓이다냥. 선물이다냥.','…비밀이다냥 ♥','tsun')]
 }
};
// 계절 칸의 처음부터 있는 반응(냥대리 관리의 그 계절 칸에 '기본'으로 보인다). 그 계절을 고르면 기본값 칸 대신 이것들이 나온다.
// 봄·따뜻한 모드: cat-spring-warm-reactions.webp(3x2: 신남·윙크·손 인사 / 수줍음·골골). 가장 자주 나오는 좋아함에는 5장 모두 넣는다.
// (번호로 관리에서 고친 멘트를 찾으니 새 반응은 끝에 더한다)
export const seasonReactionPoses={
 spring:{
  warm:{
   like:[
    art('purr','봄볕 아래서 쓰다듬어 주니 스르르 녹는다냥.','포근 ♥','spring-pet'),
    art('bounce','벚꽃보다 네 손길이 더 좋다냥! 찡긋!','찡긋 ☆','spring-wink'),
    art('bounce','쓰다듬어 주니 꽃처럼 웃음이 활짝 핀다냥!','헤헤 ♥','spring-joy'),
    art('nod','봄이라 그런가… 손길에 괜히 설렌다냥.','두근 ♥','spring-shy'),
    art('purr','반갑다냥! 봄 인사로 하트 하나 보낸다냥.','안녕냥 ♥','spring-wave')
   ],
   dislike:[
    art('tuck','봄바람에 괜히 쑥스럽다냥… 조금만 쉬고 오자냥.','부끄럽다냥…','spring-shy'),
    art('backstep','꽃구경 잠깐 다녀오겠다냥. 이따 또 만나자냥!','이따 보자냥 ♥','spring-wave')
   ],
   bonus:[art('bounce','봄이 와서 너무 신난다냥! 벚꽃 선물 받아 달라냥!','신난다냥 ♥','spring-joy'),art('bounce','찡긋! 봄맞이 특별 선물 준비했다냥!','선물이다냥 ☆','spring-wink')]
  }
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
