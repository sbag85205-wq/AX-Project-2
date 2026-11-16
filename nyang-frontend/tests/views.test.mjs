import test from 'node:test';
import assert from 'node:assert/strict';
import {VIEWS,viewOf,pageTitleOf,NAV_NAMES,navViews,STAFF_NAVS,EMPLOYEE_NAVS} from '../public/views.js';
// 화면 표(views.js)로 바꾸기 전 app.js에 흩어져 있던 목록과 제목을 그대로 옮겨 두고,
// 표에서 계산한 값이 예전과 완전히 같은지 확인한다(화면 동작이 바뀌지 않았다는 증거).
const OLD={
 employeeNavs:['schedule','activity'],
 staffViews:['chat','board','statistics','userstats','faq','documents','categories','users','model','unanswered','library'],
 staffNavs:['statistics','userstats','faq','documents','categories','users'],
 staffOnly:['statistics','userstats','faq','documents','categories','users','model','unanswered'],
 navNames:['chat','schedule','activity','board','statistics','userstats','faq','documents','categories','users','model','unanswered','library'],
 openStaff:['faq','documents','categories','users','model'],
 openAny:['chat','todos','calendar','board','activity'],
 community:['activity','board'],
 routes:{faq:'/admin/faqs',documents:'/admin/documents',categories:'/admin/categories',users:'/admin/users',model:'/admin/settings',unanswered:'/admin/unanswered',library:'/docs'},
 workspaceTitles:{chat:'물어보기',calendar:'내 일정',todos:'내 일정',activity:'내 활동',board:'질문 게시판',statistics:'이용 통계',userstats:'사용자 통계',faq:'FAQ 관리',documents:'문서 관리',categories:'분야 관리',users:'사용자 관리',model:'검색 모델 설정',unanswered:'챗봇 미답변',library:'사내 문서'},
 pageTitles:{chat:'냥대리에게 물어보기',calendar:'내 캘린더',todos:'내가 해야 할 일',activity:'나의 질문 활동',board:'익명 질문 게시판 · 이 브라우저에만 저장',statistics:'이용 통계',userstats:'사용자 통계',faq:'FAQ 관리',documents:'문서 관리',categories:'분야 관리',users:'사용자 관리',model:'검색 모델 설정',unanswered:'챗봇 미답변',library:'사내 문서'}
};
// 화면 이름 + 표에 없는 이름(메뉴 이름·잘못된 값·객체 기본 속성 이름)까지 모두 검사한다
const every=[...Object.keys(OLD.workspaceTitles),'schedule','reset','background','',undefined,null,'constructor','toString','__proto__','hasOwnProperty'];

test('메뉴 버튼 목록이 예전과 같다(순서 포함)',()=>{
 assert.deepEqual(EMPLOYEE_NAVS,OLD.employeeNavs);
 assert.deepEqual(STAFF_NAVS,OLD.staffNavs);
 assert.deepEqual(NAV_NAMES,OLD.navNames);
});
// (Knowly가 꺼졌을 때 쓰던 대체 화면·안내문은 실제로 쓰이지 않아 2단계 정리에서 지웠다)
test('화면마다 권한·열기·다시 그리기·Knowly 주소가 예전 목록과 같다',()=>{
 for(const name of every){
  const v=viewOf(name);
  assert.equal(!!v?.staff,OLD.staffViews.includes(name),'staff '+name);
  assert.equal(!!v?.staffOnly,OLD.staffOnly.includes(name),'staffOnly '+name);
  assert.equal(v?.open==='staff',OLD.openStaff.includes(name),'open staff '+name);
  assert.equal(v?.open==='any',OLD.openAny.includes(name),'open any '+name);
  assert.equal(!!v?.community,OLD.community.includes(name),'community '+name);
  assert.equal(v?.route,Object.hasOwn(OLD.routes,name)?OLD.routes[name]:undefined,'route '+name);
 }
});
test('제목이 예전과 같다',()=>{
 for(const name of every){
  const old=n=>Object.hasOwn(OLD.workspaceTitles,n);
  assert.equal(viewOf(name)?.title,old(name)?OLD.workspaceTitles[name]:undefined,'title '+name);
  assert.equal(pageTitleOf(name),old(name)?OLD.pageTitles[name]:undefined,'pageTitle '+name);
 }
});
test('메뉴가 켜지는 화면이 예전 규칙과 같다(schedule은 calendar·todos에서 켜진다)',()=>{
 for(const nav of OLD.navNames)for(const view of every){
  const old=nav==='schedule'?['calendar','todos'].includes(view):view===nav;
  assert.equal(navViews(nav).includes(view),old,nav+' / '+view);
 }
});
test('표의 모든 화면에 제목이 있다',()=>{for(const [name,v] of Object.entries(VIEWS))assert.ok(v.title,name);});
