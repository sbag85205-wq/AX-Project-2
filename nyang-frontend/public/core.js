// 질문 분야. label은 Knowly 문서·FAQ의 카테고리 이름(src/lib/constants.ts의 CATEGORIES)과 같아야
// 고른 분야의 문서 안에서 먼저 검색된다.
export const categories = [
  { id: 'server', label: '서버 설치 · 설정', icon: 'settings', detail: 'OS·도메인부터 서버 설치, 기본 설정까지' },
  { id: 'client', label: '클라이언트 접속', icon: 'send', detail: 'Linker Client 설치, 인증서버 등록, 접속' },
  { id: 'trouble', label: '장애 조치', icon: 'info', detail: '이슈별 원인과 해결 방법' },
  // 어느 분야인지 모를 때 고른다. 분야를 좁히지 않고 전체 문서에서 찾는다(서버에 분야를 보내지 않는다).
  { id: 'etc', label: '기타', icon: 'spark', detail: '어느 분야인지 모를 때 · 전체 문서에서 찾아요', searchAll: true }
];
export const defaultCategory = categories[0].id;
const builtInCategories = [...categories];
/** 담당자가 추가한 분야의 기본 설명 (분야 관리 > 설정에서 바꿀 수 있다) */
export const customCategoryDetail = '담당자가 추가한 분야 · 이 분야 문서에서 먼저 찾아요';
/**
 * 분야 관리에서 정한 이름 목록으로 categories를 바꾼다(같은 배열을 고쳐 모든 화면이 함께 본다).
 * 원래 분야와 이름이 같으면 그 분야(id·아이콘·설명·기타의 전체 검색)를 그대로 쓰고, 새 이름은 custom:<이름> 분야가 된다.
 * 바뀌었으면 true.
 */
