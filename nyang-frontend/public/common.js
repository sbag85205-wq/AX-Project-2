// 화면과 규칙 코드(lib/community.mjs, src/nyang/live-account.mjs)가 함께 쓰는 질문 분야, HTML 이스케이프, 역할 확인.

// 질문 분야. label은 Knowly 문서·FAQ의 카테고리 이름(src/lib/constants.ts의 CATEGORIES)과 같아야
// 고른 분야의 문서 안에서 먼저 검색된다(채팅은 label을 category로 보낸다). core.js가 같은 목록을 다시 내보낸다.
export const categories=[
 {id:'server',label:'서버 설치 · 설정',icon:'settings',detail:'OS·도메인부터 서버 설치, 기본 설정까지'},
 {id:'client',label:'클라이언트 접속',icon:'send',detail:'Linker Client 설치, 인증서버 등록, 접속'},
 {id:'trouble',label:'장애 조치',icon:'info',detail:'이슈별 원인과 해결 방법'}
];
/** 예전 분야. 새로 고를 수는 없지만, 이 분야로 저장된 대화·게시글은 그대로 읽고 이름을 보여준다. */
export const LEGACY_CATEGORIES=[
 {id:'hr',label:'휴가 · 근태'},
 {id:'pay',label:'급여 · 복지'},
 {id:'trip',label:'출장 · 정산'},
 {id:'life',label:'사내 생활'}
];
/** 지금 고를 수 있는 분야 id */
export const CATEGORY_IDS=categories.map(c=>c.id);
/** 저장된 기록·게시글에서 받아들이는 분야 id(지금 분야 + 예전 분야) */
export const KNOWN_CATEGORY_IDS=[...CATEGORY_IDS,...LEGACY_CATEGORIES.map(c=>c.id)];
/** {server:'서버 설치 · 설정', ..., hr:'휴가 · 근태', ...} — 예전 분야 이름 포함 */
export const categoryLabels=Object.fromEntries([...categories,...LEGACY_CATEGORIES].map(c=>[c.id,c.label]));
export const defaultCategory=categories[0].id;
/** 저장된 기록에 예전 분야(hr·pay·trip·life)가 남아 있어도 화면이 깨지지 않게 현재 분야로 맞춘다. */
export const categoryOf=id=>categories.find(c=>c.id===id)||categories[0];
/** 분야별 개수 목록: 지금 분야는 항상, 예전 분야는 글이 남아 있을 때만. rows: [{category,n}] */
export function categoryCounts(rows){
 const n=id=>rows.find(x=>x.category===id)?.n||0;
 return [...CATEGORY_IDS.map(category=>({category,n:n(category)})),...LEGACY_CATEGORIES.map(c=>({category:c.id,n:n(c.id)})).filter(x=>x.n)];
}

export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// 역할: 로그인 계정의 역할은 'staff'(담당자, Knowly 관리자) 또는 'employee'(직원)뿐이다(src/nyang/transport.ts toNyangRole).
/** 담당자 계정으로 로그인했는지. state: 게시판·계정 상태(communityState()) */
export const isStaff=state=>state?.me?.role==='staff';
/** 직원 기능(대화 기록·보상·성격·일정)을 쓸 수 있는지: 로그인한 직원 */
export const canEarnRewards=state=>!!state?.member&&!isStaff(state);
