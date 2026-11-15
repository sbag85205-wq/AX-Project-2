// 냥대리 화면 표. app.js render()·메뉴·제목·권한 확인이 모두 이 표를 쓴다.
// who: 볼 수 있는 계정 — 'employee'(직원만), 'staff'(담당자만), 'all'(둘 다)
// nav: 메뉴 버튼 id(#nav-…)가 화면 이름과 다를 때, title: 위쪽 제목, pageTitle: 화면 읽기용 제목
// knowly: Knowly 화면을 iframe으로 띄우는 경로(사내 문서는 마지막에 연 경로를 쓴다)
export const VIEWS={
 chat:{who:'employee',title:'물어보기',pageTitle:'냥대리에게 물어보기'},
 calendar:{who:'employee',nav:'schedule',title:'내 일정',pageTitle:'내 캘린더'},
 todos:{who:'employee',nav:'schedule',title:'내 일정',pageTitle:'내가 해야 할 일'},
 activity:{who:'employee',title:'내 활동',pageTitle:'나의 질문 활동'},
 board:{who:'all',title:'질문 게시판',pageTitle:'익명 질문 게시판 · 이 브라우저에만 저장'},
 statistics:{who:'staff',title:'이용통계',pageTitle:'이용통계'},
 faq:{who:'staff',title:'FAQ 관리',pageTitle:'FAQ 관리',knowly:'/admin/faqs'},
 documents:{who:'staff',title:'문서 관리',pageTitle:'문서 관리',knowly:'/admin/documents'},
 users:{who:'staff',title:'사용자 관리',pageTitle:'사용자 관리',knowly:'/admin/users'},
 model:{who:'staff',title:'검색 모델 설정',pageTitle:'검색 모델 설정',knowly:'/admin/settings'},
 unanswered:{who:'staff',title:'챗봇 미답변',pageTitle:'챗봇 미답변',knowly:'/admin/unanswered'},
 library:{who:'all',title:'사내 문서',pageTitle:'사내 문서',knowly:'/docs'}
};
/** 왼쪽 메뉴 버튼(#nav-…)과 보이는 계정. 사내 문서 메뉴는 직원에게만 보인다(담당자는 '사내 문서' 버튼으로 연다). */
export const NAV=[['chat','employee'],['schedule','employee'],['board','all'],['activity','employee'],['library','employee'],['unanswered','staff'],['statistics','staff'],['faq','staff'],['documents','staff'],['users','staff'],['model','staff']];
/** 각 계정이 처음 보는 화면 / 볼 수 없는 화면을 열려고 할 때 대신 보여줄 화면 */
export const HOME={employee:'chat',staff:'unanswered'};
const allows=(who,staff)=>who==='all'||(who==='staff')===staff;
/** staff 계정이 이 화면을 볼 수 있는지 */
export const canView=(name,staff)=>!!VIEWS[name]&&allows(VIEWS[name].who,staff);
/** staff 계정에게 이 메뉴 버튼이 보이는지 */
export const navVisible=(who,staff)=>allows(who,staff);
/** 화면에 해당하는 메뉴 버튼 id */
export const navOf=name=>VIEWS[name]?.nav||name;
