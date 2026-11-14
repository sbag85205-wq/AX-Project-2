import {makePlan,businessBefore,businessAfter,addDays,localDate,asDate} from './core.mjs';

export const QUESTION_POINTS=10;
export const TREAT_COST=10;
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
 s.pending=[...new Set((Array.isArray(value.pending)?value.pending:[]).filter(x=>typeof x==='string'))].slice(0,3);
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
 }else if(event.type==='question'){s.points+=QUESTION_POINTS;s.questions++;}
 else if(event.type==='feed'){
  if(s.pending.length)throw Error('주변의 하트를 먼저 모아 줘.');
  if(s.points<TREAT_COST)throw Error('질문을 한 번 하면 츄르를 줄 수 있어.');
  if(!Array.isArray(event.ids)||event.ids.length!==3||new Set(event.ids).size!==3||event.ids.some(x=>typeof x!=='string'||!x))throw Error('하트를 준비하지 못했어요. 다시 시도해 주세요.');
  s.points-=TREAT_COST;s.treats++;s.pending=[...event.ids];
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

export const scheduleTypes={
 trip:{title:'국내 출장 준비',startLabel:'출발일',endLabel:'복귀일',refs:['approval','booking','receipt','settle']},
 annual:{title:'연차 준비',startLabel:'연차 사용일',refs:['annual']},
 half:{title:'반차 준비',startLabel:'반차 사용일',refs:['half']},
 education:{title:'외부 교육 준비',startLabel:'교육 시작일',endLabel:'교육 종료일',refs:['education']},
 settle:{title:'출장비 정산',startLabel:'출장 복귀일',refs:['receipt','settle']},
 onboarding:{title:'입사 첫날',startLabel:'입사일',refs:['onboarding']}
};
export function scheduleTypeFor(result){
 if(result.kind==='plan')return 'trip';
 if(result.kind==='answer'&&scheduleTypes[result.id])return result.id;
 return null;
}
export function makeSchedule(type,start,end=start){
 if(!scheduleTypes[type])throw Error('자료에서 계획을 만들 수 없는 질문이에요.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||localDate(asDate(start))!==start||localDate(asDate(end))!==end)throw Error('올바른 날짜를 선택해 주세요.');
 if(end<start)throw Error('종료일은 시작일 이후로 선택해 주세요.');
 if(type==='trip')return makePlan(start,end);
 const item=(title,date,ref,note,deadline=null)=>({title,date,ref,note,deadline,type:deadline?'규정 기한':'권장 일정'});
 if(type==='annual')return [item('연차 신청 · 인수인계 내용 작성',businessBefore(start,3),'annual','인사 시스템에서 신청하고 팀장 승인을 받으세요.',businessBefore(start,3)),item('연차 승인 확인',addDays(start,-1),'annual','사용 전 승인 상태를 확인하는 권장 일정이에요.')];
 if(type==='half')return [item('반차 신청 · 팀장 승인',addDays(start,-1),'half','오전 또는 오후 4시간 단위로 신청하세요.',addDays(start,-1))];
 if(type==='education')return [item('교육 신청서 제출',businessBefore(start,5),'education','직무 관련 외부 교육을 신청하세요.',businessBefore(start,5)),item('교육 승인 확인 · 결제',businessBefore(start,1),'education','승인을 받은 뒤 결제하세요. 날짜는 권장 일정으로, 승인 상태에 따라 조정하세요.'),item('수료증 · 영수증 제출',businessAfter(end),'education','수료 후 인사팀에 제출하세요. 다음 영업일은 권장 일정이에요.')];
 if(type==='settle')return [item('출장비 정산 신청',businessAfter(start),'settle','영수증, 출장 승인 내역, 정산 신청서를 첨부하세요.',addDays(start,7))];
 return ['사원증 수령','업무 계정 확인','보안 서약서 제출','팀 온보딩 안내 참여'].map(title=>item(title,start,'onboarding','입사 첫날 담당 부서의 안내에 따라 진행하세요.'));
}
export function mergeSchedule(existing,{type,start,end,items},idFactory){
 const next=[...existing];let added=0;
 for(const item of items){const key=`${type}:${start}:${end}:${item.title}`;
  const legacy=type==='trip'&&existing.some(t=>t.key===`${start}:${end}:${item.ref}`);
  if(legacy||next.some(t=>t.key===key))continue;
  next.push({...item,id:idFactory(),key,planType:type,planLabel:scheduleTypes[type].title,tripStart:start,done:false});added++;
 }return {tasks:next,added};
}
