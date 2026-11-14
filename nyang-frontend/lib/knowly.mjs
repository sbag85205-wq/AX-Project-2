// main 브랜치의 Supabase 백엔드(chat Edge Function: FAQ·문서 검색·LLM 요약·출처 검증)에 냥대리 질문을 전달한다.
// 비밀 값(로그인 비밀번호 등)은 서버 환경 변수로만 읽고 브라우저에는 정리된 답변만 돌려준다.
import {AppError} from './community.mjs';

const MAX_QUESTION=1000;
const TIMEOUT_MS=25000;
let cached=null; // {key, token, expires}

export function knowlyConfig(env={}){
 const url=String(env.KNOWLY_SUPABASE_URL||'').trim().replace(/\/+$/,''),key=String(env.KNOWLY_SUPABASE_KEY||'').trim();
 const email=String(env.KNOWLY_LOGIN_EMAIL||'').trim(),password=String(env.KNOWLY_LOGIN_PASSWORD||'');
 if(!/^https:\/\/[^\s/]+$/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))return null;
 if(!key||!email||!password)return null;
 return {url,key,email,password};
}

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
  citations.push({title,version:text(c.version,40),pages});if(citations.length>=6)break;
 }
 const details=text(a.details,4000);
 return {answered:status==='answered'&&summary.length>0,status,mode:['faq','llm','search'].includes(a.mode)?a.mode:'search',summary,steps,details:steps.length?'':details,warnings,citations};
}

async function timed(fetchImpl,url,init){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
 try{return await fetchImpl(url,{...init,signal:ctrl.signal});}finally{clearTimeout(timer);}
}

async function token(config,fetchImpl,now){
 const key=`${config.url}|${config.email}`;
 if(cached&&cached.key===key&&cached.expires>now+60000)return cached.token;
 const res=await timed(fetchImpl,`${config.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email:config.email,password:config.password})});
 const data=await res.json().catch(()=>null);
 if(!res.ok||typeof data?.access_token!=='string'){cached=null;throw new AppError('문서 검색 서버에 로그인하지 못했어요. 담당자에게 연결 설정을 확인해 달라고 알려 주세요.',502);}
 cached={key,token:data.access_token,expires:now+Math.max(60,Number(data.expires_in)||3600)*1000};
 return cached.token;
}

export function resetKnowlyToken(){cached=null;}

/** 질문을 main 백엔드에 보내고 정리된 답을 돌려준다. 설정이 없으면 503(화면은 기존 샘플 답변으로 대체). */
export async function askKnowly(env,question,fetchImpl=fetch,now=Date.now()){
 const config=knowlyConfig(env);
 if(!config)throw new AppError('문서 검색 서버가 아직 연결되지 않았어요.',503);
 const q=text(question,MAX_QUESTION+1);
 if(!q)throw new AppError('질문을 입력해 주세요.',400);
 if(q.length>MAX_QUESTION)throw new AppError('질문은 1,000자 이내로 적어 주세요.',400);
 const call=async auth=>timed(fetchImpl,`${config.url}/functions/v1/chat`,{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${auth}`,'Content-Type':'application/json'},body:JSON.stringify({question:q,conversation_id:null})});
 let res=await call(await token(config,fetchImpl,now));
 if(res.status===401){cached=null;res=await call(await token(config,fetchImpl,now));}
 const data=await res.json().catch(()=>null);
 if(!res.ok){
  const message=text(data?.error?.message,200)||'문서 검색 서버가 답하지 못했어요. 잠시 후 다시 시도해 주세요.';
  throw new AppError(message,res.status>=500||res.status===401?502:res.status);
 }
 return toNyangAnswer(data?.answer);
}
