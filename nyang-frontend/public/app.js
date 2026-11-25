import {parseEventRequest,timeLabel,eventTask} from './event-request.js?v=7dffe9d847bc';
import {viewOf,pageTitleOf,NAV_NAMES,navViews,STAFF_NAVS,EMPLOYEE_NAVS} from './views.js?v=df74efb0e3fe';
import {fetch} from './transport.js?v=fd4b994ba12d';
import {emptyCatalog,normalizeCatalog,createCatalogPicker,idleLook,shopItems,neededImages} from './nyang-catalog.js?v=3a88ea59d01b';
import {installNyangManage,nyangManagePageHTML} from './nyang-manage.js?v=1e551f285dca';
import {createCompanionBehavior,companionAppearance} from './companion-behavior.js?v=291139f9595c';
import {normalizePersonality,personalities,personalityText,personalityAnswer,petAppearance} from './personality.js?v=32786256695d';
import {normalizeChats,rememberChat,removeChat,importQuestionHistory,questionsByCategory,chatFolders,updateChatDetails,renameChatFolder} from './chat-history.js?v=2b1060400411';
import {initCommunity,communityState,communityAction,refreshCommunity,activityHTML,boardHTML,unknownOffer,showPostDialog,showMyPost,accountGateHTML,logoutAccount,statsHTML,loadStatistics} from './community-ui.js?v=875803c52c83';
import {categories,applyManagedCategories,defaultCategory,categoryOf,documents,faq,startersFor,answers,reference,resolveQuestion,localDate,addDays,asDate,nextFriday,displayDate,makePlan} from './core.js?v=4dc923f4c7f7';
import {QUESTION_POINTS,TREAT_COST,PET_COOLDOWN_MS,PET_BONUS_POINTS,petOutcome,wardrobe,normalizeRewards,rewardTransition,scheduleTypes,scheduleTypeFor,makeSchedule,mergeSchedule} from './companion.js?v=be0125e6c23b';
import {createPetInteraction} from './pet-interaction.js?v=25ddd542a513';
import {normalizeHistory,recordAnswer,toggleSaved,unseenReplies,levelLadder} from './activity-history.js?v=20d8b9f9b46b';
const $=s=>document.querySelector(s);
import {passwordProblem,passwordInputHTML,passwordEye} from './account-view.js?v=fbdeceff715b';
import {createAccountSync} from './account-sync.js?v=422e8ba71441';
import {esc,loadingHTML} from './shared.js?v=b4248c4d9fbf';
import {staffSettingsHTML,expandStaffSettings,installStaffSettings} from './staff-settings.js?v=7ac2fbc77579';
import {orderNav,installNavLayout} from './nav-layout.js?v=2a33659a9a7a';
import {createGuide} from './guide.js?v=a94d3106cc42';
import {recentTurns} from './chat-context.js?v=e6c82dc547ad';
import {initBackground,backgroundUploads,backgroundState,showBackground,applyBackground,loadBackground} from './background.js?v=5402e774fd4a';
import {initSchedule,renderCalendar,renderTodos} from './schedule.js?v=818da1a92cb1';
const mode=document.body.dataset.mode;
const isCat=mode==='cat';
const root='/nyang/';
// 답변 저장(북마크) 아이콘
const paths={bookmark:'M7 4h10v16l-5-3.5L7 20V4Z',spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',chat:'M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-4-.9L3 21l1.7-5a8.5 8.5 0 1 1 16.3-4.5Z',list:'m3 6 1 1 2-2M10 6h11M3 12l1 1 2-2m4 1h11M3 18l1 1 2-2m4 1h11',book:'M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V6a3 3 0 0 1 1-3ZM3 17h17M7 7h9M7 11h7',arrow:'M5 12h14m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',wallet:'M20 8H5a3 3 0 0 1 0-6h13v6M3 5v14a2 2 0 0 0 2 2h15V8m0 5h-5v4h5',case:'M3 7h18v14H3V7Zm5 0V3h8v4M3 12l9 3 9-3M10 12h4',coffee:'M3 7h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7Zm13 1h3a3 3 0 0 1 0 6h-3M6 2v2m5-2v2',picture:'M3 3h18v18H3V3Zm0 14 6-6 5 5 3-3 4 4M8 7h.01',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',send:'M12 19V5m-6 6 6-6 6 6',plus:'M12 5v14M5 12h14',back:'M19 12H5m6-6-6 6 6 6',calendar:'M3 5h18v16H3V5Zm4-3v6m10-6v6M3 11h18',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',info:'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',menu:'M4 6h16M4 12h16M4 18h16',clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',logout:'M9 4H4v16h5m5-13 5 5-5 5m-6-5h12'};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
const CAT_LABELS={searching:'책에서 자료를 찾고 있는',annoyed:'귀찮은 표정의',happy:'행복한 표정의','warm-pet':'눈을 감고 골골거리는','warm-wink':'윙크하는','warm-shy':'수줍게 쉬고 싶어 하는','warm-joy':'두 손 모아 기뻐하는','cold-tsun':'곁눈질하며 볼이 빨개진','cold-think':'턱을 괴고 생각하는','cold-stop':'손바닥으로 멈추라는','cold-sulk':'고개를 돌리고 삐친','cold-shoo':'콧김을 뿜으며 손을 젓는'};
// style: 관리에서 올린 그림(--art), inner: 냥대리 위에 겹치는 추가 꾸미기 아이템
const cat=(mood='',extra='',style='',inner='')=>`<div class="cat-art ${mood} ${extra}" role="img" aria-label="${CAT_LABELS[mood]||(mood.startsWith('treat-')?'츄르를 맛있게 먹는':mood.startsWith('season-')?'계절 옷을 입은':mood==='custom-art'?'새 모습의':'차갑지만 귀여운')} 고양이 냥대리"${style?` style="${style}"`:''}>${inner}</div>`;
paths.edit='M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4';
paths.settings='M9 3h6l1 3 3 1v6l-3 1-1 3H9l-1-3-3-1V7l3-1 1-3ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z';
paths.moon='M20.9 13.1A9 9 0 0 1 10.9 3a9 9 0 1 0 10 10.1Z';
paths.help='M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z';
// 냥대리 성격 버튼 전용(해·달은 화면 밝기 버튼이 쓴다): 따뜻한 모드 하트, 차가운 모드 눈송이
paths.heart='M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z';
paths.snow='M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 4.5 12 6.5l2-2M10 19.5l2-2 2 2';
paths.cat='M5 9 4 3l6 4h4l6-4-1 6a8 8 0 1 1-14 0ZM8 12h.01M16 12h.01m-6 4 2 1 2-1';
paths.activity='M4 20h16M7 16V9m5 7V4m5 12v-5';
paths.shirt='m8 3-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4a4 4 0 0 1-8 0Z';
paths.copy='M9 8h11v13H9zM5 16V3h11';
// 사이드바 접기 버튼: 둥근 사각형 안에 왼쪽 세로줄(사이드바 패널)
paths.panel='M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 4v16';
// 발바닥 냥대리 메뉴 버튼: 발가락 네 개 + 발바닥(채워서 그린다)
// 입력창 질문 예시 버튼: 전구
paths.bulb='M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z';
paths.paw='M4.4 10.6a1.7 2.1 0 1 0 3.4 0a1.7 2.1 0 1 0-3.4 0ZM7.8 6.6a1.8 2.2 0 1 0 3.6 0a1.8 2.2 0 1 0-3.6 0ZM12.6 6.6a1.8 2.2 0 1 0 3.6 0a1.8 2.2 0 1 0-3.6 0ZM16.2 10.6a1.7 2.1 0 1 0 3.4 0a1.7 2.1 0 1 0-3.4 0ZM12 12.2c-2.6 0-5.2 3-5.2 5.3 0 1.6 1.3 2.3 2.7 2.3 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.4 0 2.7-.7 2.7-2.3 0-2.3-2.6-5.3-5.2-5.3Z';
let activeAccount=null;
const personalKeys=new Set(['om-docs','om-tasks','om-question-history','om-seen-replies','om-chat-sessions','om-chat-active','om-personality']);
const storageKey=key=>personalKeys.has(key)||key.startsWith('om-bg-')?'nyang-account:'+(activeAccount||'signed-out')+':'+key:key;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(storageKey(key)))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(storageKey(key),JSON.stringify(value));accountSync.changed(key);return true;}catch{toast('브라우저 저장 공간이 부족해 저장하지 못했어요.');return false;}}
// 계정별 기록(내 일정·대화 기록·내 활동 기록·배경/성격 설정)을 서버와 맞춰 다른 PC에서도 보이게 한다(account-sync.js)
const accountSync=createAccountSync({
 // 다른 기기 기록과 합쳐졌으면 화면이 들고 있는 일정·대화 기록 등을 곧바로 다시 읽는다(옛 목록으로 저장해 합친 항목을 지우지 않게)
 onMerged:()=>{if(activeAccount)reloadAccountRecords();},
 keyFor:(account,key)=>personalKeys.has(key)||key.startsWith('om-bg-')?'nyang-account:'+account+':'+key:key,
 async send(body){const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await res.json().catch(()=>null);if(!res.ok)throw Object.assign(Error(data?.error||'기록을 저장하지 못했어요.'),{status:res.status});return data;}
});
let uploads=read('om-docs',[]),tasks=read('om-tasks',[]),messages=[],category=isCat?null:defaultCategory,mood='',view='chat',filter='today',selectedDay=localDate(),plan=null,dialogOpener=null;
let chats=[],activeChatId=null,chatHistoryCollapsed=false,chatHistoryCategory='all',chatHistoryFolder='all',historyMessageId=null;
let chatDraft='',pendingReply=null,replyTimer=null,heroTransition=null;
let history=normalizeHistory(read('om-question-history',[])),seenReplies=read('om-seen-replies',{}),scheduleView='todos';
if(!seenReplies||typeof seenReplies!=='object')seenReplies={};
const allDocs=()=>[...documents,...uploads];
const badge=(text,cls='')=>`<span class="badge ${cls}">${text}</span>`;
// 알림: 새 알림이 앞의 알림을 지우지 않고 아래에 쌓였다가 각자 3.5초 뒤 사라진다(최대 3개, 같은 글은 하나로)
const TOAST_LIMIT=3,TOAST_MS=3500;
function toast(text){
 let stack=$('#toast-stack');
 if(!stack){stack=document.createElement('div');stack.id='toast-stack';stack.setAttribute('role','status');stack.setAttribute('aria-live','polite');document.body.append(stack);}
 const message=String(text??'');if(!message)return;
 const leave=item=>{clearTimeout(item._timer);item.classList.remove('show');setTimeout(()=>item.remove(),220);};
 const same=[...stack.children].find(x=>x.textContent===message&&x.classList.contains('show'));
 if(same){clearTimeout(same._timer);same._timer=setTimeout(()=>leave(same),TOAST_MS);return;}
 const item=document.createElement('div');item.className='toast-item';item.textContent=message;stack.append(item);
 // 화면 아래에 붙은 질문 입력창이 있으면 알림을 그 위에 띄워 입력창을 가리지 않는다.
 const lift=()=>{const box=$('.chat-composer')?.getBoundingClientRect(),docked=box&&box.height&&box.bottom>innerHeight-120;stack.style.bottom=docked?`${Math.round(innerHeight-box.top+12)}px`:'';};
 lift();requestAnimationFrame(()=>{lift();item.classList.add('show');});item._timer=setTimeout(()=>leave(item),TOAST_MS);
 const live=[...stack.children].filter(x=>x.classList.contains('show')||x===item);
 for(const old of live.slice(0,Math.max(0,live.length-TOAST_LIMIT)))leave(old);
}
// 불러오는 중: 화면 전체를 잠깐 덮고 걷는 냥대리를 보여 준다(로그인 중 등). text가 없으면 닫는다.
function showLoading(text){
 let el=$('#nyang-loading-overlay');
 if(!text){el?.remove();return;}
 if(!el){el=document.createElement('div');el.id='nyang-loading-overlay';el.className='nyang-loading-overlay';document.body.append(el);}
 el.innerHTML=loadingHTML(text);
}
const systemColorTheme=matchMedia('(prefers-color-scheme: dark)');
function applyColorTheme(theme){
 const dark=theme==='dark';
 document.documentElement.dataset.theme=dark?'dark':'light';
 $('meta[name="theme-color"]')?.setAttribute('content',dark?'#111214':'#ffffff');
 const button=$('[data-action="toggle-theme"]');
 if(button){button.setAttribute('aria-pressed',String(dark));button.dataset.glassTip=dark?'라이트 모드로':'다크 모드로';button.setAttribute('aria-label',`화면 밝기 (지금 ${dark?'다크':'라이트'} 모드)`);button.innerHTML=icon(dark?'moon':'sun')+`<span aria-hidden="true">${dark?'다크':'라이트'}</span>`;}
}
function preferredColorTheme(){
 const saved=read('nyang-color-theme',null);
 return saved==='dark'||saved==='light'?saved:systemColorTheme.matches?'dark':'light';
}
systemColorTheme.addEventListener('change',()=>applyColorTheme(preferredColorTheme()));
window.addEventListener('storage',e=>{if(e.key==='nyang-color-theme'||e.key===null)applyColorTheme(preferredColorTheme());});


let rewards={...normalizeRewards(null),treatTokens:0};
let calendarMonth=localDate().slice(0,7),calendarDay=localDate(),happyUntil=0;
// 성격별 반응 그림은 첫 반응·모드 전환 때 냥대리가 잠깐 비어 보이지 않게 처음에 두 장 모두 미리 받아 둔다.
// (주소는 화면 주소가 아니라 /nyang/ 기준이어야 한다: 화면은 /nyang/cat/ 등 여러 곳에서 열린다)
const reactionArt=['warm','cold'].map(mode=>{const img=new Image();img.src=`${root}assets/cat-${mode}-reactions.webp`;return img;});
// 계절별 모습(cat-seasons.webp)과 계절 반응·눈 깜빡임 그림은 그 계절을 정했을 때만 받는다
// 츄르를 먹는 장면(companion-behavior.js의 먹이 장면 중 먹는 순간)
// 모드 고르기 창의 대표 그림: 계절을 정했으면 그 계절 옷을 입은 모드별 대표 반응(따뜻한 모드 신남, 차가운 모드 볼 빨간 곁눈질)
const previewCat=mode=>{const season=nyangCatalog.season;return season&&season!=='none'?cat(`${mode}-${season}-${mode==='warm'?'joy':'tsun'}`,'personality-preview-cat reaction-art'):cat('','personality-preview-cat');};
const TREAT_PHASES=['snack','savor','tasty','yummy','relish','blush'];
const seasonArt=new Image(),seasonFiles={spring:['spring-warm-reactions','spring-cold-reactions','spring-blink','season-search','season-treat'],summer:['summer-warm-reactions','summer-cold-reactions','summer-blink','season-search','season-treat'],autumn:['autumn-warm-reactions','autumn-cold-reactions','autumn-blink','season-search','season-treat'],winter:['winter-warm-reactions','winter-cold-reactions','winter-blink','season-search','season-treat']},seasonLoaded=new Map();
let petReaction=null,petTimer=null,petGesture=null,ignorePetClickUntil=0,petPending=false,petMoving=false,petMotionTimer=null;
let personality='cold',companionPhase='idle';
// 냥대리 관리(담당자)에서 정한 반응·계절별 모습·꾸미기 아이템(nyang-catalog.js). 올린 그림은 data: 글자로 받아 둔다.
let nyangCatalog=emptyCatalog();const catalogImages=new Map(),catalogRequested=new Set();
const artStyle=id=>{const src=catalogImages.get(id);return src?`--art:url('${src}')`:'';};
// 반응은 지금 계절에 나올 수 있는 것 중에서 모두 같은 확률로 고른다(올린 그림은 받아 둔 것만)
const pickReaction=createCatalogPicker(()=>nyangCatalog,id=>catalogImages.has(id));
function applyCatalog(value){
 nyangCatalog=normalizeCatalog(value);
 if(nyangCatalog.season!=='none'&&!seasonArt.src)seasonArt.src=`${root}assets/cat-seasons.webp`;
 for(const name of seasonFiles[nyangCatalog.season]||[])if(!seasonLoaded.has(name)){const img=new Image();img.src=`${root}assets/cat-${name}.webp`;seasonLoaded.set(name,img);}
 loadCatalogImages();
}
async function loadCatalogImages(ids=neededImages(nyangCatalog)){
 const missing=ids.filter(id=>!catalogImages.has(id)&&!catalogRequested.has(id)).slice(0,30);if(!missing.length)return;
 missing.forEach(id=>catalogRequested.add(id));
 try{
  const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'catalog-images',ids:missing})}),data=await res.json().catch(()=>null);
  for(const [id,src] of Object.entries(data?.images||{}))if(typeof src==='string'&&src.startsWith('data:image/'))catalogImages.set(id,src);
  refreshPet();
 }catch{}finally{missing.forEach(id=>catalogRequested.delete(id));}
}
const companionBehavior=createCompanionBehavior({change(phase){companionPhase=phase;refreshPet();}});
const voice=()=>personalities[personality];
const tone=text=>personalityText(text,personality);

