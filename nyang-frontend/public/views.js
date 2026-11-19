// 냥대리 화면(view) 표. 화면을 새로 만들거나 성격을 바꿀 때는 이 표 한 곳만 고친다.
// app.js의 메뉴 표시·권한·제목·Knowly 연결은 모두 이 표에서 계산한다.
//
//  title       상단 제목(#workspace-title)
//  pageTitle   페이지 제목(#page-title). 없으면 title과 같다
//  nav         켜질 메뉴 버튼 이름(#nav-이름). 없으면 화면 이름과 같다
//  open        메뉴 버튼(data-action)으로 열 때: 'any' 누구나 · 'staff' 담당자만
//  staff       담당자도 머무를 수 있는 화면(아니면 담당자는 '챗봇 미답변'으로 보낸다)
//  staffOnly   담당자 전용 화면(직원은 '물어보기'로 보낸다)
//  staffNav    담당자에게만 보이는 메뉴 버튼(직원에게는 숨긴다)
//  route       Knowly 화면 주소(iframe으로 띄운다)
//  community   게시판·포인트 정보가 바뀌면 다시 그린다
//  noNav       메뉴 버튼이 없는 화면(다른 버튼으로만 연다)
export const VIEWS={
 chat:{title:'물어보기',pageTitle:'냥대리에게 물어보기',open:'any',staff:true},
 calendar:{title:'내 일정',pageTitle:'내 캘린더',nav:'schedule',open:'any'},
 todos:{title:'내 일정',pageTitle:'내가 해야 할 일',nav:'schedule',open:'any'},
 // 내 레벨: 위쪽 메뉴에는 없고 레벨 버튼(Lv.)으로 연다. 저장한 답변은 대화 기록 > 내 폴더 > 저장한 답변으로 옮겼다
 activity:{title:'내 레벨',pageTitle:'내 레벨',open:'any',community:true,noNav:true},
 board:{title:'질문 게시판',pageTitle:'익명 질문 게시판',open:'any',staff:true,community:true},
 statistics:{title:'이용 통계',staff:true,staffOnly:true,staffNav:true},
 userstats:{title:'사용자 통계',staff:true,staffOnly:true,staffNav:true},
 faq:{title:'FAQ 관리',open:'staff',staff:true,staffOnly:true,staffNav:true,route:'/admin/faqs'},
 documents:{title:'문서 관리',open:'staff',staff:true,staffOnly:true,staffNav:true,route:'/admin/documents'},
 categories:{title:'분야 관리',open:'staff',staff:true,staffOnly:true,staffNav:true,route:'/admin/categories'},
 users:{title:'사용자 관리',open:'staff',staff:true,staffOnly:true,staffNav:true,route:'/admin/users'},
 model:{title:'검색 모델 설정',open:'staff',staff:true,staffOnly:true,route:'/admin/settings'},
 unanswered:{title:'챗봇 미답변',staff:true,staffOnly:true,route:'/admin/unanswered'},
 library:{title:'사내 문서',staff:true,route:'/docs'},
 // 냥대리 관리(담당자): 상단 '냥대리 테스트' 묶음 아래. 화면 안에서 모드별 반응·계절별 모습·꾸미기 아이템으로 나눠 본다(nyang-manage.js)
 manage:{title:'냥대리 관리',open:'staff',staff:true,staffOnly:true,staffNav:true}
};
const names=Object.keys(VIEWS);
/** 화면 정보. 표에 없는 이름이면 null(객체 기본 속성 이름도 null). */
export const viewOf=name=>Object.hasOwn(VIEWS,name)?VIEWS[name]:null;
/** 페이지 제목(#page-title) */
export const pageTitleOf=name=>viewOf(name)?.pageTitle??viewOf(name)?.title;
const navOf=name=>viewOf(name)?.nav??name;
/** 모든 메뉴 버튼 이름(화면 순서, 중복 없이) */
export const NAV_NAMES=[...new Set(names.filter(name=>!VIEWS[name].noNav).map(navOf))];
/** 이 메뉴 버튼이 켜지는 화면들 (예: schedule → calendar·todos) */
export const navViews=nav=>names.filter(name=>navOf(name)===nav);
/** 담당자에게만 보이는 메뉴 버튼 */
export const STAFF_NAVS=names.filter(name=>VIEWS[name].staffNav);
/** 담당자에게는 숨기는(직원 전용) 메뉴 버튼: 누구나 여는 화면 중 담당자가 머무를 수 없는 화면의 메뉴 */
export const EMPLOYEE_NAVS=[...new Set(names.filter(name=>VIEWS[name].open==='any'&&!VIEWS[name].staff&&!VIEWS[name].noNav).map(navOf))];
