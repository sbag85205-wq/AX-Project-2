// 상단 메뉴 '냥대리 테스트' 묶음 아래 '냥대리 관리' 화면 (담당자 전용, views.js의 manage).
// 화면 안에서 세 칸으로 나눠 본다: 모드별 반응 그림 / 계절별 기본 모습 / 꾸미기 아이템.
//  - 그림을 추가해도 같은 종류의 반응은 모두 같은 확률로 나온다(2개면 50%, 3개면 33%…).
//  - 반응마다 나올 계절을 고를 수 있다(아무것도 고르지 않으면 사계절).
//  - 계절을 고르면 그 계절의 기본 모습이 평소 모습이 되고, 그 계절 반응이 자동으로 '사용'이 된다.
// 목록과 올린 그림은 서버(server.mjs의 catalog-*)에 저장되어 모든 직원에게 똑같이 보인다.
import {fetch} from './transport.js?v=fd4b994ba12d';
import {communityState} from './community-ui.js?v=875803c52c83';
import {esc} from './shared.js?v=b4248c4d9fbf';
import {SEASONS,KINDS,MODES,allReactions,bucketReactions,suggestLine,seasonImages,seasonDefault,shopItems,selectSeason,normalizeCatalog} from './nyang-catalog.js?v=3a88ea59d01b';

let deps=null;
const ui={tab:'none',mode:'warm',saving:false,editing:null};
const seasonLabel=id=>SEASONS.find(([s])=>s===id)?.[1]||'기본';
const staff=()=>communityState().me?.role==='staff';

async function call(input){
 const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.error||'냥대리 관리를 저장하지 못했어요.');return data;
}

/**
 * 올린 그림을 냥대리 그림과 같은 틀(750×750, 사방 여백 포함)에 맞춘다. 받은 냥대리 그림(정사각형, 고양이가 가운데)과
 * 같은 틀로 그리면 반응·계절 모습·꾸미기 아이템이 냥대리 자리에 그대로 겹친다.
 */
async function fitImage(file){
 if(!file||!/^image\/(png|webp|jpeg)$/.test(file.type))throw Error('PNG·WEBP·JPG 그림을 골라 주세요.');
 if(file.size>15_000_000)throw Error('그림 파일이 너무 커요(15MB까지).');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const C=750,BOX=655,s=BOX/Math.max(img.naturalWidth,img.naturalHeight),w=img.naturalWidth*s,h=img.naturalHeight*s;
  const canvas=document.createElement('canvas');canvas.width=C;canvas.height=C;
  const g=canvas.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,72+(BOX-w)/2,44+(BOX-h)/2,w,h);
  let src=canvas.toDataURL('image/webp',0.88);if(!src.startsWith('data:image/webp'))src=canvas.toDataURL('image/png');
  if(src.length>1_500_000)throw Error('그림이 너무 복잡해서 저장할 수 없어요. 더 단순한 그림을 올려 주세요.');
  return src;
 }finally{URL.revokeObjectURL(url);}
}
async function upload(file){const src=await fitImage(file);const {id}=await call({action:'catalog-image-add',src});deps.images.set(id,src);return id;}
const newId=prefix=>prefix+crypto.randomUUID().replace(/-/g,'').slice(0,16);

async function save(next,message){
 ui.saving=true;
 try{const {catalog}=await call({action:'catalog-save',catalog:next});deps.setCatalog(catalog);if(message)deps.toast(message);}
 catch(e){deps.toast(e.message);}
 finally{ui.saving=false;render();}
}
const draft=()=>normalizeCatalog(JSON.parse(JSON.stringify(deps.catalog())));
const findReaction=(catalog,id)=>MODES.flatMap(([m])=>KINDS.flatMap(([k])=>allReactions(catalog,m,k))).find(x=>x.id===id);