export function applyManagedCategories(labels, examples = {}, details = {}) {
  const names = (Array.isArray(labels) ? labels : []).filter(l => typeof l === 'string' && l.trim() && l.length <= 30);
  if (!names.length) return false;
  // 분야별 예시 질문(분야 관리 > 설정). 없으면 기본 예시(faq)를 쓴다.
  const listOf = l => Array.isArray(examples?.[l]) ? examples[l].filter(q => typeof q === 'string' && q.trim()).slice(0, 20) : null;
  // 분야별 설명(분야 관리 > 설정). 저장된 글이 있으면(빈 글 포함) 그것, 없으면 기본 설명.
  const detailOf = l => typeof details?.[l] === 'string' ? details[l].slice(0, 60) : null;
  const next = names.map(l => { const base = builtInCategories.find(c => c.label === l) || { id: 'custom:' + l, label: l, icon: 'book', detail: customCategoryDetail }; const detail = detailOf(l); return { ...base, ...(detail === null ? {} : { detail }), examples: listOf(l) }; });
  const same = (a, b) => a.id === b.id && a.label === b.label && a.detail === b.detail && JSON.stringify(a.examples ?? null) === JSON.stringify(b.examples ?? null);
  if (next.length === categories.length && next.every((c, i) => same(c, categories[i]))) return false;
  categories.splice(0, categories.length, ...next);
  return true;
}
/** 저장된 기록에 예전 분야(hr·pay·trip·life)가 남아 있어도 화면이 깨지지 않게 현재 분야로 맞춘다. */
export const categoryOf = id => categories.find(c => c.id === id) || categories[0];
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
// 분야별 질문 예시. 답은 항상 등록된 문서에서 찾는다(정해 둔 답변 없음).
// 문서 내용은 여기에 적지 않는다: 이 파일은 로그인 없이도 내려받을 수 있으므로 질문 문장만 둔다.
// 질문은 매뉴얼에 실제로 쓰인 낱말로 적는다. 검색이 낱말 일치를 보기 때문에, 매뉴얼이 'VM'이라고 쓴 내용을
// 'VD'로 물으면 맞는 문단을 못 찾는다. 표로만 된 내용(오류코드 등)은 지금 검색이 잘 못 찾아 넣지 않았다.
// server 분야는 해당 매뉴얼(기본 교육·설치·관리자)을 확인하지 못해, 목차의 제목 낱말을 그대로 써서 만든 것이다.
export const faq = {
  server:['서버 OS 설치 및 기본설정은 어떻게 하나요?','도메인 환경구성은 어떻게 하나요?','Dstation 필요기능 설치 방법을 알려주세요','Dstation Package 설치 방법을 알려주세요','Dcenter 설치 방법을 알려주세요','Host agent 설치 방법을 알려주세요','CenterPost 설치 방법을 알려주세요','관리 서버 구성은 어떻게 하나요?','Dstation VDAgent 설치 방법을 알려주세요','Dstation 기본 설정은 어떻게 하나요?'],
  client:['사용자 PC에 Linker Client를 설치하는 방법을 알려주세요','Linker Client 설치 요구사항을 알려주세요','관리서버 인증을 받으려면 인증서버를 어떻게 등록하나요?','VD 접속 전 준비 절차를 알려주세요','VD 전원 켜기·끄기·재시작은 어떻게 하나요?','VD 화면 위 툴바는 어떤 기능인가요?','Linker Client는 제어판에서 어떻게 삭제하나요?','Linker Client 아이콘을 실행하는 방법을 알려주세요','인증 서버가 설정되어 있지 않다고 나오면 어떻게 하나요?','할당 받은 VD의 이름과 상태는 어디서 확인하나요?','VD 연결끊기를 누르면 어떻게 되나요?','VD에서 Dstation 설치 폴더에 접근이 제한되는 이유가 뭔가요?'],
  trouble:['VM 접속이 실패할 때 무엇을 확인하나요?','웹서버에 접속이 안 될 때 어떻게 하나요?','로그인했는데 VD가 보이지 않아요','VM이 느릴 경우 무엇을 확인하나요?','Hyper-V에서 VM이 보이지 않을 때 어떻게 하나요?','VM에 명령이 먹히지 않을 때 어떻게 하나요?','VDAgent 재설치 전에 무엇을 백업해야 하나요?','프로비전이 실패하면 무엇을 확인하나요?','클러스터 스토리지 볼륨이 느릴 때 무엇을 확인하나요?','데이터 백업 및 복구 절차를 알려주세요','웹서버 접근은 되는데 로그인이 안 될 때 무엇을 확인하나요?','Master VD 파일 복제가 실패하면 무엇을 확인하나요?','VDAgent 서비스가 실행 중인지 어떻게 확인하나요?'],
  etc:['Dstation 제품 소개를 알려주세요','Dstation의 가상화 기능을 알려주세요','Dstation의 보안 특성을 알려주세요','문제가 해결되지 않으면 기술지원센터에 어떻게 연락하나요?','Dstation 무상 유지보수 기간은 얼마나 되나요?']
};
// 첫 화면 입력칸 위에 보이는 추천 질문: 등록된 매뉴얼에서 맞는 문단이 찾아지는 것만, 주제가 겹치지 않게 고른다.
// label은 화면에 보이는 짧은 글, q는 실제로 보내는 질문.
/** 채팅창 위 추천 질문 버튼 수 (분야를 바꾸면 그 분야의 예시 질문을 이만큼 짧게 보여 준다) */
export const STARTER_COUNT = 7;
/** 기본 예시 질문의 짧은 이름 (버튼에 보이는 글). 누르면 원래 질문 전체로 물어본다. */
export const shortLabels = {
  '서버 OS 설치 및 기본설정은 어떻게 하나요?': '서버 OS 기본설정', '도메인 환경구성은 어떻게 하나요?': '도메인 환경구성',
  'Dstation 필요기능 설치 방법을 알려주세요': '필요기능 설치', 'Dstation Package 설치 방법을 알려주세요': 'Package 설치',
  'Dcenter 설치 방법을 알려주세요': 'Dcenter 설치', 'Host agent 설치 방법을 알려주세요': 'Host agent 설치',
  'CenterPost 설치 방법을 알려주세요': 'CenterPost 설치', '관리 서버 구성은 어떻게 하나요?': '관리 서버 구성',
  'Dstation VDAgent 설치 방법을 알려주세요': 'VDAgent 설치', 'Dstation 기본 설정은 어떻게 하나요?': 'Dstation 기본 설정',
  '사용자 PC에 Linker Client를 설치하는 방법을 알려주세요': 'Linker Client 설치', 'Linker Client 설치 요구사항을 알려주세요': '설치 요구사항',
  '관리서버 인증을 받으려면 인증서버를 어떻게 등록하나요?': '인증서버 등록', 'VD 접속 전 준비 절차를 알려주세요': 'VD 접속 준비',
  'VD 전원 켜기·끄기·재시작은 어떻게 하나요?': 'VD 전원·재시작', 'VD 화면 위 툴바는 어떤 기능인가요?': 'VD 툴바 기능',
  'Linker Client는 제어판에서 어떻게 삭제하나요?': 'Linker Client 삭제', 'Linker Client 아이콘을 실행하는 방법을 알려주세요': 'Linker Client 실행',
  '인증 서버가 설정되어 있지 않다고 나오면 어떻게 하나요?': '인증 서버 미설정 오류', '할당 받은 VD의 이름과 상태는 어디서 확인하나요?': 'VD 이름·상태 확인',
  'VD 연결끊기를 누르면 어떻게 되나요?': 'VD 연결끊기', 'VD에서 Dstation 설치 폴더에 접근이 제한되는 이유가 뭔가요?': '설치 폴더 접근 제한',
  'VM 접속이 실패할 때 무엇을 확인하나요?': 'VM 접속 실패', '웹서버에 접속이 안 될 때 어떻게 하나요?': '웹서버 접속이 안 돼요',
  '로그인했는데 VD가 보이지 않아요': 'VD가 안 보여요', 'VM이 느릴 경우 무엇을 확인하나요?': 'VM이 느려요',
  'Hyper-V에서 VM이 보이지 않을 때 어떻게 하나요?': 'Hyper-V에 VM이 없어요', 'VM에 명령이 먹히지 않을 때 어떻게 하나요?': 'VM 명령이 안 먹혀요',
  'VDAgent 재설치 전에 무엇을 백업해야 하나요?': 'VDAgent 재설치 전 백업', '프로비전이 실패하면 무엇을 확인하나요?': '프로비전 실패',
  '클러스터 스토리지 볼륨이 느릴 때 무엇을 확인하나요?': '스토리지 볼륨이 느려요', '데이터 백업 및 복구 절차를 알려주세요': '데이터 백업·복구',
  '웹서버 접근은 되는데 로그인이 안 될 때 무엇을 확인하나요?': '웹 로그인이 안 돼요', 'Master VD 파일 복제가 실패하면 무엇을 확인하나요?': 'Master VD 복제 실패',
  'VDAgent 서비스가 실행 중인지 어떻게 확인하나요?': 'VDAgent 실행 확인',
  'Dstation 제품 소개를 알려주세요': 'Dstation 제품 소개', 'Dstation의 가상화 기능을 알려주세요': '가상화 기능', 'Dstation의 보안 특성을 알려주세요': '보안 특성',
  '문제가 해결되지 않으면 기술지원센터에 어떻게 연락하나요?': '기술지원센터 연락', 'Dstation 무상 유지보수 기간은 얼마나 되나요?': '무상 유지보수 기간'
};
/**
 * 질문을 버튼에 넣을 짧은 이름으로 줄인다. 기본 예시는 정해 둔 이름을 쓰고,
 * 담당자가 넣은 질문은 '~방법을 알려주세요', '~은 어떻게 하나요?' 같은 끝말을 덜어 내고 16자로 자른다.
 */
