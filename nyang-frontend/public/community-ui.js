import {fetch} from './transport.js?v=fd4b994ba12d';
import {boardView} from './board-view.js?v=08ed8bb0e01b';
import {loginHTML as loginView,statisticsHTML} from './account-view.js?v=3839cedc6a34';
import {categories,esc,isStaff} from './common.js?v=b28f10812dc5';
import {rewardHelp} from './reward-rules.js?v=a99b0c80721c';
const date=s=>new Date(s).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'});
let state={loading:true},hooks,filter='all',query='',connecting=null,authEpoch=0,loginRole='employee',stats=null;
// 진행 중인 요청: 같은 동작(같은 글의 좋아요·답변 등)만 겹치지 않게 막고, 다른 동작은 함께 할 수 있다.
const pending=new Set();
async function once(key,work){
 if(pending.has(key))return;
 pending.add(key);
 try{return await work();}finally{pending.delete(key);}
}
export const communityState=()=>state;
export const accountGateHTML=()=>loginView(loginRole,state);
export const statsHTML=()=>statisticsHTML(stats);
export async function loadStatistics(){
 if(!isStaff(state))return;
 const epoch=authEpoch;stats={loading:true};hooks.render();
 try{const response=await fetch('/api/account?view=stats',{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error);if(epoch!==authEpoch)return;stats=data;}
 catch(e){if(epoch!==authEpoch)return;stats={error:e.message};}
 hooks.render();
}
function broadcastAuth(){try{localStorage.setItem('nyang-account-change',String(Date.now()));}catch{}}
export async function logoutAccount(){
 try{const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!res.ok)throw Error('로그아웃하지 못했어요. 다시 시도해 주세요.');
 authEpoch++;connecting=null;stats=null;state={authenticated:false,member:false};filter='all';query='';hooks.close();hooks.update(state);broadcastAuth();}
 catch(e){hooks.toast(e.message);}
}