// ── 그림 미리보기 ────────────────────────────────────────────────
function poseThumb(r){
 if(!r.builtin){const src=deps.images.get(r.image);return src?deps.cat('custom-art','nm-thumb reaction-art',`--art:url('${src}')`):'<div class="nm-thumb nm-missing">그림을 불러오는 중</div>';}
 const p=r.pose;
 if(p.art)return deps.cat(r.mode+'-'+p.art,'nm-thumb reaction-art');
 return deps.cat(p.eyes==='closed'?'nm-closed':p.eyes||'','nm-thumb');
}
function seasonThumb(item){
 if(item.id==='base')return deps.cat('','nm-thumb');
 if(item.builtin)return deps.cat(item.id,'nm-thumb reaction-art');
 const src=deps.images.get(item.image);return src?deps.cat('custom-art','nm-thumb reaction-art',`--art:url('${src}')`):'<div class="nm-thumb nm-missing">그림을 불러오는 중</div>';
}
function itemThumb(item){
 if(item.builtin)return `<div class="nm-item-symbol item-symbol item-${item.id}">${item.symbol}</div>`;
 const src=deps.images.get(item.image);
 return src?deps.cat('','nm-thumb','',`<span class="outfit-custom" style="--outfit:url('${src}')"></span>`):'<div class="nm-thumb nm-missing">그림을 불러오는 중</div>';
}
// ── 기본값·계절 칸: 평소 모습 + 모드별 반응 ───────────────────────────
const tabLabel=season=>season==='none'?'기본값':seasonLabel(season);
function bucketHTML(c,season){
 const ready=id=>deps.images.has(id),label=tabLabel(season),current=c.season===season;
 const images=seasonImages(c,season),chosen=seasonDefault(c,season);
 const head=current
  ?`<div class="nm-now"><span class="nm-now-badge">지금 쓰는 칸</span>직원들에게 이 칸의 평소 모습과 반응이 나와요.${season==='none'?'':' 이 칸에 반응이 없는 종류는 기본값 반응이 나와요.'}</div>`
  :`<div class="nm-now"><button type="button" class="primary-button" data-nm="season" data-season="${season}" ${ui.saving?'disabled':''}>${season==='none'?'기본값으로 쓰기':`지금 계절을 ${label}로 바꾸기`}</button><span>지금은 '${tabLabel(c.season)}' 칸을 쓰고 있어요.</span></div>`;
 const look=`<section class="nm-group"><header><h3>평소 모습</h3><span>기본 모습: ${esc(chosen.name||'')}</span></header><div class="nm-grid">${images.map(item=>`<article class="nm-card ${chosen.id===item.id?'chosen':''}">${seasonThumb(item)}<div class="nm-card-text"><strong>${esc(item.name||'새 모습')}</strong></div>
   <div class="nm-card-foot"><label class="nm-switch"><input type="radio" name="default-${season}" data-nm="default" data-season="${season}" data-id="${esc(item.id)}" ${chosen.id===item.id?'checked':''}> 기본 모습</label>${item.builtin?'<span class="nm-badge">기본</span>':`<button type="button" class="text-button nm-del" data-nm="del-season" data-id="${esc(item.id)}">지우기</button>`}</div></article>`).join('')}
   <form class="nm-add nm-add-inline" data-nm-form="season" data-season="${season}"><label class="nm-file">${label} 모습 추가<input type="file" name="image" accept="image/png,image/webp,image/jpeg" required></label><input name="name" maxlength="30" placeholder="이름(예: ${label} 냥대리 2)"><button class="secondary-button" ${ui.saving?'disabled':''}>추가</button></form></div></section>`;
 const modes=`<div class="nm-modes" role="tablist" aria-label="모드">${MODES.map(([id,l])=>`<button type="button" role="tab" class="nm-mode ${ui.mode===id?'on':''}" aria-selected="${ui.mode===id}" data-nm="mode" data-mode="${id}">${l}</button>`).join('')}</div>`;
 const kinds=KINDS.map(([kind,kl])=>{
  const list=allReactions(c,ui.mode,kind).filter(r=>r.season===season),live=bucketReactions(c,season,ui.mode,kind,ready),pct=live.length?Math.round(1000/live.length)/10:0;
  const note=list.length?`사용 중 ${live.length}개 · 각각 ${pct}%`:season==='none'?'반응이 없어요':'비어 있어요 · 기본값 반응이 나와요';
  return `<section class="nm-group"><header><h3>${kl}</h3><span>${note}</span></header>${list.length?`<div class="nm-grid">${list.map(r=>{
   const on=live.some(x=>x.id===r.id),id=esc(r.id);
   const text=ui.editing===r.id
    ?`<form class="nm-edit" data-nm-form="edit" data-id="${id}"><label>멘트<input name="line" maxlength="80" required value="${esc(r.line)}"></label><label>작은 말풍선<input name="mark" maxlength="30" value="${esc(r.mark||'')}"></label>
      <div class="nm-edit-actions"><button class="primary-button" ${ui.saving?'disabled':''}>저장</button><button type="button" class="text-button" data-nm="suggest" data-id="${id}">다시 써 주기</button>${r.edited?`<button type="button" class="text-button" data-nm="reset-line" data-id="${id}">원래 멘트로</button>`:''}<button type="button" class="text-button" data-nm="cancel-edit">취소</button></div></form>`
    :`<div class="nm-card-text"><strong>${esc(r.line)}</strong>${r.mark?`<small>${esc(r.mark)}</small>`:''}<button type="button" class="text-button nm-edit-open" data-nm="edit" data-id="${id}">${deps.icon('edit')}수정</button></div>`;
   return `<article class="nm-card ${on?'':'off'} ${ui.editing===r.id?'editing':''}">${poseThumb(r)}${text}
    <div class="nm-card-foot"><label class="nm-switch"><input type="checkbox" data-nm="enable" data-id="${id}" ${r.enabled?'checked':''}> 사용</label><span class="nm-pct">${on?pct+'%':'꺼짐'}</span>${r.builtin?`<span class="nm-badge">${r.edited?'기본 · 멘트 수정':'기본'}</span>`:`<button type="button" class="text-button nm-del" data-nm="del-reaction" data-id="${id}">지우기</button>`}</div></article>`;}).join('')}</div>`:`<p class="nm-empty">${season==='none'?'아직 반응이 없어요.':`${label} 칸에 아직 ${kl} 반응이 없어요. 아래에서 추가해 주세요.`}</p>`}</section>`;
 }).join('');
 const add=`<form class="nm-add" data-nm-form="reaction" data-season="${season}"><h3>${label} · ${MODES.find(([m])=>m===ui.mode)[1]} 반응 추가</h3>
  <label class="nm-file">그림<input type="file" name="image" accept="image/png,image/webp,image/jpeg" required></label>
  <label>반응 종류<select name="kind">${KINDS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <button class="primary-button" ${ui.saving?'disabled':''}>추가하기</button>
  <p class="nm-hint">멘트는 모드·반응 종류·계절에 맞게 자동으로 써 드려요. 추가한 뒤 '수정'으로 바꿀 수 있어요. 그림은 냥대리 그림처럼 정사각형에 냥대리가 가운데 있는 투명 배경 그림이 가장 잘 맞아요. 같은 종류 안에서는 모든 반응이 같은 확률로 나와요.</p></form>`;
 return `${head}${look}<h2 class="nm-section-title">반응</h2>${modes}${kinds}${add}`;
}