export function shortQuestion(question) {
  const q = String(question ?? '').trim();
  if (shortLabels[q]) return shortLabels[q];
  let t = q.replace(/[?？!.~]+$/, '').trim(), m;
  if ((m = /^(.*?)(?:은|는|이|가|을|를)?\s*어떻게\s*(\S*?)(?:해야 하나요|하면 되나요|하나요|하죠|할까요|해요|되나요|돼요)$/.exec(t))) t = [m[1], m[2]].filter(Boolean).join(' ');
  else if ((m = /^(.*?)\s*(?:방법|절차)?(?:을|를)?\s*(?:알려\s*주세요|알려줘|알고 싶어요|궁금해요)$/.exec(t))) t = m[1];
  else if ((m = /^(.*?)(?:은|는|이|가)?\s*(?:무엇을|뭘|어디서|언제|왜)\s*\S*(?:해야 하나요|하나요|되나요)$/.exec(t))) t = m[1];
  else if ((m = /^(.*?)(?:은|는|이|가)?\s*(?:얼마나 되나요|무엇인가요|뭔가요|어떤 기능인가요|있나요)$/.exec(t))) t = m[1];
  t = t.trim() || q;
  return t.length > 16 ? t.slice(0, 15) + '…' : t;
}
/** 분야의 추천 질문 버튼: 그 분야 예시 질문(분야 관리에서 고친 것 또는 기본 예시) 앞에서부터 STARTER_COUNT개. */
export function startersFor(category, count = STARTER_COUNT) {
  const list = category?.examples || faq[category?.id] || [];
  return list.slice(0, count).map(q => ({ label: shortQuestion(q), q, category: category.id }));
}
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
 ['cancel',/휴가.*취소|연차.*취소|취소.*휴가/],['half',/반차/],['sick',/병가/],['annual',/연차.*신청|휴가.*신청|연차.*방법|(연차|휴가).*(쓰|써|사용|내고|내려|낼|쉬)/],
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