function shell(){
 $('#app').innerHTML=`<div class="app-shell studio-shell desktop-workspace">
  <aside class="app-sidebar" aria-label="냥대리 메뉴">
   <div class="sidebar-top"><button class="brand" data-action="reset" aria-label="냥대리 처음으로"><img class="company-logo company-logo-light" src="${root}assets/tilon-logo.png" width="434" height="118" alt="Tilon — Your dream starts here"><img class="company-logo company-logo-dark" src="${root}assets/tilon-logo-dark.png" width="434" height="118" alt="Tilon — Your dream starts here"><span>냥대리</span></button><button type="button" class="sidebar-toggle icon-button" data-sidebar-toggle aria-expanded="true" aria-label="사이드바 접기" title="사이드바 접기">${icon('panel')}</button></div>
   <nav class="workspace-nav side-nav" aria-label="주 메뉴">
    <button data-action="chat" id="nav-chat">${icon('chat')}<span>물어보기</span></button>
    <button data-action="schedule" id="nav-schedule">${icon('calendar')}<span>내 일정</span><span id="task-count" class="count"></span></button>
    <button data-action="board" id="nav-board">${icon('book')}<span>질문 게시판</span><span id="activity-unread" class="activity-unread" hidden></span></button>
    <button data-action="docs" id="nav-library" hidden>${icon('book')}<span>사내 문서</span></button>
    <button data-action="unanswered" id="nav-unanswered" hidden>${icon('info')}<span>챗봇 미답변</span></button>
    <button data-action="statistics" id="nav-statistics" hidden>이용 통계</button>
    <button data-action="userstats" id="nav-userstats" hidden>사용자 통계</button>
    <button data-action="faq" id="nav-faq" hidden>FAQ 관리</button>
    <button data-action="documents" id="nav-documents" hidden>문서 관리</button>
    <button data-action="categories" id="nav-categories" hidden>분야 관리</button>
    <button data-action="users" id="nav-users" hidden>사용자 관리</button>
    <button data-action="model" id="nav-model" hidden>검색 모델 설정</button>
    <button data-action="manage" id="nav-manage" hidden>냥대리 관리</button>
    ${['test:냥대리 테스트','stats:이용통계','chat:채팅 관리','admin:관리'].map(g=>{const [id,label]=g.split(':');return `<div class="nav-group" id="nav-group-${id}" hidden><button type="button" class="nav-group-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="nav-submenu-${id}">${label}${icon('down')}</button><div class="nav-submenu" id="nav-submenu-${id}"></div></div>`;}).join('')}
   </nav>
   <div id="sidebar-history" class="sidebar-history"></div>
   <div class="sidebar-profile">
    <button type="button" class="profile-card account-menu-button" id="account-button" popovertarget="profile-menu" aria-haspopup="true"></button>
    <div id="wallet" class="wallet" aria-label="보유 포인트와 하트"></div>
   </div>
   <div id="profile-menu" class="profile-menu" popover aria-label="내 프로필 메뉴">
    <div id="profile-level" class="profile-level"></div>
    <button type="button" data-action="account">${icon('settings')}<span>내 계정</span></button>
    <button type="button" data-action="logout">${icon('logout')}<span>로그아웃</span></button>
   </div>
  </aside>
  <div class="top-icons" role="group" aria-label="빠른 도구">
   <button data-action="guide" id="guide-button" aria-label="냥대리 사용 가이드 다시 보기" data-glass-tip="가이드" hidden>${icon('help')}<span>가이드 다시 보기</span></button>
   <button class="attendance-quick" id="attendance-button" data-community="attendance" data-busy-label="출석 중…" data-glass-tip="출석체크">${icon('calendar')}<span>출석체크</span></button>
   <button class="appearance-button theme-toggle" data-action="toggle-theme" aria-label="화면 밝기" aria-pressed="false" data-glass-tip="다크 모드로">${icon('moon')}</button>
  </div>
  <div class="main-shell">
   <main class="main-content cat-mode" id="main"></main>
   <span id="workspace-title" class="visually-hidden">물어보기</span>
   <span id="page-title" class="visually-hidden"></span>
  </div>
 </div><dialog id="modal" aria-labelledby="modal-title"></dialog>`;
 applyColorTheme(preferredColorTheme());applyBackground();render();
}
function updateWallet(){
 $('#wallet').hidden=communityState().me?.role==='staff';
 // 첫 화면 출석체크: 오늘 이미 했으면 '출석 완료'로 막아 둔다
 const attendance=$('#attendance-button'),attended=!!communityState().today;
 if(attendance){attendance.disabled=attended;attendance.classList.toggle('done',attended);const streak=Number(communityState().streak)||0;
  attendance.innerHTML=icon(attended?'check':'calendar')+`<span>${attended?'출석 완료':'출석체크'}</span>`+(streak?`<b class="attendance-streak">${streak}일째</b>`:'');
  attendance.setAttribute('aria-label',attended?`오늘 출석했어요. ${streak}일 연속 출석 중! 내일 또 만나요.`:streak?`어제까지 ${streak}일 연속 출석했어요. 오늘도 출석하면 ${streak+1}일째!`:'하루 한 번, 포인트 또는 츄르 선물');
  attendance.dataset.glassTip=attended?`출석 완료${streak?` (${streak}일째)`:''}`:'출석체크 (오늘 아직 안 했어요)';}
 $('#wallet').innerHTML=`<button class="wallet-level" data-action="activity">${communityState().member?'Lv. '+communityState().level.level:'내 레벨'}</button><span title="새 질문 +10 P · 하루 최대 20개"><i>P</i><strong id="points-balance">${rewards.points}</strong></span><span title="츄르를 주고 하트를 눌러 모아요"><i class="heart-mark">♥</i><strong id="hearts-balance">${rewards.hearts}</strong></span>`;
 const count=tasks.filter(t=>!t.done).length;$('#task-count').textContent=count||'';
 const unread=unseenReplies(communityState().posts,seenReplies).length,indicator=$('#activity-unread');
 indicator.hidden=!unread;indicator.textContent=unread;indicator.setAttribute('aria-label','새 답변이 달린 내 질문 '+unread+'개');
}
// ── 냥대리 테스트: 검색·모델 설정 (staff-settings.js) ──────────────────
installStaffSettings({icon,toast});
// ── 냥대리 테스트: 냥대리 관리 (nyang-manage.js) ─────────────────────
installNyangManage({icon,toast,cat,catalog:()=>nyangCatalog,images:catalogImages,
 setCatalog:value=>{applyCatalog(value);refreshPet();},loadImages:ids=>loadCatalogImages(ids)});

// ── 주 메뉴 배치 (nav-layout.js) ─────────────────────────────────────
installNavLayout();
// ── 첫 사용자 가이드 (guide.js · guide-steps.js) ─────────────────────
// 직원에게 첫 로그인 때 한 번 띄우고, 오른쪽 위 '가이드'(?) 아이콘으로 다시 본다. 담당자에게는 띄우지 않는다.
const guide=createGuide({request:fetch,busy:()=>$('#modal').open,returnFocus:()=>$('#guide-button'),beforeStart(){if(view!=='chat'){view='chat';petInteraction.reset();render();$('#main').scrollTop=0;}}});
function render(){
 document.body.dataset.personality=personality;
 const personalityButton=$('#personality-button');if(personalityButton)personalityButton.innerHTML=icon(personality==='warm'?'heart':'snow')+'<span>'+voice().label+'</span>';
 document.body.dataset.view=view;
 const session=communityState(),staff=session.me?.role==='staff';document.body.dataset.authenticated=String(!!session.member);document.body.dataset.role=staff?'staff':'employee';
 for(const name of EMPLOYEE_NAVS)$('#nav-'+name).hidden=staff;
 $('#guide-button').hidden=staff||!session.member;
 $('#nav-chat span').textContent=staff?'냥대리 테스트':'물어보기';
 orderNav(staff);
 if(staff&&!viewOf(view)?.staff)view='unanswered';
 document.body.dataset.view=view;
 for(const name of STAFF_NAVS)$('#nav-'+name).hidden=!staff;
 $('#nav-model').hidden=true; // 검색·모델 설정은 '냥대리 테스트' 화면 아래로 옮겼다
 $('#nav-unanswered').hidden=!staff;$('#nav-library').hidden=staff;
 if(!session.member){$('#sidebar-history').replaceChildren();$('#wallet').innerHTML='';$('#account-button').textContent='';$('#workspace-title').textContent='로그인';$('#main').classList.add('work-view');$('#main').innerHTML=accountGateHTML();return;}
 if(viewOf(view)?.staffOnly&&!staff)view='chat';
 $('#account-button').innerHTML='<span>'+esc(session.me.username)+'</span><small>'+(session.me.role==='staff'?'담당자':'직원')+'</small>';
 $('#account-button').setAttribute('aria-label',session.me.username+' 내 계정');
 $('#workspace-title').textContent=viewOf(view)?.title;

 const docCount=$('.side-nav [data-action="docs"] .count');if(docCount)docCount.textContent=allDocs().length;
 for(const name of NAV_NAMES){const nav=$('#nav-'+name),active=navViews(name).includes(view);nav?.classList.toggle('active',active);if(active)nav?.setAttribute('aria-current','page');else nav?.removeAttribute('aria-current');}
 document.querySelectorAll('.nav-group').forEach(g=>g.querySelector('.nav-group-toggle').classList.toggle('active',!!g.querySelector('.nav-submenu .active')));
 $('#page-title').textContent=pageTitleOf(view);
 if(staff&&view==='chat')$('#workspace-title').textContent='냥대리 테스트';
 $('#main').classList.toggle('work-view',view!=='chat');updateWallet();
 if(view!=='chat')$('#sidebar-history').replaceChildren(); // 대화 기록은 물어보기 화면에서만 보인다
 if(viewOf(view)?.route){mountKnowly(view);}else if(view==='manage')$('#main').innerHTML=nyangManagePageHTML();else if(view==='statistics')$('#main').innerHTML=knowlyStatsHTML();else if(view==='userstats')$('#main').innerHTML=statsHTML();else if(view==='activity')$('#main').innerHTML=activityHTML(`<section class="activity-work" aria-label="내 레벨">${myLevelHTML()}</section>`,true);else if(view==='board')$('#main').innerHTML=boardHTML();else if(view==='calendar')renderCalendar(scheduleState());else if(view==='todos')renderTodos(scheduleState());else renderCat();
}
async function commitReward(event){
 if(communityState().me?.role==='staff')return null;
 const payload={type:event.type,id:crypto.randomUUID()};
 if(event.type==='collect')payload.heart=event.id;
 if(event.type==='buy'||event.type==='equip')payload.item=event.id;
 const result=await communityAction('reward',payload);
 return result;
}
/** 관리에서 추가한 꾸미기 아이템: 냥대리 그림과 같은 틀의 그림을 냥대리 위에 겹친다(cat()의 inner로 넣는다) */
function customOutfitHTML(id=rewards.equipped){
 if(!id?.startsWith('item-'))return '';const item=nyangCatalog.custom.items.find(x=>x.id===id),src=item&&catalogImages.get(item.image);
 return src?`<span class="outfit-custom" aria-label="${esc(item.name)}" style="--outfit:url('${src}')"></span>`:'';
}
function outfitHTML(id=rewards.equipped){if(id?.startsWith('item-'))return '';return id?`<span class="cat-outfit outfit-${id}" aria-label="${wardrobe.find(x=>x.id===id)?.name}">${id==='ribbon'?'<i></i>':id==='crown'?'♛':'✦ <i>✧</i> ✦'}</span>`:'';}
function petHTML(){
 const reaction=petReaction&&Date.now()<petReaction.until?petReaction.kind:null;
 const happy=(rewards.pending.length>0||Date.now()<happyUntil)&&!['sleepy','peek','hesitate'].includes(companionPhase);
 const appearance=companionAppearance(personality,{phase:companionPhase,reaction,affection:petReaction?.affection});
 const base=petAppearance(personality,{reaction,happy:happy||companionPhase==='welcome',mood});
 const pose=reaction?petReaction.pose:null;
 // 답을 찾는 동안에는 책을 읽는 모습으로 바꾼다 (쓰다듬는 반응이 나오는 동안은 그 반응이 먼저다)
 const searching=!!pendingReply&&!pose;
 // 계절을 정했으면 책 읽는 모습도 그 계절 옷을 입은 그림으로(cat-season-search.webp). 책 읽는 움직임은 그대로
 const seek=searching&&nyangCatalog.season!=='none'?nyangCatalog.season:'';
 const expression=pose?(pose.eyes==='closed'?'':pose.eyes):searching?'searching':(appearance.sleepy?'':base.expression);
 // 반응·인사·츄르 장면은 성격별 전용 그림을 쓴다(그림에 눈·꼬리가 이미 그려져 있어 눈 깜빡임·꼬리 겹침은 끈다)
 // 계절을 정했으면 츄르를 먹는 장면(두 모드 모두)은 그 계절 옷을 입고 츄르 먹는 그림(cat-season-treat.webp)
 const treat=!searching&&!pose&&!reaction&&nyangCatalog.season!=='none'&&TREAT_PHASES.includes(companionPhase)?nyangCatalog.season:'';
 const poseArt=!searching&&pose?pose.art||'':'',phaseArt=!searching&&!pose&&!reaction&&!treat?appearance.art||'':'';
 // 관리에서 올린 반응 그림, 그리고 반응이 없을 때는 지금 계절의 기본 모습(관리에서 고른 것)
 const custom=!searching&&pose?.image&&catalogImages.has(pose.image)?pose.image:'';
 const idle=!searching&&!pose&&!phaseArt&&!treat?idleLook(nyangCatalog):null;
 const seasonal=idle&&idle.id!=='base'&&(idle.builtin||catalogImages.has(idle.image))?idle:null;
 const art=custom||poseArt||(treat?'treat':'')||phaseArt||(seasonal?'season':'');
 // 인사·츄르 앞뒤 장면(PHASE_ART: 윙크·골골·신남 / 생각·삐짐·츤데레)도 계절을 정했으면 그 계절 그림으로(네 계절 모두 같은 이름의 그림이 있다)
 const phaseName=phaseArt&&nyangCatalog.season!=='none'?nyangCatalog.season+'-'+phaseArt:phaseArt;
 const artMood=custom||seasonal&&!seasonal.builtin?'custom-art':treat?'treat-'+treat:poseArt||phaseName?personality+'-'+(poseArt||phaseName):seasonal?seasonal.id:'';
 const artCss=custom?artStyle(custom):seasonal&&!seasonal.builtin?artStyle(seasonal.image):'';
 const wag=!art&&(pose?pose.wag:base.wag);
 if(pose){appearance.sleepy=pose.eyes==='closed';appearance.soft=false;appearance.mark=pose.mark;}
 if(searching){appearance.sleepy=false;appearance.mark='';}
 if(art){appearance.sleepy=false;appearance.soft=false;}
 return `<span class="resident-shadow"></span><button class="pet-touch" data-action="pet" aria-label="냥대리 쓰다듬기" aria-busy="${petPending}" aria-describedby="pet-guide" ${pendingReply?'disabled title="자료를 찾는 중이라 잠시 쓰다듬을 수 없어요"':'title="클릭하거나 드래그해서 쓰다듬어 주세요"'}></button><div class="pet-body behavior-${companionPhase} ${pose?'gesture-'+pose.motion:''} ${appearance.soft?'pet-soft-boundary':''} ${petReaction?.affection?'pet-affection':''} ${petMoving?'pet-engaged':''} ${reaction?'pet-'+reaction:happy?'delighted':''}"><div class="pet-resolution">${wag?'<span class="pet-wag-tail" aria-hidden="true"></span>':''}${cat(art?artMood:expression,'resident'+(art?' reaction-art':'')+(seek?' seek-art seek-'+seek:'')+(wag?' pet-bonus-body':'')+(appearance.sleepy?' pet-sleepy':''),artCss,searching?'':customOutfitHTML())}${searching?'':outfitHTML()}</div></div><span class="resident-spark spark-one">✧</span><span class="resident-spark spark-two">✦</span><div class="pet-feedback ${reaction?'has-reaction reaction-'+reaction:''}" ${reaction||appearance.mark?'':'aria-hidden="true"'}>${appearance.mark?`<span class="companion-emote" aria-hidden="true">${appearance.mark}</span>`:''}${reaction?`<span class="pet-feedback-kicker">${reaction==='bonus'?'아주 드문 친밀감 보너스':reaction==='like'?'골골, 기분 좋은가 봐요':personality==='warm'?'지금은 쉬고 싶대요':'오늘은 조금 까칠해요'}</span><strong>${petReaction.line}</strong>${reaction==='bonus'?`<span class="pet-point-pop">+${PET_BONUS_POINTS} <small>P</small></span><small>작은 마음의 표시다냥.</small>`:`<small>${reaction==='like'?(personality==='warm'?'조금 더 함께 있자냥.':'좋아하는 건 비밀이다냥.'):(personality==='warm'?'기다려줘서 고맙다냥.':'잠깐 쉬었다 만나자냥.')}</small>`}`:''}</div>${rewards.pending.map((id,i)=>`<button class="collect-heart heart-${i}" data-heart="${id}" aria-label="하트 ${i+1} 모으기"><span>♥</span><small>+1</small></button>`).join('')}<div class="pet-actions"><button class="treat-button" data-action="feed" ${(rewards.points<TREAT_COST&&!rewards.treatTokens)||rewards.pending.length?'disabled':''}><span class="treat-stick" aria-hidden="true"></span> 츄르 주기 <b>${rewards.treatTokens?`보유 ${rewards.treatTokens}개`:'10 P'}</b></button><span>${rewards.pending.length?'하트를 눌러서 모아달라냥!':rewards.treatTokens?'출석 선물부터 먼저 쓰겠다냥.':rewards.points<TREAT_COST?'질문하면 포인트가 쌓여요':(personality==='warm'?'고맙다냥. 맛있게 먹겠다냥!':'이건… 조금 기대된다냥.')}</span><span class="pet-guide" id="pet-guide">클릭하거나 드래그해서 쓰다듬기</span></div>`;
}
function refreshPet(){
 refreshChatRewards();
 const minis=document.querySelectorAll('.mini-cat');
 if(minis.length){const look=miniLook(),stale=[...minis].filter(el=>el.dataset.look!==look);if(stale.length){const mini=miniCat();for(const el of stale)el.outerHTML=mini;}}
 const pet=$('.resident-portrait');if(!pet)return;
 const template=document.createElement('template');template.innerHTML=petHTML();
 const next=template.content,body=pet.querySelector('.pet-body'),touch=pet.querySelector('.pet-touch');
 if(!body||!touch){pet.replaceChildren(next);return;}
 // Preserve the animated body and focused/captured button. Replacing them
 // restarts CSS animations and can turn pointer focus into a visible outline.
 touch.setAttribute('aria-busy',String(petPending));
 // 답을 찾는 중에는 쓰다듬기 버튼을 잠근다(검색이 끝나면 다시 연다)
 const nextTouch=next.querySelector('.pet-touch');touch.disabled=nextTouch.disabled;touch.title=nextTouch.title;
 body.className=next.querySelector('.pet-body').className;
 const resolution=body.querySelector('.pet-resolution'),nextResolution=next.querySelector('.pet-resolution');
 if(resolution.innerHTML!==nextResolution.innerHTML)resolution.innerHTML=nextResolution.innerHTML;
 const feedback=$('.pet-feedback'),nextFeedback=next.querySelector('.pet-feedback');
 if(feedback){if(feedback.outerHTML!==nextFeedback.outerHTML)feedback.replaceWith(nextFeedback);}
 else ($('.home-cat-aside')||pet).prepend(nextFeedback);
 const actions=pet.querySelector('.pet-actions'),nextActions=next.querySelector('.pet-actions');
 if(actions.outerHTML!==nextActions.outerHTML)actions.replaceWith(nextActions);
 const hearts=[...pet.querySelectorAll('.collect-heart')],nextHearts=[...next.querySelectorAll('.collect-heart')];
 if(hearts.map(h=>h.outerHTML).join('')!==nextHearts.map(h=>h.outerHTML).join('')){
  hearts.forEach(h=>h.remove());pet.append(...nextHearts);
 }
}
const petInteraction=createPetInteraction({
 commit:()=>commitReward({type:'pet'}),cooldown:PET_COOLDOWN_MS,
 // 표정은 서버를 기다리지 않고 바로(같은 확률), 보너스 포인트만 서버가 정한다
 guess:()=>petOutcome(Math.random(),1-Number.EPSILON),
 indicate(pending){
  petPending=pending;$('.pet-touch')?.setAttribute('aria-busy',String(pending));
  if(!pending&&!petReaction){petMoving=false;clearTimeout(petMotionTimer);refreshPet();}
 },
 stroke(){
  petMoving=true;clearTimeout(petMotionTimer);refreshPet();
  // 클릭할 때마다 움직임을 처음부터 다시 시작한다(같은 반응이 또 골라지거나 한 번만 도는 움직임이 이미 끝났어도 다시 움직인다).
  // Skip the imperceptible easing-in frames: the press is visible immediately.
  for(const motion of $('.resident-portrait .pet-body')?.getAnimations()||[])if(motion.animationName)motion.currentTime=70;
  petMotionTimer=setTimeout(()=>{if(!petPending&&!petReaction){petMoving=false;refreshPet();}},2200);
 },
 react(kind){
  clearTimeout(petTimer);
  if(!kind){companionBehavior.clear();petMoving=false;clearTimeout(petMotionTimer);}else petMoving=true;
  const duration=kind==='bonus'?PET_COOLDOWN_MS:2200;
  const pose=kind?pickReaction(personality,kind):null;
  petReaction=kind?{kind,pose,line:pose.line,until:Date.now()+duration}:null;
  refreshPet();
  if(kind)petTimer=setTimeout(()=>{petReaction=null;petMoving=false;refreshPet();},duration);
 },
 onBonus:()=>toast(`냥대리가 꼬리를 흔들어요! 친밀감 보너스 +${PET_BONUS_POINTS}P`),
 onError:()=>toast('포인트를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.')
});
let loginPetTimer=null;
function reactLoginPet(){
 if(communityState().member)return;
 const button=$('.login-cat-touch'),art=button?.querySelector('.login-cat'),reply=$('#login-pet-reply');
 if(!art||!reply)return;
 clearTimeout(loginPetTimer);
 art.classList.add('annoyed');button.classList.add('is-annoyed');
 reply.textContent='로그인하고 만져라냥!';
 for(const animation of button.getAnimations())animation.currentTime=0;
 loginPetTimer=setTimeout(()=>{art.classList.remove('annoyed');button.classList.remove('is-annoyed');reply.textContent='';},2400);
}
// 답을 찾는 중(책 읽는 모습)에는 쓰다듬지 않는다. 클릭·드래그 모두 여기를 거친다.
function petCat(){if(pendingReply)return false;return petInteraction.pet();}
function sourceButtons(refs){return `<div class="sources">${refs.map(id=>{const r=reference(id,allDocs());return r?`<button data-source="${esc(id)}">${icon('book')}${esc(r.doc.title)} <span>${esc(r.section.label.split(' · ')[0])}</span>${icon('chevron')}</button>`:'';}).join('')}</div>`;}
function answerTools(r,refs,detail='',detailLabel='자세한 절차'){
 const panel=r.expandedPanel,detailId=`detail-${r.messageId}`,sourceId=`sources-${r.messageId}`;
 const first=reference(refs[0],allDocs()),saved=history.some(x=>x.id===r.messageId&&x.saved);
 const citation=first?`<div class="answer-citation"><button data-source="${esc(refs[0])}">${icon('book')}<span><strong>${esc(first.doc.title)}</strong><small>${esc(first.section.label)} · ${esc(first.doc.version)}</small></span>${icon('chevron')}</button></div>`:'';
 return `${citation}<div class="answer-tools" role="group" aria-label="답변 더 알아보기">${detail?`<button data-answer-panel="detail" data-message="${r.messageId}" aria-expanded="${panel==='detail'}" aria-controls="${detailId}">${detailLabel} ${icon('down')}</button>`:''}${refs.length>1?`<button data-answer-panel="sources" data-message="${r.messageId}" aria-expanded="${panel==='sources'}" aria-controls="${sourceId}">${icon('book')} 전체 출처 <span class="source-count">${refs.length}</span></button>`:''}${r.scheduleType?`<button class="answer-schedule-button" ${r.decision==='added'?`data-open-plan="${r.start}"`:`data-consent="${r.decision==='yes'?'no':'yes'}" data-message="${r.messageId}" aria-expanded="${r.decision==='yes'}" aria-controls="schedule-${r.messageId}"`}>${icon(r.decision==='added'?'check':'calendar')}${r.decision==='added'?'내 일정 보기':r.decision==='yes'?'일정 접기':['annual','half'].includes(r.scheduleType)?'신청 일정 잡기':'일정 잡기'}</button>`:''}<button class="answer-copy-button" data-copy-answer="${r.messageId}" title="답변을 복사해 메일·메신저에 붙여 넣을 수 있어요">${icon('copy')}답변 복사</button><button class="answer-save-button" data-save-answer="${r.messageId}" aria-pressed="${saved}" title="${saved?'다시 누르면 저장을 해제해요':'대화 기록 > 내 폴더 > 저장한 답변에서 다시 볼 수 있어요'}">${icon(saved?'check':'bookmark')}${saved?'저장됨':'답변 저장하기'}</button></div>${detail?`<div class="answer-detail" id="${detailId}" ${panel==='detail'?'':'hidden'}>${detail}</div>`:''}<div class="answer-source-panel" id="${sourceId}" ${panel==='sources'?'':'hidden'}><p>답변의 근거 · 눌러서 원문 확인</p>${sourceButtons(refs)}</div>`;
}
// main 백엔드(사내 문서 검색) 답변: 기존 답변 카드·도구 모양을 그대로 쓴다.
function knowlyHTML(r){
 const k=r.knowly||{},arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'||typeof x==='string'):[],summary=arr(k.summary),steps=arr(k.steps),cites=arr(k.citations);
 const detail=(steps.length?`<ol class="answer-steps">${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:'')+(k.details?`<p>${esc(k.details)}</p>`:'');
 const sources=cites.length?`<div class="answer-citation">${cites.map(c=>{const label=`<span><strong>${esc(c.title)}</strong><small>${esc([c.pages,c.version].filter(Boolean).join(' · '))}</small></span>`;return c.document_id?`<button data-knowly-doc="${esc(c.document_id)}" data-chunk="${esc(c.chunk_id||'')}">${icon('book')}${label}${icon('chevron')}</button>`:`<span class="knowly-source">${icon('book')}${label}</span>`;}).join('')}</div>`:'';
 const notes=arr(k.attachments).length?`<p class="caption">${arr(k.attachments).map(a=>`${esc(a.name)} ${a.read?'읽음':'읽지 못함'}`).join(' · ')}</p>`:'';
 const votes=k.message_id?`<div class="answer-tools" role="group" aria-label="답변 평가"><button data-knowly-vote="up" data-message="${esc(r.messageId)}" aria-pressed="${k.vote==='up'}">${icon(k.vote==='up'?'check':'plus')}도움돼요</button><button data-knowly-vote="down" data-message="${esc(r.messageId)}" aria-pressed="${k.vote==='down'}">${icon(k.vote==='down'?'check':'info')}아쉬워요</button></div>`:'';
 return `<div class="answer-content"><span class="answer-label">${icon('check')} ${k.error?'연결 오류':!k.answered?'등록된 근거가 부족해요':k.mode==='faq'?'FAQ에서 확인한 답변':'사내 문서에서 확인한 답변'}</span>${communityState().me?.role==='staff'&&k.search_question?`<p class="answer-search-question">검색한 질문: ${esc(k.search_question)}</p>`:''}<h3>${esc(summary[0]||'')}</h3>${summary.length>1?`<ul class="answer-essentials">${summary.slice(1).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${k.outside_category?`<p class="caption">${icon('info')} ${esc(categoryOf(r.category).label)} 분야에서 근거를 찾지 못해 전체 문서에서 찾았어요.</p>`:''}${arr(k.warnings).map(w=>`<p class="caption">${icon('info')} ${esc(w)}</p>`).join('')}${notes}${sources}${answerTools(r,[],detail)}${votes}${!k.answered&&!k.error&&communityState().me?.role!=='staff'?unknownOffer({...r,kind:'unknown'}):''}</div>`;
}
// ── Knowly(main 백엔드) 연결 ─────────────────────────────────────────
// 통합 앱은 항상 실제 Knowly 기능을 사용한다. 연결 오류를 샘플로 대체하지 않는다.
let libraryRoute='/docs',attachments=[],attachBusy=false;
// 받침이 있으면 '을', 없으면 '를'(예: 사내 문서를, 검색 모델 설정을)
const objectParticle=word=>{const c=String(word).trim().slice(-1).charCodeAt(0);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'을':'를';};
// 냥대리 로딩을 띄우지 않는 Knowly 화면(챗봇 미답변·분야 관리: 화면이 먼저 뜨고 로딩이 뒤늦게 보여 어색하다)
const NO_LOADING_CAT=new Set(['unanswered','categories']);
function knowlyFrameHTML(key,route){const name=viewOf(view)?.title||'화면';return `<div class="knowly-frame-wrap" data-knowly-key="${esc(key)}">${NO_LOADING_CAT.has(key)?'':loadingHTML(`${name}${objectParticle(name)} 불러오는 중`)}<iframe class="knowly-frame" title="Knowly ${esc(key)}" src="/knowly/index.html#${esc(route)}"></iframe></div>`;}
// 같은 화면을 다시 그릴 때 iframe을 새로 불러오지 않도록, 이미 떠 있으면 그대로 둔다.
function mountKnowly(name){
 const key=name==='library'?'library:'+libraryRoute:name,route=name==='library'?libraryRoute:viewOf(name)?.route;
 const current=$('#main > .knowly-frame-wrap');
 if(current?.dataset.knowlyKey===key)return;
 // 이미 다 뜬 Knowly 화면이 있으면 새로 만들지 않고 안쪽 주소(#)만 바꾼다: 앱을 다시 시작·로그인 확인하지 않아 훨씬 빠르다.
 // 새 화면이 데이터를 불러오는 동안은 안쪽이 '불러오는 중'을 알려 바깥 냥대리가 다시 보인다.
 const frame=current?.querySelector('iframe.knowly-frame');
 if(frame&&current.classList.contains('ready')){
  try{
   frame.contentWindow.location.hash='#'+route;
   current.dataset.knowlyKey=key;frame.title='Knowly '+key;
   const name=viewOf(view)?.title||'화면',loading=current.querySelector(':scope > .nyang-loading');
   if(loading&&NO_LOADING_CAT.has(key))loading.remove();
   else if(loading)loading.outerHTML=loadingHTML(`${name}${objectParticle(name)} 불러오는 중`);
   else if(!NO_LOADING_CAT.has(key))current.insertAdjacentHTML('afterbegin',loadingHTML(`${name}${objectParticle(name)} 불러오는 중`));
   return;
  }catch{}
 }
 $('#main').innerHTML=knowlyFrameHTML(key,route);
}
function knowlyStatsHTML(){return `<section class="admin-page knowly-stats"><header class="admin-heading"><h1>문서 검색 이용 통계</h1></header>${knowlyFrameHTML('stats','/admin/stats')}</section>`;}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||!e.data||typeof e.data.type!=='string')return;
 const frame=[...document.querySelectorAll('iframe.knowly-frame')].find(f=>f.contentWindow===e.source);if(!frame)return;
 if(e.data.type==='knowly-embed-height')frame.style.height=Math.max(320,Math.min(20000,Number(e.data.height)||0))+'px';
 if(e.data.type==='knowly-embed-route'&&frame.closest('[data-knowly-key^="library"]')){libraryRoute=String(e.data.route||'/docs');frame.parentElement.dataset.knowlyKey='library:'+libraryRoute;}
 if(e.data.type==='knowly-embed-off'||e.data.type==='knowly-embed-error'){toast(String(e.data.message||'연결을 확인해 주세요.'));}
 if(e.data.type==='knowly-embed-busy'){const wrap=frame.closest('.knowly-frame-wrap');if(wrap){
  wrap.dataset.signalled='1';wrap.classList.toggle('busy',!!e.data.busy);clearTimeout(wrap._busyTimer);
  if(!e.data.busy)wrap.classList.add('ready');
  else wrap._busyTimer=setTimeout(()=>{wrap.classList.remove('busy');wrap.classList.add('ready');},8000); // 안전장치: 8초 넘게 남아 있지 않게
 }}
});
function openLibrary(route='/docs'){libraryRoute=route;view='library';petInteraction.reset();render();$('#main').scrollTop=0;}
// 개인 Knowly 세션의 답변 또는 명시적인 오류를 표시한다.
async function askKnowly(question,files=[]){
 try{
  const conversation_id=messages.findLast(m=>m.result?.knowly?.conversation_id)?.result.knowly.conversation_id||null;
  const res=await fetch('/api/knowly',{method:'POST',body:JSON.stringify({question,conversation_id,history:recentTurns(messages),category:categoryOf(category).searchAll?null:categoryOf(category).label,attachments:files.map(a=>a.kind==='image'?{name:a.name,kind:'image',data_url:a.dataUrl}:{name:a.name,kind:'file',text:a.text})})});
  const data=await res.json();
  // 로그인이 끝났으면(다른 곳에서 로그아웃·만료) 오류 카드 대신 로그인 화면으로 보낸다
  if(res.status===401){refreshCommunity();toast(data.error||'로그인이 만료됐어요. 다시 로그인해 주세요.');}
  if(!res.ok)throw Error(data.error||'문서 검색에 실패했어요.');return data.answer;
 }catch(e){return {error:true,answered:false,summary:[e.message||'연결을 확인한 뒤 다시 질문해 주세요.'],citations:[]};}
}
async function voteKnowly(messageId,vote){
 const m=messages.find(x=>x.result?.messageId===messageId),k=m?.result?.knowly;if(!k?.message_id)return;
 const next=k.vote===vote?null:vote;
 try{const res=await fetch('/api/knowly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feedback',message_id:k.message_id,vote:next})}),data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.error||'평가를 저장하지 못했어요.');k.vote=next;saveCurrentChat();render();toast(next?'평가를 남겼어요. 고마워요!':'평가를 취소했어요.');}
 catch(err){toast(err.message);}
}
async function addAttachments(files){
 if(attachBusy)return;attachBusy=true;
 try{
  const lib=await import('/knowly/attach.js');
  for(const file of files){
   if(attachments.length>=lib.ATTACH_MAX){toast(`첨부는 ${lib.ATTACH_MAX}개까지 할 수 있어요.`);break;}
   try{attachments.push(await lib.prepareAttachment(file));}catch(err){toast(err.message||`${file.name}을(를) 읽지 못했어요.`);}
  }
 }catch{toast('첨부 기능을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');}
 finally{attachBusy=false;const draft=$('#question-form textarea')?.value;if(draft!=null)chatDraft=draft;render();}
}
// 사진(PDF는 첫 쪽 그림)은 칩 앞에 작은 미리보기를 붙이고, 누르면 크게 보여 준다
function attachmentChips(){return attachments.length?`<div class="composer-attachments" aria-label="첨부한 파일">${attachments.map(a=>`<span class="admin-tag${a.kind==='image'&&a.dataUrl?' has-thumb':''}">${a.kind==='image'&&a.dataUrl?`<button type="button" class="attach-thumb" data-preview-attach="${esc(a.id)}" aria-label="${esc(a.name)} 크게 보기" title="크게 보기"><img src="${esc(a.dataUrl)}" alt=""></button>`:''}${esc(a.kind==='image'?'사진':'파일')} · ${esc(a.name)} <button type="button" class="text-button" data-remove-attach="${esc(a.id)}" aria-label="${esc(a.name)} 첨부 빼기">×</button></span>`).join('')}</div>`:'';}
// 개인 일정 추가 카드: 제목·날짜·시간을 확인·수정하고 '내 일정에 추가'를 누른다
function eventHTML(r){const e=r.event||{},when=`${displayDate(e.date)}${e.time?' · '+timeLabel(e.time):''}`;
 if(r.decision==='added')return `<div class="answer-content event-card"><span class="answer-label">${icon('check')} 내 일정에 추가했어요</span><h3>${esc(e.title)}</h3><p>${esc(when)}</p><div class="answer-tools"><button class="answer-schedule-button" data-schedule-detail="${esc(r.messageId)}">${icon('list')} 일정 상세</button><button class="answer-schedule-button" data-open-plan="${esc(e.date)}">${icon('calendar')} 내 일정 보기</button></div></div>`;
 if(r.decision==='no')return `<div class="answer-content event-card"><span class="answer-label muted">${icon('calendar')} 일정 추가</span><h3>일정 추가를 취소했어요.</h3><p>필요하면 다시 말해 주세요.</p></div>`;
 return `<div class="answer-content event-card"><span class="answer-label">${icon('calendar')} 일정 추가</span><h3>이렇게 내 일정에 넣을까요?</h3><p>제목·날짜·시간을 확인하고, 필요하면 고친 뒤 추가하세요.</p><form class="event-form" data-event-form="${esc(r.messageId)}"><label>제목<input name="title" value="${esc(e.title)}" maxlength="40" required></label><label>날짜<input type="date" name="date" value="${esc(e.date)}" required></label><label>시간<input type="time" name="time" value="${esc(e.time)}"></label><div class="event-form-actions"><button type="submit" class="primary-button">${icon('calendar')} 내 일정에 추가</button><button type="button" class="text-button" data-event-cancel="${esc(r.messageId)}">취소</button></div></form></div>`;
}
function resultHTML(r){
 if(r.kind==='answer'){const a=personalityAnswer(answers[r.id],personality),detail=a.steps?`<ol class="answer-steps">${a.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:'';return `<div class="answer-content"><span class="answer-label">${icon('check')} 자료에서 확인한 답변</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>${answerTools(r,a.refs,detail)}</div>`;}
 if(r.kind==='knowly')return knowlyHTML(r);
 if(r.kind==='event')return eventHTML(r);
 if(r.kind==='unknown')return `<div class="answer-content"><span class="answer-label muted">${icon('info')} 확인할 수 없는 내용</span><h3>${isCat?voice().unknown:'현재 자료에서 답을 확인할 수 없습니다.'}</h3><p>${r.personal?'개인별 잔여 연차·급여·계정 정보에는 접근할 수 없어요. 사내 시스템이나 담당 부서에서 확인해 주세요.':isCat?voice().unknownDetail:'현재 샘플 자료에 없거나 체험에서 지원하지 않는 질문입니다. 관련 문서를 확인하거나 담당자에게 문의해 주세요.'}</p></div>${unknownOffer(r)}`;
 if(r.kind==='scope')return `<div class="answer-content"><h3>${isCat?voice().scope:'선택한 분야 밖의 질문입니다.'}</h3><p>지금은 ${esc(categories.find(c=>c.id===(r.category||category))?.label)} 자료 안에서 답하고 있어요.</p><button class="secondary-button" data-switch-category="${r.target}" data-retry="${esc(r.q)}">${categories.find(c=>c.id===r.target).label} 분야로 바꿔서 질문 ${icon('arrow')}</button></div>`;
 if(r.kind==='excerpt'){const long=r.text.length>180;return `<div class="answer-content"><span class="answer-label">${icon('book')} 업로드 자료 원문 검색</span><h3>${esc(r.title)}</h3><p class="excerpt">${esc(long?r.text.slice(0,180)+'…':r.text)}</p><p class="caption">${long?'문단 일부예요. ':''}${personality==='warm'?'답변으로 확인된 내용은 아니니 원문을 확인해 주세요.':'답변으로 확인된 내용은 아니니 원문을 확인해 줘.'}</p>${answerTools(r,[r.ref],long?`<p class="excerpt">${esc(r.text)}</p>`:'','문단 펼치기')}</div>`;}
 if(r.kind==='plan')return `<div class="answer-content"><span class="answer-label">${icon('check')} 자료에서 확인한 답변</span><h3>${tone('출장은 출발 3영업일 전까지 신청해.')}</h3><ul class="answer-essentials"><li>팀장 승인 후 교통·숙박 예약</li><li>출장 중 영수증 보관</li><li>복귀 다음 날부터 7일 이내 정산 신청</li></ul>${answerTools(r,['approval','booking','receipt','settle'],tone('<ol class="answer-steps"><li><strong>출장 신청</strong>목적·일정·목적지·예상 비용을 작성하고 팀장 승인을 받아.</li><li><strong>교통·숙박 예약</strong>승인 후 예약하고 확인서를 보관해. 숙박비는 1박 100,000원까지, 초과 비용은 별도 사전 승인이 필요해.</li><li><strong>증빙 보관</strong>결제 날짜·사용처·금액이 보이는 영수증을 챙겨.</li><li><strong>정산 신청</strong>영수증·출장 승인 내역·정산 신청서를 첨부해 팀장에게 승인 요청해.</li></ol>'))}</div>`;
 return '';
}

function scheduleOffer(r){
 if(!r.scheduleType)return '';
 const meta=scheduleTypes[r.scheduleType];
 // 추가한 뒤에도 일정 상세(제목·날짜·할 일 목록)를 그 자리에 남겨 둔다
 if(r.decision==='added'){const first=(r.items||[]).map(t=>t.date).sort()[0]||r.start;return `<div class="schedule-offer schedule-done" id="schedule-${r.messageId}"><p class="schedule-saved" role="status">${icon('check')} ${r.items.length}개의 할 일을 내 일정에 ${personality==='warm'?'넣었어요.':'넣었어.'}</p><h3>${esc(r.title||meta.title)}</h3><p class="schedule-done-dates">${meta.startLabel} ${displayDate(r.start)}${meta.endLabel?` · ${meta.endLabel} ${displayDate(r.end)}`:''}</p><div class="schedule-preview">${scheduleRows(r.items||[])}</div><div class="answer-tools"><button class="answer-schedule-button" data-schedule-detail="${esc(r.messageId)}">${icon('list')} 일정 상세</button><button class="answer-schedule-button" data-open-plan="${esc(first)}">${icon('calendar')} 내 일정에서 보기</button></div></div>`;}
 if(r.decision==='yes')return `<div class="schedule-offer" id="schedule-${r.messageId}"><h3>${voice().schedule}</h3><form class="plan-form" data-plan-form="${r.messageId}"><label class="plan-title-field">일정 제목<input name="title" maxlength="40" required value="${esc(r.title??meta.title)}" placeholder="${esc(meta.title)}" autocomplete="off"></label><label>${meta.startLabel}<input type="date" name="start" required value="${r.start}"></label>${meta.endLabel?`<label>${meta.endLabel}<input type="date" name="end" required min="${r.start}" value="${r.end}"></label>`:''}<div class="schedule-preview" data-preview="${r.messageId}">${schedulePreview(r)}</div><button type="submit" class="primary-button">내 일정에 추가 ${icon('calendar')}</button><button type="button" class="text-button" data-consent="no" data-message="${r.messageId}">닫기</button></form><p class="caption">샘플 일정 템플릿입니다. 실제 기한은 답변의 사내 문서와 비교해 조정하세요. 영업일은 주말만 제외해요.<br>이 사이트의 내 일정에 저장됩니다.</p></div>`;
 return `<div id="schedule-${r.messageId}" hidden></div>`;
}
// 일정 잡기 미리보기 줄(날짜·할 일·종류·마감). 추가한 뒤에도 같은 줄로 상세 내용을 계속 보여 준다
function scheduleRows(items){return items.map(t=>`<div><span class="${t.date<localDate()?'overdue':''}">${displayDate(t.date)}${t.date<localDate()?' · 지난 날짜':''}</span><strong>${esc(t.title)}</strong><small>${t.type}${t.deadline?' · 마감 '+displayDate(t.deadline):''}</small></div>`).join('');}
function schedulePreview(r){
 try{return scheduleRows(makeSchedule(r.scheduleType,r.start,r.end));}catch(err){return `<p role="alert">${esc(err.message)}</p>`;}
}
function messageTime(value){return new Date(value||Date.now()).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});}
// 지난 답변 옆 작은 냥대리도 맨 아래 냥대리처럼 지금 계절의 기본 모습(관리에서 고른 것)을 입힌다
// (계절을 바꾸거나 올린 그림을 늦게 받으면 refreshPet이 data-look을 보고 다시 그린다)
const miniSeason=()=>{const idle=idleLook(nyangCatalog);return idle&&idle.id!=='base'&&(idle.builtin||catalogImages.has(idle.image))?idle:null;};
const miniLook=()=>`${miniSeason()?.id||'base'}|${rewards.equipped||''}`;
function miniCat(){const seasonal=miniSeason();
 const art=seasonal?cat(seasonal.builtin?seasonal.id:'custom-art','resident reaction-art',seasonal.builtin?'':artStyle(seasonal.image)):cat('','resident');
 return `<div class="message-avatar mini-cat" aria-hidden="true" data-look="${esc(miniLook())}"><div class="pet-body"><div class="pet-resolution">${art}${outfitHTML()}</div></div></div>`;}
