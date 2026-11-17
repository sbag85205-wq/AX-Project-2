// 냥대리 테스트 화면 아래 '검색·모델 설정' 칸 (담당자 전용).
// 담당자가 질문해 보면서 답변 모델과 검색 기준을 바로 바꿔 볼 수 있게 채팅 입력칸 아래에 둔다.
// 값은 서버(admin-settings)에 저장되고 다음 질문부터 모든 사용자에게 적용된다.
import {fetch} from './transport.js?v=fd4b994ba12d';
import {communityState} from './community-ui.js?v=ba054ff9bb4b';
import {esc,loadingHTML} from './shared.js?v=0fcb6a1b22de';
// app.js가 넘겨주는 화면 도구(아이콘·알림)
let icon,toast;
const ss={info:null,draft:null,models:[],modelsError:'',error:'',loading:false,saving:false,testing:false,test:null,open:true};
const SS_RANGES=[
 ['keyword_min','키워드 최소 점수','질문의 검색어 중 문서에 들어 있는 비율이 이 값 이상이면 근거로 써요. 기본 0.35',false],
 ['vector_min','의미 검색 최소 점수','임베딩 유사도가 이 값 이상이면 근거로 써요. 기본 0.55',true],
 ['vector_weight','의미 검색 비중','근거 순서를 정할 때 의미 검색과 키워드 점수를 섞는 비율이에요. 기본 0.60',true]
];
async function settingsCall(input){
 const res=await fetch('/api/knowly-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.error||'설정을 처리하지 못했어요.');return data;
}
function loadStaffSettings(){
 if(ss.loading||ss.info||communityState().me?.role!=='staff')return;
 ss.loading=true;ss.error='';
 settingsCall({action:'get'}).then(d=>{ss.info=d;ss.draft={...d.settings};}).catch(e=>{ss.error=e.message;}).finally(()=>{ss.loading=false;refreshStaffSettings();});
 settingsCall({action:'models'}).then(d=>{ss.models=Array.isArray(d.models)?d.models:[];}).catch(e=>{ss.modelsError=e.message;}).finally(refreshStaffSettings);
}
const ssModel=()=>String(ss.draft?.llm_model||'').trim();
const ssEffective=()=>ssModel()||ss.info?.default_model||'';
const ssChanged=()=>!!ss.info&&!!ss.draft&&JSON.stringify(ss.info.settings)!==JSON.stringify({...ss.draft,llm_model:ssModel()||null});
function ssModelHint(){
 if(ss.modelsError)return ss.modelsError;
 const m=ss.models.find(x=>x.id===ssEffective());
 if(m){const p=Number(m.prompt_price)*1e6,c=Number(m.completion_price||0)*1e6;return m.name+(m.prompt_price==null?'':!p&&!c?' · 무료':` · 입력 $${p.toFixed(2)} · 출력 $${c.toFixed(2)} / 100만 토큰`);}
 return ss.models.length?'목록에 없는 ID예요. 철자를 확인해 주세요.':'모델 목록을 불러오는 중…';
}
export function staffSettingsHTML(){
 if(communityState().me?.role!=='staff')return '';
 loadStaffSettings();
 const busy=!ssChanged()||ss.saving;
 const head=`<div class="ss-head"><button type="button" class="ss-toggle" data-ss-action="toggle" aria-expanded="${ss.open}" aria-controls="ss-body">${icon('settings')}<strong>검색·모델 설정</strong>${icon('down')}</button><span class="ss-note">저장하면 다음 질문부터 모든 사용자에게 적용돼요.</span>${ss.draft?`<div class="ss-actions"><button type="button" class="text-button" data-ss-action="revert" ${busy?'disabled':''}>되돌리기</button><button type="button" class="primary-button" data-ss-action="save" ${busy?'disabled':''}>${ss.saving?'저장 중…':'저장'}</button></div>`:''}</div>`;
 let body;
 if(ss.error)body=`<p class="ss-message warn">${esc(ss.error)}</p>`;
 else if(!ss.draft)body=loadingHTML('설정을 불러오는 중',{compact:true});
 else{
  const i=ss.info,d=ss.draft;
  const test=ss.test?`<p class="ss-test ${ss.test.ok?'ok':'warn'}">${ss.test.ok?`응답 성공 · ${(ss.test.latency_ms/1000).toFixed(1)}초 · ${esc(ss.test.model)}`:`응답 실패: ${esc(ss.test.error||'')}`}</p>`:'';
  body=`<div class="ss-model"><label for="ss-model">답변 모델</label><div class="ss-model-row"><input id="ss-model" list="ss-model-options" autocomplete="off" placeholder="${esc(i.default_model)}" value="${esc(d.llm_model||'')}"><button type="button" class="secondary-button" data-ss-action="test" ${ss.testing||!i.llm_configured?'disabled':''}>${ss.testing?'테스트 중…':'테스트'}</button><button type="button" class="text-button" data-ss-action="default" ${d.llm_model?'':'disabled'}>기본 모델로</button></div><datalist id="ss-model-options">${ss.models.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</datalist><small class="ss-model-hint">${i.llm_configured?esc(ssModelHint()):'LLM_API_KEY 비밀값이 없어서 지금은 검색 전용으로 답해요.'}</small>${test}</div>`
   +`<div class="ss-ranges">${SS_RANGES.map(([k,label,hint,vector])=>{const off=vector&&!i.embedding_configured;return `<label class="ss-range" title="${esc(off?'EMBEDDING_MODEL 비밀값을 설정하면 쓸 수 있어요.':hint)}"><span>${label} <b data-ss-value="${k}">${Number(d[k]).toFixed(2)}</b></span><input type="range" min="0" max="1" step="0.05" data-ss="${k}" value="${Number(d[k])}" ${off?'disabled':''}></label>`;}).join('')}</div>`;
 }
 return `<section class="staff-settings ${ss.open?'':'collapsed'}" aria-label="검색·모델 설정">${head}<div class="ss-body" id="ss-body" ${ss.open?'':'hidden'}>${body}</div></section>`;
}
/** 설정 칸을 펼친 상태로 둔다(냥대리 테스트를 열 때마다). */
export function expandStaffSettings(){ss.open=true;}
function refreshStaffSettings(){
 const panel=document.querySelector('.staff-settings');if(!panel)return;
 const el=document.activeElement?.closest?.('.staff-settings')?document.activeElement:null;
 const key=el?(el.id?'#'+el.id:el.dataset.ssAction?`[data-ss-action="${el.dataset.ssAction}"]`:el.dataset.ss?`[data-ss="${el.dataset.ss}"]`:''):'';
 panel.outerHTML=staffSettingsHTML();
 if(key)document.querySelector('.staff-settings '+key)?.focus({preventScroll:true});
}
function ssSyncButtons(){
 const off=!ssChanged()||ss.saving;
 document.querySelectorAll('.staff-settings [data-ss-action="save"], .staff-settings [data-ss-action="revert"]').forEach(b=>{b.disabled=off;});
 const def=document.querySelector('.staff-settings [data-ss-action="default"]');if(def)def.disabled=!ss.draft?.llm_model;
 const hint=document.querySelector('.staff-settings .ss-model-hint');if(hint&&ss.info?.llm_configured)hint.textContent=ssModelHint();
}
/** 칸 안의 입력·버튼을 처리한다. app.js가 원래 자리(다른 클릭 처리보다 먼저)에서 한 번 부른다. */
export function installStaffSettings(deps){
 ({icon,toast}=deps);
 document.addEventListener('input',e=>{
  const t=e.target;if(!t.closest?.('.staff-settings')||!ss.draft)return;
  if(t.dataset.ss){ss.draft[t.dataset.ss]=Number(t.value);const out=document.querySelector(`.staff-settings [data-ss-value="${t.dataset.ss}"]`);if(out)out.textContent=Number(t.value).toFixed(2);}
  else if(t.id==='ss-model')ss.draft.llm_model=t.value;
  ssSyncButtons();
 });
 document.addEventListener('click',async e=>{
  const b=e.target.closest?.('[data-ss-action]');if(!b||communityState().me?.role!=='staff')return;
  const a=b.dataset.ssAction;
  if(a==='toggle'){ss.open=!ss.open;b.closest('.staff-settings').classList.toggle('collapsed',!ss.open);b.setAttribute('aria-expanded',String(ss.open));document.getElementById('ss-body').hidden=!ss.open;return;}
  if(!ss.draft)return;
  if(a==='revert'){ss.draft={...ss.info.settings};refreshStaffSettings();return;}
  if(a==='default'){ss.draft.llm_model=null;refreshStaffSettings();return;}
  if(a==='save'){
   ss.saving=true;refreshStaffSettings();
   try{const {settings}=await settingsCall({action:'save',settings:{...ss.draft,llm_model:ssModel()||null}});ss.info={...ss.info,settings};ss.draft={...settings};toast('설정을 저장했어요. 다음 질문부터 적용돼요.');}
   catch(err){toast(err.message);}
   finally{ss.saving=false;refreshStaffSettings();}
   return;
  }
  if(a==='test'){
   ss.testing=true;ss.test=null;refreshStaffSettings();
   try{ss.test=await settingsCall({action:'test_model',model:ssEffective()});}
   catch(err){ss.test={ok:false,model:ssEffective(),latency_ms:0,error:err.message};}
   finally{ss.testing=false;refreshStaffSettings();}
  }
 });
}
