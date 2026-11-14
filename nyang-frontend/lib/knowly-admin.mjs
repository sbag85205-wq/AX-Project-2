// 냥대리 담당자 화면 → main 백엔드(Supabase) 관리자 기능. 정해 둔 작업만 허용하고 입력을 검사한 뒤 관리자 계정으로 호출한다.
import {AppError} from './community.mjs';
import {knowlyAdminConfig,knowlyFetch,knowlyJson} from './knowly.mjs';

export const KNOWLY_CATEGORIES=['급여','휴가','복리후생','근무제도','경비','IT','인사정보','기타'];
export const GROUP_STATUSES=['신규','검토 중','FAQ 등록 완료','보류'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message,status=400)=>{throw new AppError(message,status);};
const str=(v,max,name,required=true)=>{const s=typeof v==='string'?v.trim():'';if(required&&!s)fail(`${name}을(를) 입력해 주세요.`);if(s.length>max)fail(`${name}은(는) ${max.toLocaleString()}자 이내로 입력해 주세요.`);return s;};
const id=v=>{if(typeof v!=='string'||!UUID.test(v))fail('대상을 찾을 수 없어요.',404);return v;};
const category=v=>{if(!KNOWLY_CATEGORIES.includes(v))fail('분야를 선택해 주세요.');return v;};
const PAGE_CHARS=3000;

/** 붙여 넣거나 파일에서 읽은 글을 ingest 함수가 받는 페이지 목록으로 나눈다 (쪽 나눔 문자가 있으면 그대로 쓴다). */
export function textPages(body){
 const clean=String(body||'').replace(/\r\n?/g,'\n');
 const parts=clean.includes('\f')?clean.split('\f'):clean.split(/\n{2,}/).reduce((pages,para)=>{
  const last=pages[pages.length-1];
  if(last!==undefined&&last.length+para.length+2<=PAGE_CHARS)pages[pages.length-1]=last?last+'\n\n'+para:para;
  else for(let i=0;i<Math.max(para.length,1);i+=PAGE_CHARS)pages.push(para.slice(i,i+PAGE_CHARS));
  return pages;
 },[]);
 return parts.map(t=>t.trim()).filter(Boolean).map((text,i)=>({page:i+1,text}));
}