function conversation(){
 const lastAssistant=messages.findLastIndex(m=>m.role==='assistant');
 const markup=messages.map((m,i)=>{const day=!i||localDate(new Date(m.at))!==localDate(new Date(messages[i-1].at))?`<div class="chat-day-divider"><span>${new Date(m.at).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})}</span></div>`:'';return day+(m.role==='user'?`<article class="chat-row from-me"><div class="user-message">${esc(m.text)}${Array.isArray(m.files)&&m.files.length?`<small class="user-attachments">첨부 · ${m.files.map(esc).join(', ')}</small>`:''}</div><time>${messageTime(m.at)}</time></article>`:`<article class="chat-row from-nyang assistant-message" data-reply="${m.result.messageId}">${i===lastAssistant&&!pendingReply?'<div class="active-cat-slot"></div>':miniCat()}<div class="chat-message-body"><div class="assistant-name">냥대리 <span>업무 메이트</span></div><div class="answer-wrap">${resultHTML(m.result)}${scheduleOffer(m.result)}</div><time>${messageTime(m.at)}</time></div></article>`);}).join('');
 return `<div class="conversation" role="log" aria-label="냥대리와의 대화" aria-live="polite" aria-relevant="additions text">${markup}${pendingReply?`<article class="chat-row from-nyang assistant-message typing-message"><div class="active-cat-slot"></div><div class="chat-message-body"><div class="assistant-name">냥대리 <span>업무 메이트</span></div><div class="typing-bubble" role="status" aria-label="냥대리가 답변을 준비하고 있어요"><i></i><i></i><i></i></div></div></article>`:''}</div>`;
}
// 첫 화면 발바닥 냥대리 메뉴: 츄르 주기·성격 모드·꾸미기를 한곳에 모은다(동작은 기존 data-action 그대로).
// 열고 닫기는 glass-motion.js가 맡는다. workspace-utilities: 담당자에게는 숨기고(account.css), 가이드 'fun' 단계가 가리킨다.
function pawMenuHTML(){return `<div class="workspace-utilities" data-paw><button type="button" class="paw-button" data-paw-toggle aria-haspopup="true" aria-expanded="false" aria-controls="paw-menu" aria-label="냥대리에게 (츄르 주기 · 모드 · 꾸미기)" title="냥대리에게">${icon('paw')}</button><div id="paw-menu" class="paw-menu" role="group" aria-label="냥대리에게" hidden><p class="paw-menu-title">냥대리에게</p><div class="chat-rewards paw-treat">${chatRewards()}</div><button type="button" id="personality-button" data-action="personality" aria-label="냥대리 성격 설정">${icon(personality==='warm'?'heart':'snow')}<span>${voice().label}</span></button><button type="button" class="paw-wardrobe" data-action="wardrobe">${icon('shirt')}<span>꾸미기</span></button></div></div>`;}
function chatRewards(){return `<button class="chat-treat-button" data-action="feed" ${(rewards.points<TREAT_COST&&!rewards.treatTokens)||rewards.pending.length?'disabled':''}><span class="treat-stick" aria-hidden="true"></span> 츄르 주기 <small>${rewards.treatTokens?`보유 ${rewards.treatTokens}개`:'10 P'}</small></button>${rewards.pending.map((id,i)=>`<button class="chat-collect-heart" data-heart="${id}" aria-label="하트 ${i+1} 모으기">♥ <small>+1</small></button>`).join('')}`;}
function refreshChatRewards(){document.querySelectorAll('.chat-rewards').forEach(area=>area.innerHTML=chatRewards());}
function motionButton(){const moving=read('om-cat-motion',true);return `<button class="motion-control" data-action="toggle-motion" aria-pressed="${moving}" aria-label="${moving?'고양이 움직임 끄기':'고양이 움직임 켜기'}"><span class="motion-mark">${moving?'Ⅱ':'▷'}</span><span>${moving?'움직임 끄기':'움직임 켜기'}</span></button>`;}
// 채팅창 위 추천 질문: 지금 고른 분야의 예시 질문을 짧은 이름으로 보여 준다(누르면 질문 전체로 물어본다).
function starterQuestions(){const list=startersFor(categoryOf(category));return list.length?`<div class="chat-starters" aria-label="${esc(categoryOf(category).label)} 추천 질문">${list.map(s=>`<button data-question="${esc(s.q)}" data-cat="${esc(s.category)}" title="${esc(s.q)}">${esc(s.label)}</button>`).join('')}</div>`:'';}
function saveCurrentChat(){
 if(!activeAccount||!activeChatId)return;
 const next=rememberChat(chats,activeChatId,messages,category);
 if(JSON.stringify(next)!==JSON.stringify(chats)&&save('om-chat-sessions',next))chats=next;
}
function chatHistoryHTML(){
 if(chatHistoryFolder!=='all'&&chatHistoryFolder!=='folder:'&&chatHistoryFolder!=='saved'&&!chatFolders(chats).includes(chatHistoryFolder.slice(7)))chatHistoryFolder='all';
 // 내 폴더 > 저장한 답변(기본 폴더): '답변 저장하기'를 누른 답변을 모아 보여 준다(질문 기록 om-question-history의 saved). 누르면 그 답변을 연다
 const savedFolder=chatHistoryFolder==='saved';
 let group='';const today=localDate(),yesterday=addDays(today,-1),filtered=chatHistoryCategory!=='all';
 const scoped=chats.filter(thread=>chatHistoryFolder==='all'||thread.folder===chatHistoryFolder.slice(7));
 const rows=savedFolder?history.filter(x=>x.saved&&(!filtered||x.result.category===chatHistoryCategory)).map(x=>({saved:true,id:x.id,title:x.q,at:x.at,category:x.result.category})):filtered?questionsByCategory(scoped,chatHistoryCategory).map(row=>{const thread=scoped.find(t=>t.id===row.threadId);return {...row,question:row.title,title:thread.customTitle||row.title,folder:thread.folder};}):scoped.map(thread=>({threadId:thread.id,title:thread.title,folder:thread.folder,at:thread.updatedAt,category:thread.category,count:thread.messages.length/2}));
 const list=rows.map(row=>{
  const date=localDate(new Date(row.at));
  const label=date===today?'오늘':date===yesterday?'어제':new Date(row.at).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  const heading=label!==group?`<h3>${esc(label)}</h3>`:'';group=label;
  if(row.saved){const selected=messages.some(m=>m.result?.messageId===row.id);return `${heading}<div class="chat-history-row"><button class="chat-history-item ${selected?'selected':''}" data-history-open="${esc(row.id)}" aria-current="${selected?'true':'false'}" title="${esc(row.title)}"><span>${esc(row.title)}</span><small>저장한 답변 · ${esc(categories.find(c=>c.id===row.category)?.label||'업무 질문')}</small></button></div>`;}
  const selected=row.threadId===activeChatId&&(!filtered||row.messageId===historyMessageId);
  return `${heading}<div class="chat-history-row"><button class="chat-history-item ${selected?'selected':''}" data-chat-open="${esc(row.threadId)}" ${filtered?`data-chat-message="${esc(row.messageId)}"`:''} aria-current="${selected?'true':'false'}" title="${esc(row.title)}"><span>${esc(row.title)}</span>${filtered&&row.question!==row.title?`<small class="chat-question-preview">${esc(row.question)}</small>`:''}<small>${row.folder?esc(row.folder)+' · ':''}${filtered?'질문 다시 보기':row.count+'개 질문'} · ${esc(categories.find(c=>c.id===row.category)?.label||'업무 질문')}</small></button><button class="chat-history-settings icon-button" data-chat-settings="${esc(row.threadId)}" aria-label="${esc(row.title)} 대화 설정" title="제목 · 폴더 설정">${icon('settings')}</button><button class="chat-history-delete icon-button" data-chat-delete="${esc(row.threadId)}" aria-label="${esc(row.title)} 대화 삭제" title="대화 전체 삭제">${icon('trash')}</button></div>`;
 }).join('');
 const empty=savedFolder?'<p>아직 저장한 답변이 없어요.</p><span>답변 아래 \'답변 저장하기\'를 누르면<br>여기에 모여요.</span>':chatHistoryFolder!=='all'?'<p>이 조건에 맞는 대화가 없어요.</p><span>다른 폴더나 분야를 선택해 보세요.</span>':filtered?'<p>이 분야의 질문이 아직 없어요.</p><span>다른 분야나 전체 대화를 선택해 보세요.</span>':'<p>아직 대화가 없어요.</p><span>냥대리에게 질문하면<br>여기에 차곡차곡 모여요.</span>';
 return `<aside class="chat-history ${chatHistoryCollapsed?'is-collapsed':''}" aria-label="대화 기록"><div class="chat-history-heading"><h2>대화 기록</h2><button class="icon-button" data-action="toggle-chat-history" aria-label="${chatHistoryCollapsed?'대화 기록 펼치기':'대화 기록 접기'}" aria-expanded="${!chatHistoryCollapsed}" aria-controls="chat-history-list">${icon(chatHistoryCollapsed?'chevron':'back')}</button></div><div class="chat-history-filter"><label for="chat-history-folder">내 폴더</label><select id="chat-history-folder"><option value="all" ${chatHistoryFolder==='all'?'selected':''}>모든 폴더</option><option value="saved" ${savedFolder?'selected':''}>저장한 답변</option><option value="folder:" ${chatHistoryFolder==='folder:'?'selected':''}>폴더 없음</option>${chatFolders(chats).map(name=>`<option value="folder:${esc(name)}" ${chatHistoryFolder==='folder:'+name?'selected':''}>${esc(name)}</option>`).join('')}</select>${chatHistoryFolder.startsWith('folder:')&&chatHistoryFolder.slice(7)?'<button class="folder-rename text-button" data-action="rename-chat-folder">폴더 이름 변경</button>':''}<label class="chat-category-label" for="chat-history-category">분야별로 찾기</label><select id="chat-history-category"><option value="all" ${!filtered?'selected':''}>전체 대화</option>${categories.map(c=>`<option value="${c.id}" ${chatHistoryCategory===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select><p role="status">${savedFolder?'저장한 답변':filtered?'질문':'대화'} ${rows.length}개</p></div><div id="chat-history-list" class="chat-history-list" ${chatHistoryCollapsed?'hidden':''}>${list||`<div class="chat-history-empty">${empty}</div>`}</div><p class="chat-history-note">최근 100개 대화<br>이 브라우저에 계정별로 저장돼요.</p></aside>`;
}
// 내 일정에서 직접 일정 추가: 제목·날짜·시간(선택)을 넣으면 대화를 거치지 않고 바로 내 일정에 넣는다
function showAddTask(){
 const today=localDate(),date=view==='calendar'?calendarDay:filter==='day'?selectedDay:filter==='tomorrow'?addDays(today,1):today;
 openModal(`<h2 id="modal-title">일정 추가</h2><p class="modal-sub">제목과 날짜를 넣으면 내 일정에 바로 추가돼요.</p><form id="task-add-form" class="chat-settings-form"><label for="task-add-title">제목</label><input id="task-add-title" name="title" maxlength="40" required placeholder="예: 팀 회의, 보고서 제출" autocomplete="off"><label for="task-add-date">날짜</label><input id="task-add-date" type="date" name="date" required value="${esc(date)}"><label for="task-add-time">시간 <small>(선택)</small></label><input id="task-add-time" type="time" name="time"><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">취소</button><button class="primary-button" type="submit">추가</button></div></form>`);
 $('#task-add-title')?.focus();
}
// 대화에서 만든 일정을 대화 안에서 바로 확인: 내 일정에 저장된 지금 내용(날짜·시간·분류·메모·마감·완료)을 창으로 보여 준다
function chatScheduleTasks(r){
 if(r.kind==='event'){const ev=r.event||{},t=tasks.find(x=>x.id===r.taskId)||tasks.find(x=>x.planType==='event'&&x.title===ev.title&&x.date===ev.date);return t?[t]:[];}
 const prefix=`${r.scheduleType}:${r.start}:${r.end}:`;return tasks.filter(t=>String(t.key||'').startsWith(prefix)).sort((a,b)=>a.date.localeCompare(b.date));
}
function showScheduleDetail(messageId){
 const r=messages.find(m=>m.result?.messageId===messageId)?.result;if(!r)return;
 const list=chatScheduleTasks(r),today=localDate(),name=r.kind==='event'?(r.event?.title||'일정'):(r.title||scheduleTypes[r.scheduleType]?.title||'일정');
 const rows=list.map(t=>`<article class="agenda-item ${t.done?'done':''}"><label><input type="checkbox" data-complete="${esc(t.id)}" aria-label="${esc(t.title)} 완료" ${t.done?'checked':''}><strong>${esc(t.title)}</strong></label><small>${esc(displayDate(t.date))}${t.time?' · '+esc(timeLabel(t.time)):''} · ${t.planType==='event'?esc(t.planLabel||'내 일정'):`${esc(t.planLabel||'')} · ${esc(t.type)}`}</small>${t.note?`<p>${esc(t.note)}</p>`:''}${t.deadline?`<p class="agenda-deadline ${!t.done&&t.deadline<today?'overdue':''}">규정 마감 ${displayDate(t.deadline)}</p>`:''}</article>`).join('');
 openModal(`<h2 id="modal-title">일정 상세</h2><p class="modal-sub">${esc(name)} · 내 일정에 저장된 내용이에요. 완료 표시는 내 일정에도 바로 반영돼요.</p><div class="schedule-detail-list">${rows||'<p class="modal-sub">내 일정에서 지웠거나 찾을 수 없는 일정이에요.</p>'}</div><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">닫기</button>${list.length?`<button type="button" class="primary-button" data-open-plan="${esc(list[0].date)}">내 일정에서 보기</button>`:''}</div>`,true);
}
function showChatSettings(id){
 if(!communityState().member)return;
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 openModal(`<h2 id="modal-title">대화 설정</h2><p class="modal-sub">기억하기 쉬운 제목과 나만의 폴더로 정리하세요.</p><form id="chat-settings-form" class="chat-settings-form" data-thread-id="${esc(id)}"><label for="chat-custom-title">대화 제목</label><input id="chat-custom-title" name="customTitle" maxlength="80" value="${esc(thread.customTitle)}" placeholder="${esc(thread.messages[0]?.text||'대화 제목')}"><small>비워두면 첫 질문을 제목으로 사용해요.</small><div class="chat-folder-label"><label for="chat-custom-folder">폴더 이름</label><button type="button" class="chat-folder-toggle" data-action="toggle-chat-folders" aria-expanded="false" aria-controls="chat-existing-folders">기존 폴더 <span aria-hidden="true">⌄</span></button></div><div id="chat-existing-folders" class="chat-folder-picker" role="group" aria-label="기존 폴더 선택" hidden>${chatFolders(chats).length?chatFolders(chats).map(name=>`<button type="button" data-chat-folder-choice="${esc(name)}">${esc(name)}</button>`).join(''):'<p>아직 만든 폴더가 없어요.<br>아래에 새 폴더 이름을 입력해 주세요.</p>'}</div><input id="chat-custom-folder" name="folder" maxlength="40" value="${esc(thread.folder)}" placeholder="예: 휴가 준비, 자주 찾는 규정" autocomplete="off"><small>기존 폴더명을 선택하거나 새로 입력하세요. 비워두면 폴더에서 꺼내요.</small><p class="modal-sub">제목과 폴더는 계정에 저장돼 다른 PC에서도 보여요.</p><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">취소</button><button class="primary-button" type="submit">저장</button></div></form>`);
 $('#chat-custom-title')?.focus();
}
function showRenameFolder(){
 const name=chatHistoryFolder.startsWith('folder:')?chatHistoryFolder.slice(7):'';
 if(!name||!chatFolders(chats).includes(name))return;
 openModal(`<h2 id="modal-title">폴더 이름 변경</h2><form id="chat-folder-form" class="chat-settings-form" data-folder="${esc(name)}"><label for="chat-folder-name">폴더 이름</label><input id="chat-folder-name" name="folder" value="${esc(name)}" maxlength="40" required><small>이 폴더의 모든 대화에 적용돼요. 기존 폴더와 같은 이름이면 함께 모아져요.</small><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">취소</button><button class="primary-button" type="submit">저장</button></div></form>`);
 $('#chat-folder-name')?.focus();
}
function showDeleteChat(id){
 if(!communityState().member)return;
 if(pendingReply){toast('답변을 마친 뒤 대화를 삭제해 주세요.');return;}
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 openModal(`<h2 id="modal-title">이 대화를 삭제할까요?</h2><p class="chat-delete-title">${esc(thread.title)}</p><p class="modal-sub">대화에 포함된 모든 질문과 답변, 질문 기록과 저장한 답변이 삭제돼요(다른 PC에서도 지워져요). 삭제한 대화는 복구할 수 없어요.</p><p class="modal-sub">게시판에 올린 질문과 등록한 일정, 포인트는 유지돼요.</p><div class="chat-delete-actions"><button class="secondary-button" data-action="close-modal">취소</button><button class="chat-delete-confirm" data-chat-delete-confirm="${esc(id)}">대화 삭제</button></div>`);
 $('.chat-delete-actions [data-action="close-modal"]')?.focus();
}
function deleteChat(id){
 if(!communityState().member||!chats.some(x=>x.id===id))return;
 if(pendingReply){toast('답변을 마친 뒤 대화를 삭제해 주세요.');return;}
 const next=removeChat(chats,history,id);
 if(!save('om-question-history',next.history))return;
 if(!save('om-chat-sessions',next.chats)){save('om-question-history',history);return;}
 chats=next.chats;history=next.history;
 if(activeChatId===id){
  activeChatId=null;save('om-chat-active',null);historyMessageId=null;
  messages=[];chatDraft='';plan=null;heroTransition=null;category=null;petInteraction.reset();
 }
 closeModal();render();$('#chat-history-category')?.focus({preventScroll:true});toast('대화를 삭제했어요.');
}
function openChat(id,messageId=null){
 if(!communityState().member)return;
 if(pendingReply){toast('답변을 마친 뒤 이전 대화를 열어 주세요.');return;}
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 if(thread.messages.some(m=>m.result?.kind==='answer'&&!answers[m.result.id]||m.result?.kind==='scope'&&!categories.some(c=>c.id===m.result.target))){toast('이전 답변을 읽을 수 없어요. 다시 질문해 주세요.');return;}
 petInteraction.reset();activeChatId=id;historyMessageId=messageId;save('om-chat-active',id);
 messages=structuredClone(thread.messages);category=messages.find(m=>m.result?.messageId===messageId)?.result.category||thread.category;chatDraft='';heroTransition=null;view='chat';render();
 if(messageId){requestAnimationFrame(()=>{const pane=$('.chat-transcript'),reply=[...document.querySelectorAll('[data-reply]')].find(el=>el.dataset.reply===messageId);if(pane&&reply){const question=reply.previousElementSibling;pane.scrollTop+=(question||reply).getBoundingClientRect().top-pane.getBoundingClientRect().top-24;}});}else scrollConversation();
 $('#question-form textarea')?.focus({preventScroll:true});
}
function renderCat(){
 saveCurrentChat();
 const previousPet=$('.resident-portrait'),home=!messages.length&&!pendingReply;
 const focusInput=document.activeElement?.matches('#question-form textarea');
 const selection=focusInput?[$('#question-form textarea').selectionStart,$('#question-form textarea').selectionEnd]:null;
 const oldScroll=$('.chat-transcript')?.scrollTop;
 document.body.classList.toggle('motion-paused',!read('om-cat-motion',true));
 let content;
 if(home){
  content=`<section class="cat-room home-scene chat-home"><div class="cat-resident-stage"><div class="scene-window" aria-hidden="true"></div><div class="active-cat-slot"></div><div class="home-cat-aside"></div>${pawMenuHTML()}<div class="resident-speech"><h1>${voice().greeting}</h1><p>${voice().intro}</p></div></div><div class="cat-below chat-home-below">${composer(true)}${starterQuestions()}${staffSettingsHTML()}</div></section>`;
 }else{
  content=`<section class="chat-room" aria-label="냥대리 채팅방"><div class="chat-transcript" tabindex="0" aria-label="대화 내역"><div class="chat-transcript-inner">${conversation()}</div></div><div class="chat-compose-dock">${composer()}${staffSettingsHTML()}<p class="chat-dock-note">중요한 내용은 답변의 출처에서 확인하세요.</p></div></section>`;
 }
 // 대화 기록은 왼쪽 사이드바(#sidebar-history) 안, 메뉴 바로 아래에 그린다
 $('#main').innerHTML=`<div class="chat-layout"><div class="chat-workspace">${content}</div></div>`;
 $('#sidebar-history').innerHTML=chatHistoryHTML();
 const pet=previousPet||document.createElement('div');pet.className='resident-portrait';
 if(!previousPet)pet.innerHTML=petHTML();
 $('.active-cat-slot').replaceWith(pet);
 // Keep text outside the animated portrait; the side column reserves its full height.
 const feedback=pet.querySelector('.pet-feedback');
 if(home&&feedback)$('.home-cat-aside').prepend(feedback);
 // 이어 쓰는 고양이는 지금 상태(찾는 중 ↔ 평소)에 맞게 다시 맞춘다. 바뀐 부분만 갈아 끼워 움직임이 끊기지 않는다.
 if(previousPet)refreshPet();
 if(!home&&oldScroll!==undefined)$('.chat-transcript').scrollTop=oldScroll;
 resizeComposer();
 if(focusInput){const field=$('#question-form textarea');field.focus({preventScroll:true});field.setSelectionRange(...selection);}
 if(heroTransition&&!home){
  const from=heroTransition;heroTransition=null;
  scrollConversation();
  requestAnimationFrame(()=>{
   if(!pet.isConnected||read('om-cat-motion',true)===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const to=pet.getBoundingClientRect();
   const animation=pet.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width})`},{transform:'translate(0,0) scale(1)'}],{duration:820,easing:'cubic-bezier(.22,.8,.25,1)',fill:'both'});
   pet.classList.add('cat-arriving');animation.finished.catch(()=>{}).finally(()=>{animation.cancel();pet.classList.remove('cat-arriving');});
  });
 }
}
function composer(home=false){const current=categoryOf(category);return `<form class="composer chat-composer" id="question-form">${attachmentChips()}<div class="input-row"><button type="button" class="attach-button" data-action="attach" aria-label="${attachBusy?'첨부 파일을 읽는 중':'사진·파일 첨부'}" title="${attachBusy?'읽는 중…':'사진·파일 첨부'}" ${attachBusy?'disabled':''}>${icon('plus')}</button><input type="file" id="knowly-attach" hidden multiple accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.xlsx,.xls,.csv,.txt,.md"><button type="button" class="scope-pill" data-action="choose-category" aria-label="분야 변경 (지금 ${esc(current.label)}에 질문 중)"><strong id="scope-name">${esc(current.label)}</strong>${icon('down')}</button><button type="button" class="examples-button" data-action="chat-examples" aria-label="질문 예시" data-glass-tip="질문 예시">${icon('bulb')}</button><textarea name="question" rows="1" maxlength="1000" aria-label="질문 입력" placeholder="${home?'회사 생활에서 궁금한 점을 물어보세요.':'이어서 질문해 보세요…'}" required>${esc(chatDraft)}</textarea><button class="send-button" aria-label="질문 보내기" title="질문 보내기" type="submit" ${pendingReply?'disabled':''}>${icon('send')}</button></div></form>`;}
// 분야 변경: 지금 목록으로 바로 열고, 분야 관리에서 바뀐 목록을 받아 오면 다시 그린다.
function showCategories(refresh=true){openModal(`<h2 id="modal-title">어떤 분야가 궁금하세요?</h2><p class="modal-sub">고른 분야의 문서에서 먼저 찾고, 없으면 전체 자료에서 찾아요.${categories.some(c=>c.searchAll)?' 어느 분야인지 모르면 기타를 고르세요.':''} 작성 중인 질문은 유지됩니다.</p><div class="category-options">${categories.map(c=>`<button data-select-category="${esc(c.id)}" aria-pressed="${c.id===categoryOf(category).id}">${icon(c.icon)}<span><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small></span>${icon(c.id===categoryOf(category).id?'check':'chevron')}</button>`).join('')}</div>`);if(refresh)refreshCategories().then(changed=>{if(changed&&$('#modal').open&&$('#modal .category-options'))showCategories(false);});}
// 분야 관리에서 정한 분야 목록을 받아 채팅 분야에 반영한다. 못 받으면 지금 목록을 그대로 쓴다.
async function refreshCategories(){try{const res=await fetch('/api/knowly-categories',{method:'POST',body:'{}'});const data=await res.json();return res.ok&&applyManagedCategories(data.categories,data.examples,data.details);}catch{return false;}}
function resizeComposer(){const field=$('#question-form textarea');if(!field)return;field.style.height='auto';field.style.height=Math.min(140,Math.max(30,field.scrollHeight))+'px';}
function scrollConversation(){const pane=$('.chat-transcript'),last=pane?.querySelector('.assistant-message:last-child');if(!pane)return;requestAnimationFrame(()=>{if(!pane.isConnected)return;if(last)pane.scrollTop+=last.getBoundingClientRect().top-pane.getBoundingClientRect().top-24;else pane.scrollTop=pane.scrollHeight;});}
// 질문 예시: 지금 목록으로 바로 열고, 분야 관리에서 바뀐 예시를 받아 오면 다시 그린다.
function showChatExamples(refresh=true){const c=categoryOf(category);openModal(`<h2 id="modal-title">질문 예시</h2><p class="modal-sub">${esc(c.label)} 분야에서 물어볼 수 있는 질문이에요.</p><div class="chat-example-list">${(c.examples||faq[c.id]||[]).map(q=>`<button class="secondary-button" data-question="${esc(q)}" data-cat="${esc(c.id)}">${esc(q)} ${icon('arrow')}</button>`).join('')||'<p class="caption">이 분야는 아직 질문 예시가 없어요. 궁금한 점을 바로 물어보세요.</p>'}</div>`);if(refresh)refreshCategories().then(changed=>{if(changed&&$('#modal').open&&$('#modal .chat-example-list'))showChatExamples(false);});}
function resetChat(){saveCurrentChat();activeChatId=null;if(activeAccount)save('om-chat-active',null);clearTimeout(replyTimer);replyTimer=null;pendingReply=null;heroTransition=null;messages=[];chatDraft='';plan=null;view='chat';mood='';category=null;petInteraction.reset();render();}
function ask(q,id,reward=true){
 if(!communityState().member){render();return;}
 q=String(q).trim();if(!q)return;
 if(pendingReply){toast('답변을 마치면 이어서 물어봐 줘.');return;}
 if(q.length>1000){toast('질문은 1,000자 이내로 적어 주세요.');return;}
 if(!activeChatId){activeChatId=crypto.randomUUID();save('om-chat-active',activeChatId);}
 const first=!messages.length,portrait=$('.chat-home .resident-portrait');
 if(first&&portrait)heroTransition=portrait.getBoundingClientRect();
 category=categoryOf(category).id;mood='';petInteraction.reset();
 let r=id?{kind:id==='plan'?'plan':'answer',id}:resolveQuestion(q,category,uploads);
 if(r.kind==='unknown'&&!r.personal&&/연차|휴가/.test(q)&&/일정|계획/.test(q)&&!/취소|육아|출산/.test(q))r=resolveQuestion('연차 신청 '+q,category,uploads);
 // 질문 분야(서버·클라이언트·장애·기타)와 일정 규정 분야(휴가·출장 등)가 달라도 '일정 잡기'는 질문 내용으로 판단한다
 r.q=q;r.category=category;r.messageId=crypto.randomUUID();r.scheduleType=communityState().me?.role==='staff'?null:scheduleTypeFor(r.kind==='scope'?resolveQuestion(q,r.target,uploads):r);r.start=addDays(localDate(),14);r.end=r.start;
 const files=attachments;attachments=[];
 messages.push({role:'user',text:q,at:Date.now(),...(files.length?{files:files.map(a=>a.name)}:{})});pendingReply=r;chatDraft='';view='chat';
 render();refreshPet();scrollConversation();$('#question-form textarea')?.focus({preventScroll:true});
 if(reward&&communityState().me?.role!=='staff')communityAction('question',{question:q});
 // 개인 일정 추가 요청("내일 오후 3시에 미팅 추가해줘")은 사내 문서를 찾지 않고 '내 일정에 추가' 카드로 답한다.
 // 규정 일정(연차·출장 등 일정 잡기)이 있는 질문과 담당자 화면, 첨부가 있는 질문은 그대로 문서 검색으로 보낸다.
 const event=!r.scheduleType&&!files.length&&communityState().me?.role!=='staff'?parseEventRequest(q,localDate()):null;
 const remote=event?null:askKnowly(q,files);
 replyTimer=setTimeout(async()=>{
  if(pendingReply!==r)return;
  if(event){r.kind='event';r.event=event;r.scheduleType=null;}
  else{const k=remote&&await remote;if(pendingReply!==r)return;
  r.kind='knowly';r.knowly=k;if(!k?.answered)r.scheduleType=null;}
  pendingReply=null;replyTimer=null;messages.push({role:'assistant',result:r,at:Date.now()});saveCurrentChat();
  const next=recordAnswer(history,r);if(save('om-question-history',next))history=next;
  if(view==='activity')render();
  if(view==='chat'){render();scrollConversation();}
 },first?950:480);
}
// ── 내 일정 화면 (schedule.js) ─────────────────────────────────────
initSchedule({icon,badge});
const scheduleState=()=>({view,tasks,calendarMonth,calendarDay,filter,selectedDay});
function customizeTabs(active){return `<div class="customize-tabs segmented" role="group" aria-label="꾸미기 설정">${[['outfit','고양이'],['background','배경'],['motion','움직임']].map(([id,label])=>`<button data-customize="${id}" class="${active===id?'selected':''}" aria-pressed="${active===id}">${label}</button>`).join('')}</div>`;}
function showMotion(){openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('motion')}<section class="motion-settings"><div><h3>냥대리 움직임</h3><p>눈 깜빡임과 가벼운 움직임을 켜거나 끌 수 있어요.</p></div>${motionButton()}</section><p class="caption">기기에서 동작 줄이기를 설정했다면 해당 설정이 우선 적용돼요.</p>`,true);}
// 내 레벨(레벨 버튼으로 연다): 현재 레벨과 진행률, 전체 레벨 단계(달성·현재·남은 질문 수)를 보여준다. 값은 서버가 준 레벨·지갑 정보를 그대로 쓴다.
function myLevelHTML(){
 const {member,wallet:w,level:l}=communityState();
 if(!member||!w||!l)return '<div class="activity-record-empty"><h2>로그인하면 내 레벨을 볼 수 있어요.</h2><p>새 질문을 할수록 레벨이 올라가요.</p></div>';
 const mark=x=>x.state==='done'?'달성':x.state==='current'?'현재 레벨':`${x.left}개 남음`;
 return `<section class="activity-level my-level" aria-labelledby="my-level-title"><h2 id="my-level-title">현재 레벨</h2><div class="activity-level-value"><strong>Lv. ${l.level}</strong><span>${esc(l.name)}</span></div><div class="activity-progress" role="progressbar" aria-label="다음 레벨까지 진행률" aria-valuenow="${l.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${l.progress}%"></i></div><div class="activity-level-meta"><span>새 질문 ${w.questions}개</span><span>${l.next?`다음 레벨까지 ${l.next-w.questions}개`:'최고 레벨 달성'}</span></div></section>`
  +`<ol class="level-ladder" aria-label="전체 레벨">${levelLadder(w.questions).map(x=>`<li class="${x.state}"${x.state==='current'?' aria-current="step"':''}><b>Lv. ${x.level}</b><strong>${esc(x.name)}</strong><small>새 질문 ${x.at}개부터</small><em>${mark(x)}</em></li>`).join('')}</ol>`
  +'<p class="activity-storage-note">새 질문을 할 때마다 1개씩 쌓여요. 같은 질문은 한 번만, 하루 최대 20개까지 세요. 레벨은 질문 활동을 나타내며 업무 능력 평가에는 쓰이지 않아요.</p>';
}
function openHistory(id){
 const existing=chats.find(x=>x.messages.some(m=>m.result?.messageId===id));if(existing){openChat(existing.id);return;}
 const entry=history.find(x=>x.id===id);if(!entry)return;
 if(pendingReply){toast('지금 답변을 마친 뒤 이전 질문을 열어 주세요.');return;}
 const r={...entry.result,messageId:entry.id};
 if(r.kind==='answer'&&!answers[r.id]||r.kind==='scope'&&!categories.some(c=>c.id===r.target)){toast('이전 답변을 읽을 수 없어요. 다시 질문해 주세요.');return;}
 if(r.kind==='excerpt'&&!reference(r.ref,allDocs())){toast('이 답변의 원문 자료가 삭제되어 출처를 열 수 없어요.');}
 saveCurrentChat();activeChatId='legacy-'+id;save('om-chat-active',activeChatId);
 petInteraction.reset();category=r.category;chatDraft='';heroTransition=null;
 messages=[{role:'user',text:entry.q,at:entry.at},{role:'assistant',result:r,at:entry.at}];view='chat';render();scrollConversation();
}

function showPersonality(){
 if(!communityState().member||communityState().me?.role==='staff')return;
 openModal(`<h2 id="modal-title">어떤 냥대리가 좋아요?</h2><p class="modal-sub">움직임을 미리 보고, 마음에 드는 냥대리를 골라 주세요.</p><div class="personality-options" role="group" aria-label="냥대리 성격">${['cold','warm'].map(mode=>`<button class="personality-option ${personality===mode?'selected':''}" data-personality="${mode}" aria-pressed="${personality===mode}"><span class="personality-preview" aria-hidden="true">${previewCat(mode)}</span><strong>${personalities[mode].label}</strong><span>${mode==='warm'?'먼저 인사하고, 손길에는 골골. 츄르는 바로 냠냠!':'무심하게 힐끗. 가끔 손길에 마음을 열어요.'}</span><q>${mode==='warm'?'쓰다듬어주면 행복하다냥!':'츄르? …잠깐, 나 주고 가라냥.'}</q><small>${personality===mode?'사용 중':'이 모드로 선택'}</small></button>`).join('')}</div><p class="personality-note">답변의 정보와 출처, 포인트 보상은 같아요.<br>선택은 이 브라우저에 계정별로 저장됩니다.</p>`);
}
function showWardrobe(){
 openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('outfit')}<p class="modal-sub">모은 하트로 아이템을 선택하세요.</p><div class="wardrobe-preview">${cat('','closet-cat','',customOutfitHTML())}${outfitHTML()}<span class="heart-balance">♥ <strong>${rewards.hearts}</strong> 보유</span></div><div class="wardrobe-items">${shopItems(nyangCatalog,{all:true}).filter(item=>item.builtin||(item.enabled!==false||rewards.owned.includes(item.id))&&catalogImages.has(item.image)).map(item=>{const owned=rewards.owned.includes(item.id),equipped=rewards.equipped===item.id;return `<article class="wardrobe-item ${equipped?'equipped':''}">${item.builtin?`<div class="item-symbol item-${item.id}">${item.symbol}</div>`:`<div class="item-symbol item-custom" style="--outfit:url('${catalogImages.get(item.image)}')" aria-hidden="true"></div>`}<h3>${esc(item.name)}</h3><p>${esc(item.description||'')}</p><button class="${owned?'secondary':'primary'}-button" ${equipped||!owned&&rewards.hearts<item.cost?'disabled':''} data-item="${item.id}" data-owned="${owned}">${equipped?'착용 중':owned?'착용하기':`♥ ${item.cost} · 열고 착용`}</button>${!owned&&rewards.hearts<item.cost?`<small>하트 ${item.cost-rewards.hearts}개 더 모으면 돼</small>`:''}</article>`;}).join('')}</div><div class="wardrobe-footer"><button class="text-button" data-action="unequip" ${!rewards.equipped?'disabled':''}>기본 모습으로</button><span>한 번 연 아이템은 다시 하트를 쓰지 않아요.</span></div><p class="caption">질문 +10 P → 츄르 10 P → 하트 3개 → 눌러 모으고 꾸미기</p>`,true);
}
function showAttachPreview(id){const a=attachments.find(x=>x.id===id);if(!a?.dataUrl)return;openModal(`<h2 id="modal-title">첨부한 사진</h2><p class="modal-sub">${esc(a.name)}</p><img class="attach-preview-large" src="${esc(a.dataUrl)}" alt="${esc(a.name)} 미리보기">`,true);}
function openModal(content,wide=false){const m=$('#modal');if(!m.open)dialogOpener=document.activeElement;m.className=wide?'wide':'';m.innerHTML=`<button class="icon-button modal-close" data-action="close-modal" aria-label="닫기">${icon('close')}</button>${content}`;if(!m.open)m.showModal();}
// 츄르 확인 창을 화면 가운데가 아니라 냥대리 캐릭터 가운데에 맞춘다. 화면 밖으로 나가지 않게 가장자리 12px 안쪽으로 제한한다.
function placeTreatConfirm(){const m=$('#modal'),cat=[...document.querySelectorAll('.resident-portrait')].map(e=>e.getBoundingClientRect()).find(r=>r.width&&r.height);m.style.removeProperty('--treat-x');m.style.removeProperty('--treat-y');if(!cat)return;const w=m.offsetWidth,h=m.offsetHeight,x=Math.min(Math.max(cat.left+cat.width/2,w/2+12),innerWidth-w/2-12),y=Math.min(Math.max(cat.top+cat.height/2,h/2+12),innerHeight-h/2-12);m.style.setProperty('--treat-x',`${Math.round(x)}px`);m.style.setProperty('--treat-y',`${Math.round(y)}px`);}
function closeModal(){ $('#modal').close();dialogOpener?.focus(); }
function openSource(id){const r=reference(id,allDocs());if(!r)return;openModal(`<div class="modal-eyebrow">${icon('book')} 근거 원문</div><h2 id="modal-title">${esc(r.doc.title)}</h2><p class="modal-sub">${esc(r.doc.version)} · ${categories.find(c=>c.id===r.doc.category)?.label}</p><div class="source-document">${r.doc.sections.map(s=>`<section class="${s.id===id?'highlight':''}"><h3>${esc(s.label)}</h3><p>${esc(s.text)}</p>${s.id===id?'<span class="source-marker">이 답변의 근거</span>':''}</section>`).join('')}</div>`);requestAnimationFrame(()=>$('.source-document .highlight')?.scrollIntoView({block:'nearest'}));}
function showDocs(){openModal(`<h2 id="modal-title">참고 자료</h2><p class="modal-sub">답변과 일정의 근거가 되는 샘플 문서입니다.</p><div class="docs-list">${allDocs().map(d=>`<button data-source="${d.sections[0].id}"><span class="doc-icon">${icon('book')}</span><span><strong>${esc(d.title)}</strong><small>${esc(d.version)} · ${d.sections.length}개 항목</small></span>${icon('chevron')}</button>`).join('')}</div><div class="upload-doc"><h3>내 샘플 자료로 검색해 보기</h3><p>TXT·Markdown 파일을 올리면 선택한 분야 안에서 관련 문단을 찾아줘요. 추가 자료는 이 브라우저에만 저장됩니다.</p><label>자료 분야<select id="upload-category">${categories.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label><label class="secondary-button file-button">${icon('plus')} 샘플 문서 올리기<input type="file" id="doc-upload" accept=".txt,.md,text/plain,text/markdown"></label><small>UTF-8 텍스트 · 파일당 최대 2MB · PDF와 AI 문서 분석은 이 체험에 포함되지 않아요.</small>${uploads.length?'<button class="text-button" data-action="clear-uploads">내가 올린 자료 지우기</button>':''}</div>`,true);}
// ── 꾸미기 > 배경 (background.js) ──────────────────────────────────
initBackground({read,save,toast,openModal,closeModal,customizeTabs,icon,mode,isCat,root});


// Start on press, not release. A drag and its trailing click are one stroke.
document.addEventListener('pointerdown',e=>{
 const button=e.target.closest('.pet-touch');
 if(!button||!e.isPrimary||e.button!==0)return;
 petGesture={id:e.pointerId,button};
 button.setPointerCapture(e.pointerId);
 ignorePetClickUntil=Infinity;
 petCat();
});
function endPetGesture(e,cancelled=false){
 if(!petGesture||e.pointerId!==petGesture.id)return;
 const {button}=petGesture;petGesture=null;
 if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
 ignorePetClickUntil=performance.now()+500;
}
document.addEventListener('pointerup',e=>endPetGesture(e));
document.addEventListener('pointercancel',e=>endPetGesture(e,true));
document.addEventListener('lostpointercapture',e=>endPetGesture(e,true));
// ── 화면 클릭 처리 표 ─────────────────────────────────────────
// 버튼을 누르면 clickByData를 위에서부터 보고 처음 맞는 하나만 처리한 뒤 끝낸다.
// 맞는 것이 없으면 data-action 이름으로 clickByAction을 위에서부터 보고, 맞는 처리를 모두 차례로 한다.
// 이때 stop이 true인 처리를 하면 거기서 끝낸다(예전 코드의 'return'). 순서가 동작에 영향을 주므로 함부로 바꾸지 않는다.
const is=(...names)=>a=>names.includes(a);
// ① data-* 속성으로 구분하는 버튼 [맞는지, 처리]
const clickByData=[
 [b=>b.dataset.copyAnswer,async (b,e)=>{const r=messages.find(m=>m.result?.messageId===b.dataset.copyAnswer)?.result,text=answerText(r);if(!text){toast('복사할 답변을 찾지 못했어요.');return;}toast(await copyText(text)?'답변을 복사했어요.':'복사하지 못했어요. 답변을 직접 선택해 복사해 주세요.');}],
 [b=>b.dataset.knowlyDoc,(b,e)=>{openLibrary(`/docs/${encodeURIComponent(b.dataset.knowlyDoc)}${b.dataset.chunk?`?chunk=${encodeURIComponent(b.dataset.chunk)}`:''}`);return;}],
 [b=>b.dataset.knowlyVote,(b,e)=>{voteKnowly(b.dataset.message,b.dataset.knowlyVote);return;}],
 [b=>b.dataset.previewAttach,(b,e)=>{showAttachPreview(b.dataset.previewAttach);return;}],
 [b=>b.dataset.removeAttach,(b,e)=>{chatDraft=$('#question-form textarea')?.value??chatDraft;attachments=attachments.filter(a=>a.id!==b.dataset.removeAttach);render();return;}],
 [b=>b.dataset.action==='attach',(b,e)=>{$('#knowly-attach')?.click();return;}],
 [b=>b.dataset.customize,(b,e)=>{({outfit:showWardrobe,background:showBackground,motion:showMotion}[b.dataset.customize])?.();return;}],
 [b=>b.dataset.selectCategory,(b,e)=>{category=b.dataset.selectCategory;closeModal();render();$('#question-form textarea')?.focus();return;}],
 [b=>b.dataset.scheduleView,(b,e)=>{view=b.dataset.scheduleView;scheduleView=view;render();return;}],
 [b=>b.dataset.historyOpen,(b,e)=>{openHistory(b.dataset.historyOpen);return;}],
 [b=>b.dataset.saveAnswer,(b,e)=>{const r=messages.find(m=>m.result?.messageId===b.dataset.saveAnswer)?.result;if(r&&!history.some(x=>x.id===r.messageId)){const next=recordAnswer(history,r);if(!save('om-question-history',next))return;history=next;}try{const next=toggleSaved(history,b.dataset.saveAnswer);if(save('om-question-history',next)){history=next;render();toast(history.find(x=>x.id===b.dataset.saveAnswer)?.saved?'답변을 저장했어요. 대화 기록 > 내 폴더 > 저장한 답변에서 다시 볼 수 있어요.':'답변 저장을 해제했어요.');}}catch(e){toast(e.message);}return;}],
 [b=>b.dataset.activityPost,(b,e)=>{const post=communityState().posts?.find(p=>p.id===b.dataset.activityPost);if(post){const next={...seenReplies,[post.id]:post.replies.length};if(save('om-seen-replies',next))seenReplies=next;showMyPost(post.id);}return;}],
 [b=>b.dataset.heart,async (b,e)=>{if(await commitReward({type:'collect',id:b.dataset.heart})){refreshPet();toast('하트 +1 ♥ · 꾸미기에 쓸 수 있다냥.');if(!rewards.pending.length){$('.resident-speech h1')?.replaceChildren(voice().heart);$('.resident-speech p')?.replaceChildren(voice().heartDetail);clearTimeout(window.happyTimer);window.happyTimer=setTimeout(()=>{happyUntil=0;refreshPet();},3500);}}return;}],
 [b=>b.dataset.item,async (b,e)=>{if(await commitReward({type:b.dataset.owned==='true'?'equip':'buy',id:b.dataset.item})){refreshPet();showWardrobe();toast('제법 잘 어울린다냥!');}return;}],
 [b=>b.dataset.answerPanel,(b,e)=>{const r=messages.find(m=>m.result?.messageId===b.dataset.message)?.result;if(r){r.expandedPanel=r.expandedPanel===b.dataset.answerPanel?null:b.dataset.answerPanel;render();$(`[data-answer-panel="${b.dataset.answerPanel}"][data-message="${r.messageId}"]`)?.focus({preventScroll:true});}return;}],
 [b=>b.dataset.consent,(b,e)=>{const r=messages.find(m=>m.result?.messageId===b.dataset.message)?.result;if(r&&r.decision!=='added'){r.decision=b.dataset.consent;render();requestAnimationFrame(()=>{const form=$(`[data-plan-form="${r.messageId}"]`);if(form){form.querySelector('input')?.focus({preventScroll:true});form.scrollIntoView({block:'nearest'});}else $(`[data-consent][data-message="${r.messageId}"]`)?.focus({preventScroll:true});});}return;}],
 [b=>b.dataset.eventCancel,(b,e)=>{const r=messages.find(m=>m.result?.messageId===b.dataset.eventCancel)?.result;if(r&&r.kind==='event'&&r.decision!=='added'){r.decision='no';saveCurrentChat();render();}return;}],
 [b=>b.dataset.scheduleDetail,(b,e)=>{showScheduleDetail(b.dataset.scheduleDetail);return;}],
 [b=>b.dataset.openPlan,(b,e)=>{if($('#modal').open)closeModal();calendarDay=b.dataset.openPlan;calendarMonth=calendarDay.slice(0,7);view='calendar';scheduleView='calendar';render();return;}],
 [b=>b.dataset.month,(b,e)=>{const [y,m]=calendarMonth.split('-').map(Number);calendarMonth=localDate(new Date(y,m-1+Number(b.dataset.month),1,12)).slice(0,7);render();return;}],
 [b=>b.dataset.calendarDay,(b,e)=>{calendarDay=b.dataset.calendarDay;render();return;}],
 [b=>b.dataset.bgDelete,(b,e)=>{const id=b.dataset.bgDelete,inUse=backgroundState().id==='upload:'+id;if(save('om-bg-uploads-'+mode,backgroundUploads().filter(x=>x.id!==id))){if(inUse)save('om-bg-theme-'+mode,'white');applyBackground();showBackground();toast(inUse?'사용 중이던 이미지를 지워 기본 배경으로 바꿨어요.':'이미지를 삭제했어요.');}return;}],
 [b=>b.dataset.background,(b,e)=>{if(save('om-bg-theme-'+mode,b.dataset.background)){applyBackground();closeModal();toast(backgroundState().label+' 배경으로 바꿨어요.');}return;}],
 [b=>b.dataset.source,(b,e)=>{openSource(b.dataset.source);return;}],
 [b=>b.dataset.question,(b,e)=>{if($('#modal').open)closeModal();category=b.dataset.cat;ask(b.dataset.question);return;}],
 [b=>b.dataset.faq,(b,e)=>{if($('#modal').open)closeModal();ask(b.dataset.q,b.dataset.faq);return;}],
 [b=>b.dataset.switchCategory,(b,e)=>{category=b.dataset.switchCategory;ask(b.dataset.retry,undefined,false);return;}],
 [b=>b.dataset.filter,(b,e)=>{filter=b.dataset.filter;render();return;}],
 [b=>b.dataset.day,(b,e)=>{selectedDay=b.dataset.day;filter='day';render();return;}],
 [b=>b.dataset.delete,(b,e)=>{const next=tasks.filter(t=>t.id!==b.dataset.delete);if(save('om-tasks',next)){tasks=next;render();toast('할 일을 삭제했어요.');}return;}],
 [b=>b.dataset.postQuestion,(b,e)=>{const r=messages.find(m=>m.result?.messageId===b.dataset.postQuestion)?.result;if(r)showPostDialog(r);return;}],
 [b=>b.dataset.chatSettings,(b,e)=>{showChatSettings(b.dataset.chatSettings);return;}],
 [b=>b.dataset.action==='rename-chat-folder',(b,e)=>{showRenameFolder();return;}],
 [b=>b.dataset.action==='toggle-chat-folders',(b,e)=>{const list=$('#chat-existing-folders');if(!list)return;
  list.hidden=!list.hidden;b.setAttribute('aria-expanded',String(!list.hidden));return;}],
 [b=>b.hasAttribute('data-chat-folder-choice'),(b,e)=>{const input=$('#chat-custom-folder'),list=$('#chat-existing-folders');if(!input||!list)return;
  input.value=b.dataset.chatFolderChoice;list.hidden=true;
  $('[data-action="toggle-chat-folders"]')?.setAttribute('aria-expanded','false');input.focus();return;}],
 [b=>b.dataset.chatDelete,(b,e)=>{showDeleteChat(b.dataset.chatDelete);return;}],
 [b=>b.dataset.chatDeleteConfirm,(b,e)=>{deleteChat(b.dataset.chatDeleteConfirm);return;}],
 [b=>b.dataset.chatOpen,(b,e)=>{openChat(b.dataset.chatOpen,b.dataset.chatMessage||null);return;}],
 [b=>b.dataset.personality,(b,e)=>{if(!communityState().member||communityState().me?.role==='staff')return;
  const next=normalizePersonality(b.dataset.personality);if(!save('om-personality',next))return;
  personality=next;petInteraction.reset();closeModal();render();companionBehavior.greet(personality);toast(voice().label+'로 바꿨어요.');return;}],
];
// ② ③ data-action 이름으로 구분하는 버튼 [맞는지(a: 동작 이름), 처리, stop]
const clickByAction=[
 [is('personality'),(a,b,e)=>{showPersonality();return;},true],
 [is('guide'),(a,b,e)=>{const me=communityState().me;if(communityState().member&&me?.role!=='staff')guide.start({id:activeAccount,role:me.role});return;},true],
 [is('toggle-chat-history'),(a,b,e)=>{chatHistoryCollapsed=!chatHistoryCollapsed;render();return;},true],
 [is('login-pet'),(a,b,e)=>{reactLoginPet();return;},true],
 [is('logout'),async (a,b,e)=>{await logoutAccount();return;},true],
 [is('account'),(a,b,e)=>{const me=communityState().me;openModal('<div class="account-menu"><h2 id="modal-title">내 계정</h2><strong>'+esc(me.username)+' · '+(me.role==='staff'?'담당자':'직원')+'</strong><p>'+ (me.role==='staff'?'질문 게시판 관리와 통계에 접근할 수 있어요.':'포인트와 보상은 같은 계정으로 로그인한<br>모든 기기에서 이어져요.') +'</p><p>Knowly 개인 계정으로 연결되어 있어요.<br>대화와 보상은 계정별로 구분됩니다.</p><div class="account-menu-actions"><button class="secondary-button" data-action="change-password">비밀번호 변경</button><button class="primary-button" data-action="logout">로그아웃</button></div></div>');return;},true],
 [is('change-password'),(a,b,e)=>{showPasswordForm();return;},true],
 [is('unanswered','library'),(a,b,e)=>{if(a==='library')openLibrary();else if(communityState().me?.role==='staff'){view=a;petInteraction.reset();render();$('#main').scrollTop=0;}return;},true],
 [(a,b)=>viewOf(a)?.open==='staff',(a,b,e)=>{if(communityState().me?.role==='staff'){view=a;petInteraction.reset();render();$('#main').scrollTop=0;}return;},true],
 // 사용자 통계(포인트 순위 등): 담당자만, 열 때마다 새로 집계한다
 [is('userstats'),(a,b,e)=>{if(communityState().me?.role==='staff'){view='userstats';petInteraction.reset();render();$('#main').scrollTop=0;loadStatistics();}return;},true],
 [is('statistics'),(a,b,e)=>{if(communityState().me?.role==='staff'){view='statistics';petInteraction.reset();render();$('#main').scrollTop=0;}return;},true],
 [is('toggle-theme'),(a,b,e)=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyColorTheme(next);save('nyang-color-theme',next);return;},true],
 [is('pet'),(a,b,e)=>{if(e.detail===0||performance.now()>=ignorePetClickUntil)petCat();return;},true],
 [is('reset'),(a,b,e)=>{resetChat();},false],
 [is('choose-category'),(a,b,e)=>{showCategories();},false],
 [is('schedule'),(a,b,e)=>{petInteraction.reset();view=scheduleView;render();$('#main').scrollTop=0;},false],
 // 상단 Lv. 버튼은 내 레벨 탭으로 바로 연다
 [is('activity'),(a,b,e)=>{refreshCommunity();},false],
 [is('board'),(a,b,e)=>{refreshCategories().then(changed=>{if(changed&&view==='board')render();});},false],
 // 분야 관리에서 바뀐 분야를 게시판에도 반영
 [(a,b)=>viewOf(a)?.open==='any',(a,b,e)=>{if(a==='chat')expandStaffSettings(); // 냥대리 테스트를 열 때마다 설정 칸은 펼친 상태로 보여 준다
 // 이미 물어보기 화면에서 지난 대화를 보고 있을 때 왼쪽 '물어보기'를 누르면 새 질문을 시작한다(로고를 누른 것과 같다).
 // 답변을 기다리는 중에는 그 답이 사라지지 않게 그대로 둔다.
 if(a==='chat'&&b.id==='nav-chat'&&view==='chat'&&messages.length&&!pendingReply){resetChat();$('#main').scrollTop=0;return;}
 if(view!==a)petInteraction.reset();view=a;render();$('#main').scrollTop=0;},false],
 [is('calendar-today'),(a,b,e)=>{calendarMonth=localDate().slice(0,7);calendarDay=localDate();render();},false],
 [is('chat-examples'),(a,b,e)=>{showChatExamples();},false],
 [is('add-task'),(a,b,e)=>{showAddTask();},false],
 [is('sample-plan'),(a,b,e)=>{view='chat';ask('출장 준비 일정을 짜주세요','plan');},false],
 [is('feed'),(a,b,e)=>{// 바로 주지 않고 먼저 확인을 받는다. 보유한 츄르가 있으면 그것을 먼저 쓴다(포인트 차감 없음).
 if(rewards.pending.length||(rewards.points<TREAT_COST&&!rewards.treatTokens))return;
 const useToken=rewards.treatTokens>0;
 openModal(`<div class="treat-confirm"><h2 id="modal-title">츄르 주기</h2><p class="modal-sub">${useToken?`보유한 츄르 1개를 사용해 츄르를 주시겠습니까?`:`${TREAT_COST}포인트를 이용해 츄르를 주시겠습니까?`}</p><div class="modal-button-row"><button type="button" class="primary-button" data-action="feed-confirm">확인</button><button type="button" class="secondary-button" data-action="close-modal">취소</button></div></div>`);
 placeTreatConfirm();$('#modal [data-action="feed-confirm"]')?.focus();
 return;},false],
 [is('feed-confirm'),async (a,b,e)=>{closeModal();if(await commitReward({type:'feed',ids:Array.from({length:3},()=>crypto.randomUUID())})){petInteraction.reset();happyUntil=Date.now()+6000;companionBehavior.feed(personality);refreshPet();$('.resident-speech h1')?.replaceChildren(voice().feed);$('.resident-speech p')?.replaceChildren(voice().feedDetail);toast('츄르 고맙다냥! 주변 하트 3개를 눌러 모아보라냥.');}},false],
 [is('wardrobe'),(a,b,e)=>{showWardrobe();},false],
 [is('unequip'),async (a,b,e)=>{if(await commitReward({type:'equip',id:null})){refreshPet();showWardrobe();}},false],
 [is('docs'),(a,b,e)=>{if(communityState().me?.role!=='staff'&&communityState().member){openLibrary();return;}showDocs();},false],
 [is('toggle-motion'),(a,b,e)=>{const moving=!read('om-cat-motion',true);if(save('om-cat-motion',moving)){document.body.classList.toggle('motion-paused',!moving);b.setAttribute('aria-pressed',String(moving));b.setAttribute('aria-label',moving?'고양이 움직임 끄기':'고양이 움직임 켜기');b.innerHTML=`<span class="motion-mark">${moving?'Ⅱ':'▷'}</span><span>${moving?'움직임 끄기':'움직임 켜기'}</span>`;}},false],
 [is('close-modal'),(a,b,e)=>{closeModal();},false],
 [is('clear-uploads'),(a,b,e)=>{if(save('om-docs',[])){uploads=[];showDocs();toast('추가한 문서를 지웠어요.');}},false],
];
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a[data-action]');if(!b||b.disabled)return;
 for(const [match,handle] of clickByData)if(match(b)){const r=handle(b,e);if(r)await r;return;}
 const a=b.dataset.action;
 for(const [match,handle,stop] of clickByAction)if(match(a,b)){const r=handle(a,b,e);if(r)await r;if(stop)return;}
});
document.addEventListener('submit',e=>{
 if(e.target.id==='question-form'){e.preventDefault();const text=new FormData(e.target).get('question');ask(text);}
 if(e.target.id==='task-add-form'){
  e.preventDefault();const fd=new FormData(e.target),title=String(fd.get('title')||'').trim().slice(0,40),date=String(fd.get('date')||''),time=String(fd.get('time')||'');
  if(!title){toast('제목을 입력해 주세요.');$('#task-add-title')?.focus();return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('날짜를 골라 주세요.');return;}
  const task={...eventTask({title,date,time:/^\d{2}:\d{2}$/.test(time)?time:''},crypto.randomUUID()),planLabel:'직접 추가한 일정'};
  if(save('om-tasks',[...tasks,task])){tasks=[...tasks,task];closeModal();if(view==='calendar'){calendarDay=date;calendarMonth=date.slice(0,7);}render();toast(`${displayDate(date)}${task.time?' '+timeLabel(task.time):''} '${title}' 일정을 추가했어요.`);}
  return;
 }
 if(e.target.dataset.eventForm){
  e.preventDefault();const r=messages.find(m=>m.result?.messageId===e.target.dataset.eventForm)?.result;
  if(!r||r.kind!=='event'||r.decision==='added')return;
  const fd=new FormData(e.target),title=String(fd.get('title')||'').trim().slice(0,40)||'새 일정',date=String(fd.get('date')||''),time=String(fd.get('time')||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('날짜를 골라 주세요.');return;}
  const taskId=crypto.randomUUID(),next=[...tasks,eventTask({title,date,time:/^\d{2}:\d{2}$/.test(time)?time:''},taskId)];
  if(save('om-tasks',next)){tasks=next;r.event={title,date,time};r.taskId=taskId;r.decision='added';saveCurrentChat();render();toast(`${displayDate(date)}${time?' '+timeLabel(time):''} '${title}' 일정을 내 일정에 넣었어요.`);}
  return;
 }
 if(e.target.dataset.planForm){
  e.preventDefault();const r=messages.find(m=>m.result?.messageId===e.target.dataset.planForm)?.result;
  if(!r||r.decision!=='yes')return;
  const fd=new FormData(e.target),start=fd.get('start'),end=fd.get('end')||start,title=String(fd.get('title')||'').trim().slice(0,40)||scheduleTypes[r.scheduleType].title;
  try{const items=makeSchedule(r.scheduleType,start,end),result=mergeSchedule(tasks,{type:r.scheduleType,start,end,items,label:title},()=>crypto.randomUUID());
   if(save('om-tasks',result.tasks)){tasks=result.tasks;r.start=start;r.end=end;r.items=items;r.title=title;r.decision='added';render();toast(result.added?`${result.added}개의 할 일을 내 일정에 넣었어.`:'이미 캘린더에 챙겨 둔 일정이야.');}
  }catch(err){toast(err.message);}
 }
});
document.addEventListener('input',e=>{if(e.target.matches('#question-form textarea')){chatDraft=e.target.value;resizeComposer();}
 // 일정 잡기 창의 제목은 입력하는 동안 기억해 둔다(화면이 다시 그려져도 남는다)
 if(e.target.matches('[data-plan-form] input[name=title]')){const r=messages.find(m=>m.result?.messageId===e.target.form.dataset.planForm)?.result;if(r)r.title=e.target.value;}});