// ── 칸 3: 꾸미기 아이템 ──────────────────────────────────────────
function itemsHTML(c){
 return `<section class="nm-group"><header><h3>꾸미기 아이템</h3><span>직원이 하트로 열고 착용해요</span></header><div class="nm-grid">${shopItems(c,{all:true}).map(item=>`<article class="nm-card ${item.enabled===false?'off':''}">${itemThumb(item)}<div class="nm-card-text"><strong>${esc(item.name)}</strong><small>♥ ${item.cost}${item.description?' · '+esc(item.description):''}</small></div>
  <div class="nm-card-foot">${item.builtin?'<span class="nm-badge">기본</span>':`<label class="nm-switch"><input type="checkbox" data-nm="item-enable" data-id="${esc(item.id)}" ${item.enabled!==false?'checked':''}> 판매 중</label><button type="button" class="text-button nm-del" data-nm="del-item" data-id="${esc(item.id)}">지우기</button>`}</div></article>`).join('')}</div></section>
 <form class="nm-add" data-nm-form="item"><h3>아이템 추가</h3>
  <label class="nm-file">그림<input type="file" name="image" accept="image/png,image/webp,image/jpeg" required></label>
  <label>이름<input name="name" maxlength="30" required placeholder="예: 벚꽃 머리핀"></label>
  <label>하트 가격<input name="cost" type="number" min="1" max="999" value="5" required></label>
  <label>설명<input name="description" maxlength="80" placeholder="예: 봄바람에 살랑이는 머리핀"></label>
  <button class="primary-button" ${ui.saving?'disabled':''}>추가하기</button>
  <p class="nm-hint">냥대리 그림과 같은 크기의 투명 배경 그림에 아이템만 그려서 올리면 냥대리 위에 그대로 겹쳐져요.</p></form>`;
}

