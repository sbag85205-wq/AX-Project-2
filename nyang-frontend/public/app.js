import {createReactionPicker} from './reaction-variety.js?v=115ea2f34987';
import {createCompanionBehavior,companionAppearance} from './companion-behavior.js?v=ef11f91be08e';
import {normalizePersonality,personalities,personalityText,personalityAnswer,petAppearance} from './personality.js?v=32786256695d';
import {normalizeChats,rememberChat,removeChat,importQuestionHistory,questionsByCategory,chatFolders,updateChatDetails,renameChatFolder} from './chat-history.js?v=06e0b81b016b';
import {adminView} from './admin-view.js?v=d3650a3b26a4';
import {initCommunity,communityState,communityAction,refreshCommunity,activityHTML,boardHTML,unknownOffer,showPostDialog,showMyPost,accountGateHTML,statsHTML,loadStatistics,logoutAccount} from './community-ui.js?v=4c3d0f2d22e9';
import {categories,documents,faq,answers,reference,resolveQuestion,localDate,addDays,asDate,nextFriday,displayDate,makePlan} from './core.js?v=0ff57cf675c0';
import {QUESTION_POINTS,TREAT_COST,PET_COOLDOWN_MS,PET_BONUS_POINTS,petOutcome,wardrobe,normalizeRewards,rewardTransition,scheduleTypes,scheduleTypeFor,makeSchedule,mergeSchedule} from './companion.js?v=7d55f062fd27';
import {createPetInteraction} from './pet-interaction.js?v=355c0da8eb14';
import {normalizeHistory,recordAnswer,toggleSaved,unseenReplies} from './activity-history.js?v=7e17914f64fb';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mode=document.body.dataset.mode;
const isCat=mode==='cat';
const root=mode==='home'?'./':'../';
const paths={spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',chat:'M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-4-.9L3 21l1.7-5a8.5 8.5 0 1 1 16.3-4.5Z',list:'m3 6 1 1 2-2M10 6h11M3 12l1 1 2-2m4 1h11M3 18l1 1 2-2m4 1h11',book:'M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V6a3 3 0 0 1 1-3ZM3 17h17M7 7h9M7 11h7',arrow:'M5 12h14m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',wallet:'M20 8H5a3 3 0 0 1 0-6h13v6M3 5v14a2 2 0 0 0 2 2h15V8m0 5h-5v4h5',case:'M3 7h18v14H3V7Zm5 0V3h8v4M3 12l9 3 9-3M10 12h4',coffee:'M3 7h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7Zm13 1h3a3 3 0 0 1 0 6h-3M6 2v2m5-2v2',picture:'M3 3h18v18H3V3Zm0 14 6-6 5 5 3-3 4 4M8 7h.01',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',send:'M12 19V5m-6 6 6-6 6 6',plus:'M12 5v14M5 12h14',back:'M19 12H5m6-6-6 6 6 6',calendar:'M3 5h18v16H3V5Zm4-3v6m10-6v6M3 11h18',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',info:'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',menu:'M4 6h16M4 12h16M4 18h16',clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',logout:'M9 4H4v16h5m5-13 5 5-5 5m-6-5h12'};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
const cat=(mood='',extra='')=>`<div class="cat-art ${mood} ${extra}" role="img" aria-label="${mood==='annoyed'?'귀찮은 표정의':mood==='happy'?'행복한 표정의':'차갑지만 귀여운'} 고양이 냥대리"></div>`;
paths.settings='M9 3h6l1 3 3 1v6l-3 1-1 3H9l-1-3-3-1V7l3-1 1-3ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z';
paths.moon='M20.9 13.1A9 9 0 0 1 10.9 3a9 9 0 1 0 10 10.1Z';
paths.cat='M5 9 4 3l6 4h4l6-4-1 6a8 8 0 1 1-14 0ZM8 12h.01M16 12h.01m-6 4 2 1 2-1';
paths.activity='M4 20h16M7 16V9m5 7V4m5 12v-5';
paths.shirt='m8 3-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4a4 4 0 0 1-8 0Z';
let activeAccount=null;
let adminQuery='',adminCategory='all',documentQuery='',documentCategory='all';
const personalKeys=new Set(['om-docs','om-tasks','om-question-history','om-seen-replies','om-chat-sessions','om-chat-active','om-personality']);
const storageKey=key=>personalKeys.has(key)?'nyang-account:'+(activeAccount||'signed-out')+':'+key:key;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(storageKey(key)))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(storageKey(key),JSON.stringify(value));return true;}catch{toast('브라우저 저장 공간이 부족해 저장하지 못했어요.');return false;}}
let uploads=read('om-docs',[]),tasks=read('om-tasks',[]),messages=[],category=isCat?null:'trip',mood='',view='chat',filter='today',selectedDay=localDate(),plan=null,dialogOpener=null;
let chats=[],activeChatId=null,chatHistoryCollapsed=false,chatHistoryCategory='all',chatHistoryFolder='all',historyMessageId=null;
let chatDraft='',pendingReply=null,replyTimer=null,heroTransition=null;
let history=normalizeHistory(read('om-question-history',[])),activityTab='recent',activityQuery='',seenReplies=read('om-seen-replies',{}),scheduleView='todos';
if(!seenReplies||typeof seenReplies!=='object')seenReplies={};
const allDocs=()=>[...documents,...uploads];
const badge=(text,cls='')=>`<span class="badge ${cls}">${text}</span>`;
function toast(text){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
const systemColorTheme=matchMedia('(prefers-color-scheme: dark)');
function applyColorTheme(theme){
 const dark=theme==='dark';
 document.documentElement.dataset.theme=dark?'dark':'light';
 $('meta[name="theme-color"]')?.setAttribute('content',dark?'#111214':'#ffffff');
 const button=$('[data-action="toggle-theme"]');
 if(button){button.setAttribute('aria-pressed',String(dark));button.title=dark?'라이트 모드로 전환':'다크 모드로 전환';button.innerHTML=icon(dark?'moon':'sun')+`<span aria-hidden="true">${dark?'다크':'라이트'}</span>`;}
}
function preferredColorTheme(){
 const saved=read('nyang-color-theme',null);
 return saved==='dark'||saved==='light'?saved:systemColorTheme.matches?'dark':'light';
}
systemColorTheme.addEventListener('change',()=>applyColorTheme(preferredColorTheme()));
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
    <button data-action="statistics" id="nav-statistics" hidden>${icon('activity')}<span>이용통계</span></button>
    <button data-action="faq" id="nav-faq" hidden>FAQ 관리</button>
    <button data-action="documents" id="nav-documents" hidden>문서 관리</button>
    <button data-action="users" id="nav-users" hidden>사용자 관리</button>
    <button data-action="model" id="nav-model" hidden>검색 모델 설정</button>
   </nav>
   <div class="header-account"><div id="wallet" class="wallet" aria-label="보유 포인트와 하트"></div></div>
  </header>
  <div class="main-shell">
   <header class="topbar workspace-toolbar"><div class="workspace-context"><span id="workspace-title">물어보기</span></div><div class="top-actions"><div class="workspace-utilities"><button data-action="personality" id="personality-button" aria-label="냥대리 성격 설정">${icon('moon')}<span>차가운 모드</span></button><button data-action="docs">${icon('book')}<span>참고 자료</span></button><button data-action="wardrobe">${icon('shirt')}<span>꾸미기</span></button></div><button class="appearance-button theme-toggle" data-action="toggle-theme" aria-label="다크 모드" aria-pressed="false" title="다크 모드로 전환">${icon('moon')}</button></div></header>
   <main class="main-content cat-mode" id="main"></main>
   <footer class="bottom-note"><span id="page-title" class="visually-hidden"></span><span>회사 샘플 자료로 체험하고 있어요.</span><button data-action="docs">참고 자료 보기 ${icon('chevron')}</button></footer>
  </div>
 </div><dialog id="modal" aria-labelledby="modal-title"></dialog>`;
 applyColorTheme(preferredColorTheme());applyBackground();render();
}
function updateWallet(){
 $('#wallet').hidden=communityState().me?.role==='staff';
 $('#wallet').innerHTML=`<button class="wallet-level" data-action="activity">${communityState().member?'Lv. '+communityState().level.level:'내 활동'}</button><span title="새 질문 +10 P · 하루 최대 20개"><i>P</i><strong id="points-balance">${rewards.points}</strong></span><span title="츄르를 주고 하트를 눌러 모아요"><i class="heart-mark">♥</i><strong id="hearts-balance">${rewards.hearts}</strong></span>`;
 const count=tasks.filter(t=>!t.done).length;$('#task-count').textContent=count||'';
 const unread=unseenReplies(communityState().posts,seenReplies).length,indicator=$('#activity-unread');
 indicator.hidden=!unread;indicator.textContent=unread;indicator.setAttribute('aria-label','새 답변이 달린 내 질문 '+unread+'개');
}
function render(){
 document.body.dataset.personality=personality;
 const personalityButton=$('#personality-button');if(personalityButton)personalityButton.innerHTML=icon(personality==='warm'?'sun':'moon')+'<span>'+voice().label+'</span>';
 document.body.dataset.view=view;
 const session=communityState(),staff=session.me?.role==='staff';document.body.dataset.authenticated=String(!!session.member);document.body.dataset.role=staff?'staff':'employee';
 for(const name of ['chat','schedule','activity'])$('#nav-'+name).hidden=staff;
 $('#nav-board span').textContent=staff?'미등록 질문':'질문 게시판';
 if(staff&&!['board','statistics','faq','documents','users','model'].includes(view))view='board';
 document.body.dataset.view=view;
 for(const name of ['statistics','faq','documents','users','model'])$('#nav-'+name).hidden=!staff;
 if(!session.member){$('#wallet').innerHTML='';$('#account-button').textContent='';$('#workspace-title').textContent='로그인';$('#main').classList.add('work-view');$('#main').innerHTML=accountGateHTML();return;}
 if(['statistics','faq','documents','users','model'].includes(view)&&!staff)view='chat';
 $('#account-button').innerHTML='<span>'+esc(session.me.username)+'</span><small>'+(session.me.role==='staff'?'담당자':'직원')+'</small>';
 $('#account-button').setAttribute('aria-label',session.me.username+' 내 계정');
 $('#workspace-title').textContent={chat:'물어보기',calendar:'내 일정',todos:'내 일정',activity:'내 활동',board:'질문 게시판',statistics:'이용통계',faq:'FAQ 관리',documents:'문서 관리',users:'사용자 관리',model:'검색 모델 설정'}[view];

 const docCount=$('.side-nav [data-action="docs"] .count');if(docCount)docCount.textContent=allDocs().length;
 for(const name of ['chat','schedule','activity','board','statistics','faq','documents','users','model']){const nav=$('#nav-'+name),active=name==='schedule'?['calendar','todos'].includes(view):view===name;nav?.classList.toggle('active',active);if(active)nav?.setAttribute('aria-current','page');else nav?.removeAttribute('aria-current');}
 $('#page-title').textContent={chat:'냥대리에게 물어보기',calendar:'내 캘린더',todos:'내가 해야 할 일',activity:'나의 질문 활동',board:'익명 질문 게시판',statistics:'이용통계',faq:'FAQ 관리',documents:'문서 관리',users:'사용자 관리',model:'검색 모델 설정'}[view];
 if(staff&&view==='board')$('#workspace-title').textContent='미등록 질문';
 $('#main').classList.toggle('work-view',view!=='chat');updateWallet();
 if(['faq','documents','users','model'].includes(view))$('#main').innerHTML=adminView(view,session.me.role,view==='documents'?documentQuery:adminQuery,view==='documents'?documentCategory:adminCategory,allDocs());else if(view==='statistics')$('#main').innerHTML=statsHTML();else if(view==='activity')$('#main').innerHTML=activityHTML(activityContent());else if(view==='board')$('#main').innerHTML=boardHTML();else if(view==='calendar')renderCalendar();else if(view==='todos')renderTodos();else renderCat();
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
 const base=petAppearance(personality,{reaction,happy:happy||companionPhase==='welcome',mood});
 const pose=reaction?petReaction.pose:null;
 const expression=pose?(pose.eyes==='closed'?'':pose.eyes):(appearance.sleepy?'':base.expression);
 const wag=pose?pose.wag:base.wag;
 if(pose){appearance.sleepy=pose.eyes==='closed';appearance.soft=false;appearance.mark=pose.mark;}
 return `<span class="resident-shadow"></span><button class="pet-touch" data-action="pet" aria-label="냥대리 쓰다듬기" aria-busy="${petPending}" aria-describedby="pet-guide" title="클릭하거나 드래그해서 쓰다듬어 주세요"><span class="pet-stroke-mark" aria-hidden="true">✦</span></button><div class="pet-body behavior-${companionPhase} ${pose?'gesture-'+pose.motion:''} ${appearance.soft?'pet-soft-boundary':''} ${petReaction?.affection?'pet-affection':''} ${petMoving?'pet-engaged':''} ${reaction?'pet-'+reaction:happy?'delighted':''}"><div class="pet-resolution">${wag?'<span class="pet-wag-tail" aria-hidden="true"></span>':''}${cat(expression,'resident'+(wag?' pet-bonus-body':'')+(appearance.sleepy?' pet-sleepy':''))}${outfitHTML()}${appearance.mark?`<span class="companion-emote" aria-hidden="true">${appearance.mark}</span>`:''}</div></div><span class="resident-spark spark-one">✧</span><span class="resident-spark spark-two">✦</span><div class="pet-feedback ${reaction?'has-reaction reaction-'+reaction:''}" ${reaction?'':'aria-hidden="true"'}>${reaction?`<span class="pet-feedback-kicker">${reaction==='bonus'?'아주 드문 친밀감 보너스':reaction==='like'?'골골, 기분 좋은가 봐요':personality==='warm'?'지금은 쉬고 싶대요':'오늘은 조금 까칠해요'}</span><strong>${petReaction.line}</strong>${reaction==='bonus'?`<span class="pet-point-pop">+${PET_BONUS_POINTS} <small>P</small></span><small>작은 마음의 표시다냥.</small>`:`<small>${reaction==='like'?(personality==='warm'?'조금 더 함께 있자냥.':'좋아하는 건 비밀이다냥.'):(personality==='warm'?'기다려줘서 고맙다냥.':'잠깐 쉬었다 만나자냥.')}</small>`}`:''}</div>${rewards.pending.map((id,i)=>`<button class="collect-heart heart-${i}" data-heart="${id}" aria-label="하트 ${i+1} 모으기"><span>♥</span><small>+1</small></button>`).join('')}<div class="pet-actions"><button class="treat-button" data-action="feed" ${(rewards.points<TREAT_COST&&!rewards.treatTokens)||rewards.pending.length?'disabled':''}><span class="treat-stick" aria-hidden="true"></span> 츄르 주기 <b>${rewards.treatTokens?`보유 ${rewards.treatTokens}개`:'10 P'}</b></button><span>${rewards.pending.length?'하트를 눌러서 모아달라냥!':rewards.treatTokens?'출석 선물부터 먼저 쓰겠다냥.':rewards.points<TREAT_COST?'질문하면 포인트가 쌓여요':(personality==='warm'?'고맙다냥. 맛있게 먹겠다냥!':'이건… 조금 기대된다냥.')}</span><span class="pet-guide" id="pet-guide">클릭하거나 드래그해서 쓰다듬기</span></div>`;
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
 return `${citation}<div class="answer-tools" role="group" aria-label="답변 더 알아보기">${detail?`<button data-answer-panel="detail" data-message="${r.messageId}" aria-expanded="${panel==='detail'}" aria-controls="${detailId}">${detailLabel} ${icon('down')}</button>`:''}${refs.length>1?`<button data-answer-panel="sources" data-message="${r.messageId}" aria-expanded="${panel==='sources'}" aria-controls="${sourceId}">${icon('book')} 전체 출처 <span class="source-count">${refs.length}</span></button>`:''}<button data-save-answer="${r.messageId}" aria-pressed="${saved}">${icon(saved?'check':'plus')}${saved?'저장됨':'답변 저장'}</button>${r.scheduleType?`<button class="answer-schedule-button" ${r.decision==='added'?`data-open-plan="${r.start}"`:`data-consent="${r.decision==='yes'?'no':'yes'}" data-message="${r.messageId}" aria-expanded="${r.decision==='yes'}" aria-controls="schedule-${r.messageId}"`}>${icon(r.decision==='added'?'check':'calendar')}${r.decision==='added'?'내 일정 보기':r.decision==='yes'?'일정 접기':['annual','half'].includes(r.scheduleType)?'신청 일정 잡기':'일정 잡기'}</button>`:''}</div>${detail?`<div class="answer-detail" id="${detailId}" ${panel==='detail'?'':'hidden'}>${detail}</div>`:''}<div class="answer-source-panel" id="${sourceId}" ${panel==='sources'?'':'hidden'}><p>답변의 근거 · 눌러서 원문 확인</p>${sourceButtons(refs)}</div>`;
}
// main 백엔드(사내 문서 검색) 답변: 기존 답변 카드·도구 모양을 그대로 쓴다.
function knowlyHTML(r){
 const k=r.knowly||{},arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'||typeof x==='string'):[],summary=arr(k.summary),steps=arr(k.steps),cites=arr(k.citations);
 const detail=steps.length?`<ol class="answer-steps">${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:k.details?`<p>${esc(k.details)}</p>`:'';
 const sources=cites.length?`<p class="caption knowly-sources">${icon('book')} 근거 · ${cites.map(c=>esc([c.title,c.version,c.pages].filter(Boolean).join(' · '))).join(' / ')}</p>`:'';
 return `<div class="answer-content"><span class="answer-label">${icon('check')} ${k.mode==='faq'?'FAQ에서 확인한 답변':'사내 문서에서 확인한 답변'}</span><h3>${esc(summary[0]||'')}</h3>${summary.length>1?`<ul class="answer-essentials">${summary.slice(1).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${arr(k.warnings).map(w=>`<p class="caption">${icon('info')} ${esc(w)}</p>`).join('')}${sources}${answerTools(r,[],detail)}</div>`;
}
let knowlyOff=false;
// 서버가 문서 검색에 연결돼 있으면 답을 받아오고, 아니면 null (기존 샘플 답변으로 대체).
async function askKnowly(question){
 if(knowlyOff)return null;
 try{const res=await fetch('/api/knowly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})}),data=await res.json().catch(()=>null);if(res.status===503)knowlyOff=true;return res.ok?data?.answer||null:null;}
 catch{return null;}
}
function resultHTML(r){
 if(r.kind==='answer'){const a=personalityAnswer(answers[r.id],personality),detail=a.steps?`<ol class="answer-steps">${a.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:'';return `<div class="answer-content"><span class="answer-label">${icon('check')} 자료에서 확인한 답변</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>${answerTools(r,a.refs,detail)}</div>`;}
 if(r.kind==='knowly')return knowlyHTML(r);
 if(r.kind==='unknown')return `<div class="answer-content"><span class="answer-label muted">${icon('info')} 확인할 수 없는 내용</span><h3>${isCat?voice().unknown:'현재 자료에서 답을 확인할 수 없습니다.'}</h3><p>${r.personal?'개인별 잔여 연차·급여·계정 정보에는 접근할 수 없어요. 사내 시스템이나 담당 부서에서 확인해 주세요.':isCat?voice().unknownDetail:'현재 샘플 자료에 없거나 체험에서 지원하지 않는 질문입니다. 관련 문서를 확인하거나 담당자에게 문의해 주세요.'}</p></div>${unknownOffer(r)}`;
 if(r.kind==='scope')return `<div class="answer-content"><h3>${isCat?voice().scope:'선택한 분야 밖의 질문입니다.'}</h3><p>지금은 ${categories.find(c=>c.id===(r.category||category))?.label} 자료 안에서 답하고 있어요.</p><button class="secondary-button" data-switch-category="${r.target}" data-retry="${esc(r.q)}">${categories.find(c=>c.id===r.target).label} 분야로 바꿔서 질문 ${icon('arrow')}</button></div>`;
 if(r.kind==='excerpt'){const long=r.text.length>180;return `<div class="answer-content"><span class="answer-label">${icon('book')} 업로드 자료 원문 검색</span><h3>${esc(r.title)}</h3><p class="excerpt">${esc(long?r.text.slice(0,180)+'…':r.text)}</p><p class="caption">${long?'문단 일부예요. ':''}${personality==='warm'?'답변으로 확인된 내용은 아니니 원문을 확인해 주세요.':'답변으로 확인된 내용은 아니니 원문을 확인해 줘.'}</p>${answerTools(r,[r.ref],long?`<p class="excerpt">${esc(r.text)}</p>`:'','문단 펼치기')}</div>`;}
 if(r.kind==='plan')return `<div class="answer-content"><span class="answer-label">${icon('check')} 자료에서 확인한 답변</span><h3>${tone('출장은 출발 3영업일 전까지 신청해.')}</h3><ul class="answer-essentials"><li>팀장 승인 후 교통·숙박 예약</li><li>출장 중 영수증 보관</li><li>복귀 다음 날부터 7일 이내 정산 신청</li></ul>${answerTools(r,['approval','booking','receipt','settle'],tone('<ol class="answer-steps"><li><strong>출장 신청</strong>목적·일정·목적지·예상 비용을 작성하고 팀장 승인을 받아.</li><li><strong>교통·숙박 예약</strong>승인 후 예약하고 확인서를 보관해. 숙박비는 1박 100,000원까지, 초과 비용은 별도 사전 승인이 필요해.</li><li><strong>증빙 보관</strong>결제 날짜·사용처·금액이 보이는 영수증을 챙겨.</li><li><strong>정산 신청</strong>영수증·출장 승인 내역·정산 신청서를 첨부해 팀장에게 승인 요청해.</li></ol>'))}</div>`;
 return '';
}

function scheduleOffer(r){
 if(!r.scheduleType)return '';
 const meta=scheduleTypes[r.scheduleType];
 if(r.decision==='added')return `<div class="schedule-saved" role="status">${icon('check')} ${r.items.length}개의 할 일을 내 일정에 ${personality==='warm'?'넣었어요.':'넣었어.'} <span>${displayDate(r.start)}${meta.endLabel?' — '+displayDate(r.end):''}</span></div>`;
 if(r.decision==='yes')return `<div class="schedule-offer" id="schedule-${r.messageId}"><h3>${voice().schedule}</h3><form class="plan-form" data-plan-form="${r.messageId}"><label>${meta.startLabel}<input type="date" name="start" required value="${r.start}"></label>${meta.endLabel?`<label>${meta.endLabel}<input type="date" name="end" required min="${r.start}" value="${r.end}"></label>`:''}<div class="schedule-preview" data-preview="${r.messageId}">${schedulePreview(r)}</div><button type="submit" class="primary-button">내 일정에 추가 ${icon('calendar')}</button><button type="button" class="text-button" data-consent="no" data-message="${r.messageId}">닫기</button></form><p class="caption">규정 기한과 권장 일정을 구분했어요. 영업일은 주말만 제외해요.<br>이 사이트의 내 일정에 저장됩니다.</p></div>`;
 return `<div id="schedule-${r.messageId}" hidden></div>`;
}
function schedulePreview(r){
 try{return makeSchedule(r.scheduleType,r.start,r.end).map(t=>`<div><span class="${t.date<localDate()?'overdue':''}">${displayDate(t.date)}${t.date<localDate()?' · 지난 날짜':''}</span><strong>${esc(t.title)}</strong><small>${t.type}${t.deadline?' · 마감 '+displayDate(t.deadline):''}</small></div>`).join('');}catch(err){return `<p role="alert">${esc(err.message)}</p>`;}
}
function messageTime(value){return new Date(value||Date.now()).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});}
function miniCat(){return `<div class="message-avatar mini-cat" aria-hidden="true"><div class="pet-body"><div class="pet-resolution">${cat('','resident')}${outfitHTML()}</div></div></div>`;}
function conversation(){
 const lastAssistant=messages.findLastIndex(m=>m.role==='assistant');
 const markup=messages.map((m,i)=>{const day=!i||localDate(new Date(m.at))!==localDate(new Date(messages[i-1].at))?`<div class="chat-day-divider"><span>${new Date(m.at).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})}</span></div>`:'';return day+(m.role==='user'?`<article class="chat-row from-me"><div class="user-message">${esc(m.text)}</div><time>${messageTime(m.at)}</time></article>`:`<article class="chat-row from-nyang assistant-message" data-reply="${m.result.messageId}">${i===lastAssistant&&!pendingReply?'<div class="active-cat-slot"></div>':miniCat()}<div class="chat-message-body"><div class="assistant-name">냥대리 <span>업무 메이트</span>${i===lastAssistant&&!pendingReply?`<div class="chat-rewards inline-cat-rewards">${chatRewards()}</div>`:''}</div><div class="answer-wrap">${resultHTML(m.result)}${scheduleOffer(m.result)}</div><time>${messageTime(m.at)}</time></div></article>`);}).join('');
 return `<div class="conversation" role="log" aria-label="냥대리와의 대화" aria-live="polite" aria-relevant="additions text">${markup}${pendingReply?`<article class="chat-row from-nyang assistant-message typing-message"><div class="active-cat-slot"></div><div class="chat-message-body"><div class="assistant-name">냥대리 <span>업무 메이트</span></div><div class="typing-bubble" role="status" aria-label="냥대리가 답변을 준비하고 있어요"><i></i><i></i><i></i></div></div></article>`:''}</div>`;
}
function chatRewards(){return `<button class="chat-treat-button" data-action="feed" ${(rewards.points<TREAT_COST&&!rewards.treatTokens)||rewards.pending.length?'disabled':''}><span class="treat-stick" aria-hidden="true"></span> 츄르 주기 <small>${rewards.treatTokens?`보유 ${rewards.treatTokens}개`:'10 P'}</small></button>${rewards.pending.map((id,i)=>`<button class="chat-collect-heart" data-heart="${id}" aria-label="하트 ${i+1} 모으기">♥ <small>+1</small></button>`).join('')}`;}
function refreshChatRewards(){document.querySelectorAll('.chat-rewards').forEach(area=>area.innerHTML=chatRewards());}
function motionButton(){const moving=read('om-cat-motion',true);return `<button class="motion-control" data-action="toggle-motion" aria-pressed="${moving}" aria-label="${moving?'고양이 움직임 끄기':'고양이 움직임 켜기'}"><span class="motion-mark">${moving?'Ⅱ':'▷'}</span><span>${moving?'움직임 끄기':'움직임 켜기'}</span></button>`;}
function starterQuestions(){return `<div class="chat-starters" aria-label="추천 질문"><button data-question="연차는 어떻게 신청하나요?" data-cat="hr">연차는 어떻게 신청하나요? ${icon('chevron')}</button><button data-question="출장 준비 일정을 짜주세요" data-cat="trip">출장 준비 일정을 짜주세요 ${icon('chevron')}</button><button data-question="사내 Wi-Fi는 어떻게 연결하나요?" data-cat="life">사내 Wi-Fi는 어떻게 연결하나요? ${icon('chevron')}</button></div>`;}
function saveCurrentChat(){
 if(!activeAccount||communityState().me?.role==='staff'||!activeChatId)return;
 const next=rememberChat(chats,activeChatId,messages,category);
 if(JSON.stringify(next)!==JSON.stringify(chats)&&save('om-chat-sessions',next))chats=next;
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
  const selected=row.threadId===activeChatId&&(!filtered||row.messageId===historyMessageId);
  return `${heading}<div class="chat-history-row"><button class="chat-history-item ${selected?'selected':''}" data-chat-open="${esc(row.threadId)}" ${filtered?`data-chat-message="${esc(row.messageId)}"`:''} aria-current="${selected?'true':'false'}" title="${esc(row.title)}"><span>${esc(row.title)}</span>${filtered&&row.question!==row.title?`<small class="chat-question-preview">${esc(row.question)}</small>`:''}<small>${row.folder?esc(row.folder)+' · ':''}${filtered?'질문 다시 보기':row.count+'개 질문'} · ${esc(categories.find(c=>c.id===row.category)?.label||'업무 질문')}</small></button><button class="chat-history-settings icon-button" data-chat-settings="${esc(row.threadId)}" aria-label="${esc(row.title)} 대화 설정" title="제목 · 폴더 설정">${icon('settings')}</button><button class="chat-history-delete icon-button" data-chat-delete="${esc(row.threadId)}" aria-label="${esc(row.title)} 대화 삭제" title="대화 전체 삭제">${icon('trash')}</button></div>`;
 }).join('');
 const empty=chatHistoryFolder!=='all'?'<p>이 조건에 맞는 대화가 없어요.</p><span>다른 폴더나 분야를 선택해 보세요.</span>':filtered?'<p>이 분야의 질문이 아직 없어요.</p><span>다른 분야나 전체 대화를 선택해 보세요.</span>':'<p>아직 대화가 없어요.</p><span>냥대리에게 질문하면<br>여기에 차곡차곡 모여요.</span>';
 return `<aside class="chat-history ${chatHistoryCollapsed?'is-collapsed':''}" aria-label="대화 기록"><div class="chat-history-heading"><h2>대화 기록</h2><button class="icon-button" data-action="toggle-chat-history" aria-label="${chatHistoryCollapsed?'대화 기록 펼치기':'대화 기록 접기'}" aria-expanded="${!chatHistoryCollapsed}" aria-controls="chat-history-list">${icon(chatHistoryCollapsed?'chevron':'back')}</button></div><div class="chat-history-filter"><label for="chat-history-folder">내 폴더</label><select id="chat-history-folder"><option value="all" ${chatHistoryFolder==='all'?'selected':''}>모든 폴더</option><option value="folder:" ${chatHistoryFolder==='folder:'?'selected':''}>폴더 없음</option>${chatFolders(chats).map(name=>`<option value="folder:${esc(name)}" ${chatHistoryFolder==='folder:'+name?'selected':''}>${esc(name)}</option>`).join('')}</select>${chatHistoryFolder.startsWith('folder:')&&chatHistoryFolder.slice(7)?'<button class="folder-rename text-button" data-action="rename-chat-folder">폴더 이름 변경</button>':''}<label class="chat-category-label" for="chat-history-category">분야별로 찾기</label><select id="chat-history-category"><option value="all" ${!filtered?'selected':''}>전체 대화</option>${categories.map(c=>`<option value="${c.id}" ${chatHistoryCategory===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select><p role="status">${filtered?'질문':'대화'} ${rows.length}개</p></div><div id="chat-history-list" class="chat-history-list" ${chatHistoryCollapsed?'hidden':''}>${list||`<div class="chat-history-empty">${empty}</div>`}</div><p class="chat-history-note">최근 100개 대화<br>이 브라우저에 계정별로 저장돼요.</p></aside>`;
}
function showChatSettings(id){
 if(!communityState().member||communityState().me?.role==='staff')return;
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
 if(!communityState().member||communityState().me?.role==='staff')return;
 if(pendingReply){toast('답변을 마친 뒤 대화를 삭제해 주세요.');return;}
 saveCurrentChat();const thread=chats.find(x=>x.id===id);if(!thread)return;
 openModal(`<h2 id="modal-title">이 대화를 삭제할까요?</h2><p class="chat-delete-title">${esc(thread.title)}</p><p class="modal-sub">대화에 포함된 모든 질문과 답변, 내 활동 기록과 저장한 답변이 이 브라우저에서 삭제돼요. 삭제한 대화는 복구할 수 없어요.</p><p class="modal-sub">게시판에 올린 질문과 등록한 일정, 포인트는 유지돼요.</p><div class="chat-delete-actions"><button class="secondary-button" data-action="close-modal">취소</button><button class="chat-delete-confirm" data-chat-delete-confirm="${esc(id)}">대화 삭제</button></div>`);
 $('.chat-delete-actions [data-action="close-modal"]')?.focus();
}
function deleteChat(id){
 if(!communityState().member||communityState().me?.role==='staff'||!chats.some(x=>x.id===id))return;
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
 if(!communityState().member||communityState().me?.role==='staff')return;
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
  content=`<section class="cat-room home-scene chat-home"><div class="cat-resident-stage"><div class="scene-window" aria-hidden="true"></div><div class="active-cat-slot"></div><div class="chat-rewards home-cat-rewards" aria-label="냥대리에게 츄르 주기">${chatRewards()}</div><div class="resident-speech"><h1>${voice().greeting}</h1><p>${voice().intro}</p></div></div><div class="cat-below chat-home-below">${composer(true)}${starterQuestions()}</div></section>`;
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
function composer(home=false){const current=categories.find(c=>c.id===(category||'hr'));return `<form class="composer chat-composer" id="question-form"><div class="composer-scope"><span>${icon(current.icon)}<strong id="scope-name">${current.label}</strong>에 질문 중</span><button type="button" class="text-button" data-action="choose-category">분야 변경 ${icon('down')}</button></div><div class="input-row"><textarea name="question" rows="1" maxlength="1000" aria-label="질문 입력" placeholder="${home?'회사 생활에서 궁금한 점을 물어보세요.':'이어서 질문해 보세요…'}" required>${esc(chatDraft)}</textarea><button class="send-button" aria-label="질문 보내기" title="질문 보내기" type="submit" ${pendingReply?'disabled':''}>${icon('send')}</button></div><div class="composer-meta"><span>선택한 분야의 자료에서만 답해요.</span><button type="button" class="text-button" data-action="chat-examples">질문 예시 ${icon('chevron')}</button><small>Enter 전송 · Shift+Enter 줄바꿈</small></div></form>`;}
function showCategories(){openModal(`<h2 id="modal-title">어떤 분야가 궁금하세요?</h2><p class="modal-sub">선택한 분야의 자료에서만 답변해요. 작성 중인 질문은 유지됩니다.</p><div class="category-options">${categories.map(c=>`<button data-select-category="${c.id}" aria-pressed="${c.id===(category||'hr')}">${icon(c.icon)}<span><strong>${c.label}</strong><small>${c.detail}</small></span>${icon(c.id===(category||'hr')?'check':'chevron')}</button>`).join('')}</div>`);}
function resizeComposer(){const field=$('#question-form textarea');if(!field)return;field.style.height='auto';field.style.height=Math.min(140,Math.max(30,field.scrollHeight))+'px';}
function scrollConversation(){const pane=$('.chat-transcript'),last=pane?.querySelector('.assistant-message:last-child');if(!pane)return;requestAnimationFrame(()=>{if(!pane.isConnected)return;if(last)pane.scrollTop+=last.getBoundingClientRect().top-pane.getBoundingClientRect().top-24;else pane.scrollTop=pane.scrollHeight;});}
function showChatExamples(){const c=category||'hr';openModal(`<h2 id="modal-title">질문 예시</h2><p class="modal-sub">${categories.find(x=>x.id===c).label} 분야의 자주 묻는 질문이에요.</p><div class="chat-example-list">${faq[c].map(([q,id])=>`<button class="secondary-button" data-faq="${id}" data-q="${esc(q)}">${esc(q)} ${icon('arrow')}</button>`).join('')}</div>`);}
function resetChat(){saveCurrentChat();activeChatId=null;if(activeAccount)save('om-chat-active',null);clearTimeout(replyTimer);replyTimer=null;pendingReply=null;heroTransition=null;messages=[];chatDraft='';plan=null;view='chat';mood='';category=null;petInteraction.reset();render();}
function ask(q,id,reward=true){
 if(!communityState().member||communityState().me?.role==='staff'){render();return;}
 q=String(q).trim();if(!q)return;
 if(pendingReply){toast('답변을 마치면 이어서 물어봐 줘.');return;}
 if(q.length>1000){toast('질문은 1,000자 이내로 적어 주세요.');return;}
 if(!activeChatId){activeChatId=crypto.randomUUID();save('om-chat-active',activeChatId);}
 const first=!messages.length,portrait=$('.chat-home .resident-portrait');
 if(first&&portrait)heroTransition=portrait.getBoundingClientRect();
 category=category||'hr';mood='';petInteraction.reset();
 let r=id?{kind:id==='plan'?'plan':'answer',id}:resolveQuestion(q,category,uploads);
 if(r.kind==='unknown'&&!r.personal&&/연차|휴가/.test(q)&&/일정|계획/.test(q)&&!/취소|육아|출산/.test(q))r=resolveQuestion('연차 신청 '+q,category,uploads);
 r.q=q;r.category=category;r.messageId=crypto.randomUUID();r.scheduleType=scheduleTypeFor(r);r.start=addDays(localDate(),14);r.end=r.start;
 messages.push({role:'user',text:q,at:Date.now()});pendingReply=r;chatDraft='';view='chat';
 render();refreshPet();scrollConversation();$('#question-form textarea')?.focus({preventScroll:true});
 if(reward)communityAction('question',{question:q});
 const remote=!id&&!r.personal&&r.kind!=='scope'?askKnowly(q):null;
 replyTimer=setTimeout(async()=>{
  if(pendingReply!==r)return;
  const k=remote&&await remote;if(pendingReply!==r)return;
  if(k?.answered&&Array.isArray(k.summary)){r.kind='knowly';r.knowly=k;}
  pendingReply=null;replyTimer=null;messages.push({role:'assistant',result:r,at:Date.now()});saveCurrentChat();
  const next=recordAnswer(history,r);if(save('om-question-history',next))history=next;
  if(view==='activity')render();
  if(view==='chat'){render();scrollConversation();}
 },first?950:480);
}
function scheduleTabs(){return `<div class="schedule-view-switch segmented" role="group" aria-label="일정 보기 방식"><button data-schedule-view="todos" class="${view==='todos'?'selected':''}" aria-pressed="${view==='todos'}">${icon('list')} 목록</button><button data-schedule-view="calendar" class="${view==='calendar'?'selected':''}" aria-pressed="${view==='calendar'}">${icon('calendar')} 달력</button></div>`;}
function renderCalendar(){
 const [year,month]=calendarMonth.split('-').map(Number),first=new Date(year,month-1,1,12),start=addDays(localDate(first),-(first.getDay()+6)%7);
 const days=Array.from({length:42},(_,i)=>addDays(start,i)),today=localDate();
 const selected=tasks.filter(t=>t.date===calendarDay).sort((a,b)=>Number(a.done)-Number(b.done));
 $('#main').innerHTML=`<section class="calendar-page"><div class="calendar-heading"><div><h1>내 일정</h1><p>날짜별로 계획을 한눈에 확인하세요.</p></div><button class="secondary-button" data-action="sample-plan">${icon('plus')} 일정 만들기</button></div>${scheduleTabs()}<div class="calendar-layout"><div class="calendar-board"><div class="month-navigation"><h2>${year}년 <strong>${month}월</strong></h2><div><button class="text-button" data-action="calendar-today">오늘</button><button class="icon-button" data-month="-1" aria-label="이전 달">${icon('back')}</button><button class="icon-button" data-month="1" aria-label="다음 달">${icon('arrow')}</button></div></div><div class="calendar-weekdays">${['월','화','수','목','금','토','일'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${days.map(date=>{const list=tasks.filter(t=>t.date===date);return `<button class="calendar-cell ${date.slice(0,7)!==calendarMonth?'outside':''} ${date===today?'today':''} ${date===calendarDay?'selected':''}" data-calendar-day="${date}" aria-label="${displayDate(date)}, 일정 ${list.length}개" aria-pressed="${date===calendarDay}"><span class="date-number">${asDate(date).getDate()}</span>${list.slice(0,2).map(t=>`<span class="calendar-event ${t.done?'done':''}">${esc(t.title)}</span>`).join('')}${list.length>2?`<small>+${list.length-2}개 더</small>`:''}</button>`;}).join('')}</div><div class="calendar-legend"><span><i></i> 예정된 할 일</span><span><i></i> 완료한 일</span><span>규정 기한은 일정 상세에서 확인해요.</span></div></div><aside class="day-agenda"><h2>${displayDate(calendarDay)}</h2><p>할 일 ${selected.filter(t=>!t.done).length}개 · 완료 ${selected.filter(t=>t.done).length}개</p><div>${selected.length?selected.map(t=>`<article class="agenda-item ${t.done?'done':''}"><label><input type="checkbox" data-complete="${t.id}" aria-label="${esc(t.title)} 완료" ${t.done?'checked':''}><strong>${esc(t.title)}</strong></label><small>${esc(t.planLabel||'국내 출장 준비')} · ${t.type}</small><p>${esc(t.note)}</p>${t.deadline?`<p class="agenda-deadline ${!t.done&&t.deadline<today?'overdue':''}">규정 마감 ${displayDate(t.deadline)}</p>`:''}<button class="source-inline" data-source="${t.ref}">${icon('book')} 근거 보기</button><div class="agenda-edit"><label>작업일<input type="date" data-task-date="${t.id}" aria-label="${esc(t.title)} 작업일" value="${t.date}"></label><button class="icon-button" data-delete="${t.id}" aria-label="${esc(t.title)} 삭제">${icon('trash')}</button></div></article>`).join(''):`<div class="agenda-empty">${icon('coffee')}<h3>등록된 일정이 없어요.</h3><p>다른 날짜를 선택하거나<br>대화에서 일정을 추가하세요.</p></div>`}</div></aside></div><p class="local-note">${icon('info')} 이 브라우저에 저장됩니다. 외부 캘린더·승인 시스템과는 연결되지 않아요.</p></section>`;
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
 return `<section class="activity-work" aria-label="나의 질문 기록">${notices}<div class="activity-tabs" role="group" aria-label="질문 기록 종류">${tabs.map(([id,label])=>`<button data-activity-tab="${id}" aria-pressed="${activityTab===id}" class="${activityTab===id?'selected':''}">${label}${id==='posts'&&fresh.length?`<span>${fresh.length}</span>`:''}</button>`).join('')}</div><form id="activity-search"><input name="query" value="${esc(activityQuery)}" aria-label="내 질문 검색" placeholder="질문 내용으로 찾기"><button class="secondary-button">검색</button></form><div class="activity-record-list">${activityTab==='posts'?postRows.map(p=>`<article class="activity-record"><button class="activity-record-open" data-activity-post="${esc(p.id)}"><span class="record-meta">${esc(categories.find(c=>c.id===p.category)?.label)} · ${date(p.created)}${fresh.some(x=>x.id===p.id)?'<b class="reply-new">새 답변</b>':''}</span><strong>${esc(p.body)}</strong><span class="record-preview">${p.replies.length?`담당자 답변 ${p.replies.length}개 · 공식 확인 전`:'답변을 기다리고 있어요'} · 좋아요 ${p.likes}</span></button>${icon('chevron')}</article>`).join(''):rows.map(x=>`<article class="activity-record"><button class="activity-record-open" data-history-open="${esc(x.id)}"><span class="record-meta">${esc(categories.find(c=>c.id===x.result.category)?.label)} · ${date(x.at)}</span><strong>${esc(x.q)}</strong><span class="record-preview">${esc(x.result.kind==='answer'?answers[x.result.id]?.title||'답변 다시 보기':x.result.kind==='plan'?'출장 준비 절차와 일정':x.result.kind==='excerpt'?x.result.title:x.result.kind==='knowly'?x.result.knowly?.summary?.[0]||'사내 문서 답변':x.result.kind==='scope'?'다른 분야의 질문':'자료에서 확인하지 못한 질문')}</span></button>${x.saved?'<span class="record-saved">저장됨</span>':icon('chevron')}</article>`).join('')}${!(activityTab==='posts'?postRows.length:rows.length)?`<div class="activity-record-empty"><h2>${activityQuery?'일치하는 질문이 없어요.':empty}</h2><p>${activityQuery?'다른 단어로 검색해 보세요.':activityTab==='saved'?'답변 아래의 ‘답변 저장’을 누르면 여기에 모여요.':activityTab==='posts'?'냥대리가 답하지 못한 질문을 게시판에 남길 수 있어요.':'지금부터 나눈 질문과 답변이 여기에 쌓여요.'}</p>${!activityQuery?'<button class="secondary-button" data-action="chat">냥대리에게 물어보기</button>':''}</div>`:''}</div><p class="activity-storage-note">${activityTab==='posts'?'최근 게시판 질문 200개 안에서 내가 쓴 질문을 보여줘요. 새 답변은 내 활동을 열거나 새로고침하면 확인돼요.':'최근 질문 100개와 저장한 답변 최대 100개가 현재 계정의 이 브라우저에 보관돼요. 질문 기록은 다른 기기와 동기화되지 않아요.'}</p></section>`;
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
 openModal(`<h2 id="modal-title">어떤 냥대리가 좋아요?</h2><p class="modal-sub">움직임을 미리 보고, 마음에 드는 냥대리를 골라 주세요.</p><div class="personality-options" role="group" aria-label="냥대리 성격">${['cold','warm'].map(mode=>`<button class="personality-option ${personality===mode?'selected':''}" data-personality="${mode}" aria-pressed="${personality===mode}"><span class="personality-preview" aria-hidden="true">${cat('','personality-preview-cat')}</span><strong>${personalities[mode].label}</strong><span>${mode==='warm'?'먼저 인사하고, 손길에는 골골. 츄르는 바로 냠냠!':'무심하게 힐끗. 가끔 손길에 마음을 열어요.'}</span><q>${mode==='warm'?'쓰다듬어주면 행복하다냥!':'츄르? …잠깐, 나 주고 가라냥.'}</q><small>${personality===mode?'사용 중':'이 모드로 선택'}</small></button>`).join('')}</div><p class="personality-note">답변의 정보와 출처, 포인트 보상은 같아요.<br>선택은 이 브라우저에 계정별로 저장됩니다.</p>`);
}
function showWardrobe(){
 openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('outfit')}<p class="modal-sub">모은 하트로 아이템을 선택하세요.</p><div class="wardrobe-preview">${cat('','closet-cat')}${outfitHTML()}<span class="heart-balance">♥ <strong>${rewards.hearts}</strong> 보유</span></div><div class="wardrobe-items">${wardrobe.map(item=>{const owned=rewards.owned.includes(item.id),equipped=rewards.equipped===item.id;return `<article class="wardrobe-item ${equipped?'equipped':''}"><div class="item-symbol item-${item.id}">${item.symbol}</div><h3>${item.name}</h3><p>${item.description}</p><button class="${owned?'secondary':'primary'}-button" ${equipped||!owned&&rewards.hearts<item.cost?'disabled':''} data-item="${item.id}" data-owned="${owned}">${equipped?'착용 중':owned?'착용하기':`♥ ${item.cost} · 열고 착용`}</button>${!owned&&rewards.hearts<item.cost?`<small>하트 ${item.cost-rewards.hearts}개 더 모으면 돼</small>`:''}</article>`;}).join('')}</div><div class="wardrobe-footer"><button class="text-button" data-action="unequip" ${!rewards.equipped?'disabled':''}>기본 모습으로</button><span>한 번 연 아이템은 다시 하트를 쓰지 않아요.</span></div><p class="caption">질문 +10 P → 츄르 10 P → 하트 3개 → 눌러 모으고 꾸미기</p>`,true);
}
function renderTodos(){
 const today=localDate(),tomorrow=addDays(today,1),weekday=asDate(today).getDay(),monday=addDays(today,-((weekday+6)%7)),sunday=addDays(monday,6);
 const dates=Array.from({length:7},(_,i)=>addDays(monday,i));
 let filtered=tasks.filter(t=>filter==='all'?true:filter==='week'?t.date>=monday&&t.date<=sunday:filter==='tomorrow'?t.date===tomorrow:filter==='day'?t.date===selectedDay:t.date===today).sort((a,b)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
 const overdue=tasks.filter(t=>!t.done&&t.deadline&&t.deadline<today).length;
 const names={today:'오늘',tomorrow:'내일',week:'이번 주',all:'전체',day:displayDate(selectedDay)};
 $('#main').innerHTML=`<section class="todos-page"><div class="todo-title"><div><h1>내 일정</h1><p>오늘 해야 할 일부터 하나씩 확인하세요.</p></div><button class="secondary-button" data-action="chat">${icon('plus')} 대화에서 추가</button></div>${scheduleTabs()}<div class="todo-stats"><div><span>남은 할 일</span><strong>${tasks.filter(t=>!t.done).length}<small>개</small></strong></div><div><span>오늘 할 일</span><strong>${tasks.filter(t=>!t.done&&t.date===today).length}<small>개</small></strong></div><div><span>완료한 일</span><strong>${tasks.filter(t=>t.done).length}<small>개</small></strong></div></div>${overdue?`<div class="overdue-alert">${icon('clock')} 규정상 마감이 지난 미완료 업무가 ${overdue}개 있어요. <button class="text-button" data-filter="all">전체 보기</button></div>`:''}<div class="todo-controls"><div class="segmented">${['today','tomorrow','week','all'].map(f=>`<button class="${filter===f?'selected':''}" data-filter="${f}">${names[f]}</button>`).join('')}</div><span>${displayDate(today)} 기준</span></div><div class="week-strip">${dates.map(d=>`<button data-day="${d}" class="${(filter==='today'?d===today:filter==='tomorrow'?d===tomorrow:filter==='day'&&d===selectedDay)?'selected':''}"><span>${asDate(d).toLocaleDateString('ko-KR',{weekday:'short'})}</span><strong>${asDate(d).getDate()}</strong><i class="${tasks.some(t=>!t.done&&t.date===d)?'has-task':''}"></i></button>`).join('')}</div><div class="list-heading"><h2>${names[filter]}의 할 일 <span>${filtered.length}</span></h2><span>완료하면 체크해 주세요</span></div><div class="task-list">${filtered.length?filtered.map(t=>`<article class="task-row ${t.done?'done':''}"><input type="checkbox" aria-label="${esc(t.title)} 완료" data-complete="${t.id}" ${t.done?'checked':''}><div class="task-detail"><div class="task-top"><h3>${esc(t.title)}</h3>${badge(t.type,t.type==='규정 기한'?'blue':'')}</div><p>${esc(t.planLabel||'국내 출장 준비')} · ${displayDate(t.tripStart)} 기준</p><small>${esc(t.note)}</small><div class="task-meta"><button class="source-inline" data-source="${t.ref}">${icon('book')} 근거 보기</button>${t.deadline?`<span class="${!t.done&&t.deadline<today?'overdue':''}">마감 ${displayDate(t.deadline)}</span>`:''}</div></div><label class="task-date">작업일<input type="date" value="${t.date}" data-task-date="${t.id}" aria-label="${esc(t.title)} 작업일"></label><button class="icon-button delete-task" data-delete="${t.id}" aria-label="${esc(t.title)} 삭제">${icon('trash')}</button></article>`).join(''):`<div class="empty-state">${icon('list')}<h3>${tasks.length?'이 날짜에는 등록된 할 일이 없어요.':'아직 등록한 계획이 없어요.'}</h3><p>${tasks.length?'다른 날짜나 전체 목록을 확인해 보세요.':'챗봇에게 출장 준비 일정을 물어보고 할 일로 추가해 보세요.'}</p><button class="secondary-button" data-action="sample-plan">출장 준비 계획 만들기 ${icon('arrow')}</button></div>`}</div><p class="local-note">${icon('info')} 이 브라우저에 저장되며, 캘린더와 함께 표시됩니다.</p></section>`;
}
function openModal(content,wide=false){const m=$('#modal');if(!m.open)dialogOpener=document.activeElement;m.className=wide?'wide':'';m.innerHTML=`<button class="icon-button modal-close" data-action="close-modal" aria-label="닫기">${icon('close')}</button>${content}`;if(!m.open)m.showModal();}
function closeModal(){ $('#modal').close();dialogOpener?.focus(); }
function openSource(id){const r=reference(id,allDocs());if(!r)return;openModal(`<div class="modal-eyebrow">${icon('book')} 근거 원문</div><h2 id="modal-title">${esc(r.doc.title)}</h2><p class="modal-sub">${esc(r.doc.version)} · ${categories.find(c=>c.id===r.doc.category)?.label}</p><div class="source-document">${r.doc.sections.map(s=>`<section class="${s.id===id?'highlight':''}"><h3>${esc(s.label)}</h3><p>${esc(s.text)}</p>${s.id===id?'<span class="source-marker">이 답변의 근거</span>':''}</section>`).join('')}</div>`);requestAnimationFrame(()=>$('.source-document .highlight')?.scrollIntoView({block:'nearest'}));}
function showDocs(){openModal(`<h2 id="modal-title">참고 자료</h2><p class="modal-sub">답변과 일정의 근거가 되는 샘플 문서입니다.</p><div class="docs-list">${allDocs().map(d=>`<button data-source="${d.sections[0].id}"><span class="doc-icon">${icon('book')}</span><span><strong>${esc(d.title)}</strong><small>${esc(d.version)} · ${d.sections.length}개 항목</small></span>${icon('chevron')}</button>`).join('')}</div><div class="upload-doc"><h3>내 샘플 자료로 검색해 보기</h3><p>TXT·Markdown 파일을 올리면 선택한 분야 안에서 관련 문단을 찾아줘요. 추가 자료는 이 브라우저에만 저장됩니다.</p><label>자료 분야<select id="upload-category">${categories.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label><label class="secondary-button file-button">${icon('plus')} 샘플 문서 올리기<input type="file" id="doc-upload" accept=".txt,.md,text/plain,text/markdown"></label><small>UTF-8 텍스트 · 파일당 최대 2MB · PDF와 AI 문서 분석은 이 체험에 포함되지 않아요.</small>${uploads.length?'<button class="text-button" data-action="clear-uploads">내가 올린 자료 지우기</button>':''}</div>`,true);}
const backgroundPresets=[
 {id:'cafe',label:'따뜻한 카페',caption:'커피 한 잔 같은 포근함',file:'bg-cafe.png'},
 {id:'nature',label:'초록빛 자연',caption:'숲속에서 잠시 숨 고르기',file:'bg-nature.png'},
 {id:'ocean',label:'잔잔한 바다',caption:'파도 곁에서 가볍게',file:'bg-ocean.png'},
 {id:'mountain',label:'고요한 산',caption:'맑은 공기와 느긋한 하루',file:'bg-mountain.png'}
];
function backgroundState(){
 const uploaded=read('om-bg-'+mode,null);
 const saved=read('om-bg-theme-'+mode,null);
 const id=saved||(uploaded?'custom':isCat?'cafe':'white');
 if(id==='custom'&&typeof uploaded==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(uploaded))return {id,label:'나만의 공간',url:uploaded};
 const preset=backgroundPresets.find(p=>p.id===id);
 return preset?{...preset,url:root+'assets/'+preset.file}:{id:'white',label:'하얀 작업실',url:null};
}
function showBackground(){
 const current=backgroundState();
 openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('background')}<p class="modal-sub">냥대리 뒤에 놓일 풍경을 선택하세요.</p><div class="background-presets">${backgroundPresets.map(p=>`<button class="background-option ${current.id===p.id?'chosen':''}" data-background="${p.id}" aria-pressed="${current.id===p.id}"><span class="background-thumb" style="background-image:url('${root}assets/${p.file}')">${current.id===p.id?`<span class="background-check">${icon('check')}</span>`:''}</span><span class="background-option-name">${p.label}${p.id==='cafe'&&isCat?'<em>기본</em>':''}</span><small>${p.caption}</small></button>`).join('')}</div><div class="background-other"><button class="white-background-option ${current.id==='white'?'chosen':''}" data-background="white" aria-pressed="${current.id==='white'}"><span></span>흰색 배경${current.id==='white'?icon('check'):''}</button><label class="secondary-button file-button">${icon('picture')} 내 이미지 올리기<input type="file" id="bg-upload" accept="image/png,image/jpeg,image/webp,image/gif"></label></div>${current.id==='custom'?'<p class="custom-background-status">현재 내가 올린 이미지를 사용 중이에요.</p>':''}<p class="caption">이미지 업로드: JPG, PNG, WebP, GIF · 최대 8MB<br>배경 선택은 이 브라우저에 저장돼요.</p>`,true);
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
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a[data-action]');if(!b||b.disabled)return;
 if(b.dataset.customize){({outfit:showWardrobe,background:showBackground,motion:showMotion}[b.dataset.customize])?.();return;}
 if(b.dataset.selectCategory){category=b.dataset.selectCategory;closeModal();render();$('#question-form textarea')?.focus();return;}
 if(b.dataset.scheduleView){view=b.dataset.scheduleView;scheduleView=view;render();return;}
 if(b.dataset.activityTab){activityTab=b.dataset.activityTab;render();return;}
 if(b.dataset.historyOpen){openHistory(b.dataset.historyOpen);return;}
 if(b.dataset.saveAnswer){const r=messages.find(m=>m.result?.messageId===b.dataset.saveAnswer)?.result;if(r&&!history.some(x=>x.id===r.messageId)){const next=recordAnswer(history,r);if(!save('om-question-history',next))return;history=next;}try{const next=toggleSaved(history,b.dataset.saveAnswer);if(save('om-question-history',next)){history=next;render();toast(history.find(x=>x.id===b.dataset.saveAnswer)?.saved?'내 활동에 답변을 저장했어요.':'답변 저장을 해제했어요.');}}catch(e){toast(e.message);}return;}
 if(b.dataset.activityPost){const post=communityState().posts?.find(p=>p.id===b.dataset.activityPost);if(post){const next={...seenReplies,[post.id]:post.replies.length};if(save('om-seen-replies',next))seenReplies=next;showMyPost(post.id);}return;}
 if(b.dataset.heart){if(await commitReward({type:'collect',id:b.dataset.heart})){refreshPet();toast('하트 +1 ♥ · 꾸미기에 쓸 수 있다냥.');if(!rewards.pending.length){$('.resident-speech h1')?.replaceChildren(voice().heart);$('.resident-speech p')?.replaceChildren(voice().heartDetail);clearTimeout(window.happyTimer);window.happyTimer=setTimeout(()=>{happyUntil=0;refreshPet();},3500);}}return;}
 if(b.dataset.item){if(await commitReward({type:b.dataset.owned==='true'?'equip':'buy',id:b.dataset.item})){refreshPet();showWardrobe();toast('제법 잘 어울린다냥!');}return;}
 if(b.dataset.answerPanel){const r=messages.find(m=>m.result?.messageId===b.dataset.message)?.result;if(r){r.expandedPanel=r.expandedPanel===b.dataset.answerPanel?null:b.dataset.answerPanel;render();$(`[data-answer-panel="${b.dataset.answerPanel}"][data-message="${r.messageId}"]`)?.focus({preventScroll:true});}return;}
 if(b.dataset.consent){const r=messages.find(m=>m.result?.messageId===b.dataset.message)?.result;if(r&&r.decision!=='added'){r.decision=b.dataset.consent;render();requestAnimationFrame(()=>{const form=$(`[data-plan-form="${r.messageId}"]`);if(form){form.querySelector('input')?.focus({preventScroll:true});form.scrollIntoView({block:'nearest'});}else $(`[data-consent][data-message="${r.messageId}"]`)?.focus({preventScroll:true});});}return;}
 if(b.dataset.openPlan){calendarDay=b.dataset.openPlan;calendarMonth=calendarDay.slice(0,7);view='calendar';scheduleView='calendar';render();return;}
 if(b.dataset.month){const [y,m]=calendarMonth.split('-').map(Number);calendarMonth=localDate(new Date(y,m-1+Number(b.dataset.month),1,12)).slice(0,7);render();return;}
 if(b.dataset.calendarDay){calendarDay=b.dataset.calendarDay;render();return;}
 if(b.dataset.background){if(save('om-bg-theme-'+mode,b.dataset.background)){applyBackground();closeModal();toast(backgroundState().label+' 배경으로 바꿨어요.');}return;}
 if(b.dataset.source){openSource(b.dataset.source);return;}
 if(b.dataset.question){category=b.dataset.cat;ask(b.dataset.question);return;}
 if(b.dataset.faq){if($('#modal').open)closeModal();ask(b.dataset.q,b.dataset.faq);return;}
  if(b.dataset.switchCategory){category=b.dataset.switchCategory;ask(b.dataset.retry,undefined,false);return;}
 if(b.dataset.filter){filter=b.dataset.filter;render();return;}
 if(b.dataset.day){selectedDay=b.dataset.day;filter='day';render();return;}
 if(b.dataset.delete){const next=tasks.filter(t=>t.id!==b.dataset.delete);if(save('om-tasks',next)){tasks=next;render();toast('할 일을 삭제했어요.');}return;}
 if(b.dataset.postQuestion){const r=messages.find(m=>m.result?.messageId===b.dataset.postQuestion)?.result;if(r)showPostDialog(r);return;}
 if(b.dataset.chatSettings){showChatSettings(b.dataset.chatSettings);return;}
 if(b.dataset.action==='rename-chat-folder'){showRenameFolder();return;}
 if(b.dataset.action==='toggle-chat-folders'){
  const list=$('#chat-existing-folders');if(!list)return;
  list.hidden=!list.hidden;b.setAttribute('aria-expanded',String(!list.hidden));return;
 }
 if(b.hasAttribute('data-chat-folder-choice')){
  const input=$('#chat-custom-folder'),list=$('#chat-existing-folders');if(!input||!list)return;
  input.value=b.dataset.chatFolderChoice;list.hidden=true;
  $('[data-action="toggle-chat-folders"]')?.setAttribute('aria-expanded','false');input.focus();return;
 }
 if(b.dataset.chatDelete){showDeleteChat(b.dataset.chatDelete);return;}
 if(b.dataset.chatDeleteConfirm){deleteChat(b.dataset.chatDeleteConfirm);return;}
 if(b.dataset.chatOpen){openChat(b.dataset.chatOpen,b.dataset.chatMessage||null);return;}
 if(b.dataset.personality){
  if(!communityState().member||communityState().me?.role==='staff')return;
  const next=normalizePersonality(b.dataset.personality);if(!save('om-personality',next))return;
  personality=next;petInteraction.reset();closeModal();render();companionBehavior.greet(personality);toast(voice().label+'로 바꿨어요.');return;
 }
 const a=b.dataset.action;
 if(a==='reset-document-search'){if(communityState().me?.role==='staff'){documentQuery='';documentCategory='all';render();}return;}
 if(a==='personality'){showPersonality();return;}
 if(a==='toggle-chat-history'){chatHistoryCollapsed=!chatHistoryCollapsed;render();return;}
 if(a==='login-pet'){reactLoginPet();return;}
 if(a==='logout'){await logoutAccount();return;}
 if(a==='account'){const me=communityState().me;openModal('<div class="account-menu"><h2 id="modal-title">내 계정</h2><strong>'+esc(me.username)+' · '+(me.role==='staff'?'담당자':'직원')+'</strong><p>'+ (me.role==='staff'?'질문 게시판 관리와 통계에 접근할 수 있어요.':'포인트와 보상은 같은 계정으로 로그인한<br>모든 기기에서 이어져요.') +'</p><p>현재는 두 개의 공용 시연 계정입니다.<br>실제 직원별 사용에는 개인 계정이 필요해요.</p><button class="primary-button" data-action="logout">로그아웃</button></div>');return;}
 if(['faq','documents','users','model'].includes(a)){if(communityState().me?.role==='staff'){view=a;petInteraction.reset();render();$('#main').scrollTop=0;}return;}
 if(a==='statistics'){if(communityState().me?.role==='staff'){view='statistics';petInteraction.reset();await loadStatistics();}return;}
 if(a==='toggle-theme'){
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyColorTheme(next);save('nyang-color-theme',next);return;
 }
 if(a==='pet'){if(e.detail===0||performance.now()>=ignorePetClickUntil)petCat();return;}
 if(a==='reset')resetChat();
 if(a==='choose-category')showCategories();
 if(a==='schedule'){petInteraction.reset();view=scheduleView;render();$('#main').scrollTop=0;}
 if(a==='activity')refreshCommunity();
 if(['chat','todos','calendar','board','activity'].includes(a)){if(view!==a)petInteraction.reset();view=a;render();$('#main').scrollTop=0;}
 if(a==='calendar-today'){calendarMonth=localDate().slice(0,7);calendarDay=localDate();render();}
 
 
 
 
 if(a==='chat-examples')showChatExamples();
 if(a==='sample-plan'){view='chat';category='trip';ask('출장 준비 일정을 짜주세요','plan');}
 if(a==='feed'){if(await commitReward({type:'feed',ids:Array.from({length:3},()=>crypto.randomUUID())})){petInteraction.reset();happyUntil=Date.now()+6000;companionBehavior.feed(personality);refreshPet();$('.resident-speech h1')?.replaceChildren(voice().feed);$('.resident-speech p')?.replaceChildren(voice().feedDetail);toast('츄르 고맙다냥! 주변 하트 3개를 눌러 모아보라냥.');}}
 if(a==='wardrobe')showWardrobe();
 if(a==='unequip'&&await commitReward({type:'equip',id:null})){refreshPet();showWardrobe();}
 if(a==='docs')showDocs();
 if(a==='background')showBackground();
 if(a==='toggle-motion'){const moving=!read('om-cat-motion',true);if(save('om-cat-motion',moving)){document.body.classList.toggle('motion-paused',!moving);b.setAttribute('aria-pressed',String(moving));b.setAttribute('aria-label',moving?'고양이 움직임 끄기':'고양이 움직임 켜기');b.innerHTML=`<span class="motion-mark">${moving?'Ⅱ':'▷'}</span><span>${moving?'움직임 끄기':'움직임 켜기'}</span>`;}}
 if(a==='close-modal')closeModal();
 if(a==='clear-uploads'){if(save('om-docs',[])){uploads=[];showDocs();toast('추가한 문서를 지웠어요.');}}
});
document.addEventListener('submit',e=>{
 if(e.target.id==='activity-search'){e.preventDefault();activityQuery=String(new FormData(e.target).get('query')||'').trim();render();return;}
 if(e.target.id==='question-form'){e.preventDefault();const text=new FormData(e.target).get('question');ask(text);}
 if(e.target.dataset.planForm){
  e.preventDefault();const r=messages.find(m=>m.result?.messageId===e.target.dataset.planForm)?.result;
  if(!r||r.decision!=='yes')return;
  const fd=new FormData(e.target),start=fd.get('start'),end=fd.get('end')||start;
  try{const items=makeSchedule(r.scheduleType,start,end),result=mergeSchedule(tasks,{type:r.scheduleType,start,end,items},()=>crypto.randomUUID());
   if(save('om-tasks',result.tasks)){tasks=result.tasks;r.start=start;r.end=end;r.items=items;r.decision='added';render();toast(result.added?`${result.added}개의 할 일을 내 일정에 넣었어.`:'이미 캘린더에 챙겨 둔 일정이야.');}
  }catch(err){toast(err.message);}
 }
});
document.addEventListener('input',e=>{if(e.target.matches('#question-form textarea')){chatDraft=e.target.value;resizeComposer();}});
document.addEventListener('keydown',e=>{if(e.target.matches('#question-form textarea')&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit();}});
document.addEventListener('change',async e=>{
 if(e.target.id==='chat-history-folder'){chatHistoryFolder=e.target.value;$('.chat-history').outerHTML=chatHistoryHTML();$('#chat-history-folder')?.focus({preventScroll:true});return;}
 if(e.target.id==='chat-history-category'){
  chatHistoryCategory=categories.some(c=>c.id===e.target.value)?e.target.value:'all';
  $('.chat-history').outerHTML=chatHistoryHTML();$('#chat-history-category')?.focus({preventScroll:true});return;
 }
 if(e.target.closest('[data-plan-form]')){const form=e.target.closest('[data-plan-form]'),r=messages.find(m=>m.result?.messageId===form.dataset.planForm)?.result;if(r){r.start=form.elements.start.value;if(form.elements.end){form.elements.end.min=r.start;if(form.elements.end.value<r.start)form.elements.end.value=r.start;r.end=form.elements.end.value;}else r.end=r.start;form.querySelector('.schedule-preview').innerHTML=schedulePreview(r);}}
 if(e.target.id==='active-category'){category=e.target.value;toast(`${categories.find(c=>c.id===category).label} 분야로 변경했어요.`);}
 if(e.target.dataset.complete){const next=tasks.map(t=>t.id===e.target.dataset.complete?{...t,done:e.target.checked}:t);if(save('om-tasks',next)){tasks=next;render();}}
 if(e.target.dataset.taskDate){if(!e.target.value)return;const next=tasks.map(t=>t.id===e.target.dataset.taskDate?{...t,date:e.target.value}:t);if(save('om-tasks',next)){tasks=next;render();toast('작업일을 바꿨어요. 규정상 마감은 유지됩니다.');}}
 if(e.target.id==='bg-upload')await loadBackground(e.target.files[0]);
 if(e.target.id==='doc-upload'){const file=e.target.files[0];if(!file)return;if(!/\.(txt|md)$/i.test(file.name)||file.size>2*1024*1024){toast('2MB 이하 TXT 또는 Markdown 파일을 선택해 주세요.');return;}const contents=await file.text();const paragraphs=contents.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);if(!paragraphs.length){toast('내용이 있는 문서를 선택해 주세요.');return;}const id=crypto.randomUUID();const doc={id,category:$('#upload-category').value,title:file.name,version:'내가 추가한 자료',sections:paragraphs.map((text,i)=>({id:`${id}-${i}`,label:`문단 ${i+1}`,text}))};if(save('om-docs',[...uploads,doc])){uploads.push(doc);showDocs();toast('샘플 자료를 추가했어요. 같은 분야에서 검색할 수 있어요.');}}
});
shell();
initCommunity({
 toast,modal:openModal,close:closeModal,render,
 show(next){view=next;render();$('#main').scrollTop=0;},
 update(state){
  const next=state.member?state.me.username:null;
  if(next!==activeAccount){
   chats=[];activeChatId=null;chatHistoryCollapsed=false;chatHistoryCategory='all';chatHistoryFolder='all';historyMessageId=null;heroTransition=null;
   clearTimeout(replyTimer);replyTimer=null;pendingReply=null;messages=[];chatDraft='';category=null;view='chat';activityTab='recent';activityQuery='';plan=null;petInteraction.reset();
   if($('#modal').open)closeModal();activeAccount=next;personality=normalizePersonality(next?read('om-personality','cold'):'cold');
   uploads=read('om-docs',[]);tasks=read('om-tasks',[]);history=normalizeHistory(read('om-question-history',[]));seenReplies=read('om-seen-replies',{});if(!seenReplies||typeof seenReplies!=='object')seenReplies={};
   if(next&&state.me.role!=='staff'){
    const stored=read('om-chat-sessions',null);chats=stored===null?importQuestionHistory(history):normalizeChats(stored);
    activeChatId=read('om-chat-active',null);const selected=chats.find(x=>x.id===activeChatId);
    if(selected){messages=structuredClone(selected.messages);category=selected.category;}else activeChatId=null;
   }
   rewards=state.wallet||{...normalizeRewards(null),treatTokens:0};render();if(next&&state.me.role!=='staff')companionBehavior.greet(personality);return;
  }
  if(!state.member){render();return;}
  rewards=state.wallet||{...normalizeRewards(null),treatTokens:0};updateWallet();refreshPet();if(['activity','board'].includes(view)&&!$('#modal').open)render();}
});

document.addEventListener('submit',e=>{if(e.target.id!=='admin-faq-search'||communityState().me?.role!=='staff')return;e.preventDefault();const data=new FormData(e.target);adminQuery=String(data.get('query')||'').trim();adminCategory=String(data.get('category')||'all');render();});

document.addEventListener('submit',e=>{if(e.target.id!=='admin-documents-search'||communityState().me?.role!=='staff')return;e.preventDefault();const data=new FormData(e.target);documentQuery=String(data.get('query')||'').trim();documentCategory=String(data.get('category')||'all');render();});

document.addEventListener('submit',e=>{
 if(!['chat-settings-form','chat-folder-form'].includes(e.target.id))return;
 e.preventDefault();if(!communityState().member||communityState().me?.role==='staff')return;
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
