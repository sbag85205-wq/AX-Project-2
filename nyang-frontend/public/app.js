import {fetch} from './transport.js?v=fd4b994ba12d';
import {createReactionPicker} from './reaction-variety.js?v=115ea2f34987';
import {createCompanionBehavior,companionAppearance} from './companion-behavior.js?v=ef11f91be08e';
import {normalizePersonality,personalities,personalityText,personalityAnswer,petAppearance} from './personality.js?v=32786256695d';
import {normalizeChats,rememberChat,removeChat,importQuestionHistory,questionsByCategory,chatFolders,updateChatDetails,renameChatFolder} from './chat-history.js?v=54838544bef7';
import {COMMUNITY_CLICK_SELECTOR,initCommunity,communityState,communityAction,refreshCommunity,activityHTML,boardHTML,unknownOffer,showPostDialog,showMyPost,accountGateHTML,logoutAccount} from './community-ui.js?v=8727cb006b6d';
import {documents,faq,starters,answers,reference,localDate,addDays,asDate,displayDate} from './core.js?v=107007c04825';
import {categories,categoryLabels,categoryOf,esc,isStaff,canEarnRewards} from './common.js?v=b28f10812dc5';
import {scheduleTypes,makeSchedule,mergeSchedule} from './companion.js?v=b330209ae6c3';
import {TREAT_COST,PET_COOLDOWN_MS,PET_BONUS_POINTS,HEARTS_PER_TREAT,wardrobe,normalizeRewards,rewardHelp} from './reward-rules.js?v=a99b0c80721c';
import {icon} from './icons.js';
import {backgroundPresets} from './backgrounds.js';
import {VIEWS,NAV,HOME,canView,navVisible,navOf} from './views.js';
import {createPetInteraction} from './pet-interaction.js?v=355c0da8eb14';
import {normalizeHistory,recordAnswer,toggleSaved,unseenReplies} from './activity-history.js?v=d76a89d9987b';
const $=s=>document.querySelector(s);
const mode=document.body.dataset.mode;
const root='/nyang/';
const cat=(mood='',extra='')=>`<div class="cat-art ${mood} ${extra}" role="img" aria-label="${mood==='annoyed'?'귀찮은 표정의':mood==='happy'?'행복한 표정의':'차갑지만 귀여운'} 고양이 냥대리"></div>`;
// 브라우저 저장(localStorage). 키 이름은 예전과 같다.
// read/save: 이 브라우저 공통 설정(테마·움직임·배경).
// readMine/saveMine: 로그인 계정별 기록(대화·일정·질문 기록·성격 등) → 'nyang-account:<계정>:<키>'.
let activeAccount=null;
const accountKey=key=>'nyang-account:'+(activeAccount||'signed-out')+':'+key;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('브라우저 저장 공간이 부족해 저장하지 못했어요.');return false;}}
const readMine=(key,fallback)=>read(accountKey(key),fallback);
const saveMine=(key,value)=>save(accountKey(key),value);
let uploads=readMine('om-docs',[]),tasks=readMine('om-tasks',[]),view='chat',filter='today',selectedDay=localDate(),dialogOpener=null;
// 열려 있는 대화 하나의 상태. 대화를 열거나 새로 시작하거나 계정이 바뀌면 통째로 바꾼다.
// id: 대화 기록 id, messages: 질문·답변, category: 고른 분야, draft: 입력 중인 글, pendingReply·replyTimer: 기다리는 답변,
// heroTransition: 첫 질문 때 고양이가 옮겨가는 애니메이션 시작 위치, historyMessageId: 분야별 기록에서 연 질문
const newChat=(fields={})=>({id:null,messages:[],category:null,draft:'',pendingReply:null,replyTimer:null,heroTransition:null,historyMessageId:null,...fields});
let chat=newChat();
let chats=[],chatHistoryCollapsed=false,chatHistoryCategory='all',chatHistoryFolder='all';
const readSeenReplies=()=>{const value=readMine('om-seen-replies',{});return value&&typeof value==='object'?value:{};};
let history=normalizeHistory(readMine('om-question-history',[])),activityTab='recent',activityQuery='',seenReplies=readSeenReplies(),scheduleView='todos';
const allDocs=()=>[...documents,...uploads];
const badge=(text,cls='')=>`<span class="badge ${cls}">${text}</span>`;
let toastTimer=null,happyTimer=null;
function toast(text){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
// 테마 결정·적용 규칙은 theme.js(<head>에서 먼저 실행) 한 곳에 있다.
const colorTheme=window.nyangTheme;
function applyColorTheme(theme){
 const dark=colorTheme.apply(theme);
 const button=$('[data-action="toggle-theme"]');
 if(button){button.setAttribute('aria-pressed',String(dark));button.title=dark?'라이트 모드로 전환':'다크 모드로 전환';button.innerHTML=icon(dark?'moon':'sun')+`<span aria-hidden="true">${dark?'다크':'라이트'}</span>`;}
}
const preferredColorTheme=()=>colorTheme.preferred();
colorTheme.media.addEventListener('change',()=>applyColorTheme(preferredColorTheme()));
window.addEventListener('storage',e=>{if(e.key==='nyang-color-theme'||e.key===null)applyColorTheme(preferredColorTheme());});


let rewards={...normalizeRewards(null),treatTokens:0};
let calendarMonth=localDate().slice(0,7),calendarDay=localDate(),happyUntil=0;
let petReaction=null,petTimer=null,petGesture=null,ignorePetClickUntil=0,petPending=false,petMoving=false,petMotionTimer=null;
let personality='cold',companionPhase='idle';
const pickReaction=createReactionPicker();
const companionBehavior=createCompanionBehavior({change(phase){companionPhase=phase;refreshPet();}});
const voice=()=>personalities[personality];
const tone=text=>personalityText(text,personality);

function shell(){
 $('#app').innerHTML=`<div class="app-shell studio-shell desktop-workspace">
  <header class="workspace-header">
   <div class="header-brand"><button class="brand" data-action="reset" aria-label="냥대리 처음으로"><img class="company-logo" src="${root}assets/tilon-logo.png" width="434" height="118" alt="Tilon — Your dream starts here"><span>냥대리</span></button><button class="account-menu-button" data-action="account" id="account-button"></button></div>
   <nav class="workspace-nav side-nav" aria-label="주 메뉴">
    <button data-action="chat" id="nav-chat">${icon('chat')}<span>물어보기</span></button>
    <button data-action="schedule" id="nav-schedule">${icon('calendar')}<span>내 일정</span><span id="task-count" class="count"></span></button>
    <button data-action="board" id="nav-board">${icon('book')}<span>질문 게시판</span></button>
    <button data-action="activity" id="nav-activity">${icon('activity')}<span>내 활동</span><span id="activity-unread" class="activity-unread" hidden></span></button>
    <button data-action="docs" id="nav-library" hidden>${icon('book')}<span>사내 문서</span></button>
    <button data-action="unanswered" id="nav-unanswered" hidden>${icon('info')}<span>챗봇 미답변</span></button>
    <button data-action="statistics" id="nav-statistics" hidden>${icon('activity')}<span>이용통계</span></button>
    <button data-action="faq" id="nav-faq" hidden>FAQ 관리</button>
    <button data-action="documents" id="nav-documents" hidden>문서 관리</button>
    <button data-action="users" id="nav-users" hidden>사용자 관리</button>
    <button data-action="model" id="nav-model" hidden>검색 모델 설정</button>
   </nav>
   <div class="header-account"><div id="wallet" class="wallet" aria-label="보유 포인트와 하트"></div></div>
  </header>
  <div class="main-shell">
   <header class="topbar workspace-toolbar"><div class="workspace-context"><span id="workspace-title">물어보기</span></div><div class="top-actions"><div class="workspace-utilities"><button data-action="personality" id="personality-button" aria-label="냥대리 성격 설정">${icon('moon')}<span>차가운 모드</span></button><button data-action="wardrobe">${icon('shirt')}<span>꾸미기</span></button></div><button class="appearance-button theme-toggle" data-action="toggle-theme" aria-label="다크 모드" aria-pressed="false" title="다크 모드로 전환">${icon('moon')}</button></div></header>
   <main class="main-content cat-mode" id="main"></main>
   <footer class="bottom-note"><span id="page-title" class="visually-hidden"></span><span>Knowly 사내 문서와 FAQ를 검색합니다.</span><button data-action="docs">참고 자료 보기 ${icon('chevron')}</button></footer>
  </div>
 </div><dialog id="modal" aria-labelledby="modal-title"></dialog>`;
 applyColorTheme(preferredColorTheme());applyBackground();render();
}
function updateWallet(){
 $('#wallet').hidden=isStaff(communityState());
 $('#wallet').innerHTML=`<button class="wallet-level" data-action="activity">${communityState().member?'Lv. '+communityState().level.level:'내 활동'}</button><span title="${rewardHelp().wallet}"><i>P</i><strong id="points-balance">${rewards.points}</strong></span><span title="츄르를 주고 하트를 눌러 모아요"><i class="heart-mark">♥</i><strong id="hearts-balance">${rewards.hearts}</strong></span>`;
 const count=tasks.filter(t=>!t.done).length;$('#task-count').textContent=count||'';
 const unread=unseenReplies(communityState().posts,seenReplies).length,indicator=$('#activity-unread');
 indicator.hidden=!unread;indicator.textContent=unread;indicator.setAttribute('aria-label','새 답변이 달린 내 질문 '+unread+'개');
}
// 화면별 그리기. Knowly 화면(VIEWS[…].knowly)은 mountKnowly가 그린다.
const viewRenderers={
 chat:()=>renderCat(),
 calendar:()=>renderCalendar(),
 todos:()=>renderTodos(),
 activity:()=>{$('#main').innerHTML=activityHTML(activityContent());},
 board:()=>{$('#main').innerHTML=boardHTML();},
 statistics:()=>{$('#main').innerHTML=knowlyStatsHTML();}
};
function render(){
 document.body.dataset.personality=personality;
 const personalityButton=$('#personality-button');if(personalityButton)personalityButton.innerHTML=icon(personality==='warm'?'sun':'moon')+'<span>'+voice().label+'</span>';
 document.body.dataset.view=view;
 const session=communityState(),staff=isStaff(session);document.body.dataset.authenticated=String(!!session.member);document.body.dataset.role=staff?'staff':'employee';
 for(const [id,who] of NAV)$('#nav-'+id).hidden=!navVisible(who,staff);
 // 볼 수 없는 화면이면 그 계정의 첫 화면으로 바꾼다(로그인 전에는 로그인 화면만 그린다).
 if(staff&&!canView(view,true))view=HOME.staff;
 document.body.dataset.view=view;
 if(!session.member){$('#wallet').innerHTML='';$('#account-button').textContent='';$('#workspace-title').textContent='로그인';$('#main').classList.add('work-view');$('#main').innerHTML=accountGateHTML();return;}
 if(!staff&&!canView(view,false))view=HOME.employee;
 $('#account-button').innerHTML='<span>'+esc(session.me.username)+'</span><small>'+(staff?'담당자':'직원')+'</small>';
 $('#account-button').setAttribute('aria-label',session.me.username+' 내 계정');
 $('#workspace-title').textContent=VIEWS[view].title;

 for(const [id] of NAV){const nav=$('#nav-'+id),active=navOf(view)===id;nav?.classList.toggle('active',active);if(active)nav?.setAttribute('aria-current','page');else nav?.removeAttribute('aria-current');}
 $('#page-title').textContent=VIEWS[view].pageTitle;
 $('#main').classList.toggle('work-view',view!=='chat');updateWallet();
 if(VIEWS[view].knowly)mountKnowly(view);else viewRenderers[view]();
}
async function commitReward(event){
 const payload={type:event.type,id:crypto.randomUUID()};
 if(event.type==='collect')payload.heart=event.id;
 if(event.type==='buy'||event.type==='equip')payload.item=event.id;
 const result=await communityAction('reward',payload);
 return result;
}
function outfitHTML(id=rewards.equipped){return id?`<span class="cat-outfit outfit-${id}" aria-label="${wardrobe.find(x=>x.id===id)?.name}">${id==='ribbon'?'<i></i>':id==='crown'?'♛':'✦ <i>✧</i> ✦'}</span>`:'';}
function petHTML(){
 const reaction=petReaction&&Date.now()<petReaction.until?petReaction.kind:null;
 const happy=(rewards.pending.length>0||Date.now()<happyUntil)&&!['sleepy','peek','hesitate'].includes(companionPhase);
 const appearance=companionAppearance(personality,{phase:companionPhase,reaction,affection:petReaction?.affection});
 const base=petAppearance(personality,{reaction,happy:happy||companionPhase==='welcome'});
 const pose=reaction?petReaction.pose:null;
 const expression=pose?(pose.eyes==='closed'?'':pose.eyes):(appearance.sleepy?'':base.expression);
 const wag=pose?pose.wag:base.wag;
 if(pose){appearance.sleepy=pose.eyes==='closed';appearance.soft=false;appearance.mark=pose.mark;}
 return `<span class="resident-shadow"></span><button class="pet-touch" data-action="pet" aria-label="냥대리 쓰다듬기" aria-busy="${petPending}" aria-describedby="pet-guide" title="클릭하거나 드래그해서 쓰다듬어 주세요"><span class="pet-stroke-mark" aria-hidden="true">✦</span></button><div class="pet-body behavior-${companionPhase} ${pose?'gesture-'+pose.motion:''} ${appearance.soft?'pet-soft-boundary':''} ${petReaction?.affection?'pet-affection':''} ${petMoving?'pet-engaged':''} ${reaction?'pet-'+reaction:happy?'delighted':''}"><div class="pet-resolution">${wag?'<span class="pet-wag-tail" aria-hidden="true"></span>':''}${cat(expression,'resident'+(wag?' pet-bonus-body':'')+(appearance.sleepy?' pet-sleepy':''))}${outfitHTML()}${appearance.mark?`<span class="companion-emote" aria-hidden="true">${appearance.mark}</span>`:''}</div></div><span class="resident-spark spark-one">✧</span><span class="resident-spark spark-two">✦</span><div class="pet-feedback ${reaction?'has-reaction reaction-'+reaction:''}" ${reaction?'':'aria-hidden="true"'}>${reaction?`<span class="pet-feedback-kicker">${reaction==='bonus'?'아주 드문 친밀감 보너스':reaction==='like'?'골골, 기분 좋은가 봐요':personality==='warm'?'지금은 쉬고 싶대요':'오늘은 조금 까칠해요'}</span><strong>${petReaction.line}</strong>${reaction==='bonus'?`<span class="pet-point-pop">+${PET_BONUS_POINTS} <small>P</small></span><small>작은 마음의 표시다냥.</small>`:`<small>${reaction==='like'?(personality==='warm'?'조금 더 함께 있자냥.':'좋아하는 건 비밀이다냥.'):(personality==='warm'?'기다려줘서 고맙다냥.':'잠깐 쉬었다 만나자냥.')}</small>`}`:''}</div>${rewards.pending.map((id,i)=>`<button class="collect-heart heart-${i}" data-heart="${id}" aria-label="하트 ${i+1} 모으기"><span>♥</span><small>+1</small></button>`).join('')}<div class="pet-actions"><button class="treat-button" data-action="feed" ${(rewards.points<TREAT_COST&&!rewards.treatTokens)||rewards.pending.length?'disabled':''}><span class="treat-stick" aria-hidden="true"></span> 츄르 주기 <b>${rewards.treatTokens?`보유 ${rewards.treatTokens}개`:TREAT_COST+' P'}</b></button><span>${rewards.pending.length?'하트를 눌러서 모아달라냥!':rewards.treatTokens?'출석 선물부터 먼저 쓰겠다냥.':rewards.points<TREAT_COST?'질문하면 포인트가 쌓여요':(personality==='warm'?'고맙다냥. 맛있게 먹겠다냥!':'이건… 조금 기대된다냥.')}</span><span class="pet-guide" id="pet-guide">클릭하거나 드래그해서 쓰다듬기</span></div>`;
}
function refreshPet(){
 refreshChatRewards();
 const pet=$('.resident-portrait');if(!pet)return;
 const template=document.createElement('template');template.innerHTML=petHTML();
 const next=template.content,body=pet.querySelector('.pet-body'),touch=pet.querySelector('.pet-touch');
 if(!body||!touch){pet.replaceChildren(next);return;}
 // Preserve the animated body and focused/captured button. Replacing them
 // restarts CSS animations and can turn pointer focus into a visible outline.
 touch.setAttribute('aria-busy',String(petPending));
 body.className=next.querySelector('.pet-body').className;
 const resolution=body.querySelector('.pet-resolution'),nextResolution=next.querySelector('.pet-resolution');
 if(resolution.innerHTML!==nextResolution.innerHTML)resolution.innerHTML=nextResolution.innerHTML;
 for(const selector of ['.pet-feedback','.pet-actions']){
  const current=pet.querySelector(selector),replacement=next.querySelector(selector);
  if(current.outerHTML!==replacement.outerHTML)current.replaceWith(replacement);
 }
 const hearts=[...pet.querySelectorAll('.collect-heart')],nextHearts=[...next.querySelectorAll('.collect-heart')];
 if(hearts.map(h=>h.outerHTML).join('')!==nextHearts.map(h=>h.outerHTML).join('')){
  hearts.forEach(h=>h.remove());pet.append(...nextHearts);
 }
}
const petInteraction=createPetInteraction({
 commit:()=>commitReward({type:'pet'}),cooldown:PET_COOLDOWN_MS,
 indicate(pending){
  petPending=pending;$('.pet-touch')?.setAttribute('aria-busy',String(pending));
  if(!pending&&!petReaction){petMoving=false;clearTimeout(petMotionTimer);refreshPet();}
 },
 stroke(){
  petMoving=true;clearTimeout(petMotionTimer);refreshPet();
  const motion=$('.resident-portrait .pet-body')?.getAnimations().find(a=>['pet-stroke','warm-touch','cold-touch'].includes(a.animationName));
  // Skip the imperceptible easing-in frames: the press is visible immediately.
  if(motion)motion.currentTime=70;
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
function petCat(){return petInteraction.pet();}
function sourceButtons(refs){return `<div class="sources">${refs.map(id=>{const r=reference(id,allDocs());return r?`<button data-source="${esc(id)}">${icon('book')}${esc(r.doc.title)} <span>${esc(r.section.label.split(' · ')[0])}</span>${icon('chevron')}</button>`:'';}).join('')}</div>`;}
function answerTools(r,refs,detail='',detailLabel='자세한 절차'){
 const panel=r.expandedPanel,detailId=`detail-${r.messageId}`,sourceId=`sources-${r.messageId}`;
 const first=reference(refs[0],allDocs()),saved=history.some(x=>x.id===r.messageId&&x.saved);
 const citation=first?`<div class="answer-citation"><button data-source="${esc(refs[0])}">${icon('book')}<span><strong>${esc(first.doc.title)}</strong><small>${esc(first.section.label)} · ${esc(first.doc.version)}</small></span>${icon('chevron')}</button></div>`:'';
 return `${citation}<div class="answer-tools" role="group" aria-label="답변 더 알아보기">${detail?`<button data-answer-panel="detail" data-message="${r.messageId}" aria-expanded="${panel==='detail'}" aria-controls="${detailId}">${detailLabel} ${icon('down')}</button>`:''}${refs.length>1?`<button data-answer-panel="sources" data-message="${r.messageId}" aria-expanded="${panel==='sources'}" aria-controls="${sourceId}">${icon('book')} 전체 출처 <span class="source-count">${refs.length}</span></button>`:''}<button data-save-answer="${r.messageId}" aria-pressed="${saved}">${icon(saved?'check':'plus')}${saved?'저장됨':'답변 저장'}</button>${scheduleMode(r)?`<button class="answer-schedule-button" ${r.decision==='added'?`data-open-plan="${r.start}"`:`data-consent="${r.decision==='yes'?'no':'yes'}" data-message="${r.messageId}" aria-expanded="${r.decision==='yes'}" aria-controls="schedule-${r.messageId}"`}>${icon(r.decision==='added'?'check':'calendar')}${r.decision==='added'?'내 일정 보기':r.decision==='yes'?'일정 접기':scheduleMode(r)==='todo'?'할 일로 추가':['annual','half'].includes(r.scheduleType)?'신청 일정 잡기':'일정 잡기'}</button>`:''}</div>${detail?`<div class="answer-detail" id="${detailId}" ${panel==='detail'?'':'hidden'}>${detail}</div>`:''}<div class="answer-source-panel" id="${sourceId}" ${panel==='sources'?'':'hidden'}><p>답변의 근거 · 눌러서 원문 확인</p>${sourceButtons(refs)}</div>`;
}
// main 백엔드(사내 문서 검색) 답변: 기존 답변 카드·도구 모양을 그대로 쓴다.
function knowlyHTML(r){
 const k=r.knowly||{},arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'||typeof x==='string'):[],summary=arr(k.summary),steps=arr(k.steps),cites=arr(k.citations);
 const detail=(steps.length?`<ol class="answer-steps">${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:'')+(k.details?`<p>${esc(k.details)}</p>`:'');
 const sources=cites.length?`<div class="answer-citation">${cites.map(c=>{const label=`<span><strong>${esc(c.title)}</strong><small>${esc([c.pages,c.version].filter(Boolean).join(' · '))}</small></span>`;return c.document_id?`<button data-knowly-doc="${esc(c.document_id)}" data-chunk="${esc(c.chunk_id||'')}">${icon('book')}${label}${icon('chevron')}</button>`:`<span class="knowly-source">${icon('book')}${label}</span>`;}).join('')}</div>`:'';
 const notes=arr(k.attachments).length?`<p class="caption">${arr(k.attachments).map(a=>`${esc(a.name)} ${a.read?'읽음':'읽지 못함'}`).join(' · ')}</p>`:'';
 const votes=k.message_id?`<div class="answer-tools" role="group" aria-label="답변 평가"><button data-knowly-vote="up" data-message="${esc(r.messageId)}" aria-pressed="${k.vote==='up'}">${icon(k.vote==='up'?'check':'plus')}도움돼요</button><button data-knowly-vote="down" data-message="${esc(r.messageId)}" aria-pressed="${k.vote==='down'}">${icon(k.vote==='down'?'check':'info')}아쉬워요</button></div>`:'';
 return `<div class="answer-content"><span class="answer-label">${icon('check')} ${k.error?'연결 오류':!k.answered?'등록된 근거가 부족해요':k.mode==='faq'?'FAQ에서 확인한 답변':'사내 문서에서 확인한 답변'}</span><h3>${esc(summary[0]||'')}</h3>${summary.length>1?`<ul class="answer-essentials">${summary.slice(1).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${k.outside_category?`<p class="caption">${icon('info')} ${esc(categoryOf(r.category).label)} 분야에서 근거를 찾지 못해 전체 문서에서 찾았어요.</p>`:''}${arr(k.warnings).map(w=>`<p class="caption">${icon('info')} ${esc(w)}</p>`).join('')}${notes}${sources}${answerTools(r,[],detail)}${votes}${!k.answered&&!k.error?unknownOffer({...r,kind:'unknown'}):''}</div>`;
}
// ── Knowly(main 백엔드) 연결 ─────────────────────────────────────────
// 통합 앱은 항상 실제 Knowly 기능을 사용한다. 연결 오류를 샘플로 대체하지 않는다.
let libraryRoute='/docs',attachments=[],attachBusy=false;
function knowlyFrameHTML(key,route){return `<div class="knowly-frame-wrap" data-knowly-key="${esc(key)}"><iframe class="knowly-frame" title="Knowly ${esc(key)}" src="/knowly/index.html#${esc(route)}"></iframe></div>`;}
// 같은 화면을 다시 그릴 때 iframe을 새로 불러오지 않도록, 이미 떠 있으면 그대로 둔다.
function mountKnowly(name){
 const key=name==='library'?'library:'+libraryRoute:name,route=name==='library'?libraryRoute:VIEWS[name].knowly;
 const current=$('#main > .knowly-frame-wrap');
 if(current?.dataset.knowlyKey===key)return;
 $('#main').innerHTML=knowlyFrameHTML(key,route);
}
function knowlyStatsHTML(){return `<section class="admin-page knowly-stats"><header class="admin-heading"><h1>문서 검색 이용 통계</h1></header>${knowlyFrameHTML('stats','/admin/stats')}</section>`;}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||!e.data||typeof e.data.type!=='string')return;
 const frame=[...document.querySelectorAll('iframe.knowly-frame')].find(f=>f.contentWindow===e.source);if(!frame)return;
 if(e.data.type==='knowly-embed-height')frame.style.height=Math.max(320,Math.min(20000,Number(e.data.height)||0))+'px';
 if(e.data.type==='knowly-embed-route'&&frame.closest('[data-knowly-key^="library"]')){libraryRoute=String(e.data.route||'/docs');frame.parentElement.dataset.knowlyKey='library:'+libraryRoute;}
 if(e.data.type==='knowly-embed-off'||e.data.type==='knowly-embed-error'){toast(String(e.data.message||'연결을 확인해 주세요.'));}
});
function openLibrary(route='/docs'){libraryRoute=route;view='library';petInteraction.reset();render();$('#main').scrollTop=0;}
// 개인 Knowly 세션의 답변 또는 명시적인 오류를 표시한다.
async function askKnowly(question,files=[]){
 try{
  const conversation_id=chat.messages.findLast(m=>m.result?.knowly?.conversation_id)?.result.knowly.conversation_id||null;
  const res=await fetch('/api/knowly',{method:'POST',body:JSON.stringify({question,conversation_id,category:categoryOf(chat.category).label,attachments:files.map(a=>a.kind==='image'?{name:a.name,kind:'image',data_url:a.dataUrl}:{name:a.name,kind:'file',text:a.text})})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'문서 검색에 실패했어요.');return data.answer;
 }catch(e){return {error:true,answered:false,summary:[e.message||'연결을 확인한 뒤 다시 질문해 주세요.'],citations:[]};}
}
async function voteKnowly(messageId,vote){
 const m=chat.messages.find(x=>x.result?.messageId===messageId),k=m?.result?.knowly;if(!k?.message_id)return;
 const next=k.vote===vote?null:vote;
 try{const res=await fetch('/api/knowly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feedback',message_id:k.message_id,vote:next})}),data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.error||'평가를 저장하지 못했어요.');k.vote=next;saveCurrentChat();render();toast(next?'평가를 남겼어요. 고마워요!':'평가를 취소했어요.');}
 catch(err){toast(err.message);}
}
// 첨부 처리는 Knowly 화면과 같은 코드를 쓴다: /knowly/attach.js는 npm run build:nyang-embed가
// src/embed/attach.ts(→ src/lib/attach.ts)에서 만든다. 쓰는 것: prepareAttachment(file)→첨부 객체,
// ATTACH_MAX(최대 개수). 그 밖에 ATTACH_ACCEPT·ATTACH_MAX_MB를 내보내며, composer()의 accept 목록은 ATTACH_ACCEPT와 같아야 한다.
// 불러오기에 실패하면 다음 시도에서 다시 불러온다(실패를 기억하지 않음).
let attachModule=null;
function loadAttach(){
 attachModule??=import('/knowly/attach.js').then(lib=>{
  if(typeof lib.prepareAttachment!=='function'||!Number.isInteger(lib.ATTACH_MAX))throw Error('첨부 모듈 형식이 달라요.');
  return lib;
 }).catch(err=>{attachModule=null;throw err;});
 return attachModule;
}
async function addAttachments(files){
 if(attachBusy)return;attachBusy=true;
 try{
  const lib=await loadAttach();
  for(const file of files){
   if(attachments.length>=lib.ATTACH_MAX){toast(`첨부는 ${lib.ATTACH_MAX}개까지 할 수 있어요.`);break;}
   try{attachments.push(await lib.prepareAttachment(file));}catch(err){toast(err.message||`${file.name}을(를) 읽지 못했어요.`);}
  }
 }catch{toast('첨부 기능을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');}
 finally{attachBusy=false;const draft=$('#question-form textarea')?.value;if(draft!=null)chat.draft=draft;render();}
}
function attachmentChips(){return attachments.length?`<div class="composer-attachments" aria-label="첨부한 파일">${attachments.map(a=>`<span class="admin-tag">${esc(a.kind==='image'?'사진':'파일')} · ${esc(a.name)} <button type="button" class="text-button" data-remove-attach="${esc(a.id)}" aria-label="${esc(a.name)} 첨부 빼기">×</button></span>`).join('')}</div>`:'';}
function resultHTML(r){
 if(r.kind==='answer'){const a=personalityAnswer(answers[r.id],personality),detail=a.steps?`<ol class="answer-steps">${a.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:'';return `<div class="answer-content"><span class="answer-label">${icon('check')} 자료에서 확인한 답변</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>${answerTools(r,a.refs,detail)}</div>`;}
 if(r.kind==='knowly')return knowlyHTML(r);
 if(r.kind==='unknown')return `<div class="answer-content"><span class="answer-label muted">${icon('info')} 확인할 수 없는 내용</span><h3>${voice().unknown}</h3><p>${r.personal?'개인별 잔여 연차·급여·계정 정보에는 접근할 수 없어요. 사내 시스템이나 담당 부서에서 확인해 주세요.':voice().unknownDetail}</p></div>${unknownOffer(r)}`;
 if(r.kind==='scope')return `<div class="answer-content"><h3>${voice().scope}</h3><p>지금은 ${categoryLabels[r.category||chat.category]||''} 자료 안에서 답하고 있어요.</p><button class="secondary-button" data-switch-category="${r.target}" data-retry="${esc(r.q)}">${categoryLabels[r.target]} 분야로 바꿔서 질문 ${icon('arrow')}</button></div>`;
 if(r.kind==='excerpt'){const long=r.text.length>180;return `<div class="answer-content"><span class="answer-label">${icon('book')} 업로드 자료 원문 검색</span><h3>${esc(r.title)}</h3><p class="excerpt">${esc(long?r.text.slice(0,180)+'…':r.text)}</p><p class="caption">${long?'문단 일부예요. ':''}${personality==='warm'?'답변으로 확인된 내용은 아니니 원문을 확인해 주세요.':'답변으로 확인된 내용은 아니니 원문을 확인해 줘.'}</p>${answerTools(r,[r.ref],long?`<p class="excerpt">${esc(r.text)}</p>`:'','문단 펼치기')}</div>`;}
 if(r.kind==='plan')return `<div class="answer-content"><span class="answer-label">${icon('check')} 자료에서 확인한 답변</span><h3>${tone('출장은 출발 3영업일 전까지 신청해.')}</h3><ul class="answer-essentials"><li>팀장 승인 후 교통·숙박 예약</li><li>출장 중 영수증 보관</li><li>복귀 다음 날부터 7일 이내 정산 신청</li></ul>${answerTools(r,['approval','booking','receipt','settle'],tone('<ol class="answer-steps"><li><strong>출장 신청</strong>목적·일정·목적지·예상 비용을 작성하고 팀장 승인을 받아.</li><li><strong>교통·숙박 예약</strong>승인 후 예약하고 확인서를 보관해. 숙박비는 1박 100,000원까지, 초과 비용은 별도 사전 승인이 필요해.</li><li><strong>증빙 보관</strong>결제 날짜·사용처·금액이 보이는 영수증을 챙겨.</li><li><strong>정산 신청</strong>영수증·출장 승인 내역·정산 신청서를 첨부해 팀장에게 승인 요청해.</li></ol>'))}</div>`;
 return '';
}

// 일정 추가 방식. 'todo': Knowly 답변 — 기한을 만들지 않고, 할 일과 날짜를 사용자가 직접 정한다.
// 'sample': 예전에 저장된 샘플 답변(answer·plan)만 — 그 답변에 쓰인 샘플 규정의 일정 템플릿.
function scheduleMode(r){
 if(r.kind==='knowly')return r.decision==='added'||r.knowly?.answered&&!r.knowly.error?'todo':null;
 return r.scheduleType&&scheduleTypes[r.scheduleType]?'sample':null;
}
function todoOffer(r){
 if(r.decision==='added')return `<div class="schedule-saved" role="status">${icon('check')} ${r.items?.length||1}개의 할 일을 내 일정에 ${personality==='warm'?'넣었어요.':'넣었어.'} <span>${displayDate(r.start)}${r.end&&r.end!==r.start?' — '+displayDate(r.end):''}</span></div>`;
 if(r.decision==='yes')return `<div class="schedule-offer" id="schedule-${r.messageId}"><h3>${voice().schedule}</h3><form class="plan-form" data-plan-form="${r.messageId}"><label>할 일<input name="title" required maxlength="80" value="${esc(r.todoTitle??String(r.knowly?.summary?.[0]||r.q||'').slice(0,80))}"></label><label>날짜<input type="date" name="start" required value="${esc(r.todoDate||'')}"></label><button type="submit" class="primary-button">내 일정에 추가 ${icon('calendar')}</button><button type="button" class="text-button" data-consent="no" data-message="${r.messageId}">닫기</button></form><p class="caption">날짜는 직접 골라 주세요. 냥대리는 기한을 정하지 않아요. 신청 기한은 답변의 사내 문서에서 확인하세요.<br>이 브라우저의 내 일정에 저장됩니다.</p></div>`;
 return `<div id="schedule-${r.messageId}" hidden></div>`;
}
function addTodo(r,title,date){
 if(!title){toast('할 일을 적어 주세요.');return;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||localDate(asDate(date))!==date){toast('올바른 날짜를 선택해 주세요.');return;}
 const key=`todo:${r.messageId}:${date}:${title}`,exists=tasks.some(t=>t.key===key);
 const item={id:crypto.randomUUID(),key,title,date,ref:null,note:r.q?'냥대리에게 물어본 질문: '+r.q:'냥대리 답변에서 추가한 할 일',deadline:null,type:'내 할 일',planType:'todo',planLabel:'냥대리 답변',tripStart:date,done:false};
 const next=exists?tasks:[...tasks,item];
 if(exists||saveMine('om-tasks',next)){tasks=next;r.start=date;r.end=date;r.items=[{title}];r.decision='added';render();toast(exists?'이미 캘린더에 챙겨 둔 일정이야.':'1개의 할 일을 내 일정에 넣었어.');}
}
function scheduleOffer(r){
 const mode=scheduleMode(r);
 if(!mode)return '';
 if(mode==='todo')return todoOffer(r);
 const meta=scheduleTypes[r.scheduleType];
 if(r.decision==='added')return `<div class="schedule-saved" role="status">${icon('check')} ${r.items.length}개의 할 일을 내 일정에 ${personality==='warm'?'넣었어요.':'넣었어.'} <span>${displayDate(r.start)}${meta.endLabel?' — '+displayDate(r.end):''}</span></div>`;
 if(r.decision==='yes')return `<div class="schedule-offer" id="schedule-${r.messageId}"><h3>${voice().schedule}</h3><form class="plan-form" data-plan-form="${r.messageId}"><label>${meta.startLabel}<input type="date" name="start" required value="${r.start}"></label>${meta.endLabel?`<label>${meta.endLabel}<input type="date" name="end" required min="${r.start}" value="${r.end}"></label>`:''}<div class="schedule-preview" data-preview="${r.messageId}">${schedulePreview(r)}</div><button type="submit" class="primary-button">내 일정에 추가 ${icon('calendar')}</button><button type="button" class="text-button" data-consent="no" data-message="${r.messageId}">닫기</button></form><p class="caption">샘플 일정 템플릿입니다. 실제 기한은 답변의 사내 문서와 비교해 조정하세요. 영업일은 주말만 제외해요.<br>이 사이트의 내 일정에 저장됩니다.</p></div>`;
 return `<div id="schedule-${r.messageId}" hidden></div>`;
}
function schedulePreview(r){
 try{return makeSchedule(r.scheduleType,r.start,r.end).map(t=>`<div><span class="${t.date<localDate()?'overdue':''}">${displayDate(t.date)}${t.date<localDate()?' · 지난 날짜':''}</span><strong>${esc(t.title)}</strong><small>${t.type}${t.deadline?' · 마감 '+displayDate(t.deadline):''}</small></div>`).join('');}catch(err){return `<p role="alert">${esc(err.message)}</p>`;}
}
function messageTime(value){return new Date(value||Date.now()).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});}
function miniCat(){return `<div class="message-avatar mini-cat" aria-hidden="true"><div class="pet-body"><div class="pet-resolution">${cat('','resident')}${outfitHTML()}</div></div></div>`;}
function conversation(){
 const lastAssistant=chat.messages.findLastIndex(m=>m.role==='assistant');
 const markup=chat.messages.map((m,i)=>{const day=!i||localDate(new Date(m.at))!==localDate(new Date(chat.messages[i-1].at))?`<div class="chat-day-divider"><span>${new Date(m.at).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})}</span></div>`:'';return day+(m.role==='user'?`<article class="chat-row from-me"><div class="user-message">${esc(m.text)}${Array.isArray(m.files)&&m.files.length?`<small class="user-attachments">첨부 · ${m.files.map(esc).join(', ')}</small>`:''}</div><time>${messageTime(m.at)}</time></article>`:`<article class="chat-row from-nyang assistant-message" data-reply="${m.result.messageId}">${i===lastAssistant&&!chat.pendingReply?'<div class="active-cat-slot"></div>':miniCat()}<div class="chat-message-body"><div class="assistant-name">냥대리 <span>업무 메이트</span>${i===lastAssistant&&!chat.pendingReply?`<div class="chat-rewards inline-cat-rewards">${chatRewards()}</div>`:''}</div><div class="answer-wrap">${resultHTML(m.result)}${scheduleOffer(m.result)}</div><time>${messageTime(m.at)}</time></div></article>`);}).join('');
 return `<div class="conversation" role="log" aria-label="냥대리와의 대화" aria-live="polite" aria-relevant="additions text">${markup}${chat.pendingReply?`<article class="chat-row from-nyang assistant-message typing-message"><div class="active-cat-slot"></div><div class="chat-message-body"><div class="assistant-name">냥대리 <span>업무 메이트</span></div><div class="typing-bubble" role="status" aria-label="냥대리가 답변을 준비하고 있어요"><i></i><i></i><i></i></div></div></article>`:''}</div>`;
}
function chatRewards(){return `<button class="chat-treat-button" data-action="feed" ${(rewards.points<TREAT_COST&&!rewards.treatTokens)||rewards.pending.length?'disabled':''}><span class="treat-stick" aria-hidden="true"></span> 츄르 주기 <small>${rewards.treatTokens?`보유 ${rewards.treatTokens}개`:TREAT_COST+' P'}</small></button>${rewards.pending.map((id,i)=>`<button class="chat-collect-heart" data-heart="${id}" aria-label="하트 ${i+1} 모으기">♥ <small>+1</small></button>`).join('')}`;}
function refreshChatRewards(){document.querySelectorAll('.chat-rewards').forEach(area=>area.innerHTML=chatRewards());}
function motionButton(){const moving=read('om-cat-motion',true);return `<button class="motion-control" data-action="toggle-motion" aria-pressed="${moving}" aria-label="${moving?'고양이 움직임 끄기':'고양이 움직임 켜기'}"><span class="motion-mark">${moving?'Ⅱ':'▷'}</span><span>${moving?'움직임 끄기':'움직임 켜기'}</span></button>`;}
function starterQuestions(){return `<div class="chat-starters" aria-label="추천 질문">${starters.map(s=>`<button data-question="${esc(s.q)}" data-cat="${s.category}">${esc(s.label)}</button>`).join('')}</div>`;}
function saveCurrentChat(){
 if(!activeAccount||isStaff(communityState())||!chat.id)return;
 const next=rememberChat(chats,chat.id,chat.messages,chat.category);
 if(JSON.stringify(next)!==JSON.stringify(chats)&&saveMine('om-chat-sessions',next))chats=next;
}
function chatHistoryHTML(){
 if(chatHistoryFolder!=='all'&&chatHistoryFolder!=='folder:'&&!chatFolders(chats).includes(chatHistoryFolder.slice(7)))chatHistoryFolder='all';
 let group='';const today=localDate(),yesterday=addDays(today,-1),filtered=chatHistoryCategory!=='all';
 const scoped=chats.filter(thread=>chatHistoryFolder==='all'||thread.folder===chatHistoryFolder.slice(7));
 const rows=filtered?questionsByCategory(scoped,chatHistoryCategory).map(row=>{const thread=scoped.find(t=>t.id===row.threadId);return {...row,question:row.title,title:thread.customTitle||row.title,folder:thread.folder};}):scoped.map(thread=>({threadId:thread.id,title:thread.title,folder:thread.folder,at:thread.updatedAt,category:thread.category,count:thread.messages.length/2}));
 const list=rows.map(row=>{
  const date=localDate(new Date(row.at));
  const label=date===today?'오늘':date===yesterday?'어제':new Date(row.at).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  const heading=label!==group?`<h3>${esc(label)}</h3>`:'';group=label;
  const selected=row.threadId===chat.id&&(!filtered||row.messageId===chat.historyMessageId);
  return `${heading}<div class="chat-history-row"><button class="chat-history-item ${selected?'selected':''}" data-chat-open="${esc(row.threadId)}" ${filtered?`data-chat-message="${esc(row.messageId)}"`:''} aria-current="${selected?'true':'false'}" title="${esc(row.title)}"><span>${esc(row.title)}</span>${filtered&&row.question!==row.title?`<small class="chat-question-preview">${esc(row.question)}</small>`:''}<small>${row.folder?esc(row.folder)+' · ':''}${filtered?'질문 다시 보기':row.count+'개 질문'} · ${esc(categoryLabels[row.category]||'업무 질문')}</small></button><button class="chat-history-settings icon-button" data-chat-settings="${esc(row.threadId)}" aria-label="${esc(row.title)} 대화 설정" title="제목 · 폴더 설정">${icon('settings')}</button><button class="chat-history-delete icon-button" data-chat-delete="${esc(row.threadId)}" aria-label="${esc(row.title)} 대화 삭제" title="대화 전체 삭제">${icon('trash')}</button></div>`;
 }).join('');
 const empty=chatHistoryFolder!=='all'?'<p>이 조건에 맞는 대화가 없어요.</p><span>다른 폴더나 분야를 선택해 보세요.</span>':filtered?'<p>이 분야의 질문이 아직 없어요.</p><span>다른 분야나 전체 대화를 선택해 보세요.</span>':'<p>아직 대화가 없어요.</p><span>냥대리에게 질문하면<br>여기에 차곡차곡 모여요.</span>';
 return `<aside class="chat-history ${chatHistoryCollapsed?'is-collapsed':''}" aria-label="대화 기록"><div class="chat-history-heading"><h2>대화 기록</h2><button class="icon-button" data-action="toggle-chat-history" aria-label="${chatHistoryCollapsed?'대화 기록 펼치기':'대화 기록 접기'}" aria-expanded="${!chatHistoryCollapsed}" aria-controls="chat-history-list">${icon(chatHistoryCollapsed?'chevron':'back')}</button></div><div class="chat-history-filter"><label for="chat-history-folder">내 폴더</label><select id="chat-history-folder"><option value="all" ${chatHistoryFolder==='all'?'selected':''}>모든 폴더</option><option value="folder:" ${chatHistoryFolder==='folder:'?'selected':''}>폴더 없음</option>${chatFolders(chats).map(name=>`<option value="folder:${esc(name)}" ${chatHistoryFolder==='folder:'+name?'selected':''}>${esc(name)}</option>`).join('')}</select>${chatHistoryFolder.startsWith('folder:')&&chatHistoryFolder.slice(7)?'<button class="folder-rename text-button" data-action="rename-chat-folder">폴더 이름 변경</button>':''}<label class="chat-category-label" for="chat-history-category">분야별로 찾기</label><select id="chat-history-category"><option value="all" ${!filtered?'selected':''}>전체 대화</option>${categories.map(c=>`<option value="${c.id}" ${chatHistoryCategory===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select><p role="status">${filtered?'질문':'대화'} ${rows.length}개</p></div><div id="chat-history-list" class="chat-history-list" ${chatHistoryCollapsed?'hidden':''}>${list||`<div class="chat-history-empty">${empty}</div>`}</div><p class="chat-history-note">최근 100개 대화<br>이 브라우저에 계정별로 저장돼요.</p></aside>`;
}
function showChatSettings(id){
 if(!canEarnRewards(communityState()))return;
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 openModal(`<h2 id="modal-title">대화 설정</h2><p class="modal-sub">기억하기 쉬운 제목과 나만의 폴더로 정리하세요.</p><form id="chat-settings-form" class="chat-settings-form" data-thread-id="${esc(id)}"><label for="chat-custom-title">대화 제목</label><input id="chat-custom-title" name="customTitle" maxlength="80" value="${esc(thread.customTitle)}" placeholder="${esc(thread.messages[0]?.text||'대화 제목')}"><small>비워두면 첫 질문을 제목으로 사용해요.</small><div class="chat-folder-label"><label for="chat-custom-folder">폴더 이름</label><button type="button" class="chat-folder-toggle" data-action="toggle-chat-folders" aria-expanded="false" aria-controls="chat-existing-folders">기존 폴더 <span aria-hidden="true">⌄</span></button></div><div id="chat-existing-folders" class="chat-folder-picker" role="group" aria-label="기존 폴더 선택" hidden>${chatFolders(chats).length?chatFolders(chats).map(name=>`<button type="button" data-chat-folder-choice="${esc(name)}">${esc(name)}</button>`).join(''):'<p>아직 만든 폴더가 없어요.<br>아래에 새 폴더 이름을 입력해 주세요.</p>'}</div><input id="chat-custom-folder" name="folder" maxlength="40" value="${esc(thread.folder)}" placeholder="예: 휴가 준비, 자주 찾는 규정" autocomplete="off"><small>기존 폴더명을 선택하거나 새로 입력하세요. 비워두면 폴더에서 꺼내요.</small><p class="modal-sub">제목과 폴더는 이 브라우저에 계정별로 저장돼요.</p><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">취소</button><button class="primary-button" type="submit">저장</button></div></form>`);
 $('#chat-custom-title')?.focus();
}
function showRenameFolder(){
 const name=chatHistoryFolder.startsWith('folder:')?chatHistoryFolder.slice(7):'';
 if(!name||!chatFolders(chats).includes(name))return;
 openModal(`<h2 id="modal-title">폴더 이름 변경</h2><form id="chat-folder-form" class="chat-settings-form" data-folder="${esc(name)}"><label for="chat-folder-name">폴더 이름</label><input id="chat-folder-name" name="folder" value="${esc(name)}" maxlength="40" required><small>이 폴더의 모든 대화에 적용돼요. 기존 폴더와 같은 이름이면 함께 모아져요.</small><div class="chat-delete-actions"><button type="button" class="secondary-button" data-action="close-modal">취소</button><button class="primary-button" type="submit">저장</button></div></form>`);
 $('#chat-folder-name')?.focus();
}
function showDeleteChat(id){
 if(!canEarnRewards(communityState()))return;
 if(chat.pendingReply){toast('답변을 마친 뒤 대화를 삭제해 주세요.');return;}
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 openModal(`<h2 id="modal-title">이 대화를 삭제할까요?</h2><p class="chat-delete-title">${esc(thread.title)}</p><p class="modal-sub">대화에 포함된 모든 질문과 답변, 내 활동 기록과 저장한 답변이 이 브라우저에서 삭제돼요. 삭제한 대화는 복구할 수 없어요.</p><p class="modal-sub">게시판에 올린 질문과 등록한 일정, 포인트는 유지돼요.</p><div class="chat-delete-actions"><button class="secondary-button" data-action="close-modal">취소</button><button class="chat-delete-confirm" data-chat-delete-confirm="${esc(id)}">대화 삭제</button></div>`);
 $('.chat-delete-actions [data-action="close-modal"]')?.focus();
}
function deleteChat(id){
 if(!canEarnRewards(communityState())||!chats.some(x=>x.id===id))return;
 if(chat.pendingReply){toast('답변을 마친 뒤 대화를 삭제해 주세요.');return;}
 const next=removeChat(chats,history,id);
 if(!saveMine('om-question-history',next.history))return;
 if(!saveMine('om-chat-sessions',next.chats)){saveMine('om-question-history',history);return;}
 chats=next.chats;history=next.history;
 if(chat.id===id){
  chat=newChat();saveMine('om-chat-active',null);petInteraction.reset();
 }
 closeModal();render();$('#chat-history-category')?.focus({preventScroll:true});toast('대화를 삭제했어요.');
}
function openChat(id,messageId=null){
 if(!canEarnRewards(communityState()))return;
 if(chat.pendingReply){toast('답변을 마친 뒤 이전 대화를 열어 주세요.');return;}
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 if(thread.messages.some(m=>m.result?.kind==='answer'&&!answers[m.result.id]||m.result?.kind==='scope'&&!categoryLabels[m.result.target])){toast('이전 답변을 읽을 수 없어요. 다시 질문해 주세요.');return;}
 petInteraction.reset();saveMine('om-chat-active',id);
 const messages=structuredClone(thread.messages);
 chat=newChat({id,historyMessageId:messageId,messages,category:messages.find(m=>m.result?.messageId===messageId)?.result.category||thread.category});view='chat';render();
 if(messageId){requestAnimationFrame(()=>{const pane=$('.chat-transcript'),reply=[...document.querySelectorAll('[data-reply]')].find(el=>el.dataset.reply===messageId);if(pane&&reply){const question=reply.previousElementSibling;pane.scrollTop+=(question||reply).getBoundingClientRect().top-pane.getBoundingClientRect().top-24;}});}else scrollConversation();
 $('#question-form textarea')?.focus({preventScroll:true});
}
function renderCat(){
 saveCurrentChat();
 const previousPet=$('.resident-portrait'),home=!chat.messages.length&&!chat.pendingReply;
 const focusInput=document.activeElement?.matches('#question-form textarea');
 const selection=focusInput?[$('#question-form textarea').selectionStart,$('#question-form textarea').selectionEnd]:null;
 const oldScroll=$('.chat-transcript')?.scrollTop;
 document.body.classList.toggle('motion-paused',!read('om-cat-motion',true));
 let content;
 if(home){
  content=`<section class="cat-room home-scene chat-home"><div class="cat-resident-stage"><div class="scene-window" aria-hidden="true"></div><div class="active-cat-slot"></div><div class="chat-rewards home-cat-rewards" aria-label="냥대리에게 츄르 주기">${chatRewards()}</div><div class="resident-speech"><h1>${voice().greeting}</h1><p>${voice().intro}</p></div></div><div class="cat-below chat-home-below">${starterQuestions()}${composer(true)}</div></section>`;
 }else{
  content=`<section class="chat-room" aria-label="냥대리 채팅방"><div class="chat-transcript" tabindex="0" aria-label="대화 내역"><div class="chat-transcript-inner">${conversation()}</div></div><div class="chat-compose-dock">${composer()}<p class="chat-dock-note">중요한 내용은 답변의 출처에서 확인하세요.</p></div></section>`;
 }
 $('#main').innerHTML=`<div class="chat-layout">${chatHistoryHTML()}<div class="chat-workspace">${content}</div></div>`;
 const pet=previousPet||document.createElement('div');pet.className='resident-portrait';
 if(!previousPet)pet.innerHTML=petHTML();
 $('.active-cat-slot').replaceWith(pet);
 if(!home&&oldScroll!==undefined)$('.chat-transcript').scrollTop=oldScroll;
 resizeComposer();
 if(focusInput){const field=$('#question-form textarea');field.focus({preventScroll:true});field.setSelectionRange(...selection);}
 if(chat.heroTransition&&!home){
  const from=chat.heroTransition;chat.heroTransition=null;
  scrollConversation();
  requestAnimationFrame(()=>{
   if(!pet.isConnected||read('om-cat-motion',true)===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const to=pet.getBoundingClientRect();
   const animation=pet.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width})`},{transform:'translate(0,0) scale(1)'}],{duration:820,easing:'cubic-bezier(.22,.8,.25,1)',fill:'both'});
   pet.classList.add('cat-arriving');animation.finished.catch(()=>{}).finally(()=>{animation.cancel();pet.classList.remove('cat-arriving');});
  });
 }
}
function composer(home=false){const current=categoryOf(chat.category);return `<form class="composer chat-composer" id="question-form"><div class="composer-scope"><span>${icon(current.icon)}<strong id="scope-name">${current.label}</strong>에 질문 중</span><div class="composer-scope-actions"><button type="button" class="text-button" data-action="chat-examples">질문 예시 ${icon('chevron')}</button><button type="button" class="text-button" data-action="choose-category">분야 변경 ${icon('down')}</button></div></div>${attachmentChips()}<div class="input-row"><button type="button" class="attach-button" data-action="attach" aria-label="${attachBusy?'첨부 파일을 읽는 중':'사진·파일 첨부'}" title="${attachBusy?'읽는 중…':'사진·파일 첨부'}" ${attachBusy?'disabled':''}>${icon('plus')}</button><input type="file" id="knowly-attach" hidden multiple accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.xlsx,.xls,.csv,.txt,.md"><textarea name="question" rows="1" maxlength="1000" aria-label="질문 입력" placeholder="${home?'회사 생활에서 궁금한 점을 물어보세요.':'이어서 질문해 보세요…'}" required>${esc(chat.draft)}</textarea><button class="send-button" aria-label="질문 보내기" title="질문 보내기" type="submit" ${chat.pendingReply?'disabled':''}>${icon('send')}</button></div><div class="composer-meta"><span>등록된 사내 문서와 FAQ에서 답해요.</span><small>Enter 전송 · Shift+Enter 줄바꿈</small></div></form>`;}
function showCategories(){openModal(`<h2 id="modal-title">어떤 분야가 궁금하세요?</h2><p class="modal-sub">고른 분야의 문서에서 먼저 찾고, 없으면 전체 자료에서 찾아요. 작성 중인 질문은 유지됩니다.</p><div class="category-options">${categories.map(c=>`<button data-select-category="${c.id}" aria-pressed="${c.id===categoryOf(chat.category).id}">${icon(c.icon)}<span><strong>${c.label}</strong><small>${c.detail}</small></span>${icon(c.id===categoryOf(chat.category).id?'check':'chevron')}</button>`).join('')}</div>`);}
function resizeComposer(){const field=$('#question-form textarea');if(!field)return;field.style.height='auto';field.style.height=Math.min(140,Math.max(30,field.scrollHeight))+'px';}
function scrollConversation(){const pane=$('.chat-transcript'),last=pane?.querySelector('.assistant-message:last-child');if(!pane)return;requestAnimationFrame(()=>{if(!pane.isConnected)return;if(last)pane.scrollTop+=last.getBoundingClientRect().top-pane.getBoundingClientRect().top-24;else pane.scrollTop=pane.scrollHeight;});}
function showChatExamples(){const c=categoryOf(chat.category);openModal(`<h2 id="modal-title">질문 예시</h2><p class="modal-sub">${c.label} 분야에서 물어볼 수 있는 질문이에요.</p><div class="chat-example-list">${faq[c.id].map(q=>`<button class="secondary-button" data-question="${esc(q)}" data-cat="${c.id}">${esc(q)} ${icon('arrow')}</button>`).join('')}</div>`);}
function resetChat(){saveCurrentChat();if(activeAccount)saveMine('om-chat-active',null);clearTimeout(chat.replyTimer);chat=newChat();view='chat';petInteraction.reset();render();}
function ask(q,reward=true){
 if(!canEarnRewards(communityState())){render();return;}
 q=String(q).trim();if(!q)return;
 if(chat.pendingReply){toast('답변을 마치면 이어서 물어봐 줘.');return;}
 if(q.length>1000){toast('질문은 1,000자 이내로 적어 주세요.');return;}
 if(!chat.id){chat.id=crypto.randomUUID();saveMine('om-chat-active',chat.id);}
 const first=!chat.messages.length,portrait=$('.chat-home .resident-portrait');
 if(first&&portrait)chat.heroTransition=portrait.getBoundingClientRect();
 chat.category=categoryOf(chat.category).id;petInteraction.reset();
 // 답변은 항상 Knowly에서 받는다. 샘플 규칙(resolveQuestion·샘플 일정)으로 분류하거나 기한을 만들지 않는다.
 const r={q,category:chat.category,messageId:crypto.randomUUID()};
 const files=attachments;attachments=[];
 chat.messages.push({role:'user',text:q,at:Date.now(),...(files.length?{files:files.map(a=>a.name)}:{})});chat.pendingReply=r;chat.draft='';view='chat';
 render();refreshPet();scrollConversation();$('#question-form textarea')?.focus({preventScroll:true});
 if(reward)communityAction('question',{question:q});
 const remote=askKnowly(q,files);
 chat.replyTimer=setTimeout(async()=>{
  if(chat.pendingReply!==r)return;
  const k=remote&&await remote;if(chat.pendingReply!==r)return;
  r.kind='knowly';r.knowly=k;
  chat.pendingReply=null;chat.replyTimer=null;chat.messages.push({role:'assistant',result:r,at:Date.now()});saveCurrentChat();
  const next=recordAnswer(history,r);if(saveMine('om-question-history',next))history=next;
  if(view==='activity')render();
  if(view==='chat'){render();scrollConversation();}
 },first?950:480);
}
function scheduleTabs(){return `<div class="schedule-view-switch segmented" role="group" aria-label="일정 보기 방식"><button data-schedule-view="todos" class="${view==='todos'?'selected':''}" aria-pressed="${view==='todos'}">${icon('list')} 목록</button><button data-schedule-view="calendar" class="${view==='calendar'?'selected':''}" aria-pressed="${view==='calendar'}">${icon('calendar')} 달력</button></div>`;}
function renderCalendar(){
 const [year,month]=calendarMonth.split('-').map(Number),first=new Date(year,month-1,1,12),start=addDays(localDate(first),-(first.getDay()+6)%7);
 const days=Array.from({length:42},(_,i)=>addDays(start,i)),today=localDate();
 const selected=tasks.filter(t=>t.date===calendarDay).sort((a,b)=>Number(a.done)-Number(b.done));
 $('#main').innerHTML=`<section class="calendar-page"><div class="calendar-heading"><div><h1>내 일정</h1><p>날짜별로 계획을 한눈에 확인하세요.</p></div><button class="secondary-button" data-action="sample-plan">${icon('plus')} 일정 만들기</button></div>${scheduleTabs()}<div class="calendar-layout"><div class="calendar-board"><div class="month-navigation"><h2>${year}년 <strong>${month}월</strong></h2><div><button class="text-button" data-action="calendar-today">오늘</button><button class="icon-button" data-month="-1" aria-label="이전 달">${icon('back')}</button><button class="icon-button" data-month="1" aria-label="다음 달">${icon('arrow')}</button></div></div><div class="calendar-weekdays">${['월','화','수','목','금','토','일'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${days.map(date=>{const list=tasks.filter(t=>t.date===date);return `<button class="calendar-cell ${date.slice(0,7)!==calendarMonth?'outside':''} ${date===today?'today':''} ${date===calendarDay?'selected':''}" data-calendar-day="${date}" aria-label="${displayDate(date)}, 일정 ${list.length}개" aria-pressed="${date===calendarDay}"><span class="date-number">${asDate(date).getDate()}</span>${list.slice(0,2).map(t=>`<span class="calendar-event ${t.done?'done':''}">${esc(t.title)}</span>`).join('')}${list.length>2?`<small>+${list.length-2}개 더</small>`:''}</button>`;}).join('')}</div><div class="calendar-legend"><span><i></i> 예정된 할 일</span><span><i></i> 완료한 일</span><span>규정 기한은 일정 상세에서 확인해요.</span></div></div><aside class="day-agenda"><h2>${displayDate(calendarDay)}</h2><p>할 일 ${selected.filter(t=>!t.done).length}개 · 완료 ${selected.filter(t=>t.done).length}개</p><div>${selected.length?selected.map(t=>`<article class="agenda-item ${t.done?'done':''}"><label><input type="checkbox" data-complete="${t.id}" aria-label="${esc(t.title)} 완료" ${t.done?'checked':''}><strong>${esc(t.title)}</strong></label><small>${esc(t.planLabel||'국내 출장 준비')} · ${t.type}</small><p>${esc(t.note)}</p>${t.deadline?`<p class="agenda-deadline ${!t.done&&t.deadline<today?'overdue':''}">규정 마감 ${displayDate(t.deadline)}</p>`:''}${t.ref?`<button class="source-inline" data-source="${t.ref}">${icon('book')} 근거 보기</button>`:''}<div class="agenda-edit"><label>작업일<input type="date" data-task-date="${t.id}" aria-label="${esc(t.title)} 작업일" value="${t.date}"></label><button class="icon-button" data-delete="${t.id}" aria-label="${esc(t.title)} 삭제">${icon('trash')}</button></div></article>`).join(''):`<div class="agenda-empty">${icon('coffee')}<h3>등록된 일정이 없어요.</h3><p>다른 날짜를 선택하거나<br>대화에서 일정을 추가하세요.</p></div>`}</div></aside></div><p class="local-note">${icon('info')} 이 브라우저에 저장됩니다. 외부 캘린더·승인 시스템과는 연결되지 않아요.</p></section>`;
}
function customizeTabs(active){return `<div class="customize-tabs segmented" role="group" aria-label="꾸미기 설정">${[['outfit','고양이'],['background','배경'],['motion','움직임']].map(([id,label])=>`<button data-customize="${id}" class="${active===id?'selected':''}" aria-pressed="${active===id}">${label}</button>`).join('')}</div>`;}
function showMotion(){openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('motion')}<section class="motion-settings"><div><h3>냥대리 움직임</h3><p>눈 깜빡임과 가벼운 움직임을 켜거나 끌 수 있어요.</p></div>${motionButton()}</section><p class="caption">기기에서 동작 줄이기를 설정했다면 해당 설정이 우선 적용돼요.</p>`,true);}
function activityContent(){
 const posts=(communityState().posts||[]).filter(p=>p.mine),fresh=unseenReplies(posts,seenReplies),q=activityQuery.toLocaleLowerCase('ko');
 const rows=(activityTab==='saved'?history.filter(x=>x.saved):history.slice(0,100)).filter(x=>x.q.toLocaleLowerCase('ko').includes(q));
 const date=at=>new Date(at).toLocaleDateString('ko-KR',{month:'long',day:'numeric'});
 const tabs=[['recent','최근 질문'],['saved','저장한 답변'],['posts','내가 게시한 질문']];
 const notices=fresh.length?`<button class="activity-notice" data-activity-tab="posts">${icon('chat')} 내 질문 ${fresh.length}개에 새 답변이 있어요 ${icon('chevron')}</button>`:'';
 const postRows=posts.filter(p=>p.body.toLocaleLowerCase('ko').includes(q));
 const empty=activityTab==='saved'?'아직 저장한 답변이 없어요.':activityTab==='posts'?'아직 게시한 질문이 없어요.':'아직 기록된 질문이 없어요.';
 return `<section class="activity-work" aria-label="나의 질문 기록">${notices}<div class="activity-tabs" role="group" aria-label="질문 기록 종류">${tabs.map(([id,label])=>`<button data-activity-tab="${id}" aria-pressed="${activityTab===id}" class="${activityTab===id?'selected':''}">${label}${id==='posts'&&fresh.length?`<span>${fresh.length}</span>`:''}</button>`).join('')}</div><form id="activity-search"><input name="query" value="${esc(activityQuery)}" aria-label="내 질문 검색" placeholder="질문 내용으로 찾기"><button class="secondary-button">검색</button></form><div class="activity-record-list">${activityTab==='posts'?postRows.map(p=>`<article class="activity-record"><button class="activity-record-open" data-activity-post="${esc(p.id)}"><span class="record-meta">${esc(categoryLabels[p.category])} · ${date(p.created)}${fresh.some(x=>x.id===p.id)?'<b class="reply-new">새 답변</b>':''}</span><strong>${esc(p.body)}</strong><span class="record-preview">${p.replies.length?`담당자 답변 ${p.replies.length}개 · 공식 확인 전`:'답변을 기다리고 있어요'} · 좋아요 ${p.likes}</span></button>${icon('chevron')}</article>`).join(''):rows.map(x=>`<article class="activity-record"><button class="activity-record-open" data-history-open="${esc(x.id)}"><span class="record-meta">${esc(categoryLabels[x.result.category])} · ${date(x.at)}</span><strong>${esc(x.q)}</strong><span class="record-preview">${esc(x.result.kind==='answer'?answers[x.result.id]?.title||'답변 다시 보기':x.result.kind==='plan'?'출장 준비 절차와 일정':x.result.kind==='excerpt'?x.result.title:x.result.kind==='knowly'?x.result.knowly?.summary?.[0]||'사내 문서 답변':x.result.kind==='scope'?'다른 분야의 질문':'자료에서 확인하지 못한 질문')}</span></button>${x.saved?'<span class="record-saved">저장됨</span>':icon('chevron')}</article>`).join('')}${!(activityTab==='posts'?postRows.length:rows.length)?`<div class="activity-record-empty"><h2>${activityQuery?'일치하는 질문이 없어요.':empty}</h2><p>${activityQuery?'다른 단어로 검색해 보세요.':activityTab==='saved'?'답변 아래의 ‘답변 저장’을 누르면 여기에 모여요.':activityTab==='posts'?'냥대리가 답하지 못한 질문을 게시판에 남길 수 있어요.':'지금부터 나눈 질문과 답변이 여기에 쌓여요.'}</p>${!activityQuery?'<button class="secondary-button" data-action="chat">냥대리에게 물어보기</button>':''}</div>`:''}</div><p class="activity-storage-note">${activityTab==='posts'?'최근 게시판 질문 200개 안에서 내가 쓴 질문을 보여줘요. 새 답변은 내 활동을 열거나 새로고침하면 확인돼요.':'최근 질문 100개와 저장한 답변 최대 100개가 현재 계정의 이 브라우저에 보관돼요. 질문 기록은 다른 기기와 동기화되지 않아요.'}</p></section>`;
}
function openHistory(id){
 const existing=chats.find(x=>x.messages.some(m=>m.result?.messageId===id));if(existing){openChat(existing.id);return;}
 const entry=history.find(x=>x.id===id);if(!entry)return;
 if(chat.pendingReply){toast('지금 답변을 마친 뒤 이전 질문을 열어 주세요.');return;}
 const r={...entry.result,messageId:entry.id};
 if(r.kind==='answer'&&!answers[r.id]||r.kind==='scope'&&!categoryLabels[r.target]){toast('이전 답변을 읽을 수 없어요. 다시 질문해 주세요.');return;}
 if(r.kind==='excerpt'&&!reference(r.ref,allDocs())){toast('이 답변의 원문 자료가 삭제되어 출처를 열 수 없어요.');}
 saveCurrentChat();saveMine('om-chat-active','legacy-'+id);
 petInteraction.reset();
 chat=newChat({id:'legacy-'+id,category:r.category,messages:[{role:'user',text:entry.q,at:entry.at},{role:'assistant',result:r,at:entry.at}]});view='chat';render();scrollConversation();
}

function showPersonality(){
 if(!canEarnRewards(communityState()))return;
 openModal(`<h2 id="modal-title">어떤 냥대리가 좋아요?</h2><p class="modal-sub">움직임을 미리 보고, 마음에 드는 냥대리를 골라 주세요.</p><div class="personality-options" role="group" aria-label="냥대리 성격">${['cold','warm'].map(mode=>`<button class="personality-option ${personality===mode?'selected':''}" data-personality="${mode}" aria-pressed="${personality===mode}"><span class="personality-preview" aria-hidden="true">${cat('','personality-preview-cat')}</span><strong>${personalities[mode].label}</strong><span>${mode==='warm'?'먼저 인사하고, 손길에는 골골. 츄르는 바로 냠냠!':'무심하게 힐끗. 가끔 손길에 마음을 열어요.'}</span><q>${mode==='warm'?'쓰다듬어주면 행복하다냥!':'츄르? …잠깐, 나 주고 가라냥.'}</q><small>${personality===mode?'사용 중':'이 모드로 선택'}</small></button>`).join('')}</div><p class="personality-note">답변의 정보와 출처, 포인트 보상은 같아요.<br>선택은 이 브라우저에 계정별로 저장됩니다.</p>`);
}
function showWardrobe(){
 openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('outfit')}<p class="modal-sub">모은 하트로 아이템을 선택하세요.</p><div class="wardrobe-preview">${cat('','closet-cat')}${outfitHTML()}<span class="heart-balance">♥ <strong>${rewards.hearts}</strong> 보유</span></div><div class="wardrobe-items">${wardrobe.map(item=>{const owned=rewards.owned.includes(item.id),equipped=rewards.equipped===item.id;return `<article class="wardrobe-item ${equipped?'equipped':''}"><div class="item-symbol item-${item.id}">${item.symbol}</div><h3>${item.name}</h3><p>${item.description}</p><button class="${owned?'secondary':'primary'}-button" ${equipped||!owned&&rewards.hearts<item.cost?'disabled':''} data-item="${item.id}" data-owned="${owned}">${equipped?'착용 중':owned?'착용하기':`♥ ${item.cost} · 열고 착용`}</button>${!owned&&rewards.hearts<item.cost?`<small>하트 ${item.cost-rewards.hearts}개 더 모으면 돼</small>`:''}</article>`;}).join('')}</div><div class="wardrobe-footer"><button class="text-button" data-action="unequip" ${!rewards.equipped?'disabled':''}>기본 모습으로</button><span>한 번 연 아이템은 다시 하트를 쓰지 않아요.</span></div><p class="caption">${rewardHelp().cycle}</p>`,true);
}
function renderTodos(){
 const today=localDate(),tomorrow=addDays(today,1),weekday=asDate(today).getDay(),monday=addDays(today,-((weekday+6)%7)),sunday=addDays(monday,6);
 const dates=Array.from({length:7},(_,i)=>addDays(monday,i));
 let filtered=tasks.filter(t=>filter==='all'?true:filter==='week'?t.date>=monday&&t.date<=sunday:filter==='tomorrow'?t.date===tomorrow:filter==='day'?t.date===selectedDay:t.date===today).sort((a,b)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
 const overdue=tasks.filter(t=>!t.done&&t.deadline&&t.deadline<today).length;
 const names={today:'오늘',tomorrow:'내일',week:'이번 주',all:'전체',day:displayDate(selectedDay)};
 $('#main').innerHTML=`<section class="todos-page"><div class="todo-title"><div><h1>내 일정</h1><p>오늘 해야 할 일부터 하나씩 확인하세요.</p></div><button class="secondary-button" data-action="chat">${icon('plus')} 대화에서 추가</button></div>${scheduleTabs()}<div class="todo-stats"><div><span>남은 할 일</span><strong>${tasks.filter(t=>!t.done).length}<small>개</small></strong></div><div><span>오늘 할 일</span><strong>${tasks.filter(t=>!t.done&&t.date===today).length}<small>개</small></strong></div><div><span>완료한 일</span><strong>${tasks.filter(t=>t.done).length}<small>개</small></strong></div></div>${overdue?`<div class="overdue-alert">${icon('clock')} 규정상 마감이 지난 미완료 업무가 ${overdue}개 있어요. <button class="text-button" data-filter="all">전체 보기</button></div>`:''}<div class="todo-controls"><div class="segmented">${['today','tomorrow','week','all'].map(f=>`<button class="${filter===f?'selected':''}" data-filter="${f}">${names[f]}</button>`).join('')}</div><span>${displayDate(today)} 기준</span></div><div class="week-strip">${dates.map(d=>`<button data-day="${d}" class="${(filter==='today'?d===today:filter==='tomorrow'?d===tomorrow:filter==='day'&&d===selectedDay)?'selected':''}"><span>${asDate(d).toLocaleDateString('ko-KR',{weekday:'short'})}</span><strong>${asDate(d).getDate()}</strong><i class="${tasks.some(t=>!t.done&&t.date===d)?'has-task':''}"></i></button>`).join('')}</div><div class="list-heading"><h2>${names[filter]}의 할 일 <span>${filtered.length}</span></h2><span>완료하면 체크해 주세요</span></div><div class="task-list">${filtered.length?filtered.map(t=>`<article class="task-row ${t.done?'done':''}"><input type="checkbox" aria-label="${esc(t.title)} 완료" data-complete="${t.id}" ${t.done?'checked':''}><div class="task-detail"><div class="task-top"><h3>${esc(t.title)}</h3>${badge(t.type,t.type==='규정 기한'?'blue':'')}</div><p>${esc(t.planLabel||'국내 출장 준비')} · ${displayDate(t.tripStart)} 기준</p><small>${esc(t.note)}</small><div class="task-meta">${t.ref?`<button class="source-inline" data-source="${t.ref}">${icon('book')} 근거 보기</button>`:''}${t.deadline?`<span class="${!t.done&&t.deadline<today?'overdue':''}">마감 ${displayDate(t.deadline)}</span>`:''}</div></div><label class="task-date">작업일<input type="date" value="${t.date}" data-task-date="${t.id}" aria-label="${esc(t.title)} 작업일"></label><button class="icon-button delete-task" data-delete="${t.id}" aria-label="${esc(t.title)} 삭제">${icon('trash')}</button></article>`).join(''):`<div class="empty-state">${icon('list')}<h3>${tasks.length?'이 날짜에는 등록된 할 일이 없어요.':'아직 등록한 계획이 없어요.'}</h3><p>${tasks.length?'다른 날짜나 전체 목록을 확인해 보세요.':'챗봇에게 출장 준비 일정을 물어보고 할 일로 추가해 보세요.'}</p><button class="secondary-button" data-action="sample-plan">출장 준비 계획 만들기 ${icon('arrow')}</button></div>`}</div><p class="local-note">${icon('info')} 이 브라우저에 저장되며, 캘린더와 함께 표시됩니다.</p></section>`;
}
function openModal(content,wide=false){const m=$('#modal');if(!m.open)dialogOpener=document.activeElement;m.className=wide?'wide':'';m.innerHTML=`<button class="icon-button modal-close" data-action="close-modal" aria-label="닫기">${icon('close')}</button>${content}`;if(!m.open)m.showModal();}
function closeModal(){ $('#modal').close();dialogOpener?.focus(); }
function openSource(id){const r=reference(id,allDocs());if(!r)return;openModal(`<div class="modal-eyebrow">${icon('book')} 근거 원문</div><h2 id="modal-title">${esc(r.doc.title)}</h2><p class="modal-sub">${esc(r.doc.version)} · ${categoryLabels[r.doc.category]||''}</p><div class="source-document">${r.doc.sections.map(s=>`<section class="${s.id===id?'highlight':''}"><h3>${esc(s.label)}</h3><p>${esc(s.text)}</p>${s.id===id?'<span class="source-marker">이 답변의 근거</span>':''}</section>`).join('')}</div>`);requestAnimationFrame(()=>$('.source-document .highlight')?.scrollIntoView({block:'nearest'}));}
function backgroundState(){
 const uploaded=read('om-bg-'+mode,null);
 const saved=read('om-bg-theme-'+mode,null);
 const id=saved||(uploaded?'custom':'cafe');
 if(id==='custom'&&typeof uploaded==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(uploaded))return {id,label:'나만의 공간',url:uploaded};
 const preset=backgroundPresets.find(p=>p.id===id);
 return preset?{...preset,url:root+'assets/'+preset.file}:{id:'white',label:'하얀 작업실',url:null};
}
function showBackground(){
 const current=backgroundState();
 openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('background')}<p class="modal-sub">냥대리 뒤에 놓일 풍경을 선택하세요.</p><div class="background-presets">${backgroundPresets.map(p=>`<button class="background-option ${current.id===p.id?'chosen':''}" data-background="${p.id}" aria-pressed="${current.id===p.id}"><span class="background-thumb" style="background-image:url('${root}assets/${p.file}')">${current.id===p.id?`<span class="background-check">${icon('check')}</span>`:''}</span><span class="background-option-name">${p.label}${p.id==='cafe'?'<em>기본</em>':''}</span><small>${p.caption}</small></button>`).join('')}</div><div class="background-other"><button class="white-background-option ${current.id==='white'?'chosen':''}" data-background="white" aria-pressed="${current.id==='white'}"><span></span>흰색 배경${current.id==='white'?icon('check'):''}</button><label class="secondary-button file-button">${icon('picture')} 내 이미지 올리기<input type="file" id="bg-upload" accept="image/png,image/jpeg,image/webp,image/gif"></label></div>${current.id==='custom'?'<p class="custom-background-status">현재 내가 올린 이미지를 사용 중이에요.</p>':''}<p class="caption">이미지 업로드: JPG, PNG, WebP, GIF · 최대 8MB<br>배경 선택은 이 브라우저에 저장돼요.</p>`,true);
}
function applyBackground(){
 const bg=backgroundState();
 document.documentElement.style.setProperty('--user-bg',bg.url?`url("${bg.url}")`:'none');
 document.body.classList.toggle('custom-bg',!!bg.url);
 document.body.dataset.background=bg.id;
 const label=$('[data-room-label]');if(label)label.textContent=bg.label;
}
async function loadBackground(file){if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>8*1024*1024){toast('8MB 이하의 JPG, PNG, WebP, GIF 이미지를 골라주세요.');return;}try{const image=await createImageBitmap(file),canvas=document.createElement('canvas');const ratio=Math.min(1,1600/image.width,1200/image.height);canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();if(save('om-bg-'+mode,canvas.toDataURL('image/webp',.8))&&save('om-bg-theme-'+mode,'custom')){applyBackground();closeModal();toast('내 이미지로 배경을 바꿨어요.');}}catch{toast('이 이미지를 읽을 수 없어요. 다른 파일을 골라주세요.');}}


// Start on press, not release. A drag and its trailing click are one stroke.
document.addEventListener('pointerdown',e=>{
 const button=e.target.closest('.pet-touch');
 if(!button||!e.isPrimary||e.button!==0)return;
 petGesture={id:e.pointerId,button,x:e.clientX,y:e.clientY,distance:0};
 button.setPointerCapture(e.pointerId);button.classList.add('is-stroking');
 ignorePetClickUntil=Infinity;
 petCat();
});
document.addEventListener('pointermove',e=>{
 if(!petGesture||e.pointerId!==petGesture.id)return;
 petGesture.distance+=Math.hypot(e.clientX-petGesture.x,e.clientY-petGesture.y);
 petGesture.x=e.clientX;petGesture.y=e.clientY;
 const box=petGesture.button.getBoundingClientRect();
 petGesture.button.style.setProperty('--stroke-x',`${e.clientX-box.left}px`);
 petGesture.button.style.setProperty('--stroke-y',`${e.clientY-box.top}px`);
});
function endPetGesture(e,cancelled=false){
 if(!petGesture||e.pointerId!==petGesture.id)return;
 const {button}=petGesture;petGesture=null;button.classList.remove('is-stroking');
 if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
 ignorePetClickUntil=performance.now()+500;
}
document.addEventListener('pointerup',e=>endPetGesture(e));
document.addEventListener('pointercancel',e=>endPetGesture(e,true));
document.addEventListener('lostpointercapture',e=>endPetGesture(e,true));
// 클릭 처리. 게시판·로그인·출석·좋아요 버튼(COMMUNITY_CLICK_SELECTOR)은 community-ui.js가, 나머지는 여기서 맡는다.
// 1) 속성 표: 위에서부터 처음 맞는 하나만 실행한다(문자열은 그 data-* 값이 있을 때, 함수는 그 결과로 판별).
// 2) 속성 표에 맞는 것이 없으면 data-action 값으로 actionHandlers를 실행한다.
const attributeHandlers=[
 ['knowlyDoc',(b,e)=>{openLibrary(`/docs/${encodeURIComponent(b.dataset.knowlyDoc)}${b.dataset.chunk?`?chunk=${encodeURIComponent(b.dataset.chunk)}`:''}`);}],
 ['knowlyVote',(b,e)=>{voteKnowly(b.dataset.message,b.dataset.knowlyVote);}],
 ['removeAttach',(b,e)=>{chat.draft=$('#question-form textarea')?.value??chat.draft;attachments=attachments.filter(a=>a.id!==b.dataset.removeAttach);render();}],
 [b=>b.dataset.action==='attach',(b,e)=>{$('#knowly-attach')?.click();}],
 ['customize',(b,e)=>{({outfit:showWardrobe,background:showBackground,motion:showMotion}[b.dataset.customize])?.();}],
 ['selectCategory',(b,e)=>{chat.category=b.dataset.selectCategory;closeModal();render();$('#question-form textarea')?.focus();}],
 ['scheduleView',(b,e)=>{view=b.dataset.scheduleView;scheduleView=view;render();}],
 ['activityTab',(b,e)=>{activityTab=b.dataset.activityTab;render();}],
 ['historyOpen',(b,e)=>{openHistory(b.dataset.historyOpen);}],
 ['saveAnswer',(b,e)=>{const r=chat.messages.find(m=>m.result?.messageId===b.dataset.saveAnswer)?.result;if(r&&!history.some(x=>x.id===r.messageId)){const next=recordAnswer(history,r);if(!saveMine('om-question-history',next))return;history=next;}try{const next=toggleSaved(history,b.dataset.saveAnswer);if(saveMine('om-question-history',next)){history=next;render();toast(history.find(x=>x.id===b.dataset.saveAnswer)?.saved?'내 활동에 답변을 저장했어요.':'답변 저장을 해제했어요.');}}catch(e){toast(e.message);}}],
 ['activityPost',(b,e)=>{const post=communityState().posts?.find(p=>p.id===b.dataset.activityPost);if(post){const next={...seenReplies,[post.id]:post.replies.length};if(saveMine('om-seen-replies',next))seenReplies=next;showMyPost(post.id);}}],
 ['heart',async (b,e)=>{if(await commitReward({type:'collect',id:b.dataset.heart})){refreshPet();toast('하트 +1 ♥ · 꾸미기에 쓸 수 있다냥.');if(!rewards.pending.length){$('.resident-speech h1')?.replaceChildren(voice().heart);$('.resident-speech p')?.replaceChildren(voice().heartDetail);clearTimeout(happyTimer);happyTimer=setTimeout(()=>{happyUntil=0;refreshPet();},3500);}}}],
 ['item',async (b,e)=>{if(await commitReward({type:b.dataset.owned==='true'?'equip':'buy',id:b.dataset.item})){refreshPet();showWardrobe();toast('제법 잘 어울린다냥!');}}],
 ['answerPanel',(b,e)=>{const r=chat.messages.find(m=>m.result?.messageId===b.dataset.message)?.result;if(r){r.expandedPanel=r.expandedPanel===b.dataset.answerPanel?null:b.dataset.answerPanel;render();$(`[data-answer-panel="${b.dataset.answerPanel}"][data-message="${r.messageId}"]`)?.focus({preventScroll:true});}}],
 ['consent',(b,e)=>{const r=chat.messages.find(m=>m.result?.messageId===b.dataset.message)?.result;if(r&&r.decision!=='added'){r.decision=b.dataset.consent;render();requestAnimationFrame(()=>{const form=$(`[data-plan-form="${r.messageId}"]`);if(form){form.querySelector('input')?.focus({preventScroll:true});form.scrollIntoView({block:'nearest'});}else $(`[data-consent][data-message="${r.messageId}"]`)?.focus({preventScroll:true});});}}],
 ['openPlan',(b,e)=>{calendarDay=b.dataset.openPlan;calendarMonth=calendarDay.slice(0,7);view='calendar';scheduleView='calendar';render();}],
 ['month',(b,e)=>{const [y,m]=calendarMonth.split('-').map(Number);calendarMonth=localDate(new Date(y,m-1+Number(b.dataset.month),1,12)).slice(0,7);render();}],
 ['calendarDay',(b,e)=>{calendarDay=b.dataset.calendarDay;render();}],
 ['background',(b,e)=>{if(save('om-bg-theme-'+mode,b.dataset.background)){applyBackground();closeModal();toast(backgroundState().label+' 배경으로 바꿨어요.');}}],
 ['source',(b,e)=>{openSource(b.dataset.source);}],
 ['question',(b,e)=>{if($('#modal').open)closeModal();chat.category=b.dataset.cat;ask(b.dataset.question);}],
 ['switchCategory',(b,e)=>{chat.category=b.dataset.switchCategory;ask(b.dataset.retry,false);}],
 ['filter',(b,e)=>{filter=b.dataset.filter;render();}],
 ['day',(b,e)=>{selectedDay=b.dataset.day;filter='day';render();}],
 ['delete',(b,e)=>{const next=tasks.filter(t=>t.id!==b.dataset.delete);if(saveMine('om-tasks',next)){tasks=next;render();toast('할 일을 삭제했어요.');}}],
 ['postQuestion',(b,e)=>{const r=chat.messages.find(m=>m.result?.messageId===b.dataset.postQuestion)?.result;if(r)showPostDialog(r);}],
 ['chatSettings',(b,e)=>{showChatSettings(b.dataset.chatSettings);}],
 [b=>b.dataset.action==='rename-chat-folder',(b,e)=>{showRenameFolder();}],
 [b=>b.dataset.action==='toggle-chat-folders',(b,e)=>{const list=$('#chat-existing-folders');if(!list)return;list.hidden=!list.hidden;b.setAttribute('aria-expanded',String(!list.hidden));}],
 [b=>b.hasAttribute('data-chat-folder-choice'),(b,e)=>{const input=$('#chat-custom-folder'),list=$('#chat-existing-folders');if(!input||!list)return;input.value=b.dataset.chatFolderChoice;list.hidden=true;$('[data-action="toggle-chat-folders"]')?.setAttribute('aria-expanded','false');input.focus();}],
 ['chatDelete',(b,e)=>{showDeleteChat(b.dataset.chatDelete);}],
 ['chatDeleteConfirm',(b,e)=>{deleteChat(b.dataset.chatDeleteConfirm);}],
 ['chatOpen',(b,e)=>{openChat(b.dataset.chatOpen,b.dataset.chatMessage||null);}],
 ['personality',(b,e)=>{if(!canEarnRewards(communityState()))return;const next=normalizePersonality(b.dataset.personality);if(!saveMine('om-personality',next))return;personality=next;petInteraction.reset();closeModal();render();companionBehavior.greet(personality);toast(voice().label+'로 바꿨어요.');}]
];
const actionHandlers={
 personality:(b,e)=>{showPersonality();},
 'toggle-chat-history':(b,e)=>{chatHistoryCollapsed=!chatHistoryCollapsed;render();},
 'login-pet':(b,e)=>{reactLoginPet();},
 logout:async (b,e)=>{await logoutAccount();},
 account:(b,e)=>{const me=communityState().me;openModal('<div class="account-menu"><h2 id="modal-title">내 계정</h2><strong>'+esc(me.username)+' · '+(isStaff(communityState())?'담당자':'직원')+'</strong><p>'+ (isStaff(communityState())?'질문 게시판 관리와 통계에 접근할 수 있어요.':'포인트와 보상은 이 브라우저에만 저장돼요.<br>다른 기기·브라우저에서는 새로 시작해요.') +'</p><p>Knowly 개인 계정으로 연결되어 있어요.<br>대화와 보상은 계정별로 구분됩니다.</p><button class="primary-button" data-action="logout">로그아웃</button></div>');},
 library:(b,e)=>{openLibrary();},
 unanswered:(b,e)=>{if(isStaff(communityState()))showView('unanswered');},
 faq:(b,e)=>{if(isStaff(communityState()))showView('faq');},
 documents:(b,e)=>{if(isStaff(communityState()))showView('documents');},
 users:(b,e)=>{if(isStaff(communityState()))showView('users');},
 model:(b,e)=>{if(isStaff(communityState()))showView('model');},
 statistics:(b,e)=>{if(isStaff(communityState()))showView('statistics');},
 'toggle-theme':(b,e)=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';applyColorTheme(next);save('nyang-color-theme',next);},
 pet:(b,e)=>{if(e.detail===0||performance.now()>=ignorePetClickUntil)petCat();},
 reset:(b,e)=>{resetChat();},
 'choose-category':(b,e)=>{showCategories();},
 schedule:(b,e)=>{petInteraction.reset();view=scheduleView;render();$('#main').scrollTop=0;},
 activity:(b,e)=>{refreshCommunity();if(view!=='activity')petInteraction.reset();view='activity';render();$('#main').scrollTop=0;},
 chat:(b,e)=>{if(view!=='chat')petInteraction.reset();view='chat';render();$('#main').scrollTop=0;},
 todos:(b,e)=>{if(view!=='todos')petInteraction.reset();view='todos';render();$('#main').scrollTop=0;},
 calendar:(b,e)=>{if(view!=='calendar')petInteraction.reset();view='calendar';render();$('#main').scrollTop=0;},
 board:(b,e)=>{if(view!=='board')petInteraction.reset();view='board';render();$('#main').scrollTop=0;},
 'calendar-today':(b,e)=>{calendarMonth=localDate().slice(0,7);calendarDay=localDate();render();},
 'chat-examples':(b,e)=>{showChatExamples();},
 'sample-plan':(b,e)=>{view='chat';ask('출장 준비 일정을 짜주세요');},
 feed:async (b,e)=>{if(await commitReward({type:'feed'})){petInteraction.reset();happyUntil=Date.now()+6000;companionBehavior.feed(personality);refreshPet();$('.resident-speech h1')?.replaceChildren(voice().feed);$('.resident-speech p')?.replaceChildren(voice().feedDetail);toast(`츄르 고맙다냥! 주변 하트 ${HEARTS_PER_TREAT}개를 눌러 모아보라냥.`);}},
 wardrobe:(b,e)=>{showWardrobe();},
 unequip:async (b,e)=>{if(await commitReward({type:'equip',id:null})){refreshPet();showWardrobe();}},
 docs:(b,e)=>{if(communityState().member)openLibrary();},
 background:(b,e)=>{showBackground();},
 'toggle-motion':(b,e)=>{const moving=!read('om-cat-motion',true);if(save('om-cat-motion',moving)){document.body.classList.toggle('motion-paused',!moving);b.setAttribute('aria-pressed',String(moving));b.setAttribute('aria-label',moving?'고양이 움직임 끄기':'고양이 움직임 켜기');b.innerHTML=`<span class="motion-mark">${moving?'Ⅱ':'▷'}</span><span>${moving?'움직임 끄기':'움직임 켜기'}</span>`;}},
 'close-modal':(b,e)=>{closeModal();}
};
/** 담당자 화면(Knowly 관리 화면·이용통계)으로 옮긴다. */
function showView(name){view=name;petInteraction.reset();render();$('#main').scrollTop=0;}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a[data-action]');if(!b||b.disabled||b.matches(COMMUNITY_CLICK_SELECTOR))return;
 for(const [match,handler] of attributeHandlers)if(typeof match==='string'?b.dataset[match]:match(b)){await handler(b,e);return;}
 const action=b.dataset.action;
 if(action&&Object.hasOwn(actionHandlers,action))await actionHandlers[action](b,e);
});
// submit 처리: #activity-search, #question-form, [data-plan-form], #chat-settings-form, #chat-folder-form.
// 로그인·게시판 검색·익명 질문·담당자 답변 폼은 community-ui.js가 맡는다.
document.addEventListener('submit',e=>{
 if(['chat-settings-form','chat-folder-form'].includes(e.target.id)){e.preventDefault();submitChatSettings(e.target);return;}
 if(e.target.id==='activity-search'){e.preventDefault();activityQuery=String(new FormData(e.target).get('query')||'').trim();render();return;}
 if(e.target.id==='question-form'){e.preventDefault();const text=new FormData(e.target).get('question');ask(text);}
 if(e.target.dataset.planForm){
  e.preventDefault();const r=chat.messages.find(m=>m.result?.messageId===e.target.dataset.planForm)?.result;
  if(!r||r.decision!=='yes')return;
  const fd=new FormData(e.target),start=fd.get('start'),end=fd.get('end')||start;
  if(scheduleMode(r)==='todo'){addTodo(r,String(fd.get('title')||'').trim().slice(0,80),String(start||''));return;}
  try{const items=makeSchedule(r.scheduleType,start,end),result=mergeSchedule(tasks,{type:r.scheduleType,start,end,items},()=>crypto.randomUUID());
   if(saveMine('om-tasks',result.tasks)){tasks=result.tasks;r.start=start;r.end=end;r.items=items;r.decision='added';render();toast(result.added?`${result.added}개의 할 일을 내 일정에 넣었어.`:'이미 캘린더에 챙겨 둔 일정이야.');}
  }catch(err){toast(err.message);}
 }
});
document.addEventListener('input',e=>{if(e.target.matches('#question-form textarea')){chat.draft=e.target.value;resizeComposer();}});
document.addEventListener('keydown',e=>{if(e.target.matches('#question-form textarea')&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit();}});
document.addEventListener('change',async e=>{
 if(e.target.id==='knowly-attach'){const files=[...e.target.files];e.target.value='';if(files.length)addAttachments(files);return;}
 if(e.target.id==='chat-history-folder'){chatHistoryFolder=e.target.value;$('.chat-history').outerHTML=chatHistoryHTML();$('#chat-history-folder')?.focus({preventScroll:true});return;}
 if(e.target.id==='chat-history-category'){
  chatHistoryCategory=categories.some(c=>c.id===e.target.value)?e.target.value:'all';
  $('.chat-history').outerHTML=chatHistoryHTML();$('#chat-history-category')?.focus({preventScroll:true});return;
 }
 if(e.target.closest('[data-plan-form]')){const form=e.target.closest('[data-plan-form]'),r=chat.messages.find(m=>m.result?.messageId===form.dataset.planForm)?.result;if(r&&scheduleMode(r)==='todo'){r.todoTitle=form.elements.title.value;r.todoDate=form.elements.start.value;}else if(r){r.start=form.elements.start.value;if(form.elements.end){form.elements.end.min=r.start;if(form.elements.end.value<r.start)form.elements.end.value=r.start;r.end=form.elements.end.value;}else r.end=r.start;form.querySelector('.schedule-preview').innerHTML=schedulePreview(r);}}
 if(e.target.id==='active-category'){chat.category=e.target.value;toast(`${categoryOf(chat.category).label} 분야로 변경했어요.`);}
 if(e.target.dataset.complete){const next=tasks.map(t=>t.id===e.target.dataset.complete?{...t,done:e.target.checked}:t);if(saveMine('om-tasks',next)){tasks=next;render();}}
 if(e.target.dataset.taskDate){if(!e.target.value)return;const next=tasks.map(t=>t.id===e.target.dataset.taskDate?{...t,date:e.target.value}:t);if(saveMine('om-tasks',next)){tasks=next;render();toast('작업일을 바꿨어요. 규정상 마감은 유지됩니다.');}}
 if(e.target.id==='bg-upload')await loadBackground(e.target.files[0]);
});
/** 로그인 계정이 바뀌면(로그인·로그아웃·다른 계정) 계정별 상태를 한 번에 바꾸고 그 계정의 기록을 다시 읽는다. */
function resetForAccount(next,state){
 clearTimeout(chat.replyTimer);petInteraction.reset();
 if($('#modal').open)closeModal();
 activeAccount=next;
 chat=newChat();chats=[];chatHistoryCollapsed=false;chatHistoryCategory='all';chatHistoryFolder='all';
 view='chat';activityTab='recent';activityQuery='';
 personality=normalizePersonality(next?readMine('om-personality','cold'):'cold');
 uploads=readMine('om-docs',[]);tasks=readMine('om-tasks',[]);history=normalizeHistory(readMine('om-question-history',[]));seenReplies=readSeenReplies();
 if(canEarnRewards(state)){
  const stored=readMine('om-chat-sessions',null);chats=stored===null?importQuestionHistory(history):normalizeChats(stored);
  const selected=chats.find(x=>x.id===readMine('om-chat-active',null));
  if(selected)chat=newChat({id:selected.id,messages:structuredClone(selected.messages),category:selected.category});
 }
 rewards=state.wallet||{...normalizeRewards(null),treatTokens:0};
}
shell();
initCommunity({
 toast,modal:openModal,close:closeModal,render,
 show(next){view=next;render();$('#main').scrollTop=0;},
 update(state){
  const next=state.member?(state.me.id||state.me.username):null;
  if(next!==activeAccount){resetForAccount(next,state);render();if(canEarnRewards(state))companionBehavior.greet(personality);return;}
  if(!state.member){render();return;}
  rewards=state.wallet||{...normalizeRewards(null),treatTokens:0};updateWallet();refreshPet();if(['activity','board'].includes(view)&&!$('#modal').open)render();}
});

function submitChatSettings(form){
 if(!canEarnRewards(communityState()))return;
 const data=new FormData(form);saveCurrentChat();
 const folder=String(data.get('folder')||'').trim();
 if(form.id==='chat-folder-form'&&!folder){toast('폴더 이름을 입력해 주세요.');return;}
 if(form.id==='chat-settings-form'&&!chats.some(x=>x.id===form.dataset.threadId))return;
 const next=form.id==='chat-settings-form'?updateChatDetails(chats,form.dataset.threadId,{customTitle:String(data.get('customTitle')||''),folder}):renameChatFolder(chats,form.dataset.folder,folder);
 if(!saveMine('om-chat-sessions',next))return;
 chats=next;
 if(chatHistoryFolder!=='all')chatHistoryFolder='folder:'+folder;
 closeModal();render();toast(form.id==='chat-settings-form'?'대화 제목과 폴더를 저장했어요.':'폴더 이름을 변경했어요.');
}
