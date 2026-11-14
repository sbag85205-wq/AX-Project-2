// 냥대리 보상 규칙(숫자·확률·지갑 상태 변화)을 한 곳에 모은다.
// 화면(app.js·community-ui.js·board-view.js·account-view.js)과 규칙 코드(lib/community.mjs)가 함께 쓴다.
// 질문(+QUESTION_POINTS)·좋아요(+LIKE_POINTS)·출석 지급은 DB 트리거(nyang-frontend/drizzle)가 실제로 더한다.
// 트리거 숫자를 바꾸면 여기도 바꿔야 한다 — nyang-frontend/tests/reward-rules.test.mjs가 어긋나면 실패한다.

export const QUESTION_POINTS=10;
export const QUESTION_DAILY_LIMIT=20;
export const POST_DAILY_LIMIT=10;
export const LIKE_POINTS=5;
export const TREAT_COST=10;
export const HEARTS_PER_TREAT=3;
/** 출석 선물: roll(0~1)이 below보다 작은 첫 항목. 확률은 앞 항목과의 차이. */
export const ATTENDANCE_GIFTS=[{below:.5,points:5,tokens:0},{below:.8,points:10,tokens:0},{below:.95,points:0,tokens:1},{below:1,points:0,tokens:3}];
export const PET_LIKE_CHANCE=.6;
export const PET_BONUS_CHANCE=.03;
export const PET_BONUS_POINTS=5;
export const PET_COOLDOWN_MS=4200;
export function petOutcome(likeRoll,bonusRoll){
 if([likeRoll,bonusRoll].some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1))throw Error('올바른 쓰다듬기 확률이 아니에요.');
 return likeRoll<PET_LIKE_CHANCE?(bonusRoll<PET_BONUS_CHANCE?'bonus':'like'):'dislike';
}
export const wardrobe=[
 {id:'ribbon',name:'딸기우유 리본',cost:3,description:'무심한 얼굴에 사랑스러운 한 끗.',symbol:'🎀'},
 {id:'crown',name:'오늘의 왕관',cost:5,description:'오늘도 출근한 우리 냥대리가 최고.',symbol:'♛'},
 {id:'starlight',name:'반짝이는 별빛',cost:8,description:'냥대리 곁에 작은 별들이 머물러요.',symbol:'✦'}
];
export function initialRewards(){return {points:0,hearts:0,pending:[],owned:[],equipped:null,questions:0,treats:0,pettings:0,petBonuses:0,lastPetAt:0,lastPetId:null};}
export function normalizeRewards(value){
 const s=initialRewards();if(!value||typeof value!=='object')return s;
 for(const key of ['points','hearts','questions','treats','pettings','petBonuses','lastPetAt'])if(Number.isSafeInteger(value[key])&&value[key]>=0)s[key]=value[key];
 s.lastPetId=typeof value.lastPetId==='string'?value.lastPetId:null;
 s.pending=[...new Set((Array.isArray(value.pending)?value.pending:[]).filter(x=>typeof x==='string'))].slice(0,HEARTS_PER_TREAT);
 s.owned=[...new Set((Array.isArray(value.owned)?value.owned:[]).filter(x=>wardrobe.some(i=>i.id===x)))];
 s.equipped=s.owned.includes(value.equipped)?value.equipped:null;return s;
}
export function rewardTransition(previous,event){
 const s=normalizeRewards(previous);
 if(event.type==='pet'){
  if(typeof event.id!=='string'||!event.id||!Number.isSafeInteger(event.at)||event.at<=0)throw Error('쓰다듬기를 다시 시도해 주세요.');
  if(event.id===s.lastPetId||(s.lastPetAt&&event.at-s.lastPetAt<PET_COOLDOWN_MS))return s;
  const outcome=petOutcome(event.likeRoll,event.bonusRoll);
  s.lastPetId=event.id;s.lastPetAt=event.at;s.pettings++;
  if(outcome==='bonus'){s.points+=PET_BONUS_POINTS;s.petBonuses++;}
 }else if(event.type==='question'){s.points+=QUESTION_POINTS;s.questions++;} // 실제 지급은 DB 트리거. 같은 규칙 확인용(check-companion.mjs)
 else if(event.type==='feed'){
  if(s.pending.length)throw Error('주변의 하트를 먼저 모아 줘.');
  // event.token: 출석으로 받은 츄르로 주면 포인트를 쓰지 않는다(츄르 개수는 lib/community.mjs가 줄인다).
  if(!event.token&&s.points<TREAT_COST)throw Error('질문을 한 번 하면 츄르를 줄 수 있어.');
  if(!Array.isArray(event.ids)||event.ids.length!==HEARTS_PER_TREAT||new Set(event.ids).size!==HEARTS_PER_TREAT||event.ids.some(x=>typeof x!=='string'||!x))throw Error('하트를 준비하지 못했어요. 다시 시도해 주세요.');
  if(!event.token)s.points-=TREAT_COST;s.treats++;s.pending=[...event.ids];
 }else if(event.type==='collect'){
  if(!s.pending.includes(event.id))return s;
  s.pending=s.pending.filter(x=>x!==event.id);s.hearts++;
 }else if(event.type==='buy'){
  const item=wardrobe.find(x=>x.id===event.id);if(!item)throw Error('없는 꾸미기 아이템이에요.');
  if(!s.owned.includes(item.id)){if(s.hearts<item.cost)throw Error('하트가 조금 더 필요하다냥.');s.hearts-=item.cost;s.owned.push(item.id);}s.equipped=item.id;
 }else if(event.type==='equip'){
  if(event.id!==null&&!s.owned.includes(event.id))throw Error('먼저 아이템을 열어 주세요.');s.equipped=event.id;
 }else throw Error('알 수 없는 보상 동작이에요.');
 return s;
}

export function drawAttendanceGift(roll){
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid random roll');
 const gift=ATTENDANCE_GIFTS.find(g=>roll<g.below);
 return {points:gift.points,tokens:gift.tokens};
}
const giftName=g=>g.tokens?`츄르 ${g.tokens}개`:`${g.points} P`;
/** 보상 안내 문구(HTML). 숫자는 모두 위 상수에서 만든다. */
export function rewardHelp(){
 const odds=ATTENDANCE_GIFTS.map((g,i)=>`${giftName(g)} ${Math.round((g.below-(ATTENDANCE_GIFTS[i-1]?.below||0))*100)}%`).join(' · ');
 return {
  question:`새 질문 +${QUESTION_POINTS} P · 같은 질문은 한 번만, 하루 최대 ${QUESTION_DAILY_LIMIT}개.<br>내 게시글에 다른 직원이 좋아요를 누르면 +${LIKE_POINTS} P.`,
  attendance:`${odds}.<br>무료로 하루 한 번, 한국 시간 자정에 초기화돼요. 확률은 매일 같아요.`,
  treat:`출석으로 받은 츄르부터 쓰고, 다 쓰면 ${TREAT_COST} P로 줄 수 있어요.<br>레벨은 질문 활동을 나타내며 업무 능력 평가에는 쓰이지 않아요.`,
  wallet:`새 질문 +${QUESTION_POINTS} P · 하루 최대 ${QUESTION_DAILY_LIMIT}개`,
  cycle:`질문 +${QUESTION_POINTS} P → 츄르 ${TREAT_COST} P → 하트 ${HEARTS_PER_TREAT}개 → 눌러 모으고 꾸미기`
 };
}
