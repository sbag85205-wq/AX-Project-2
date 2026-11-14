export const categories = [
  { id: 'hr', label: '휴가 · 근태', icon: 'sun', detail: '연차부터 출퇴근까지' },
  { id: 'pay', label: '급여 · 수당', icon: 'wallet', detail: '급여일과 지원 제도' },
  { id: 'trip', label: '출장 · 정산', icon: 'case', detail: '준비부터 정산까지' },
  { id: 'life', label: '사내 생활', icon: 'coffee', detail: '회사 생활의 작은 궁금증' }
];
export const documents = [
  {id:'leave',category:'hr',title:'휴가·근태 가이드',version:'2026.10 · 샘플',sections:[
    {id:'annual',label:'제3조 · 연차 신청',text:'연차는 사용 3영업일 전까지 사내 인사 시스템에서 신청합니다. 신청 시 사용 날짜와 인수인계 내용을 입력하고 팀장의 승인을 받습니다. 신청 기한의 영업일은 토요일·일요일을 제외하며, 이 샘플 규정에서는 공휴일을 별도로 반영하지 않습니다.'},
    {id:'half',label:'제4조 · 반차 사용',text:'반차는 오전 또는 오후 4시간 단위로 사용할 수 있습니다. 사용 전일까지 인사 시스템에서 신청하고 팀장 승인을 받아야 합니다.'},
    {id:'sick',label:'제5조 · 병가',text:'병가는 팀장에게 상황을 공유한 뒤 인사팀에 신청합니다. 3일 이상 연속으로 사용하는 경우 진단서를 제출합니다. 당일 발생한 병가는 당일 신청할 수 있습니다.'},
    {id:'cancel',label:'제6조 · 휴가 취소',text:'승인된 휴가는 인사 시스템에서 취소 요청합니다. 팀장에게 변경 내용을 공유하고 취소 승인을 확인합니다.'}]},
  {id:'pay',category:'pay',title:'급여·복리후생 안내',version:'2026.10 · 샘플',sections:[
    {id:'payday',label:'제2조 · 급여 지급',text:'급여는 매월 25일에 지급합니다. 지급일이 토요일 또는 일요일이면 직전 금요일에 지급합니다. 개인별 급여 명세와 금액은 인사 시스템에서 확인합니다.'},
    {id:'meal',label:'제4조 · 식대',text:'야근 식대는 사전 승인된 연장근무 시 1인 1회 12,000원까지 지원합니다. 영수증을 첨부해 비용 정산을 신청합니다.'},
    {id:'overtime',label:'제5조 · 연장근무',text:'연장근무는 시작 전에 팀장의 승인을 받아야 합니다. 근무 완료 후 인사 시스템에 실제 근무 시간을 기록합니다. 개인별 수당은 인사팀에 확인합니다.'},
    {id:'education',label:'제7조 · 교육비',text:'직무 관련 외부 교육은 교육 시작 5영업일 전까지 신청서를 제출합니다. 팀장 승인 후 결제하며, 수료 후 수료증과 영수증을 인사팀에 제출합니다. 수습 직원 지원 여부는 이 문서에서 정하지 않습니다.'}]},
  {id:'travel',category:'trip',title:'국내 출장 운영 규정',version:'2026.10 · 샘플',sections:[
    {id:'approval',label:'제4조 · 출장 신청',text:'국내 출장은 출발 3영업일 전까지 출장 신청서를 제출합니다. 출장 목적, 일정, 목적지, 예상 비용을 작성하고 팀장 승인을 받습니다. 영업일은 토요일·일요일을 제외하며, 이 샘플 규정에서는 공휴일을 별도로 반영하지 않습니다.'},
    {id:'booking',label:'제5조 · 교통 및 숙박',text:'출장 교통과 숙박은 출장 승인 완료 후 예약합니다. 예약 확인서를 보관합니다. 숙박비는 1박 100,000원까지 지원하며, 초과 비용은 별도 사전 승인이 필요합니다.'},
    {id:'car',label:'제8조 · 자차 이용',text:'국내 출장에서 개인 차량을 이용하려면 출발 전 팀장의 별도 승인이 필요합니다. 이용 사유와 이동 경로를 제출하고 주차·통행료 영수증을 보관합니다.'}]},
  {id:'expense',category:'trip',title:'경비 정산 매뉴얼',version:'2026.10 · 샘플',sections:[
    {id:'receipt',label:'제3조 · 증빙 보관',text:'출장 중 지출한 비용의 영수증을 보관합니다. 결제 날짜, 사용처, 금액이 확인되는 증빙이 필요합니다.'},
    {id:'settle',label:'제6조 · 출장비 정산',text:'출장비는 복귀일 다음 날부터 계산하여 7일 이내에 정산 신청합니다. 영수증, 출장 승인 내역, 정산 신청서를 첨부하고 팀장에게 승인을 요청합니다.'}]},
  {id:'office',category:'life',title:'오피스 생활 가이드',version:'2026.10 · 샘플',sections:[
    {id:'wifi',label:'제2절 · 사내 Wi-Fi',text:'업무용 Wi-Fi 계정은 IT 지원팀에 사내 메신저로 요청합니다. 비밀번호를 외부에 공유하지 않습니다. 게스트는 별도 게스트 네트워크를 사용합니다.'},
    {id:'room',label:'제3절 · 회의실',text:'회의실은 사내 캘린더에서 회의실 자원을 추가해 예약합니다. 예약 시간, 참석 인원, 회의 목적을 입력하고 사용 후 정리합니다.'},
    {id:'equipment',label:'제4절 · 장비 요청',text:'업무용 장비는 IT 지원 요청서를 작성해 팀장 승인 후 IT 지원팀에 제출합니다. 고장은 장비 번호와 증상을 함께 전달합니다.'},
    {id:'onboarding',label:'제5절 · 입사 첫날',text:'입사 첫날에는 인사팀에서 사원증을 수령하고 IT 지원팀에서 업무 계정을 확인합니다. 보안 서약서를 제출한 후 팀 온보딩 안내에 참여합니다.'}]}
];
export const faq = {
  hr:[['연차는 어떻게 신청하나요?','annual'],['반차는 언제까지 신청하나요?','half'],['병가는 어떻게 신청하나요?','sick'],['신청한 휴가를 취소하고 싶어요','cancel']],
  pay:[['급여는 언제 들어오나요?','payday'],['야근 식대는 얼마까지 지원되나요?','meal'],['연장근무는 어떻게 신청하나요?','overtime'],['외부 교육비를 지원받을 수 있나요?','education']],
  trip:[['출장 준비 일정을 짜주세요','plan'],['출장비 정산은 어떻게 하나요?','settle'],['자차로 출장 가도 되나요?','car'],['숙박비는 얼마까지 지원되나요?','booking']],
  life:[['사내 Wi-Fi는 어떻게 연결하나요?','wifi'],['회의실은 어떻게 예약하나요?','room'],['업무용 장비를 요청하고 싶어요','equipment'],['입사 첫날 무엇을 해야 하나요?','onboarding']]
};
export const answers = {
  annual:{title:'사용일 3영업일 전까지 연차를 신청해.',text:'인사 시스템에 날짜와 인수인계 내용을 입력하고, 팀장 승인을 받으면 돼.',steps:['사용 날짜와 인수인계 내용을 준비해.','인사 시스템에서 사용일 3영업일 전까지 신청해. 이 샘플 규정의 영업일은 주말만 제외해.','팀장 승인이 완료됐는지 확인해.'],refs:['annual']},
  half:{title:'반차는 사용 전일까지 신청하세요.',text:'오전 또는 오후 4시간 단위로 사용할 수 있어요. 인사 시스템에서 신청 후 팀장 승인을 받아야 합니다.',refs:['half']},
  sick:{title:'팀장에게 공유한 뒤 인사팀에 신청하세요.',text:'3일 이상 연속 병가에는 진단서가 필요해요. 당일 발생한 병가는 당일 신청할 수 있습니다.',refs:['sick']},
  cancel:{title:'인사 시스템에서 취소를 요청하세요.',text:'팀장에게 변경 내용을 공유하고 취소 승인까지 확인하세요.',refs:['cancel']},
  payday:{title:'급여일은 매월 25일이에요.',text:'25일이 주말이면 직전 금요일에 지급해요. 개인별 명세와 금액은 인사 시스템에서 확인하세요.',refs:['payday']},
  meal:{title:'야근 식대는 1회 12,000원까지 지원돼요.',text:'사전 승인된 연장근무에 해당해요. 영수증을 첨부해 비용 정산을 신청하세요.',refs:['meal']},
  overtime:{title:'연장근무 시작 전에 팀장 승인이 필요해요.',text:'근무 완료 후 실제 근무 시간을 인사 시스템에 기록하세요. 개인별 수당은 인사팀에 확인해야 해요.',refs:['overtime']},
  education:{title:'교육 시작 5영업일 전까지 신청하세요.',text:'팀장 승인 후 결제하고, 수료 후 수료증과 영수증을 인사팀에 제출하세요. 수습 직원 지원 여부는 자료에서 확인되지 않습니다.',refs:['education']},
  approval:{title:'출장 신청은 출발 3영업일 전까지예요.',text:'목적, 일정, 목적지, 예상 비용을 작성하고 팀장 승인을 받으세요.',refs:['approval']},
  booking:{title:'출장 승인 후 교통·숙박을 예약하세요.',text:'숙박비는 1박 100,000원까지 지원해요. 초과 비용은 별도 사전 승인이 필요합니다.',refs:['booking']},
  car:{title:'자차 출장은 별도 사전 승인이 필요해요.',text:'출발 전 팀장에게 이용 사유와 이동 경로를 제출하세요. 주차·통행료 영수증도 보관해야 해요.',refs:['car']},
  settle:{title:'복귀 후 7일 이내에 정산하세요.',text:'복귀일 다음 날부터 7일을 계산해요. 영수증, 출장 승인 내역, 정산 신청서를 첨부해 팀장에게 승인 요청하세요.',steps:['결제 날짜·사용처·금액이 보이는 영수증 준비','출장 승인 내역과 정산 신청서 첨부','팀장에게 정산 승인 요청'],refs:['receipt','settle']},
  wifi:{title:'IT 지원팀에 Wi-Fi 계정을 요청하세요.',text:'사내 메신저로 요청할 수 있어요. 외부 방문객은 별도 게스트 네트워크를 사용해요.',refs:['wifi']},
  room:{title:'사내 캘린더에서 회의실을 예약하세요.',text:'회의실 자원을 추가하고 시간, 참석 인원, 회의 목적을 입력하세요. 사용 후 정리도 잊지 마세요.',refs:['room']},
  equipment:{title:'IT 지원 요청서를 작성하세요.',text:'팀장 승인 후 IT 지원팀에 제출하세요. 고장이라면 장비 번호와 증상을 함께 전달해 주세요.',refs:['equipment']},
  onboarding:{title:'첫날에는 사원증과 업무 계정을 챙겨.',text:'보안 서약서를 제출하고, 팀 온보딩 안내에 참여하면 돼.',steps:['인사팀에서 사원증을 수령해.','IT 지원팀에서 업무 계정을 확인해.','보안 서약서를 제출해.','팀 온보딩 안내에 참여해.'],refs:['onboarding']}
};
const matches = [
 ['cancel',/휴가.*취소|연차.*취소|취소.*휴가/],['half',/반차/],['sick',/병가/],['annual',/연차.*신청|휴가.*신청|연차.*방법/],
 ['payday',/급여.*(언제|지급|날)|월급.*(언제|날)/],['meal',/식대/],['overtime',/연장근무|야근.*신청/],['education',/교육비|외부.*교육|교육.*(일정|계획|신청)/],
 ['car',/자차|개인.*차량/],['settle',/출장비|출장.*정산|정산.*(방법|어떻게|기한)/],['booking',/숙박비|숙박.*예약|교통.*예약/],['approval',/출장.*신청/],
 ['wifi',/와이파이|wi.?fi/i],['room',/회의실/],['equipment',/장비.*(요청|신청|고장)|노트북.*(고장|신청)/],['onboarding',/입사.*첫|첫날/]
];
export function reference(id,docs=documents){for(const doc of docs){const section=doc.sections.find(s=>s.id===id);if(section)return {doc,section};}return null;}
export function resolveQuestion(q,category,uploaded=[]){
 const query=q.trim();
 if(/해외|국외|파견|육아휴직|출산휴가/.test(query))return {kind:'unknown'};
 if(/잔여|남은.*연차|내.*(급여|월급).*얼마|비밀번호|비번/.test(query))return {kind:'unknown',personal:true};
 const matched=matches.find(([,rx])=>rx.test(query));
 let id=matched?.[0];
 if(/출장/.test(query)&&/(일정|계획|준비|절차|뭘|해야|갈|가는데|가요)/.test(query)) id='plan';
 const target=id==='plan'?'trip':id?reference(id)?.doc.category:null;
 if(target&&target!==category)return {kind:'scope',target};
 // Only curated questions are answered automatically; arbitrary uploads return excerpts.
 if(id)return {kind:id==='plan'?'plan':'answer',id};
 const words=query.replace(/[?.,!]/g,'').split(/\s+/).filter(w=>w.length>=2);
 const excerpts=uploaded.filter(d=>d.category===category).flatMap(d=>d.sections).map(sec=>({sec,score:words.filter(w=>sec.text.includes(w)).length})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||Math.min(b.sec.text.length,500)-Math.min(a.sec.text.length,500));
 if(excerpts.length){const sec=excerpts[0].sec;return {kind:'excerpt',ref:sec.id,text:sec.text.length>3000?sec.text.slice(0,3000)+'… (전체 내용은 원문에서 확인하세요.)':sec.text,title:'추가한 자료에서 관련 문단을 찾았어요.'};}
 return {kind:'unknown'};
}
export function localDate(date=new Date()){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function asDate(s){return new Date(`${s}T12:00:00`);}
export function addDays(s,n){const d=asDate(s);d.setDate(d.getDate()+n);return localDate(d);}
export function businessBefore(s,n){let d=asDate(s);while(n>0){d.setDate(d.getDate()-1);if(d.getDay()!==0&&d.getDay()!==6)n--;}return localDate(d);}
export function businessAfter(s){let date=addDays(s,1);while([0,6].includes(asDate(date).getDay()))date=addDays(date,1);return date;}
export function nextFriday(){const d=new Date();const days=(5-d.getDay()+7)%7||7;return addDays(localDate(),days);}
export function displayDate(s){return asDate(s).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});}
export function makePlan(start,end){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||localDate(asDate(start))!==start||localDate(asDate(end))!==end)throw Error('올바른 출발일과 복귀일을 선택해 주세요.');
 if(end<start)throw Error('복귀일은 출발일 이후로 선택해 주세요.');
 return [
  {title:'출장 신청서 제출',date:businessBefore(start,3),deadline:businessBefore(start,3),type:'규정 기한',note:'목적·일정·목적지·예상 비용을 작성하고 팀장 승인을 요청하세요.',ref:'approval'},
  {title:'교통·숙박 예약',date:businessBefore(start,2),deadline:null,type:'권장 일정',note:'출장 승인 완료 후 예약하세요. 승인 전이라면 일정을 조정하세요.',ref:'booking'},
  {title:'출장 영수증 보관',date:start,deadline:null,type:'실행 일정',note:'출장 기간 내내 결제 날짜·사용처·금액이 보이는 증빙을 모으세요.',ref:'receipt'},
  {title:'출장비 정산 신청',date:businessAfter(end),deadline:addDays(end,7),type:'권장 일정',note:'영수증·출장 승인 내역·정산 신청서를 첨부하세요.',ref:'settle'}
 ];
}
