// 첫 사용자 가이드: 냥대리가 말풍선으로 화면 요소를 하나씩 가리키며 쓰는 법을 알려준다.
// 단계 내용은 guide-steps.js, 모양은 guide.css. 이 파일은 보여 주기·키보드·저장만 맡는다.
//
// 저장: 다 보았거나 건너뛰었다는 기록은 계정(Supabase 로그인 계정 정보)에 남긴다(transport.ts의 /api/guide).
//  그래서 다른 PC로 로그인해도 다시 뜨지 않는다. 저장에 실패하면 이 브라우저에 임시로 적어 두고 다음 로그인 때 다시 저장한다.
import {GUIDE_STEPS,GUIDE_VERSION,guideText} from './guide-steps.js?v=8008631ae06d';
import {esc} from './shared.js?v=b4248c4d9fbf';

const LOCAL_PREFIX='nyang-guide:';
const FOCUSABLE='button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])';

/**
 * 말풍선 자리를 정한다(순수 함수).
 *  target: 가리킬 요소의 화면 위치 {top,left,width,height} 또는 null(가운데에 띄움)
 *  bubble: 말풍선 크기 {width,height}, viewport: 화면 크기 {width,height}
 * 좁은 화면(narrow 이하)은 'sheet'(아래쪽 카드, 자리는 CSS가 정함). 그 밖에는 화면 밖으로 나가지 않게 left·top을 맞춘다.
 */
export function placeBubble(target,bubble,viewport,{margin=12,gap=14,narrow=560}={}){
 if(viewport.width<=narrow)return {mode:'sheet'};
 const w=Math.min(bubble.width,viewport.width-2*margin),h=Math.min(bubble.height,viewport.height-2*margin);
 const clampX=x=>Math.round(Math.max(margin,Math.min(x,viewport.width-w-margin)));
 const clampY=y=>Math.round(Math.max(margin,Math.min(y,viewport.height-h-margin)));
 if(!target)return {mode:'center',left:clampX((viewport.width-w)/2),top:clampY((viewport.height-h)/2)};
 const left=clampX(target.left+target.width/2-w/2);
 const below=target.top+target.height+gap,above=target.top-gap-h;
 if(below+h<=viewport.height-margin)return {mode:'below',left,top:Math.round(below)};
 if(above>=margin)return {mode:'above',left,top:Math.round(above)};
 // 위아래 모두 자리가 없으면(큰 요소) 화면 아래쪽 안에 겹쳐 띄운다
 return {mode:'over',left,top:clampY(viewport.height-h-margin)};
}

/** 이 계정에 가이드를 자동으로 띄울지. record: 계정에 저장된 기록, local: 이 브라우저 임시 기록 ({version,state} 또는 null) */
export function shouldAutoStart(record,local,version=GUIDE_VERSION){
 const seen=r=>!!r&&Number(r.version)>=version&&(r.state==='done'||r.state==='skipped');
 return !seen(record)&&!seen(local);
}

// 말풍선 안에 그리는 예시 화면 (실제 채팅에는 아무것도 넣지 않는다). 버튼처럼 보이지만 누를 수 없는 그림이다.
const EXAMPLES={
 answer:`<figure class="guide-example" aria-label="답변 예시 화면"><figcaption>예시</figcaption><div class="ge-card"><span class="ge-label ge-ok">사내 문서에서 확인한 답변</span><strong>설치 파일을 실행한 뒤 인증서버 주소를 등록하면 된다냥.</strong><span class="ge-source"><b>클라이언트 설치 가이드</b><small>12쪽 · 원문 보기 ›</small></span></div></figure>`,
 unknown:`<figure class="guide-example" aria-label="근거가 부족할 때 예시 화면"><figcaption>예시</figcaption><div class="ge-card"><span class="ge-label ge-warn">등록된 근거가 부족해요</span><span class="ge-offer"><span><b>게시판에 질문을 남길까요?</b><small>익명으로 공유됩니다.</small></span><span class="ge-button">익명으로 질문하기</span></span></div></figure>`,
 feedback:`<figure class="guide-example" aria-label="답변 평가 예시 화면"><figcaption>예시</figcaption><div class="ge-card ge-row"><span class="ge-button">도움돼요</span><span class="ge-button">아쉬워요</span></div></figure>`
};

