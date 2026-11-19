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
// 봄·차가운 모드: cat-spring-cold-reactions.webp(4x2: 콧김·생각·삐짐·츤데레 / 멈춰·팔짱·뚱함). 좋아함에는 7장 모두 넣는다.
// 여름·따뜻한 모드: cat-summer-warm-reactions.webp(3x2: 신남·윙크·손 인사 / 수줍음·골골·방긋). 좋아함에는 6장 모두 넣는다.
// 여름·차가운 모드: cat-summer-cold-reactions.webp(4x2: 콧김·생각·삐짐·츤데레 / 멈춰·팔짱·뚱함·눈 감음). 좋아함에는 8장 모두 넣는다.
// 가을·따뜻한 모드: cat-autumn-warm-reactions.webp(3x2: 신남·윙크·손 인사 / 수줍음·골골·방긋). 좋아함에는 6장 모두 넣는다.
// 가을·차가운 모드: cat-autumn-cold-reactions.webp(4x2: 콧김·생각·삐짐·츤데레 / 멈춰·팔짱·뚱함). 좋아함에는 7장 모두 넣는다.
// 겨울·따뜻한 모드: cat-winter-warm-reactions.webp(3x2: 신남·윙크·손 인사 / 수줍음·골골). 좋아함에는 5장 모두 넣는다.
// 겨울·차가운 모드: cat-winter-cold-reactions.webp(4x2: 콧김·생각·삐짐·츤데레 / 멈춰·팔짱·뚱함). 좋아함에는 7장 모두 넣는다.
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
  },
  cold:{
   like:[
    art('purr','…봄이라 기분이 좋은 것뿐이다냥. 착각 마라냥.','…흥 ♥','spring-tsun'),
    art('nod','흠… 봄 손길이라 그런지 나쁘지 않다냥.','…흠','spring-think'),
    art('nod','좋아서 가만히 있는 거 아니다냥. 꽃잎 보는 중이다냥.','…딴청이다냥','spring-sulk'),
    art('stretch','흥, 이 정도면 봐주겠다냥. 조금만이다냥.','흥이다냥','spring-huff'),
    art('nod','거기까지… 아니, 조금만 더 해도 된다냥.','…조금만이다냥','spring-stop'),
    art('purr','꽃샘추위라 팔짱 낀 거다냥. 손길은… 인정한다냥.','…인정이다냥','spring-cross'),
    art('nod','…표정은 원래 이렇다냥. 싫은 거 아니다냥.','…원래 이렇다냥','spring-grump')
   ],
   dislike:[
    art('backstep','흥, 꽃가루 날리니까 저리 가라냥.','훠이훠이','spring-huff'),
    art('tuck','봄인데 혼자 있고 싶다냥. 말 걸지 마라냥.','흥이다냥','spring-sulk'),
    art('backstep','발바닥 보이냐옹? 벚꽃 구경 중이니 여기까지다냥.','멈추라냥','spring-stop'),
    art('tuck','지금은 바쁘다냥. 봄맞이 업무 중이다냥.','방해 금지다냥','spring-cross'),
    art('nod','…오늘은 그런 기분 아니다냥.','…흥','spring-grump')
   ],
   bonus:[
    art('purr','봄이라 특별히 주는 거다냥. 받아라냥.','…비밀이다냥 ♥','spring-tsun'),
    art('nod','한참 고민했는데… 이번만 선물 주겠다냥.','…이번만이다냥','spring-think'),
    art('bounce','착각하지 마라냥. 남아서 주는 벚꽃 선물이다냥.','…특별히다냥 ♥','spring-cross')
   ]
  }
 },
 summer:{
  warm:{
   like:[
    art('purr','더운데도 손길은 시원하고 포근하다냥.','시원 ♥','summer-pet'),
    art('bounce','아이스커피보다 네 손길이 더 상쾌하다냥! 찡긋!','찡긋 ☆','summer-wink'),
    art('bounce','쓰다듬어 주니 여름 더위가 싹 날아간다냥!','신난다냥 ♥','summer-joy'),
    art('nod','밀짚모자 쓴 모습 칭찬받은 것 같아 쑥스럽다냥.','두근 ♥','summer-shy'),
    art('purr','반갑다냥! 여름 인사로 하트 하나 보낸다냥.','안녕냥 ♥','summer-wave'),
    art('nod','시원한 바람 같은 손길이라 기분 좋다냥.','방긋 ♥','summer-smile')
   ],
   dislike:[
    art('tuck','더워서 얼굴이 빨개졌다냥… 조금만 쉬고 오자냥.','더워냥…','summer-shy'),
    art('backstep','아이스커피 마시고 금방 오겠다냥. 이따 또 만나자냥!','이따 보자냥 ♥','summer-wave'),
    art('nod','그늘에서 잠깐 쉬고 싶다냥. 조금 뒤에 놀자냥.','쉬는 중이다냥','summer-smile')
   ],
   bonus:[
    art('bounce','여름이라 신난다냥! 시원한 선물 받아 달라냥!','신난다냥 ♥','summer-joy'),
    art('bounce','찡긋! 여름맞이 특별 선물 준비했다냥!','선물이다냥 ☆','summer-wink')
   ]
  },
  cold:{
   like:[
    art('purr','…더워서 얼굴이 빨간 거다냥. 착각 마라냥.','…흥 ♥','summer-tsun'),
    art('nod','흠… 더운데 손은 시원하니 봐주겠다냥.','…흠','summer-think'),
    art('nod','좋아서 가만히 있는 거 아니다냥. 더워서 못 움직이는 거다냥.','…딴청이다냥','summer-sulk'),
    art('stretch','흥, 이 정도 손길은 참아 주겠다냥. 조금만이다냥.','흥이다냥','summer-huff'),
    art('nod','거기까지… 아니, 시원하니까 조금만 더 해도 된다냥.','…조금만이다냥','summer-stop'),
    art('purr','팔짱 낀 건 에어컨 바람 때문이다냥. 손길은… 인정한다냥.','…인정이다냥','summer-cross'),
    art('nod','…더워서 표정이 이런 거다냥. 싫은 거 아니다냥.','…원래 이렇다냥','summer-grump'),
    art('purr','…눈 감은 건 즐기는 게 아니라 더워서다냥.','…쉿이다냥','summer-doze')
   ],
   dislike:[
    art('backstep','흥, 더우니까 붙지 마라냥.','더워냥','summer-huff'),
    art('tuck','더워서 말하기도 귀찮다냥. 저리 가라냥.','흥이다냥','summer-sulk'),
    art('backstep','발바닥 보이냐옹? 더우니까 여기까지다냥.','멈추라냥','summer-stop'),
    art('tuck','지금은 바쁘다냥. 아이스커피 마시는 중이다냥.','방해 금지다냥','summer-cross'),
    art('nod','…오늘은 너무 더워서 그런 기분 아니다냥.','…흥','summer-grump'),
    art('tuck','…못 본 척 낮잠 자는 중이다냥. 깨우지 마라냥.','쿨쿨이다냥','summer-doze')
   ],
   bonus:[
    art('purr','여름이라 특별히 주는 거다냥. 받아라냥.','…비밀이다냥 ♥','summer-tsun'),
    art('nod','한참 고민했는데… 이번만 시원한 선물 주겠다냥.','…이번만이다냥','summer-think'),
    art('bounce','착각하지 마라냥. 남아서 주는 여름 선물이다냥.','…특별히다냥 ♥','summer-cross')
   ]
  }
 },
 autumn:{
  warm:{
   like:[
    art('purr','가을바람처럼 손길이 포근해서 스르르 녹는다냥.','포근 ♥','autumn-pet'),
    art('bounce','단풍보다 네 손길이 더 곱다냥! 찡긋!','찡긋 ☆','autumn-wink'),
    art('bounce','쓰다듬어 주니 가을 하늘처럼 마음이 맑아진다냥!','신난다냥 ♥','autumn-joy'),
    art('nod','베레모 칭찬받은 것 같아 괜히 쑥스럽다냥.','두근 ♥','autumn-shy'),
    art('purr','반갑다냥! 가을 인사로 하트 하나 보낸다냥.','안녕냥 ♥','autumn-wave'),
    art('nod','포근한 손길이라 기분이 몽글몽글하다냥.','방긋 ♥','autumn-smile')
   ],
   dislike:[
    art('tuck','가을 타서 그런가… 조금만 혼자 쉬고 오자냥.','살짝 쉬자냥…','autumn-shy'),
    art('backstep','낙엽 구경 잠깐 다녀오겠다냥. 이따 또 만나자냥!','이따 보자냥 ♥','autumn-wave'),
    art('nod','단풍 아래서 잠깐 쉬고 싶다냥. 조금 뒤에 놀자냥.','쉬는 중이다냥','autumn-smile')
   ],
   bonus:[
    art('bounce','풍성한 가을이라 신난다냥! 선물 듬뿍 받아 달라냥!','듬뿍 ♥','autumn-joy'),
    art('bounce','찡긋! 가을맞이 특별 선물 준비했다냥!','선물이다냥 ☆','autumn-wink')
   ]
  },
  cold:{
   like:[
    art('purr','…가을이라 조금 감성적인 것뿐이다냥. 착각 마라냥.','…흥 ♥','autumn-tsun'),
    art('nod','흠… 독서의 계절이라 이 손길도 연구해 보겠다냥.','…흠','autumn-think'),
    art('nod','좋아서 가만히 있는 거 아니다냥. 낙엽 보는 중이다냥.','…딴청이다냥','autumn-sulk'),
    art('stretch','흥, 이 정도 손길은 봐주겠다냥. 조금만이다냥.','흥이다냥','autumn-huff'),
    art('nod','거기까지… 아니, 쌀쌀하니까 조금만 더 해도 된다냥.','…조금만이다냥','autumn-stop'),
    art('purr','팔짱 낀 건 가을바람이 쌀쌀해서다냥. 손길은… 인정한다냥.','…인정이다냥','autumn-cross'),
    art('nod','…가을 타서 표정이 이런 거다냥. 싫은 거 아니다냥.','…원래 이렇다냥','autumn-grump')
   ],
   dislike:[
    art('backstep','흥, 낙엽 밟는 중이니 방해하지 마라냥.','바스락냥','autumn-huff'),
    art('tuck','가을이라 혼자 있고 싶다냥. 말 걸지 마라냥.','흥이다냥','autumn-sulk'),
    art('backstep','발바닥 보이냐옹? 단풍 구경 중이니 여기까지다냥.','멈추라냥','autumn-stop'),
    art('tuck','지금은 바쁘다냥. 가을맞이 업무 중이다냥.','방해 금지다냥','autumn-cross'),
    art('nod','…오늘은 가을 타서 그런 기분 아니다냥.','…흥','autumn-grump')
   ],
   bonus:[
    art('purr','가을이라 특별히 주는 거다냥. 받아라냥.','…비밀이다냥 ♥','autumn-tsun'),
    art('nod','한참 고민했는데… 이번만 가을 선물 주겠다냥.','…이번만이다냥','autumn-think'),
    art('bounce','착각하지 마라냥. 남아서 주는 단풍 선물이다냥.','…특별히다냥 ♥','autumn-cross')
   ]
  }
 },
 winter:{
  warm:{
   like:[
    art('purr','추운 날엔 네 손길이 제일 따뜻하다냥.','따끈 ♥','winter-pet'),
    art('bounce','첫눈보다 네 손길이 더 반갑다냥! 찡긋!','찡긋 ☆','winter-wink'),
    art('bounce','쓰다듬어 주니 추위가 싹 녹는다냥!','신난다냥 ♥','winter-joy'),
    art('nod','털모자 칭찬받은 것 같아 괜히 쑥스럽다냥.','두근 ♥','winter-shy'),
    art('purr','반갑다냥! 겨울 인사로 하트 하나 보낸다냥.','안녕냥 ♥','winter-wave')
   ],
   dislike:[
    art('tuck','추워서 볼이 빨개졌다냥… 이불 속에서 조금만 쉬자냥.','덜덜냥…','winter-shy'),
    art('backstep','코코아 마시고 금방 오겠다냥. 이따 또 만나자냥!','이따 보자냥 ♥','winter-wave')
   ],
   bonus:[
    art('bounce','눈 오는 날이라 신난다냥! 따뜻한 선물 받아 달라냥!','소복 ♥','winter-joy'),
    art('bounce','찡긋! 연말맞이 특별 선물 준비했다냥!','선물이다냥 ☆','winter-wink')
   ]
  },
  cold:{
   like:[
    art('purr','…추워서 볼이 빨간 거다냥. 착각 마라냥.','…흥 ♥','winter-tsun'),
    art('nod','흠… 추운 날엔 이 손길도 쓸모가 있다냥.','…흠','winter-think'),
    art('nod','좋아서 가만히 있는 거 아니다냥. 추워서 못 움직이는 거다냥.','…딴청이다냥','winter-sulk'),
    art('stretch','흥, 손이 따뜻하니까 봐주겠다냥. 조금만이다냥.','흥이다냥','winter-huff'),
    art('nod','거기까지… 아니, 추우니까 조금만 더 해도 된다냥.','…조금만이다냥','winter-stop'),
    art('purr','팔짱 낀 건 추워서다냥. 손길은… 인정한다냥.','…인정이다냥','winter-cross'),
    art('nod','…추워서 표정이 굳은 거다냥. 싫은 거 아니다냥.','…원래 이렇다냥','winter-grump')
   ],
   dislike:[
    art('backstep','흥, 손 차갑다냥. 저리 가라냥.','차갑다냥','winter-huff'),
    art('tuck','추워서 말하기도 귀찮다냥. 이불 속에 있겠다냥.','흥이다냥','winter-sulk'),
    art('backstep','발바닥 보이냐옹? 눈 오는 중이니 여기까지다냥.','멈추라냥','winter-stop'),
    art('tuck','지금은 바쁘다냥. 연말 업무 중이다냥.','방해 금지다냥','winter-cross'),
    art('nod','…오늘은 너무 추워서 그런 기분 아니다냥.','…흥','winter-grump')
   ],
   bonus:[
    art('purr','연말이라 특별히 주는 거다냥. 받아라냥.','…비밀이다냥 ♥','winter-tsun'),
    art('nod','한참 고민했는데… 이번만 따뜻한 선물 주겠다냥.','…이번만이다냥','winter-think'),
    art('bounce','착각하지 마라냥. 남아서 주는 겨울 선물이다냥.','…특별히다냥 ♥','winter-cross')
   ]
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
