// 꾸미기 > 배경: 기본 풍경 4가지와 내가 올린 이미지(계정별·이 브라우저에 최대 8개).
// 고른 배경은 계정마다 따로 저장하고 서버와 맞춘다(account-sync.js). 다른 PC에 없는 올린 이미지를 고른 상태면 기본 배경으로 보인다(om-bg-theme-<모드>, om-bg-uploads-<모드>). 배경 버튼 클릭은 app.js 클릭 표가 처리한다.
import {communityState} from './community-ui.js?v=5e7f1906131e';
import {esc} from './shared.js?v=76a19ab6baf7';
const $=s=>document.querySelector(s);
// app.js가 넘겨주는 것: 계정별 저장(read·save), 창(openModal·closeModal·customizeTabs), 알림·아이콘, 화면 모드
let read,save,toast,openModal,closeModal,customizeTabs,icon,mode,isCat,root;
/** app.js가 원래 자리에서 한 번 부른다. */
export function initBackground(deps){({read,save,toast,openModal,closeModal,customizeTabs,icon,mode,isCat,root}=deps);}
const backgroundPresets=[
 {id:'cafe',label:'따뜻한 카페',caption:'커피 한 잔 같은 포근함',file:'bg-cafe.png'},
 {id:'nature',label:'초록빛 자연',caption:'숲속에서 잠시 숨 고르기',file:'bg-nature.png'},
 {id:'ocean',label:'잔잔한 바다',caption:'파도 곁에서 가볍게',file:'bg-ocean.png'},
 {id:'mountain',label:'고요한 산',caption:'맑은 공기와 느긋한 하루',file:'bg-mountain.png'}
];
// 내가 올린 배경 이미지 목록(최근 순, 계정별·이 브라우저에 최대 8개). 선택값은 'upload:<id>'로 저장한다.
const BG_UPLOAD_LIMIT=8,bgImagePattern=/^data:image\/(png|jpeg|webp|gif);base64,/;
export function backgroundUploads(){const list=read('om-bg-uploads-'+mode,[]);return Array.isArray(list)?list.filter(x=>x&&typeof x.id==='string'&&typeof x.url==='string'&&bgImagePattern.test(x.url)):[];}
export function backgroundState(){
 // 담당자의 '냥대리 테스트'는 배경 없이 쓴다 (담당자 화면에는 꾸미기 메뉴가 없다)
 if(communityState().me?.role==='staff')return {id:'white',label:'하얀 작업실',url:null};
 const fallback=isCat?'cafe':'white',saved=read('om-bg-theme-'+mode,null),id=typeof saved==='string'?saved:fallback;
 if(id.startsWith('upload:')){const image=backgroundUploads().find(x=>'upload:'+x.id===id);if(image)return {id,label:'나만의 공간',url:image.url};}
 const preset=backgroundPresets.find(p=>p.id===(id.startsWith('upload:')?fallback:id));
 return preset?{...preset,url:root+'assets/'+preset.file}:{id:'white',label:'하얀 작업실',url:null};
}
export function showBackground(){
 const current=backgroundState();
 openModal(`<h2 id="modal-title">꾸미기</h2>${customizeTabs('background')}<p class="modal-sub">냥대리 뒤에 놓일 풍경을 선택하세요.</p><div class="background-presets">${backgroundPresets.map(p=>`<button class="background-option ${current.id===p.id?'chosen':''}" data-background="${p.id}" aria-pressed="${current.id===p.id}"><span class="background-thumb" style="background-image:url('${root}assets/${p.file}')">${current.id===p.id?`<span class="background-check">${icon('check')}</span>`:''}</span><span class="background-option-name">${p.label}${p.id==='cafe'&&isCat?'<em>기본</em>':''}</span><small>${p.caption}</small></button>`).join('')}</div><div class="background-other"><button class="white-background-option ${current.id==='white'?'chosen':''}" data-background="white" aria-pressed="${current.id==='white'}"><span></span>흰색 배경${current.id==='white'?icon('check'):''}</button><label class="secondary-button file-button">${icon('picture')} 내 이미지 올리기<input type="file" id="bg-upload" accept="image/png,image/jpeg,image/webp,image/gif"></label></div>${current.id.startsWith('upload:')?'<p class="custom-background-status">현재 내가 올린 이미지를 사용 중이에요.</p>':''}${backgroundHistoryHTML(current)}<p class="caption">이미지 업로드: JPG, PNG, WebP, GIF · 최대 8MB<br>고른 배경은 계정에 저장돼 다른 PC에서도 보여요. 직접 올린 이미지는 이 브라우저에만 저장돼요(최근 ${BG_UPLOAD_LIMIT}개).</p>`,true);
}
function backgroundHistoryHTML(current){
 const list=backgroundUploads();if(!list.length)return '';
 return `<section class="background-history" aria-labelledby="bg-history-title"><h3 id="bg-history-title">내가 사용한 이미지 <span>${list.length}/${BG_UPLOAD_LIMIT}</span></h3><div class="background-history-list">${list.map((x,i)=>{const on=current.id==='upload:'+x.id;return `<div class="background-history-item ${on?'chosen':''}"><button class="background-history-pick" data-background="upload:${esc(x.id)}" aria-pressed="${on}" aria-label="내 이미지 ${i+1}${on?' (사용 중)':''} 배경으로 쓰기" style="background-image:url('${x.url}')">${on?'<span class="background-history-on">사용 중</span>':''}</button><button class="background-history-delete" data-bg-delete="${esc(x.id)}" aria-label="내 이미지 ${i+1} 삭제">${icon('close')}</button></div>`;}).join('')}</div></section>`;
}
export function applyBackground(){
 const bg=backgroundState();
 document.documentElement.style.setProperty('--user-bg',bg.url?`url("${bg.url}")`:'none');
 document.body.classList.toggle('custom-bg',!!bg.url);
 document.body.dataset.background=bg.id;
 const label=$('[data-room-label]');if(label)label.textContent=bg.label;
}
export async function loadBackground(file){if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>8*1024*1024){toast('8MB 이하의 JPG, PNG, WebP, GIF 이미지를 골라주세요.');return;}try{const image=await createImageBitmap(file),canvas=document.createElement('canvas');const ratio=Math.min(1,1600/image.width,1200/image.height);canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();const url=canvas.toDataURL('image/webp',.8),id=crypto.randomUUID(),next=[{id,url,at:Date.now()},...backgroundUploads().filter(x=>x.url!==url)].slice(0,BG_UPLOAD_LIMIT);if(save('om-bg-uploads-'+mode,next)&&save('om-bg-theme-'+mode,'upload:'+id)){applyBackground();closeModal();toast('내 이미지로 배경을 바꿨어요. 꾸미기 > 배경에서 다시 고를 수 있어요.');}}catch{toast('이 이미지를 읽을 수 없어요. 다른 파일을 골라주세요.');}}
