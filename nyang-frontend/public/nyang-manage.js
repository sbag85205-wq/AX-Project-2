// 상단 메뉴 '냥대리 테스트' 묶음 아래 '냥대리 관리' 화면 (담당자 전용, views.js의 manage).
// 화면 안에서 세 칸으로 나눠 본다: 모드별 반응 그림 / 계절별 기본 모습 / 꾸미기 아이템.
//  - 그림을 추가해도 같은 종류의 반응은 모두 같은 확률로 나온다(2개면 50%, 3개면 33%…).
//  - 반응마다 나올 계절을 고를 수 있다(아무것도 고르지 않으면 사계절).
//  - 계절을 고르면 그 계절의 기본 모습이 평소 모습이 되고, 그 계절 반응이 자동으로 '사용'이 된다.
// 목록과 올린 그림은 서버(server.mjs의 catalog-*)에 저장되어 모든 직원에게 똑같이 보인다.
import {fetch} from './transport.js?v=fd4b994ba12d';
import {communityState} from './community-ui.js?v=fbc8c6de196d';
import {esc} from './shared.js?v=b4248c4d9fbf';
import {SEASONS,KINDS,MODES,allReactions,activeReactions,seasonImages,seasonDefault,shopItems,selectSeason,normalizeCatalog} from './nyang-catalog.js?v=5d75771528af';

let deps=null;
const ui={tab:'reactions',mode:'warm',saving:false};
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
const seasonChips=(r)=>`<div class="nm-seasons" role="group" aria-label="나오는 계절">${SEASONS.slice(1).map(([id,label])=>`<button type="button" class="nm-chip ${r.seasons.includes(id)?'on':''}" data-nm="tag" data-id="${esc(r.id)}" data-season="${id}" aria-pressed="${r.seasons.includes(id)}">${label}</button>`).join('')}<span class="nm-chip-note">${r.seasons.length?'':'사계절'}</span></div>`;

// ── 칸 1: 모드별 반응 ────────────────────────────────────────────
function reactionsHTML(c){
 const ready=id=>deps.images.has(id);
 return `<div class="nm-modes" role="tablist" aria-label="모드">${MODES.map(([id,label])=>`<button type="button" role="tab" class="nm-mode ${ui.mode===id?'on':''}" aria-selected="${ui.mode===id}" data-nm="mode" data-mode="${id}">${label}</button>`).join('')}</div>
 <p class="nm-hint">지금 계절은 <b>${seasonLabel(c.season)}</b>이에요. '사용'이 켜져 있고 계절이 맞는(또는 사계절) 반응만 나오고, 같은 종류 안에서는 모두 같은 확률로 나와요.</p>
 ${KINDS.map(([kind,label])=>{
  const list=allReactions(c,ui.mode,kind),live=activeReactions(c,ui.mode,kind,ready),pct=live.length?Math.round(1000/live.length)/10:0;
  return `<section class="nm-group"><header><h3>${label}</h3><span>지금 나오는 반응 ${live.length}개 · 각각 ${pct}%</span></header><div class="nm-grid">${list.map(r=>{
   const on=live.some(x=>x.id===r.id);
   return `<article class="nm-card ${on?'':'off'}">${poseThumb(r)}<div class="nm-card-text"><strong>${esc(r.line)}</strong>${r.mark?`<small>${esc(r.mark)}</small>`:''}</div>
    ${seasonChips(r)}
    <div class="nm-card-foot"><label class="nm-switch"><input type="checkbox" data-nm="enable" data-id="${esc(r.id)}" ${r.enabled?'checked':''}> 사용</label><span class="nm-pct">${on?pct+'%':r.enabled?'다른 계절':'꺼짐'}</span>${r.builtin?'<span class="nm-badge">기본</span>':`<button type="button" class="text-button nm-del" data-nm="del-reaction" data-id="${esc(r.id)}">지우기</button>`}</div></article>`;}).join('')}</div></section>`;
 }).join('')}
 <form class="nm-add" data-nm-form="reaction"><h3>${MODES.find(([m])=>m===ui.mode)[1]} 반응 추가</h3>
  <label class="nm-file">그림<input type="file" name="image" accept="image/png,image/webp,image/jpeg" required></label>
  <label>반응 종류<select name="kind">${KINDS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <label>멘트<input name="line" maxlength="80" required placeholder="예: 오늘도 손길이 좋다냥!"></label>
  <label>작은 말풍선<input name="mark" maxlength="30" placeholder="예: 골골 ♥"></label>
  <fieldset class="nm-seasons"><legend>나오는 계절(안 고르면 사계절)</legend>${SEASONS.slice(1).map(([id,l])=>`<label class="nm-check"><input type="checkbox" name="season" value="${id}"> ${l}</label>`).join('')}</fieldset>
  <button class="primary-button" ${ui.saving?'disabled':''}>추가하기</button>
  <p class="nm-hint">냥대리 그림처럼 정사각형에 냥대리가 가운데 있는 투명 배경 그림이 가장 잘 맞아요.</p></form>`;
}

