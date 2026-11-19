import {fetch} from './transport.js?v=fd4b994ba12d';
import {categories as chatCategories} from './core.js?v=4dc923f4c7f7';
import {boardView,boardPostHTML} from './board-view.js?v=20e5fec3aa08';
import {loginHTML as loginView,statisticsHTML,periodLabel,rankingCSV} from './account-view.js?v=bbfa33131ccf';
import {esc,loadingHTML} from './shared.js?v=b4248c4d9fbf';
const date=s=>new Date(s).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'});
let state={loading:true},hooks,filter='all',query='',boardCategory='all',boardSort='new',openPostId=null,busy=false,connecting=null,authEpoch=0,loginRole='employee',stats=null;
export const communityState=()=>state;
export const accountGateHTML=()=>loginView(loginRole,state);
// 사용자 통계 화면에서 고른 순위 기간과, 포인트 순위를 모두 펼쳤는지
let statsPeriod='quarter',statsExpanded=false;
export const statsHTML=()=>statisticsHTML(stats,{period:statsPeriod,expanded:statsExpanded});
// 지금 고른 기간의 포인트 순위(최대 50명)를 CSV 파일로 내려받는다
function downloadRanking(){
 const list=stats?.rankings?.[statsPeriod]||stats?.ranking;if(!list?.length){hooks.toast('내려받을 순위가 없어요.');return;}
 const url=URL.createObjectURL(new Blob([rankingCSV(list,periodLabel(statsPeriod,stats.periods?.[statsPeriod]??stats.rankingSince))],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=`냥대리-포인트순위-${{month:'이번달',quarter:'최근3개월',all:'전체'}[statsPeriod]}-${stats.day}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 hooks.toast(`포인트 순위 ${list.length}명을 내려받았어요.`);
}
export async function loadStatistics(){
 if(state.me?.role!=='staff')return;
 const epoch=authEpoch;stats={loading:true};hooks.render();
 try{const response=await fetch('/api/account?view=stats',{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error);if(epoch!==authEpoch)return;stats=data;}
 catch(e){if(epoch!==authEpoch)return;stats={error:e.message};}
 hooks.render();
}
function broadcastAuth(){try{localStorage.setItem('nyang-account-change',String(Date.now()));}catch{}}
export async function logoutAccount(){
 try{const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!res.ok)throw Error('로그아웃하지 못했어요. 다시 시도해 주세요.');
 authEpoch++;connecting=null;stats=null;state={authenticated:false,member:false};filter='all';query='';boardCategory='all';hooks.close();hooks.update(state);broadcastAuth();}
 catch(e){hooks.toast(e.message);}
}

export function initCommunity(options){hooks=options;refreshCommunity();
 if(typeof window!=='undefined'){
  const idle=()=>!busy&&state.member&&!document.activeElement?.matches('input,textarea,select')&&!document.querySelector('dialog[open],details.staff-composer[open]');
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
  // 쓰다듬기 응답은 가볍게(지갑만) 온다. 쓰다듬기로 늘어나는 포인트는 보너스뿐이라, 늘어난 만큼 누적 포인트에도 더한다.
  const gained=data.partial==='wallet'?Math.max(0,(data.wallet?.points??0)-(state.wallet?.points??0)):0;
  // 지갑만 바뀐 응답(쓰다듬기)에는 화면 불러오기 때 받은 개인 기록 묶음을 다시 싣지 않는다(옛 기록으로 되돌리지 않게)
  const {personalState:_ps,personalLarge:_pl,...kept}=state;
  state=data.partial==='wallet'?{...kept,wallet:data.wallet,level:data.level,...(state.earned&&gained?{earned:{total:state.earned.total+gained,recent:state.earned.recent+gained}}:{})}:data;
  hooks.update(state);if(data.notice)hooks.toast(data.notice);return data;
 }catch(e){hooks.toast(e.message||'연결을 확인하고 다시 시도해 주세요.');return null;}
}
function gate(){
 if(state.loading)return loadingHTML('불러오는 중',{compact:true}); // 제목은 이미 보이는 화면이라 글만
 if(state.error)return `<div class="community-empty"><h2>잠시 연결이 끊겼어요.</h2><p>${esc(state.error)}</p><button class="primary-button" data-community="refresh">다시 연결</button></div>`;
 if(!state.member)return accountGateHTML();
 return '';
}
export function activityHTML(content='',rewards=true){ // rewards=false면 아래 '포인트와 보상' 칸을 그리지 않는다(내 레벨 탭에서만 보여줌). 접히지 않는 칸이라 출석 등으로 다시 그려도 닫히지 않는다.
 const intro='<header class="activity-heading"><h1>내 레벨</h1><button class="activity-text-button" data-community="refresh">새로고침</button></header>';
 const blocked=gate();if(blocked)return `<section class="community-page activity-page">${intro}${content}${blocked}</section>`;
 const {wallet:w,today,streak,receivedLikes}=state; // 레벨은 '내 레벨' 탭에서 보여준다
 const gift=today?(today.tokens?`츄르 ${today.tokens}개 받았어요`:`${today.points} P 받았어요`):'하루 한 번, 포인트 또는 츄르 선물';
 return `<section class="community-page activity-page">
  ${intro}
  ${content}
  ${rewards?`  <section class="activity-rewards" aria-labelledby="activity-rewards-title"><h2 id="activity-rewards-title" class="activity-rewards-title">포인트와 보상 <span>${w.points.toLocaleString('ko-KR')} P · ♥ ${w.hearts}</span></h2><div class="activity-panel">
   <dl class="activity-balances" aria-label="보유 보상">
    <div><dt>포인트</dt><dd>${w.points.toLocaleString('ko-KR')}<span>P</span></dd></div>
    <div><dt>누적 포인트</dt><dd>${(state.earned?.total??w.points).toLocaleString('ko-KR')}<span>P</span></dd>${state.earned?`<small class="activity-balance-note">최근 3개월 ${state.earned.recent.toLocaleString('ko-KR')} P · 순위 기준</small>`:''}</div>
    <div><dt>츄르</dt><dd>${w.treatTokens.toLocaleString('ko-KR')}<span>개</span></dd></div>
    <div><dt>하트</dt><dd>${w.hearts.toLocaleString('ko-KR')}<span>개</span></dd></div>
   </dl>
   <section class="activity-attendance" aria-labelledby="activity-attendance-title">
    <div><h2 id="activity-attendance-title">오늘 출석 <span>연속 ${streak}일</span></h2><p>${gift}</p></div>
    <button class="primary-button" data-community="attendance" ${today?'disabled':''}>${today?'출석 완료':'출석 선물 받기'}</button>
   </section>
   <div class="activity-board-link"><span>내 질문이 받은 유익해요 <strong>${receivedLikes}</strong></span><button class="activity-text-button" data-action="board">질문 게시판 →</button></div>
  </div>
  <details class="activity-help"><summary>보상 안내</summary>
   <dl>
    <div><dt>질문 · 유익해요</dt><dd>새 질문 +10 P · 같은 질문은 한 번만, 하루 최대 20개.<br>질문 게시판의 내 글에 다른 직원이 '유익해요'를 누르면 +10 P.</dd></div>
    <div><dt>출석 선물</dt><dd>5 P 50% · 10 P 30% · 츄르 1개 15% · 츄르 3개 5%.<br>무료로 하루 한 번, 한국 시간 자정에 초기화돼요. 확률은 매일 같아요.</dd></div>
    <div><dt>츄르 · 레벨</dt><dd>출석으로 받은 츄르부터 쓰고, 다 쓰면 10 P로 줄 수 있어요.<br>레벨은 질문 활동을 나타내며 업무 능력 평가에는 쓰이지 않아요.</dd></div>
    <div><dt>누적 포인트</dt><dd>지금까지 받은 포인트를 모두 더한 값이에요. 츄르·꾸미기에 써도 줄지 않아요.<br>포인트 순위는 최근 3개월 동안 받은 누적 포인트로 정해요.</dd></div>
    <div><dt>활동 저장</dt><dd>포인트·레벨·출석·꾸미기는 계정별로 서버에 저장돼요.<br>다른 기기에서도 같은 아이디로 로그인하면 이어져요.</dd></div>
   </dl>
  </details></section>`:''}
 </section>`;
}
export function showMyPost(id){filter='mine';query='';boardCategory='all';hooks.show('board');requestAnimationFrame(()=>{document.getElementById('post-'+id)?.scrollIntoView({block:'center'});showBoardPost(id);});}
/** 게시판 질문 상세 창을 연다(질문·답변·유익해요). */
export function showBoardPost(id){const html=boardPostHTML(state,id);if(!html)return;openPostId=id;hooks.modal(html,true);hooks.seen?.(state.posts.find(p=>p.id===id));}
// 유익해요·답변 등록 뒤 열려 있는 상세 창을 새 내용으로 다시 그린다
const refreshOpenPost=()=>{if(openPostId&&document.querySelector('#modal[open] [data-board-post]'))showBoardPost(openPostId);};
export function boardHTML(){
 const blocked=gate();if(blocked)return '<section class="community-page">'+blocked+'</section>';
 return boardView(state,filter,query,boardCategory,boardSort);
}
function showDeleteDialog(id){
 const post=state.posts.find(p=>p.id===id);if(!post||(state.me?.role!=='staff'&&!post.mine))return;
 const description=state.me?.role==='staff'?'직원 화면에서 질문과 답변이 함께 숨겨집니다.<br>삭제된 글에서 복원할 수 있고, 이미 지급된 포인트는 유지됩니다.':'내 질문과 달린 답변이 게시판과 내 활동에서 함께 사라져요.<br>이미 받은 포인트는 유지되며, 복원이 필요하면 담당자에게 요청해 주세요.';
 hooks.modal('<h2 id="modal-title">이 질문을 삭제할까요?</h2><p class="modal-sub">'+description+'</p><blockquote class="delete-question-preview">'+esc(post.body)+'</blockquote><div class="modal-button-row"><button class="danger-button" data-confirm-delete="'+esc(post.id)+'">질문 삭제</button><button class="secondary-button" data-action="close-modal">취소</button></div>');
}
export function unknownOffer(r){
 return `<div class="unknown-board-offer"><div><strong>게시판에 질문을 남길까요?</strong><p>익명으로 공유됩니다.</p></div><button class="secondary-button" data-post-question="${esc(r.messageId)}">익명으로 질문하기</button></div>`;
}
export function showPostDialog(r){
 if(!state.member){hooks.show('activity');hooks.toast('체험 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.');return;}
 hooks.modal(`<h2 id="modal-title">익명 질문 작성</h2><p class="modal-sub">게시할 내용을 확인해 주세요. 이름·급여·개인 계정 정보 등은 적지 마세요.</p>${r.personal?'<p class="privacy-note">개인별 정보는 공개 게시판에서 확인할 수 없어요. 일반적인 절차에 대한 질문으로 바꿔 주세요.</p>':''}<form id="anonymous-post"><fieldset class="post-category"><legend>어느 분야에 올릴까요?</legend><div>${chatCategories.map(c=>`<label><input type="radio" name="category" value="${esc(c.id)}" required><span>${esc(c.label)}</span></label>`).join('')}</div><p>게시판에서 분야별로 모아 볼 수 있어요.</p></fieldset><label>게시할 질문<textarea name="body" rows="5" minlength="5" maxlength="2000" required>${r.personal?'':esc(r.q)}</textarea></label><p class="community-caption">게시판에는 ‘익명의 직원’으로 보여요. 로그인한 직원·담당자 모두 어느 PC에서나 볼 수 있어요.</p><label class="consent-check"><input type="checkbox" required> 이 내용을 직원 질문 게시판에 공유할게요.</label><div class="modal-button-row"><button class="primary-button">확인하고 익명으로 게시</button><button type="button" class="text-button" data-action="close-modal">취소</button></div></form>`);
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.openPost){showBoardPost(b.dataset.openPost);return;}
 if(b.dataset.deletePost){showDeleteDialog(b.dataset.deletePost);return;}
 if(b.dataset.confirmDelete||b.dataset.restorePost){
  if(busy||!state.member)return;
  const staff=state.me?.role==='staff',post=state.posts.find(p=>p.id===b.dataset.confirmDelete);
  if(b.dataset.restorePost?!staff:!staff&&!post?.mine)return;
  busy=true;b.disabled=true;
  try{const restore=!!b.dataset.restorePost,result=await communityAction(restore?'restore-post':'delete-post',{post:b.dataset.restorePost||b.dataset.confirmDelete});if(result){if(!restore)hooks.close();hooks.show('board');}}finally{busy=false;b.disabled=false;}return;
 }
 if(b.dataset.loginRole){loginRole=b.dataset.loginRole;hooks.render();return;}
 if(b.dataset.community==='statistics'){await loadStatistics();return;}
 if(b.dataset.statsPeriod||'statsMore' in b.dataset||'statsCsv' in b.dataset){
  if(state.me?.role!=='staff')return;
  if('statsCsv' in b.dataset){downloadRanking();return;}
  if(b.dataset.statsPeriod){statsPeriod=b.dataset.statsPeriod;statsExpanded=false;}else statsExpanded=!statsExpanded;
  const again=b.dataset.statsPeriod?`[data-stats-period="${statsPeriod}"]`:'[data-stats-more]';
  hooks.render();document.querySelector(again)?.focus({preventScroll:true});return; // 다시 그려도 누른 버튼에 포커스를 둔다
 }
 if(b.dataset.boardFilter){filter=b.dataset.boardFilter;hooks.show('board');return;}
 if(b.dataset.boardCategory){boardCategory=b.dataset.boardCategory;hooks.show('board');return;}
 const action=b.dataset.community;
 if(action==='refresh'){b.disabled=true;await refreshCommunity();hooks.render();return;}
 if(!action&&!b.dataset.like)return;
 if(busy)return;busy=true;b.disabled=true;
 try{
  if(action==='attendance'){
   b.textContent=b.dataset.busyLabel||'오늘의 선물을 여는 중…';
   const result=await communityAction('attendance');hooks.render();if(result)hooks.toast(result.notice); // 실패해도 버튼 글자를 되돌린다
  }
  if(b.dataset.like){if(await communityAction('like',{post:b.dataset.like})){hooks.render();refreshOpenPost();}}
 }finally{busy=false;b.disabled=action==='attendance'&&!!state.today;} // 출석했으면 버튼을 다시 풀지 않는다
});
// 게시판 정렬(최신순 / 유익해요 많은 순)
document.addEventListener('change',e=>{if(e.target.id==='board-sort'){boardSort=e.target.value;hooks.show('board');}});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(f.id==='account-login'){
  e.preventDefault();if(busy)return;busy=true;const button=f.querySelector('[type="submit"]'),error=f.querySelector('#login-error');button.disabled=true;button.textContent='로그인 중…';error.textContent='';hooks.loading?.('로그인하는 중');
  const epoch=++authEpoch;connecting=null;
  try{const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',...Object.fromEntries(new FormData(f))})}),data=await res.json();if(epoch!==authEpoch)return;if(!res.ok)throw Error(data.error);state=data;stats=null;filter='all';query='';hooks.update(state);broadcastAuth();}
  catch(e){if(epoch===authEpoch){error.textContent=e.message;f.querySelector('[name="password"]').focus();}}
  finally{busy=false;hooks.loading?.(null);button.disabled=false;button.textContent=loginRole==='staff'?'담당자로 로그인':'직원으로 로그인';}return;
 }

 if(f.id==='board-search'){e.preventDefault();query=new FormData(f).get('query').trim();hooks.render();return;}
 if(f.id!=='anonymous-post'&&!f.dataset.staffReply)return;
 e.preventDefault();if(busy)return;busy=true;
 const submit=f.querySelector('[type="submit"],button.primary-button');submit.disabled=true;
 try{
  const data=Object.fromEntries(new FormData(f));let result;
  if(f.id==='anonymous-post'){result=await communityAction('post',data);if(result){hooks.close();filter='mine';query='';boardCategory='all';hooks.show('board');}}
  else{f.dataset.requestId??=crypto.randomUUID();result=await communityAction('reply',{...data,post:f.dataset.staffReply,id:f.dataset.requestId});if(result){hooks.render();refreshOpenPost();}}
 }finally{busy=false;submit.disabled=false;}
});
