// 화면과 규칙 코드(lib/community.mjs)가 함께 쓰는 질문 분야와 HTML 이스케이프.
export const CATEGORY_IDS=['hr','pay','trip','life'];
export const categories=[
 {id:'hr',label:'휴가 · 근태',icon:'sun',detail:'연차부터 출퇴근까지'},
 {id:'pay',label:'급여 · 복지',icon:'wallet',detail:'급여일과 지원 제도'},
 {id:'trip',label:'출장 · 정산',icon:'case',detail:'준비부터 정산까지'},
 {id:'life',label:'사내 생활',icon:'coffee',detail:'회사 생활의 작은 궁금증'}
];
/** {hr:'휴가 · 근태', ...} */
export const categoryLabels=Object.fromEntries(categories.map(c=>[c.id,c.label]));
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