document.addEventListener('keydown',e=>{if(e.target.matches('#question-form textarea')&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit();}});
// '+' 버튼 말고도 사진·파일을 질문 입력창에 끌어다 놓거나(화면 어디에 놓아도 된다) 입력창에 붙여넣으면(Ctrl+V) 첨부한다.
// 첨부 개수·크기·종류 확인은 '+' 버튼과 같은 addAttachments가 한다.
const dropTarget=()=>!$('#modal').open&&view==='chat'?$('#question-form'):null;
const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
const attachDropped=files=>{if(!files.length)return;if(attachBusy){toast('첨부 파일을 읽는 중이에요. 잠시 후 다시 놓아 주세요.');return;}addAttachments(files);};
let dragTimer=null;
document.addEventListener('dragover',e=>{const form=hasFiles(e)&&dropTarget();if(!form)return;e.preventDefault();e.dataTransfer.dropEffect='copy';form.classList.add('drag-over');clearTimeout(dragTimer);dragTimer=setTimeout(()=>form.classList.remove('drag-over'),150);});
document.addEventListener('drop',e=>{const form=hasFiles(e)&&dropTarget();if(!form)return;e.preventDefault();clearTimeout(dragTimer);form.classList.remove('drag-over');attachDropped([...e.dataTransfer.files]);});
document.addEventListener('paste',e=>{if(!e.target.closest?.('#question-form'))return;const files=[...(e.clipboardData?.files||[])];if(!files.length)return;e.preventDefault();attachDropped(files);});
document.addEventListener('change',async e=>{
 if(e.target.id==='knowly-attach'){const files=[...e.target.files];e.target.value='';if(files.length)addAttachments(files);return;}
 if(e.target.id==='chat-history-folder'){chatHistoryFolder=e.target.value;$('.chat-history').outerHTML=chatHistoryHTML();$('#chat-history-folder')?.focus({preventScroll:true});return;}
 if(e.target.id==='chat-history-category'){
  chatHistoryCategory=categories.some(c=>c.id===e.target.value)?e.target.value:'all';
  $('.chat-history').outerHTML=chatHistoryHTML();$('#chat-history-category')?.focus({preventScroll:true});return;
 }
 if(e.target.closest('[data-plan-form]')){const form=e.target.closest('[data-plan-form]'),r=messages.find(m=>m.result?.messageId===form.dataset.planForm)?.result;if(r){r.start=form.elements.start.value;if(form.elements.end){form.elements.end.min=r.start;if(form.elements.end.value<r.start)form.elements.end.value=r.start;r.end=form.elements.end.value;}else r.end=r.start;form.querySelector('.schedule-preview').innerHTML=schedulePreview(r);}}
 if(e.target.id==='active-category'){category=e.target.value;toast(`${categories.find(c=>c.id===category).label} 분야로 변경했어요.`);}
 if(e.target.dataset.complete){const next=tasks.map(t=>t.id===e.target.dataset.complete?{...t,done:e.target.checked}:t);if(save('om-tasks',next)){tasks=next;render();e.target.closest('.schedule-detail-list .agenda-item')?.classList.toggle('done',e.target.checked);}}
 if(e.target.dataset.taskDate){if(!e.target.value)return;const next=tasks.map(t=>t.id===e.target.dataset.taskDate?{...t,date:e.target.value}:t);if(save('om-tasks',next)){tasks=next;render();toast('작업일을 바꿨어요. 규정상 마감은 유지됩니다.');}}
 if(e.target.id==='bg-upload')await loadBackground(e.target.files[0]);
 if(e.target.id==='doc-upload'){const file=e.target.files[0];if(!file)return;if(!/\.(txt|md)$/i.test(file.name)||file.size>2*1024*1024){toast('2MB 이하 TXT 또는 Markdown 파일을 선택해 주세요.');return;}const contents=await file.text();const paragraphs=contents.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);if(!paragraphs.length){toast('내용이 있는 문서를 선택해 주세요.');return;}const id=crypto.randomUUID();const doc={id,category:$('#upload-category').value,title:file.name,version:'내가 추가한 자료',sections:paragraphs.map((text,i)=>({id:`${id}-${i}`,label:`문단 ${i+1}`,text}))};if(save('om-docs',[...uploads,doc])){uploads.push(doc);showDocs();toast('샘플 자료를 추가했어요. 같은 분야에서 검색할 수 있어요.');}}
});
shell();
// 계정별 기록을 브라우저 저장소에서 읽는다(내 일정·내 활동 기록·읽은 답변·대화 기록·성격)
function loadAccountRecords(next){
 personality=normalizePersonality(next?read('om-personality','cold'):'cold');
 tasks=read('om-tasks',[]);history=normalizeHistory(read('om-question-history',[]));seenReplies=read('om-seen-replies',{});if(!seenReplies||typeof seenReplies!=='object')seenReplies={};
 if(next){const stored=read('om-chat-sessions',null);chats=stored===null?importQuestionHistory(history):normalizeChats(stored);}
}
// 비밀번호 변경: 지금 비밀번호를 확인한 뒤 새 비밀번호(8자 이상)로 바꾼다. 다른 기기의 로그인은 그대로 둔다.
function showPasswordForm(message=''){
 openModal(`<h2 id="modal-title">비밀번호 변경</h2><p class="modal-sub">지금 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요. 다른 기기의 로그인은 그대로 유지돼요.</p><form id="password-form" class="chat-settings-form password-form"><label for="pw-current">지금 비밀번호</label>${passwordInputHTML({id:'pw-current',name:'current',autocomplete:'current-password'})}<label for="pw-next">새 비밀번호 <small>8자 이상</small></label>${passwordInputHTML({id:'pw-next',name:'next',autocomplete:'new-password',attrs:'minlength="8"'})}<label for="pw-confirm">새 비밀번호 확인</label>${passwordInputHTML({id:'pw-confirm',name:'confirm',autocomplete:'new-password',attrs:'minlength="8"'})}<p class="login-error" role="alert" id="password-error">${esc(message)}</p><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">취소</button><button class="primary-button" type="submit">변경</button></div></form>`);
 $('#pw-current')?.focus();
}
async function changePassword(form){
 const data=Object.fromEntries(new FormData(form)),problem=passwordProblem(String(data.current||''),String(data.next||''),String(data.confirm||''));
 const error=$('#password-error');if(problem){error.textContent=problem;return;}
 const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='바꾸는 중…';error.textContent='';
 try{
  const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'password',current:data.current,next:data.next})}),body=await res.json().catch(()=>null);
  if(!res.ok)throw Error(body?.error||'비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
  closeModal();toast('비밀번호를 바꿨어요. 다음 로그인부터 새 비밀번호를 쓰세요.');
 }catch(e){if(error)error.textContent=e.message;submit.disabled=false;submit.textContent='변경';}
}
// 비밀번호 칸: 눈 모양 버튼으로 보기·가리기, Caps Lock이 켜져 있으면 칸 아래에 알린다
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-password-toggle]');if(!b)return;
 const input=document.getElementById(b.dataset.passwordToggle);if(!input)return;
 const show=input.type==='password';input.type=show?'text':'password';
 b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'비밀번호 가리기':'비밀번호 보기');b.title=b.getAttribute('aria-label');b.innerHTML=passwordEye(show);
 input.focus({preventScroll:true});
});
const capsCheck=e=>{
 const input=e.target;if(!input?.closest?.('.password-field')||typeof e.getModifierState!=='function')return;
 const warn=document.querySelector(`[data-caps-for="${input.id}"]`);if(warn)warn.hidden=!e.getModifierState('CapsLock');
};
document.addEventListener('keydown',capsCheck);document.addEventListener('keyup',capsCheck);
document.addEventListener('focusout',e=>{const w=e.target?.id&&document.querySelector(`[data-caps-for="${e.target.id}"]`);if(w)w.hidden=true;});
// Knowly 화면(안에 끼운 화면)의 불러오는 중 표시는 바깥에 하나만: 안쪽이 '준비됨'(knowly-embed-busy false)을 알릴 때까지 보이고,
// 안쪽에서 다시 불러오기 시작하면 다시 보인다. 예전 화면처럼 신호가 없으면 다 뜬 뒤 6초 지나 걷는다.
// (load는 거품이 일지 않아 붙잡기 단계에서 받는다)
document.addEventListener('load',e=>{
 const wrap=e.target?.matches?.('iframe.knowly-frame')&&e.target.closest('.knowly-frame-wrap');if(!wrap)return;
 wrap.classList.add('loaded');clearTimeout(wrap._readyTimer);wrap._readyTimer=setTimeout(()=>{if(!wrap.dataset.signalled||!wrap.classList.contains('busy'))wrap.classList.add('ready');},6000);
},true);
// 답변 복사: 화면에 보이는 핵심·절차·설명·근거를 글자로 정리해 복사한다
function answerText(r){
 const list=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()):[];
 if(r?.kind==='knowly'){
  const k=r.knowly||{},summary=list(k.summary),steps=list(k.steps),cites=(Array.isArray(k.citations)?k.citations:[]).filter(c=>c&&c.title);
  return [summary[0],...summary.slice(1).map(x=>'• '+x),steps.length?'':null,...steps.map((x,i)=>`${i+1}. ${x}`),k.details?'\n'+k.details:null,
   cites.length?'\n근거: '+cites.map(c=>[c.title,c.pages].filter(Boolean).join(' ')).join(', '):null].filter(x=>x!==null&&x!==undefined).join('\n').replace(/\n{3,}/g,'\n\n').trim();
 }
 const card=document.querySelector(`[data-copy-answer="${CSS.escape(r?.messageId||'')}"]`)?.closest('.answer-content');
 if(!card)return '';
 const copy=card.cloneNode(true);copy.querySelectorAll('button,.answer-tools,.answer-label,.unknown-board-offer,.answer-source-panel').forEach(x=>x.remove());
 return copy.innerText.replace(/\n{3,}/g,'\n\n').trim();
}
async function copyText(text){
 try{await navigator.clipboard.writeText(text);return true;}
 catch{const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();let ok=false;try{ok=document.execCommand('copy');}catch{}area.remove();return ok;}
}
// 마지막으로 브라우저 저장소에 넣은 서버 기록 묶음(같은 묶음을 두 번 넣지 않는다)
let lastPersonalState=null;
// 계정에 저장된 화면 테마·움직임 설정을 이 화면에 적용한다
function applyDeviceSettings(){applyColorTheme(preferredColorTheme());document.body.classList.toggle('motion-paused',!read('om-cat-motion',true));}
// 서버에서 받은 기록으로 바뀐 뒤 다시 읽고 그린다. 지금 보고 있는 화면·대화는 그대로 둔다(다른 기기에서 연 대화로 갑자기 넘어가지 않게).
function reloadAccountRecords(){
 if(!activeAccount)return;
 uploads=read('om-docs',[]);loadAccountRecords(activeAccount);
 if(activeChatId&&!chats.some(x=>x.id===activeChatId)&&!messages.length)activeChatId=null;
 applyDeviceSettings();applyBackground();render();
}
// 창을 닫거나 다른 창으로 갈 때 아직 못 보낸 기록을 한 번 더 보낸다
addEventListener('pagehide',()=>{accountSync.flush();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')accountSync.flush();});
initCommunity({
 toast,modal:openModal,close:closeModal,render,loading:showLoading,
 // 내 질문 상세 창을 열면(게시판·내 활동 어디서든) 그 질문의 답변을 읽은 것으로 표시한다
 seen(post){
  if(!post?.mine||(Number(seenReplies[post.id])||0)>=post.replies.length)return;
  const next={...seenReplies,[post.id]:post.replies.length};if(save('om-seen-replies',next)){seenReplies=next;updateWallet();}
 },
 show(next){view=next;render();$('#main').scrollTop=0;},
 update(state){
  if(state.catalog)applyCatalog(state.catalog);
  const next=state.member?(state.me.id||state.me.username):null;
  if(next!==activeAccount){
   chats=[];activeChatId=null;chatHistoryCollapsed=false;chatHistoryCategory='all';chatHistoryFolder='all';historyMessageId=null;heroTransition=null;
   clearTimeout(replyTimer);replyTimer=null;pendingReply=null;messages=[];chatDraft='';category=null;view='chat';plan=null;petInteraction.reset();
   if($('#modal').open)closeModal();activeAccount=next;
   // 화면을 불러올 때 함께 받은 서버 기록(내 일정·대화 기록·테마 등)을 먼저 브라우저 저장소에 넣고 읽는다
   lastPersonalState=state.personalState;const synced=accountSync.start(next,state.personalState,state.personalLarge,state.personalUpdated);
   applyDeviceSettings();
   uploads=read('om-docs',[]);loadAccountRecords(next);
   if(next){
    activeChatId=read('om-chat-active',null);const selected=chats.find(x=>x.id===activeChatId);
    if(selected){messages=structuredClone(selected.messages);category=selected.category;}else activeChatId=null;
   }
   rewards=state.wallet||{...normalizeRewards(null),treatTokens:0};applyBackground();render();if(next)refreshCategories().then(changed=>{if(changed)render();});if(next&&state.me.role!=='staff')companionBehavior.greet(personality);
   // 나중에 받은 기록(큰 배경 이미지·예전 서버 응답)으로 바뀌었으면 다시 그린다
   synced.then(changed=>{if(changed&&activeAccount===next)reloadAccountRecords();});
   // 첫 사용자 가이드: 직원 계정이 처음 로그인하면 한 번 띄운다(본 기록은 계정에 저장되어 다른 PC에서도 다시 뜨지 않는다)
   guide.close();if(next&&state.me.role!=='staff')guide.maybeAutoStart({id:next,role:state.me.role});
   return;
  }
  if(!state.member){render();return;}
  // 같은 계정으로 다시 불러왔을 때(창으로 돌아옴 등): 다른 기기에서 바꾼 기록이 있으면 반영한다
  // 서버에서 새로 받은 기록 묶음일 때만(같은 묶음을 다시 넣으면 그 뒤에 바꾼 기록을 옛 기록으로 되돌린다)
  const fresh=state.personalState&&state.personalState!==lastPersonalState;if(fresh)lastPersonalState=state.personalState;
  if(fresh&&accountSync.refresh(state.personalState,state.personalLarge,reloadAccountRecords,state.personalUpdated)){rewards=state.wallet||rewards;reloadAccountRecords();return;}
  rewards=state.wallet||{...normalizeRewards(null),treatTokens:0};updateWallet();refreshPet();if(viewOf(view)?.community&&!$('#modal').open)render();}
});

document.addEventListener('submit',e=>{
 if(e.target.id==='password-form'){e.preventDefault();changePassword(e.target);return;}
 if(!['chat-settings-form','chat-folder-form'].includes(e.target.id))return;
 e.preventDefault();if(!communityState().member)return;
 const form=e.target,data=new FormData(form);saveCurrentChat();
 const folder=String(data.get('folder')||'').trim();
 if(form.id==='chat-folder-form'&&!folder){toast('폴더 이름을 입력해 주세요.');return;}
 if(form.id==='chat-settings-form'&&!chats.some(x=>x.id===form.dataset.threadId))return;
 const next=form.id==='chat-settings-form'?updateChatDetails(chats,form.dataset.threadId,{customTitle:String(data.get('customTitle')||''),folder}):renameChatFolder(chats,form.dataset.folder,folder);
 if(!save('om-chat-sessions',next))return;
 chats=next;
 if(chatHistoryFolder!=='all')chatHistoryFolder='folder:'+folder;
 closeModal();render();toast(form.id==='chat-settings-form'?'대화 제목과 폴더를 저장했어요.':'폴더 이름을 변경했어요.');
});