/**
 * request: 서버 요청 함수(transport.js의 fetch). beforeStart: 가이드를 열기 직전에 부른다(예: 물어보기 화면으로 옮기기).
 * busy: 다른 창(대화상자)이 열려 있어 자동으로 띄우면 안 되는지.
 * returnFocus: 닫을 때 돌아갈 곳이 없으면(첫 자동 표시, 누른 버튼에 포커스가 가지 않는 브라우저) 포커스를 줄 요소.
 */
export function createGuide({request,beforeStart=()=>{},busy=()=>false,returnFocus=()=>null,storage=globalThis.localStorage,doc=globalThis.document,win=globalThis.window,steps=GUIDE_STEPS}){
 let root=null,index=0,lastFocus=null,account=null,frame=0,autoToken=0;
 const localKey=id=>LOCAL_PREFIX+id;
 const readLocal=id=>{try{return JSON.parse(storage.getItem(localKey(id))||'null');}catch{return null;}};
 const writeLocal=(id,value)=>{try{storage.setItem(localKey(id),JSON.stringify(value));}catch{/* 저장소를 못 쓰면 계정 기록만 쓴다 */}};

 async function readRecord(){
  const res=await request('/api/guide',{method:'POST',body:JSON.stringify({action:'read'})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'가이드 기록을 읽지 못했어요.');
  return data.guide??null;
 }
 async function saveRecord(state){
  if(!account)return;
  const record={version:GUIDE_VERSION,state};
  writeLocal(account.id,record); // 먼저 이 브라우저에 적어 두고(실패 대비) 계정에 저장한다
  try{const res=await request('/api/guide',{method:'POST',body:JSON.stringify({action:'save',...record})});if(res.ok)writeLocal(account.id,{...record,synced:true});}
  catch{/* 다음 로그인 때 다시 저장한다 */}
 }

 /** 로그인한 직원에게 처음 한 번 띄운다. me: {id, role} */
 async function maybeAutoStart(me){
  const token=++autoToken;account=me&&me.id?me:null;
  if(!account||account.role==='staff')return false;
  const local=readLocal(account.id);
  if(local?.synced&&!shouldAutoStart(null,local))return false; // 이미 계정에 저장한 걸 이 브라우저가 알고 있으면 묻지 않는다
  let record=null;
  try{record=await readRecord();}catch{if(local)return false;/* 기록을 못 읽었고 이 브라우저에도 없으면 아래에서 띄운다 */}
  if(token!==autoToken)return false; // 그사이 다른 계정으로 바뀜
  // 이 브라우저에서만 봤다고 적혀 있으면(예전에 저장 실패) 계정에 다시 저장하고 띄우지 않는다
  if(!shouldAutoStart(null,local)&&shouldAutoStart(record,null)){if(!local.synced)saveRecord(local.state);return false;}
  if(!shouldAutoStart(record,local))return false;
  // 다른 창(출석·안내 등)이 닫힐 때까지 잠깐 기다린다
  for(let i=0;i<20&&busy();i++){await new Promise(r=>setTimeout(r,300));if(token!==autoToken)return false;}
  if(busy())return false;
  start();return true;
 }

 function start(me=account){
  if(me&&me.id)account=me;
  if(!account||account.role==='staff'||root)return;
  lastFocus=doc.activeElement;index=0;
  beforeStart();
  root=doc.createElement('div');root.className='nyang-guide';
  root.innerHTML=`<div class="guide-spotlight" aria-hidden="true"></div><section class="guide-bubble" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-text"></section>`;
  root.addEventListener('click',onClick);root.addEventListener('keydown',onKey);
  doc.body.append(root);doc.body.classList.add('guide-open');
  win.addEventListener('resize',schedule);win.addEventListener('scroll',schedule,true);
  show(0);
 }

 function close(state=null){
  if(!root)return;
  win.removeEventListener('resize',schedule);win.removeEventListener('scroll',schedule,true);cancelAnimationFrame(frame);
  root.remove();root=null;doc.body.classList.remove('guide-open');
  if(state)saveRecord(state);
  const back=lastFocus&&lastFocus!==doc.body&&doc.contains(lastFocus)?lastFocus:returnFocus();
  back?.focus?.();
 }

 function stepHTML(step,i){
  const last=i===steps.length-1,total=steps.length;
  return `<div class="guide-head"><span class="guide-cat ${step.mood==='happy'?'happy':''}" aria-hidden="true"></span><p class="guide-progress">${i+1} / ${total} 단계</p><button type="button" class="guide-skip" data-guide="skip" aria-label="가이드 건너뛰기 (다시 보려면 가이드 버튼)">건너뛰기</button></div>
<h2 id="guide-title">${esc(step.title)}</h2>
<div id="guide-text" class="guide-text">${step.body?`<p>${guideText(step.body,esc)}</p>`:''}${step.points?.length?`<ul>${step.points.map(p=>`<li>${guideText(p,esc)}</li>`).join('')}</ul>`:''}</div>
${EXAMPLES[step.example]||''}
<ol class="guide-dots" aria-hidden="true">${steps.map((_,j)=>`<li class="${j===i?'on':''}"></li>`).join('')}</ol>
<div class="guide-actions">${i>0?`<button type="button" class="guide-button" data-guide="prev" aria-label="이전 단계로">이전</button>`:'<span></span>'}
${last?`<span class="guide-final"><button type="button" class="guide-button" data-guide="later" aria-label="가이드 닫기 (다음 로그인 때 다시 보기)">다음에 또 보기</button><button type="button" class="guide-button primary" data-guide="done" aria-label="가이드 마치고 다시 보지 않기">다시 보지 않기</button></span>`
 :`<button type="button" class="guide-button primary" data-guide="next" aria-label="다음 단계로 (${i+2} / ${total})">다음</button>`}</div>`;
 }

 function show(i){
  index=Math.max(0,Math.min(i,steps.length-1));
  const bubble=root.querySelector('.guide-bubble');
  bubble.innerHTML=stepHTML(steps[index],index);root.dataset.step=steps[index].id;
  const el=targetOf(steps[index]);
  if(el)el.scrollIntoView({block:'nearest',inline:'nearest'});
  position();
  (bubble.querySelector('.guide-button.primary')||bubble.querySelector('[data-guide]')).focus();
 }

 // 가리킬 요소: 있고 화면에 보일 때만 (숨김·크기 0이면 가운데에 띄운다)
 function targetOf(step){
  if(!step.target)return null;
  const el=doc.querySelector(step.target);
  if(!el||el.closest('[hidden]'))return null;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0?el:null;
 }

 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(position);}
 function position(){
  if(!root)return;
  const el=targetOf(steps[index]),spot=root.querySelector('.guide-spotlight'),bubble=root.querySelector('.guide-bubble');
  const rect=el?.getBoundingClientRect(),pad=6;
  spot.hidden=!rect;root.classList.toggle('no-target',!rect);
  if(rect)Object.assign(spot.style,{top:rect.top-pad+'px',left:rect.left-pad+'px',width:rect.width+pad*2+'px',height:rect.height+pad*2+'px'});
  const place=placeBubble(rect?{top:rect.top,left:rect.left,width:rect.width,height:rect.height}:null,{width:bubble.offsetWidth,height:bubble.offsetHeight},{width:win.innerWidth,height:win.innerHeight});
  bubble.dataset.place=place.mode;
  if(place.mode==='sheet'){bubble.style.left='';bubble.style.top='';}
  else{bubble.style.left=place.left+'px';bubble.style.top=place.top+'px';}
 }

 function onClick(e){
  const action=e.target.closest('[data-guide]')?.dataset.guide;if(!action)return;
  if(action==='next')show(index+1);
  else if(action==='prev')show(index-1);
  else if(action==='skip')close('skipped');
  else if(action==='done')close('done');
  else if(action==='later')close(null);
 }

 function onKey(e){
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close('skipped');return;}
  if(e.key==='ArrowRight'&&index<steps.length-1){e.preventDefault();e.stopPropagation();show(index+1);return;}
  if(e.key==='ArrowLeft'&&index>0){e.preventDefault();e.stopPropagation();show(index-1);return;}
  if(e.key!=='Tab')return;
  // 포커스가 말풍선 밖으로 나가지 않게 처음·끝에서 돌린다
  const items=[...root.querySelectorAll(FOCUSABLE)];if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}
 }

 return {start,close,maybeAutoStart,isOpen:()=>!!root,step:()=>index};
}