export async function knowlyAdmin(env,op,input={},fetchImpl=fetch){
 const config=knowlyAdminConfig(env);
 if(!config)fail('관리자 연결이 아직 설정되지 않았어요.',503);
 const call=(path,init)=>knowlyFetch(config,path,init,fetchImpl);
 const rest=async(path,init={},fallback='요청을 처리하지 못했어요.')=>knowlyJson(await call('/rest/v1/'+path,{...init,headers:{Prefer:'return=representation',...(init.headers||{})}}),fallback);
 const fn=async(name,body,fallback)=>knowlyJson(await call('/functions/v1/'+name,{method:'POST',body:JSON.stringify(body)}),fallback);
 switch(op){
  case 'status':return {connected:true};
  // FAQ
  case 'faq.list':return {faqs:await rest('faqs?select=id,question,answer,category,active,updated_at&order=updated_at.desc&limit=500')};
  case 'faq.save':{
   const row={question:str(input.question,500,'질문'),answer:str(input.answer,8000,'답변'),category:category(input.category),active:input.active!==false,updated_at:new Date().toISOString()};
   if(input.id)await rest(`faqs?id=eq.${id(input.id)}`,{method:'PATCH',body:JSON.stringify(row)},'FAQ를 저장하지 못했어요.');
   else await rest('faqs',{method:'POST',body:JSON.stringify(row)},'FAQ를 저장하지 못했어요.');
   return {ok:true,notice:input.id?'FAQ를 수정했어요.':'FAQ를 추가했어요.'};
  }
  case 'faq.delete':await rest(`faqs?id=eq.${id(input.id)}`,{method:'DELETE'},'FAQ를 삭제하지 못했어요.');return {ok:true,notice:'FAQ를 삭제했어요.'};
  // 문서
  case 'doc.list':return {documents:await rest('documents?select=id,title,category,version,effective_from,page_count,status,error,file_path,created_at&order=created_at.desc&limit=500')};
  case 'doc.create':{
   const pages=textPages(str(input.text,1500000,'문서 내용'));
   if(pages.length>400)fail('문서가 너무 길어요. 400쪽 이하로 나눠 등록해 주세요.');
   const r=await fn('ingest',{title:str(input.title,200,'문서명'),category:category(input.category),version:str(input.version,40,'버전',false)||'v1',effective_from:/^\d{4}-\d{2}-\d{2}$/.test(input.effective_from||'')?input.effective_from:null,pages},'문서를 등록하지 못했어요.');
   return {ok:true,notice:`문서를 등록했어요. 검색 단위 ${Number(r?.chunks)||0}개${r?.embedded?' · 의미 검색 포함':''}`};
  }
  case 'doc.status':{
   if(!['ready','archived'].includes(input.status))fail('상태를 확인해 주세요.');
   await rest(`documents?id=eq.${id(input.id)}`,{method:'PATCH',body:JSON.stringify({status:input.status,updated_at:new Date().toISOString()})},'상태를 바꾸지 못했어요.');
   return {ok:true,notice:input.status==='archived'?'문서를 보관했어요. 이제 답변에 쓰지 않아요.':'문서를 다시 답변에 사용해요.'};
  }
  case 'doc.delete':{
   const [doc]=await rest(`documents?id=eq.${id(input.id)}&select=file_path`);
   if(!doc)fail('문서를 찾을 수 없어요.',404);
   if(doc.file_path){const res=await call('/storage/v1/object/documents',{method:'DELETE',body:JSON.stringify({prefixes:[doc.file_path]})});if(!res.ok&&res.status!==404)await knowlyJson(res,'원본 파일을 지우지 못했어요.');}
   await rest(`documents?id=eq.${id(input.id)}`,{method:'DELETE'},'문서를 삭제하지 못했어요.');
   return {ok:true,notice:'문서를 삭제했어요.'};
  }
  case 'doc.reindex':{const r=await fn('ingest',{action:'reindex'},'다시 색인하지 못했어요.'),done=Array.isArray(r?.done)?r.done.length:0,left=Number(r?.remaining)||0;return {ok:true,notice:`문서 ${done}개를 다시 색인했어요.${left?` 남은 문서 ${left}개는 한 번 더 눌러 주세요.`:''}`};}
  // 사용자
  case 'user.list':{
   const [users,departments]=await Promise.all([rest('profiles?select=id,login_id,display_name,department_id,role,created_at&order=created_at'),rest('departments?select=id,name&order=name')]);
   return {users,departments};
  }
  case 'user.create':{
   const login=str(input.login_id,40,'아이디').toLowerCase();
   if(!/^[a-z0-9._-]{3,40}$/.test(login))fail('아이디는 영문 소문자·숫자·._- 3~40자로 입력해 주세요.');
   const password=typeof input.password==='string'?input.password:'';if(password.length<8||password.length>72)fail('비밀번호는 8~72자로 입력해 주세요.');
   await fn('admin-users',{action:'create',login_id:login,display_name:str(input.display_name,40,'이름',false),password,department_id:input.department_id?id(input.department_id):null,role:input.role==='admin'?'admin':'employee'},'사용자를 만들지 못했어요.');
   return {ok:true,notice:'사용자를 추가했어요.'};
  }
  case 'user.update':{
   const patch={};
   if('role' in input){if(!['employee','admin'].includes(input.role))fail('권한을 확인해 주세요.');patch.role=input.role;}
   if('department_id' in input)patch.department_id=input.department_id?id(input.department_id):null;
   if('display_name' in input)patch.display_name=str(input.display_name,40,'이름');
   if(!Object.keys(patch).length)fail('바꿀 내용이 없어요.');
   await rest(`profiles?id=eq.${id(input.id)}`,{method:'PATCH',body:JSON.stringify(patch)},'사용자 정보를 바꾸지 못했어요.');
   return {ok:true,notice:'사용자 정보를 바꿨어요.'};
  }
  case 'user.reset':{
   const password=typeof input.password==='string'?input.password:'';if(password.length<8||password.length>72)fail('비밀번호는 8~72자로 입력해 주세요.');
   await fn('admin-users',{action:'reset_password',user_id:id(input.id),password},'비밀번호를 바꾸지 못했어요.');return {ok:true,notice:'비밀번호를 바꿨어요.'};
  }
  case 'user.delete':await fn('admin-users',{action:'delete',user_id:id(input.id)},'사용자를 삭제하지 못했어요.');return {ok:true,notice:'사용자를 삭제했어요.'};
  case 'dept.create':await rest('departments',{method:'POST',body:JSON.stringify({name:str(input.name,40,'부서명')})},'부서를 추가하지 못했어요.');return {ok:true,notice:'부서를 추가했어요.'};
  // 검색 모델 설정
  case 'settings.get':{
   const [info,models]=await Promise.all([fn('admin-settings',{action:'get'},'설정을 불러오지 못했어요.'),fn('admin-settings',{action:'models'},'모델 목록을 불러오지 못했어요.').catch(()=>({models:[]}))]);
   return {...info,models:Array.isArray(models?.models)?models.models.slice(0,200):[]};
  }
  case 'settings.save':{
   const s=input.settings||{},num=v=>Number(v);
   const r=await fn('admin-settings',{action:'save',settings:{llm_model:typeof s.llm_model==='string'?s.llm_model.trim().slice(0,120):'',keyword_min:num(s.keyword_min),vector_min:num(s.vector_min),vector_weight:num(s.vector_weight)}},'설정을 저장하지 못했어요.');
   return {ok:true,settings:r?.settings,notice:'검색 설정을 저장했어요.'};
  }
  case 'settings.test':return fn('admin-settings',{action:'test_model',model:typeof input.model==='string'?input.model.trim().slice(0,120):''},'모델을 시험하지 못했어요.');
  // 통계·답 못한 질문
  case 'stats':{
   const days=[7,30,90].includes(Number(input.days))?Number(input.days):30;
   const [usage,groups]=await Promise.all([rest('rpc/admin_usage_stats',{method:'POST',body:JSON.stringify({days})},'통계를 불러오지 못했어요.'),rest('question_groups?select=id,question,category,status,created_at,last_asked_at&order=last_asked_at.desc&limit=200')]);
   return {days,usage,groups};
  }
  case 'group.status':{
   if(!GROUP_STATUSES.includes(input.status)||input.status==='FAQ 등록 완료')fail('상태를 확인해 주세요.');
   await rest(`question_groups?id=eq.${id(input.id)}`,{method:'PATCH',body:JSON.stringify({status:input.status})},'상태를 바꾸지 못했어요.');return {ok:true,notice:`‘${input.status}’로 바꿨어요.`};
  }
  case 'group.faq':{
   const row={question:str(input.question,500,'질문'),answer:str(input.answer,8000,'답변'),category:category(input.category),active:true,updated_at:new Date().toISOString()};
   const [faq]=await rest('faqs',{method:'POST',body:JSON.stringify(row)},'FAQ를 등록하지 못했어요.');
   await rest(`question_groups?id=eq.${id(input.id)}`,{method:'PATCH',body:JSON.stringify({status:'FAQ 등록 완료',faq_id:faq?.id??null,category:row.category})},'질문 상태를 바꾸지 못했어요.');
   return {ok:true,notice:'FAQ로 등록했어요. 이제 같은 질문에 바로 답해요.'};
  }
  default:fail('지원하지 않는 작업이에요.',400);
 }
}