// ── 칸 2: 계절별 기본 모습 ───────────────────────────────────────
function seasonsHTML(c){
 return `<div class="nm-season-pick"><h3>지금 계절</h3><div class="nm-modes" role="radiogroup" aria-label="지금 계절">${SEASONS.map(([id,label])=>`<button type="button" role="radio" class="nm-mode ${c.season===id?'on':''}" aria-checked="${c.season===id}" data-nm="season" data-season="${id}">${label}</button>`).join('')}</div>
 <p class="nm-hint">계절을 고르면 그 계절의 기본 모습이 평소 냥대리가 되고, 반응도 그 계절(또는 사계절) 것으로 자동 선택돼요.</p></div>
 ${SEASONS.map(([season,label])=>{
  const list=seasonImages(c,season),chosen=seasonDefault(c,season);
  return `<section class="nm-group ${c.season===season?'current':''}"><header><h3>${label}${c.season===season?' <em>지금 계절</em>':''}</h3><span>기본 모습: ${esc(chosen.name||'')}</span></header><div class="nm-grid">${list.map(item=>`<article class="nm-card ${chosen.id===item.id?'chosen':''}">${seasonThumb(item)}<div class="nm-card-text"><strong>${esc(item.name||'새 모습')}</strong></div>
   <div class="nm-card-foot"><label class="nm-switch"><input type="radio" name="default-${season}" data-nm="default" data-season="${season}" data-id="${esc(item.id)}" ${chosen.id===item.id?'checked':''}> 기본 모습</label>${item.builtin?'<span class="nm-badge">기본</span>':`<button type="button" class="text-button nm-del" data-nm="del-season" data-id="${esc(item.id)}">지우기</button>`}</div></article>`).join('')}
   <form class="nm-add nm-add-inline" data-nm-form="season" data-season="${season}"><label class="nm-file">${label} 모습 추가<input type="file" name="image" accept="image/png,image/webp,image/jpeg" required></label><input name="name" maxlength="30" placeholder="이름(예: ${label} 냥대리 2)"><button class="secondary-button" ${ui.saving?'disabled':''}>추가</button></form></div></section>`;
 }).join('')}`;
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

const TABS=[['reactions','모드별 반응','따뜻한·차가운 모드의 쓰다듬기 반응 그림과 멘트예요. 그림을 추가하고, 반응마다 나오는 계절을 고를 수 있어요.'],
 ['seasons','계절별 모습','지금 계절과 계절마다의 평소 모습을 정해요. 계절을 고르면 그 계절 반응도 자동으로 선택돼요.'],
 ['items','꾸미기 아이템','직원이 하트로 열고 착용하는 아이템이에요. 새 아이템을 추가하고 판매를 켜고 끌 수 있어요.']];
function pageHTML(){
 const c=deps.catalog(),tab=TABS.find(([id])=>id===ui.tab)||TABS[0];
 return `<section class="admin-page nyang-manage"><header class="admin-heading"><h1>냥대리 관리</h1><div>바꾼 내용은 바로 저장되고 모든 직원의 냥대리에 적용돼요.</div></header>
 <div class="nm-tabs" role="tablist" aria-label="냥대리 관리">${TABS.map(([id,label])=>`<button type="button" role="tab" class="nm-tab ${tab[0]===id?'on':''}" aria-selected="${tab[0]===id}" data-nm="tab" data-tab="${id}">${label}</button>`).join('')}</div>
 <p class="nm-lead">${tab[2]}</p>
 <div class="nm-body">${tab[0]==='reactions'?reactionsHTML(c):tab[0]==='seasons'?seasonsHTML(c):itemsHTML(c)}</div></section>`;
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
  if(a==='tab'){ui.tab=b.dataset.tab;render();return;}
  if(a==='mode'){ui.mode=b.dataset.mode==='cold'?'cold':'warm';render();return;}
  if(ui.saving)return;
  const next=draft(),id=b.dataset.id;
  if(a==='tag'){
   const r=[...MODES.flatMap(([m])=>KINDS.flatMap(([k])=>allReactions(next,m,k)))].find(x=>x.id===id);if(!r)return;
   const seasons=r.seasons.includes(b.dataset.season)?r.seasons.filter(s=>s!==b.dataset.season):[...r.seasons,b.dataset.season];
   next.reactions[id]={enabled:r.enabled,seasons};save(next);return;
  }
  if(a==='season'){
   const chosen=selectSeason(next,b.dataset.season);
   const count=MODES.reduce((n,[m])=>n+KINDS.reduce((k,[kind])=>k+activeReactions(chosen,m,kind).length,0),0);
   save(chosen,`지금 계절을 '${seasonLabel(chosen.season)}'(으)로 바꿨어요. 반응 ${count}개가 자동으로 선택됐어요.`);return;
  }
  if(a==='del-reaction'&&confirm('이 반응을 지울까요?')){const r=next.custom.reactions.find(x=>x.id===id);next.custom.reactions=next.custom.reactions.filter(x=>x.id!==id);delete next.reactions[id];save(next,'반응을 지웠어요.').then(()=>r&&call({action:'catalog-image-delete',id:r.image}).catch(()=>{}));return;}
  if(a==='del-season'&&confirm('이 모습을 지울까요?')){const r=next.custom.seasonImages.find(x=>x.id===id);next.custom.seasonImages=next.custom.seasonImages.filter(x=>x.id!==id);for(const s in next.defaults)if(next.defaults[s]===id)delete next.defaults[s];save(next,'모습을 지웠어요.').then(()=>r&&call({action:'catalog-image-delete',id:r.image}).catch(()=>{}));return;}
  if(a==='del-item'&&confirm('이 아이템을 지울까요? 이미 연 직원의 냥대리에서도 보이지 않게 돼요.')){next.custom.items=next.custom.items.filter(x=>x.id!==id);save(next,'아이템을 지웠어요.');return;}
 });
 document.addEventListener('change',e=>{
  const t=e.target;if(!t.dataset?.nm||!staff()||ui.saving)return;
  const next=draft(),id=t.dataset.id;
  if(t.dataset.nm==='enable'){
   const r=MODES.flatMap(([m])=>KINDS.flatMap(([k])=>allReactions(next,m,k))).find(x=>x.id===id);if(!r)return;
   next.reactions[id]={enabled:t.checked,seasons:r.seasons};save(next);
  }
  if(t.dataset.nm==='default'){next.defaults[t.dataset.season]=id;save(next,`${seasonLabel(t.dataset.season)} 기본 모습을 바꿨어요.`);}
  if(t.dataset.nm==='item-enable'){const item=next.custom.items.find(x=>x.id===id);if(item){item.enabled=t.checked;save(next);}}
 });
 document.addEventListener('submit',async e=>{
  const f=e.target.closest?.('[data-nm-form]');if(!f||!staff())return;e.preventDefault();if(ui.saving)return;
  const data=new FormData(f),kind=f.dataset.nmForm;
  ui.saving=true;f.querySelectorAll('button').forEach(x=>{x.disabled=true;});
  try{
   const image=await upload(data.get('image'));const next=draft();
   if(kind==='reaction'){
    const id=newId('c-');next.custom.reactions.push({id,mode:ui.mode,kind:data.get('kind'),image,line:String(data.get('line')||''),mark:String(data.get('mark')||'')});
    next.reactions[id]={enabled:true,seasons:data.getAll('season').map(String)};
   }else if(kind==='season'){
    next.custom.seasonImages.push({id:newId('s-'),season:f.dataset.season,image,name:String(data.get('name')||'')||`${seasonLabel(f.dataset.season)} 냥대리`});
   }else{
    next.custom.items.push({id:newId('item-'),image,name:String(data.get('name')||''),cost:Math.max(1,Math.min(999,Math.round(Number(data.get('cost'))||1))),description:String(data.get('description')||''),enabled:true});
   }
   ui.saving=false;await save(next,'추가했어요. 모든 직원의 냥대리에 바로 적용돼요.');
  }catch(err){ui.saving=false;deps.toast(err.message||'추가하지 못했어요.');render();}
 });
}