export function initCommunity(options){hooks=options;refreshCommunity();
 if(typeof window!=='undefined'){
  const idle=()=>!pending.size&&state.member&&!document.activeElement?.matches('input,textarea,select')&&!document.querySelector('dialog[open],details.staff-composer[open]');
  window.addEventListener('focus',()=>{if(idle())refreshCommunity();});
  window.addEventListener('storage',e=>{if(e.key==='nyang-account-change'){authEpoch++;connecting=null;refreshCommunity();}});
  setInterval(()=>{if(!document.hidden&&idle())refreshCommunity();},15000);
 }
}
export function refreshCommunity(){
 if(connecting)return connecting;
 const request=loadCommunity().finally(()=>{if(connecting===request)connecting=null;});connecting=request;return request;
}
async function loadCommunity(){
 const epoch=authEpoch;
 try{const res=await fetch('/api/account',{cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error);if(epoch!==authEpoch)return;state=data;}
 catch(e){if(epoch!==authEpoch)return;state=state.member?{...state,connectionError:e.message}:{error:e.message};}
 hooks.update(state);
}
export async function communityAction(action,body={}){
 if(state.loading)await refreshCommunity();
 if(!state.member){hooks.render();hooks.toast('로그인 후 이용해 주세요.');return null;}
 const epoch=authEpoch;
 try{
  const response=action==='reward'&&body.type==='pet'?'wallet':undefined;
  const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body,response})});
  const data=await res.json();if(epoch!==authEpoch)return null;if(res.status===401){authEpoch++;state={authenticated:false,member:false};hooks.update(state);throw Error('로그인이 만료됐어요. 다시 로그인해 주세요.');}if(!res.ok)throw Error(data.error);
  state=data.partial==='wallet'?{...state,wallet:data.wallet,level:data.level}:data;
  hooks.update(state);if(data.notice)hooks.toast(data.notice);return data;
 }catch(e){hooks.toast(e.message||'연결을 확인하고 다시 시도해 주세요.');return null;}
}
function gate(){
 if(state.loading)return '<div class="community-empty" role="status">체험 공간을 준비하고 있어요…</div>';
 if(state.error)return `<div class="community-empty"><h2>잠시 연결이 끊겼어요.</h2><p>${esc(state.error)}</p><button class="primary-button" data-community="refresh">다시 연결</button></div>`;
 if(!state.member)return accountGateHTML();
 return '';
}
const hero=(kicker,title,desc)=>`<div class="community-heading"><div><h1>${title}</h1><p>${desc}</p></div><button class="secondary-button" data-community="refresh">새로고침 ↻</button></div>`;
export function activityHTML(content=''){
 const intro='<header class="activity-heading"><h1>내 활동</h1><button class="activity-text-button" data-community="refresh">새로고침</button></header>';
 const blocked=gate();if(blocked)return `<section class="community-page activity-page">${intro}${content}${blocked}</section>`;
 const {wallet:w,level:l,today,streak,receivedLikes}=state;
 const help=rewardHelp(),gift=today?(today.tokens?`츄르 ${today.tokens}개 받았어요`:`${today.points} P 받았어요`):'하루 한 번, 포인트 또는 츄르 선물';
 return `<section class="community-page activity-page">
  ${intro}
  ${content}
  <details class="activity-rewards"><summary>포인트와 보상 <span>${w.points.toLocaleString('ko-KR')} P · ♥ ${w.hearts}</span></summary><div class="activity-panel">
   <section class="activity-level" aria-labelledby="activity-level-title">
    <h2 id="activity-level-title">질문 레벨</h2>
    <div class="activity-level-value"><strong>Lv. ${l.level}</strong><span>${esc(l.name)}</span></div>
    <div class="activity-progress" role="progressbar" aria-label="다음 질문 레벨까지 진행률" aria-valuenow="${l.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${l.progress}%"></i></div>
    <div class="activity-level-meta"><span>새 질문 ${w.questions}개</span><span>${l.next?`다음 레벨까지 ${l.next-w.questions}개`:'최고 레벨 달성'}</span></div>
   </section>
   <dl class="activity-balances" aria-label="보유 보상">
    <div><dt>포인트</dt><dd>${w.points.toLocaleString('ko-KR')}<span>P</span></dd></div>
    <div><dt>츄르</dt><dd>${w.treatTokens.toLocaleString('ko-KR')}<span>개</span></dd></div>
    <div><dt>하트</dt><dd>${w.hearts.toLocaleString('ko-KR')}<span>개</span></dd></div>
   </dl>
   <section class="activity-attendance" aria-labelledby="activity-attendance-title">
    <div><h2 id="activity-attendance-title">오늘 출석 <span>연속 ${streak}일</span></h2><p>${gift}</p></div>
    <button class="primary-button" data-community="attendance" ${today?'disabled':''}>${today?'출석 완료':'출석 선물 받기'}</button>
   </section>
   <div class="activity-board-link"><span>받은 좋아요 <strong>${receivedLikes}</strong></span><button class="activity-text-button" data-action="board">질문 게시판 →</button></div>
  </div>
  <details class="activity-help"><summary>보상 안내</summary>
   <dl>
    <div><dt>질문 · 좋아요</dt><dd>${help.question}</dd></div>
    <div><dt>출석 선물</dt><dd>${help.attendance}</dd></div>
    <div><dt>츄르 · 레벨</dt><dd>${help.treat}</dd></div>
    <div><dt>활동 저장</dt><dd>포인트·레벨·출석·꾸미기는 계정별로 이 브라우저에만 저장돼요.<br>다른 기기·브라우저에서는 새로 시작하고, 브라우저 데이터를 지우면 초기화돼요.</dd></div>
   </dl>
  </details></details>
 </section>`;
}
export function showMyPost(id){filter='mine';query='';hooks.show('board');requestAnimationFrame(()=>document.getElementById('post-'+id)?.scrollIntoView({block:'center'}));}
export function boardHTML(){
 const blocked=gate();if(blocked)return '<section class="community-page">'+blocked+'</section>';
 return boardView(state,filter,query);
}
function showDeleteDialog(id){
 const post=state.posts.find(p=>p.id===id);if(!post||(!isStaff(state)&&!post.mine))return;
 const description=isStaff(state)?'직원 화면에서 질문과 답변이 함께 숨겨집니다.<br>삭제된 글에서 복원할 수 있고, 이미 지급된 포인트는 유지됩니다.':'내 질문과 달린 답변이 게시판과 내 활동에서 함께 사라져요.<br>이미 받은 포인트는 유지되며, 복원이 필요하면 담당자에게 요청해 주세요.';
 hooks.modal('<h2 id="modal-title">이 질문을 삭제할까요?</h2><p class="modal-sub">'+description+'</p><blockquote class="delete-question-preview">'+esc(post.body)+'</blockquote><div class="modal-button-row"><button class="danger-button" data-confirm-delete="'+esc(post.id)+'">질문 삭제</button><button class="secondary-button" data-action="close-modal">취소</button></div>');
}
export function unknownOffer(r){
 return `<div class="unknown-board-offer"><div><strong>게시판에 질문을 남길까요?</strong><p>익명으로 공유됩니다.</p></div><button class="secondary-button" data-post-question="${esc(r.messageId)}">익명으로 질문하기</button></div>`;
}
export function showPostDialog(r){
 if(!state.member){hooks.show('activity');hooks.toast('체험 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.');return;}
 hooks.modal(`<h2 id="modal-title">익명 질문 작성</h2><p class="modal-sub">게시할 내용을 확인해 주세요. 이름·급여·개인 계정 정보 등은 적지 마세요.</p>${r.personal?'<p class="privacy-note">개인별 정보는 공개 게시판에서 확인할 수 없어요. 일반적인 절차에 대한 질문으로 바꿔 주세요.</p>':''}<form id="anonymous-post"><label>질문 분야<select name="category">${categories.map(c=>`<option value="${c.id}" ${c.id===r.category?'selected':''}>${c.label}</option>`).join('')}</select></label><label>게시할 질문<textarea name="body" rows="5" minlength="5" maxlength="2000" required>${r.personal?'':esc(r.q)}</textarea></label><p class="community-caption">게시판에는 ‘익명의 직원’으로 보여요. 지금은 이 브라우저에만 저장돼서, 같은 브라우저로 로그인한 직원·담당자만 볼 수 있어요.</p><label class="consent-check"><input type="checkbox" required> 이 내용을 직원 질문 게시판에 공유할게요.</label><div class="modal-button-row"><button class="primary-button">확인하고 익명으로 게시</button><button type="button" class="text-button" data-action="close-modal">취소</button></div></form>`);
}
// 이 파일의 클릭 처리는 아래 속성을 가진 버튼만 맡는다. 나머지(data-action 등)는 app.js가 맡는다.
export const COMMUNITY_CLICK_SELECTOR='[data-delete-post],[data-confirm-delete],[data-restore-post],[data-login-role],[data-community],[data-board-filter],[data-like]';
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled||!b.matches(COMMUNITY_CLICK_SELECTOR))return;
 if(b.dataset.deletePost){showDeleteDialog(b.dataset.deletePost);return;}
 if(b.dataset.confirmDelete||b.dataset.restorePost){
  if(!state.member)return;
  const staff=isStaff(state),post=state.posts.find(p=>p.id===b.dataset.confirmDelete);
  if(b.dataset.restorePost?!staff:!staff&&!post?.mine)return;
  const restore=!!b.dataset.restorePost,id=b.dataset.restorePost||b.dataset.confirmDelete;
  await once('delete:'+id,async()=>{
   b.disabled=true;
   try{const result=await communityAction(restore?'restore-post':'delete-post',{post:id});if(result){if(!restore)hooks.close();hooks.show('board');}}finally{b.disabled=false;}
  });return;
 }
 if(b.dataset.loginRole){loginRole=b.dataset.loginRole;hooks.render();return;}
 if(b.dataset.community==='statistics'){await loadStatistics();return;}
 if(b.dataset.boardFilter){filter=b.dataset.boardFilter;hooks.show('board');return;}
 const action=b.dataset.community;
 if(action==='refresh'){b.disabled=true;await refreshCommunity();hooks.render();return;}
 if(action==='attendance'){
  await once('attendance',async()=>{
   b.disabled=true;b.textContent='오늘의 선물을 여는 중…';
   try{const result=await communityAction('attendance');if(result){hooks.render();hooks.toast(result.notice);}}finally{b.disabled=false;}
  });return;
 }
 if(b.dataset.like){
  await once('like:'+b.dataset.like,async()=>{
   b.disabled=true;
   try{if(await communityAction('like',{post:b.dataset.like}))hooks.render();}finally{b.disabled=false;}
  });
 }
});
// 이 파일의 submit 처리: #account-login, #board-search, #anonymous-post, [data-staff-reply]. 나머지 폼은 app.js가 맡는다.
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(f.id==='account-login'){
  e.preventDefault();
  await once('login',async()=>{
   const button=f.querySelector('[type="submit"]'),error=f.querySelector('#login-error');button.disabled=true;button.textContent='로그인 중…';error.textContent='';
   const epoch=++authEpoch;connecting=null;
   try{const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',...Object.fromEntries(new FormData(f))})}),data=await res.json();if(epoch!==authEpoch)return;if(!res.ok)throw Error(data.error);state=data;stats=null;filter='all';query='';hooks.update(state);broadcastAuth();}
   catch(e){if(epoch===authEpoch){error.textContent=e.message;f.querySelector('[name="password"]').focus();}}
   finally{button.disabled=false;button.textContent=loginRole==='staff'?'담당자로 로그인':'직원으로 로그인';}
  });return;
 }
 if(f.id==='board-search'){e.preventDefault();query=new FormData(f).get('query').trim();hooks.render();return;}
 if(f.id!=='anonymous-post'&&!f.dataset.staffReply)return;
 e.preventDefault();
 await once(f.id==='anonymous-post'?'post':'reply:'+f.dataset.staffReply,async()=>{
  const submit=f.querySelector('[type="submit"],button.primary-button');submit.disabled=true;
  try{
   const data=Object.fromEntries(new FormData(f));let result;
   if(f.id==='anonymous-post'){result=await communityAction('post',data);if(result){hooks.close();filter='mine';query='';hooks.show('board');}}
   else{f.dataset.requestId??=crypto.randomUUID();result=await communityAction('reply',{...data,post:f.dataset.staffReply,id:f.dataset.requestId});if(result)hooks.render();}
  }finally{submit.disabled=false;}
 });
});
