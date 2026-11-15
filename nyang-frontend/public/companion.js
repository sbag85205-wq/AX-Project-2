import {makePlan,businessBefore,businessAfter,addDays,localDate,asDate} from './core.js?v=107007c04825';

// 보상 규칙은 reward-rules.js 한 곳에 있다. 기존 가져오기 경로를 위해 다시 내보낸다.
export {QUESTION_POINTS,TREAT_COST,PET_LIKE_CHANCE,PET_BONUS_CHANCE,PET_BONUS_POINTS,PET_COOLDOWN_MS,petOutcome,wardrobe,initialRewards,normalizeRewards,rewardTransition} from './reward-rules.js?v=a99b0c80721c';

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
