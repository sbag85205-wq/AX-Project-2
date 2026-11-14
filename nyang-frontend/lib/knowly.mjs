// main 브랜치의 Supabase 백엔드(chat Edge Function: FAQ·문서 검색·LLM 요약·출처 검증)에 냥대리 질문을 전달한다.
// 비밀 값(로그인 비밀번호 등)은 서버 환경 변수로만 읽고 브라우저에는 정리된 답변만 돌려준다.
import {AppError} from './community.mjs';

const MAX_QUESTION=1000;
const TIMEOUT_MS=25000;
const tokens=new Map(); // `${url}|${email}` → {token, expires, userId}

function baseConfig(env,emailKey,passwordKey){
 const url=String(env.KNOWLY_SUPABASE_URL||'').trim().replace(/\/+$/,''),key=String(env.KNOWLY_SUPABASE_KEY||'').trim();
 const email=String(env[emailKey]||'').trim(),password=String(env[passwordKey]||'');
 if(!/^https:\/\/[^\s/]+$/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))return null;
 if(!key||!email||!password)return null;
 return {url,key,email,password};
}
/** 직원 질문용 계정 설정 (없으면 null) */
export const knowlyConfig=(env={})=>baseConfig(env,'KNOWLY_LOGIN_EMAIL','KNOWLY_LOGIN_PASSWORD');
/** 관리자 화면용 계정 설정 (Knowly 관리자 역할 계정, 없으면 null) */
export const knowlyAdminConfig=(env={})=>baseConfig(env,'KNOWLY_ADMIN_EMAIL','KNOWLY_ADMIN_PASSWORD');

const text=(v,max=600)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v,max=8,len=600)=>(Array.isArray(v)?v:[]).map(x=>text(x,len)).filter(Boolean).slice(0,max);

/** chat 함수의 Answer를 냥대리 화면이 쓰는 결과로 줄인다. 근거 없는 답은 answered=false. */
export function toNyangAnswer(answer){
 const a=answer&&typeof answer==='object'?answer:{};
 const status=['answered','insufficient_evidence','conflicting_sources'].includes(a.status)?a.status:'insufficient_evidence';
 const summary=list(a.summary,4),steps=list(a.steps,12),warnings=list(a.warnings,4);
 const seen=new Set(),citations=[];
 for(const c of Array.isArray(a.citations)?a.citations:[]){
  const title=text(c?.document_title,200);if(!title)continue;
  const start=Number(c.page_start)||0,end=Number(c.page_end)||start,pages=start?(end>start?`${start}–${end}쪽`:`${start}쪽`):'';
  const id=`${title}|${pages}`;if(seen.has(id))continue;seen.add(id);
  const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)?v:'';
  citations.push({title,version:text(c.version,40),pages,document_id:uuid(c.document_id),chunk_id:uuid(c.chunk_id)});if(citations.length>=6)break;
 }
 const details=text(a.details,4000);
 const notes=(Array.isArray(a.attachments)?a.attachments:[]).slice(0,3).map(n=>({name:text(n?.name,120),read:n?.read===true})).filter(n=>n.name);
 return {answered:status==='answered'&&summary.length>0,status,mode:['faq','llm','search'].includes(a.mode)?a.mode:'search',summary,steps,details:steps.length?'':details,warnings,citations,attachments:notes};
}

async function timed(fetchImpl,url,init){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
 try{return await fetchImpl(url,{...init,signal:ctrl.signal});}finally{clearTimeout(timer);}
}