const TABS=[...SEASONS.map(([id])=>[id,tabLabel(id)]),['items','꾸미기 아이템']];
function pageHTML(){
 const c=deps.catalog(),tab=TABS.find(([id])=>id===ui.tab)||TABS[0];
 return `<section class="admin-page nyang-manage"><header class="admin-heading"><h1>냥대리 관리</h1></header>
 <div class="nm-guide"><p>직원 첫 화면에 사는 <b>냥대리 캐릭터</b>의 모습과 반응을 정하는 곳이에요. 여기서 바꾼 내용은 모든 직원에게 똑같이 보여요.</p>
 <ul><li><b>평소 모습</b> 직원 첫 화면에 서 있는 냥대리 그림이에요. 계절 칸마다 따로 정해요.</li>
 <li><b>반응</b> 직원이 냥대리를 쓰다듬으면 나오는 그림과 멘트예요. 따뜻한·차가운 모드별로 나뉘고, 같은 종류의 반응은 같은 확률로 골라 나와요.</li>
 <li><b>꾸미기 아이템</b> 직원이 하트로 사서 냥대리에게 입히는 아이템이에요.</li>
 <li><b>지금 쓰는 칸</b> 탭에 점이 찍힌 칸이 지금 직원에게 보이는 칸이에요. 다른 칸에서 '지금 계절을 …로 바꾸기'(기본값 칸은 '기본값으로 쓰기')를 누르면 바뀌어요.</li></ul></div>
 <div class="nm-tabs" role="tablist" aria-label="냥대리 관리">${TABS.map(([id,label])=>`<button type="button" role="tab" class="nm-tab ${tab[0]===id?'on':''}" aria-selected="${tab[0]===id}" data-nm="tab" data-tab="${id}">${label}${c.season===id?'<i class="nm-tab-dot" title="지금 쓰는 칸"></i>':''}</button>`).join('')}</div>
 <p class="nm-lead">${tab[0]==='items'?'직원이 하트로 열고 착용하는 아이템이에요. 새 아이템을 추가하고 판매를 켜고 끌 수 있어요.':tab[0]==='none'?'계절을 정하지 않았을 때(기본값) 냥대리의 평소 모습과 쓰다듬기 반응이에요.':`${tab[1]}에 쓸 평소 모습과 쓰다듬기 반응이에요. 지금 계절을 ${tab[1]}로 바꾸면 이 칸이 쓰여요.`}</p>
 <div class="nm-body">${tab[0]==='items'?itemsHTML(c):bucketHTML(c,tab[0])}</div></section>`;
}
/** 상단 메뉴에서 연 화면(app.js가 #main에 넣는다). 올린 그림은 받는 대로 다시 그린다. */
export function nyangManagePageHTML(){
 if(!deps)return '';
 const c=deps.catalog(),ids=[...c.custom.reactions.map(r=>r.image),...c.custom.seasonImages.map(r=>r.image),...c.custom.items.map(r=>r.image)].filter(id=>!deps.images.has(id));
 if(ids.length)Promise.resolve(deps.loadImages?.(ids)).then(render);
 return pageHTML();
}
function render(){
 const host=document.querySelector('.nyang-manage');if(!host)return;
 const main=document.getElementById('main'),top=main?.scrollTop||0;host.outerHTML=pageHTML();if(main)main.scrollTop=top;
}