async function token(config,fetchImpl,now){return (await signIn(config,fetchImpl,now)).token;}
async function signIn(config,fetchImpl,now){
 const key=`${config.url}|${config.email}`,hit=tokens.get(key);
 if(hit&&hit.expires>now+120000)return hit;
 const res=await timed(fetchImpl,`${config.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email:config.email,password:config.password})});
 const data=await res.json().catch(()=>null);
 if(!res.ok||typeof data?.access_token!=='string'){tokens.delete(key);throw new AppError('문서 검색 서버에 로그인하지 못했어요. 담당자에게 연결 설정을 확인해 달라고 알려 주세요.',502);}
 const entry={token:data.access_token,expires:now+Math.max(60,Number(data.expires_in)||3600)*1000,userId:typeof data.user?.id==='string'?data.user.id:null};
 tokens.set(key,entry);
 return entry;
}

/** 냥대리 계정 역할에 맞는 Knowly 계정의 짧은 접속 토큰 (담당자 → 관리자 계정, 직원 → 직원 계정). 비밀번호·갱신 토큰은 내보내지 않는다. */
export async function knowlySession(env,role,fetchImpl=fetch,now=Date.now()){
 const config=role==='staff'?knowlyAdminConfig(env):role==='employee'?knowlyConfig(env):null;
 if(!config)throw new AppError(role==='staff'?'Knowly 관리자 연결이 아직 설정되지 않았어요.':'문서 검색 서버가 아직 연결되지 않았어요.',503);
 const s=await signIn(config,fetchImpl,now);
 return {url:config.url,key:config.key,access_token:s.token,expires_at:s.expires,user_id:s.userId};
}

export function resetKnowlyToken(){tokens.clear();}

/** 설정한 계정으로 Supabase API를 호출한다. 토큰이 만료돼 401이 오면 한 번 다시 로그인한다. */
export async function knowlyFetch(config,path,init={},fetchImpl=fetch,now=Date.now()){
 const call=async auth=>timed(fetchImpl,config.url+path,{...init,headers:{apikey:config.key,Authorization:`Bearer ${auth}`,...(init.body!==undefined?{'Content-Type':'application/json'}:{}),...(init.headers||{})}});
 let res=await call(await token(config,fetchImpl,now));
 if(res.status===401){tokens.delete(`${config.url}|${config.email}`);res=await call(await token(config,fetchImpl,now));}
 return res;
}

/** Edge Function 결과를 읽고, 실패하면 서버가 보낸 한국어 메시지로 예외를 던진다. */
export async function knowlyJson(res,fallback){
 const data=await res.json().catch(()=>null);
 if(!res.ok){
  const message=text(data?.error?.message,300)||text(data?.message,300)||fallback;
  throw new AppError(message,res.status>=500||res.status===401?502:res.status===403?403:400);
 }
 return data;
}

/** 질문을 main 백엔드에 보내고 정리된 답을 돌려준다. 설정이 없으면 503(화면은 기존 샘플 답변으로 대체). */
/** 첨부 검사 (main의 chat 함수와 같은 한도: 3개, 파일 글자 6,000자, 사진 data URL) */
export function cleanAttachments(value){
 if(value==null)return [];
 if(!Array.isArray(value)||value.length>3)throw new AppError('첨부는 3개까지 할 수 있어요.',400);
 return value.map(a=>{
  const name=text(a?.name,120)||'첨부';
  if(a?.kind==='image'){const url=typeof a.data_url==='string'?a.data_url:'';if(!/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url)||url.length>4_000_000)throw new AppError(`${name}: 사진을 읽지 못했어요.`,400);return {name,kind:'image',data_url:url};}
  if(a?.kind==='file')return {name,kind:'file',text:typeof a.text==='string'?a.text.slice(0,6000):''};
  throw new AppError('첨부 형식을 확인해 주세요.',400);
 });
}

/** 답변 좋아요/아쉬워요를 main의 chat 함수에 기록한다. */
export async function knowlyFeedback(env,messageId,vote,fetchImpl=fetch,now=Date.now()){
 const config=knowlyConfig(env);
 if(!config)throw new AppError('문서 검색 서버가 아직 연결되지 않았어요.',503);
 if(typeof messageId!=='string'||!/^[0-9a-f-]{36}$/i.test(messageId))throw new AppError('답변을 찾을 수 없어요.',404);
 if(!['up','down',null].includes(vote))throw new AppError('평가를 확인해 주세요.',400);
 const res=await knowlyFetch(config,'/functions/v1/chat',{method:'POST',body:JSON.stringify({action:'feedback',message_id:messageId,vote})},fetchImpl,now);
 await knowlyJson(res,'평가를 저장하지 못했어요.');
 return {ok:true};
}

export async function askKnowly(env,question,fetchImpl=fetch,now=Date.now(),attachments=[]){
 const config=knowlyConfig(env);
 if(!config)throw new AppError('문서 검색 서버가 아직 연결되지 않았어요.',503);
 const q=text(question,MAX_QUESTION+1);
 if(!q)throw new AppError('질문을 입력해 주세요.',400);
 if(q.length>MAX_QUESTION)throw new AppError('질문은 1,000자 이내로 적어 주세요.',400);
 const files=cleanAttachments(attachments);
 const res=await knowlyFetch(config,'/functions/v1/chat',{method:'POST',body:JSON.stringify({question:q,conversation_id:null,attachments:files})},fetchImpl,now);
 const data=await knowlyJson(res,'문서 검색 서버가 답하지 못했어요. 잠시 후 다시 시도해 주세요.');
 return {...toNyangAnswer(data?.answer),message_id:typeof data?.message_id==='string'?data.message_id:null};
}