export function installNyangManage(d){
 deps=d;
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-nm]');if(!b||!staff())return;
  const a=b.dataset.nm;
  if(a==='tab'){ui.tab=b.dataset.tab;ui.editing=null;render();return;}
  if(a==='edit'){ui.editing=b.dataset.id;render();document.querySelector(`.nm-edit[data-id="${CSS.escape(b.dataset.id)}"] input[name=line]`)?.focus();return;}
  if(a==='cancel-edit'){ui.editing=null;render();return;}
  if(a==='suggest'){
   const f=b.closest('form'),r=findReaction(deps.catalog(),b.dataset.id);if(!f||!r)return;
   const used=allReactions(deps.catalog(),r.mode,r.kind).map(x=>x.line).concat(f.elements.line.value),next=suggestLine(r.mode,r.kind,r.season,used);
   f.elements.line.value=next.line;f.elements.mark.value=next.mark;return;
  }
  if(a==='mode'){ui.mode=b.dataset.mode==='cold'?'cold':'warm';ui.editing=null;render();return;}
  if(ui.saving)return;
  const next=draft(),id=b.dataset.id;
  if(a==='season'){
   const chosen=selectSeason(next,b.dataset.season);
   save(chosen,chosen.season==='none'?'기본값 칸을 쓰도록 바꿨어요.':`지금 계절을 '${tabLabel(chosen.season)}'(으)로 바꿨어요. 직원들에게 ${tabLabel(chosen.season)} 칸의 모습과 반응이 나와요.`);return;
  }
  if(a==='reset-line'){const o=next.reactions[id]||{};next.reactions[id]={enabled:o.enabled!==false};ui.editing=null;save(next,'원래 멘트로 되돌렸어요.');return;}
  if(a==='del-reaction'&&confirm('이 반응을 지울까요?')){const r=next.custom.reactions.find(x=>x.id===id);next.custom.reactions=next.custom.reactions.filter(x=>x.id!==id);delete next.reactions[id];save(next,'반응을 지웠어요.').then(()=>r&&call({action:'catalog-image-delete',id:r.image}).catch(()=>{}));return;}
  if(a==='del-season'&&confirm('이 모습을 지울까요?')){const r=next.custom.seasonImages.find(x=>x.id===id);next.custom.seasonImages=next.custom.seasonImages.filter(x=>x.id!==id);for(const s in next.defaults)if(next.defaults[s]===id)delete next.defaults[s];save(next,'모습을 지웠어요.').then(()=>r&&call({action:'catalog-image-delete',id:r.image}).catch(()=>{}));return;}
  if(a==='del-item'&&confirm('이 아이템을 지울까요? 이미 연 직원의 냥대리에서도 보이지 않게 돼요.')){next.custom.items=next.custom.items.filter(x=>x.id!==id);save(next,'아이템을 지웠어요.');return;}
 });
 document.addEventListener('change',e=>{
  const t=e.target;if(!t.dataset?.nm||!staff()||ui.saving)return;
  const next=draft(),id=t.dataset.id;
  if(t.dataset.nm==='enable'){
   next.reactions[id]={enabled:t.checked};save(next);
  }
  if(t.dataset.nm==='default'){next.defaults[t.dataset.season]=id;save(next,`${seasonLabel(t.dataset.season)} 기본 모습을 바꿨어요.`);}
  if(t.dataset.nm==='item-enable'){const item=next.custom.items.find(x=>x.id===id);if(item){item.enabled=t.checked;save(next);}}
 });
 document.addEventListener('submit',async e=>{
  const f=e.target.closest?.('[data-nm-form]');if(!f||!staff())return;e.preventDefault();if(ui.saving)return;
  const data=new FormData(f),kind=f.dataset.nmForm;
  if(kind==='edit'){
   const next=draft(),id=f.dataset.id,r=findReaction(next,id);if(!r)return;
   const line=String(data.get('line')||'').trim().slice(0,80),mark=String(data.get('mark')||'').trim().slice(0,30);if(!line){deps.toast('멘트를 적어 주세요.');return;}
   if(r.builtin){
    const o=next.reactions[id]||{};
    next.reactions[id]=line===r.original.line&&mark===r.original.mark?{enabled:o.enabled!==false}:{enabled:o.enabled!==false,line,mark};
   }else{const c=next.custom.reactions.find(x=>x.id===id);if(c){c.line=line;c.mark=mark;}}
   ui.editing=null;save(next,'멘트를 고쳤어요.');return;
  }
  ui.saving=true;f.querySelectorAll('button').forEach(x=>{x.disabled=true;});
  let added='';
  try{
   const image=await upload(data.get('image'));const next=draft();
   if(kind==='reaction'){
    // 멘트는 모드·종류·칸에 맞게 자동으로 쓴다(같은 종류에서 이미 쓰는 멘트는 피한다)
    const reactionKind=String(data.get('kind')),season=f.dataset.season||'none';
    const {line,mark}=suggestLine(ui.mode,reactionKind,season,allReactions(next,ui.mode,reactionKind).map(x=>x.line));
    const id=newId('c-');next.custom.reactions.push({id,mode:ui.mode,kind:reactionKind,season,image,line,mark});
    next.reactions[id]={enabled:true};added=`추가했어요. 멘트는 "${line}"로 써 두었어요. '수정'으로 바꿀 수 있어요.`;
   }else if(kind==='season'){
    next.custom.seasonImages.push({id:newId('s-'),season:f.dataset.season,image,name:String(data.get('name')||'')||`${seasonLabel(f.dataset.season)} 냥대리`});
   }else{
    next.custom.items.push({id:newId('item-'),image,name:String(data.get('name')||''),cost:Math.max(1,Math.min(999,Math.round(Number(data.get('cost'))||1))),description:String(data.get('description')||''),enabled:true});
   }
   ui.saving=false;await save(next,added||'추가했어요. 모든 직원의 냥대리에 바로 적용돼요.');
  }catch(err){ui.saving=false;deps.toast(err.message||'추가하지 못했어요.');render();}
 });
}
