// Knowly(main 브랜치 Supabase 백엔드)에 브라우저가 직접 로그인하고 질문한다. Knowly 화면과 같은 방식이다.
// 연결 설정(/api/knowly-config)이 없으면 아무것도 하지 않고, 냥대리는 기존 시연 계정·샘플 답변으로 동작한다.
const STORE='nyang-knowly-session',TIMEOUT_MS=30000;
let configPromise=null;

export function knowlyConfig(){
 configPromise??=fetch('/api/knowly-config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(c=>c?.configured?c:null).catch(()=>null);
 return configPromise;
}
const readSession=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch{return null;}};
const writeSession=s=>{try{if(s)localStorage.setItem(STORE,JSON.stringify(s));else localStorage.removeItem(STORE);}catch{}};
async function timed(url,init){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
 try{return await fetch(url,{...init,signal:ctrl.signal});}finally{clearTimeout(timer);}
}
async function grant(c,type,body){
 const res=await timed(`${c.url}/auth/v1/token?grant_type=${type}`,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json().catch(()=>null);
 if(!res.ok||typeof data?.access_token!=='string'){
  if(type==='refresh_token')writeSession(null);
  throw Error(res.status===400||res.status===401?'아이디 또는 비밀번호가 맞지 않아요.':'로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
 }
 const session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000};
 writeSession(session);return session;
}
/** Knowly 아이디(또는 이메일)·비밀번호로 로그인하고 접속 토큰을 돌려준다. Knowly와 같은 규칙: 아이디 → 아이디@knowly.local */
export async function signIn(loginId,password){
 const c=await knowlyConfig();if(!c)return null;
 const id=String(loginId||'').trim(),email=id.includes('@')?id:`${id.toLowerCase()}@${c.domain}`;
 return (await grant(c,'password',{email,password:String(password||'')})).access_token;
}
async function accessToken(){
 const c=await knowlyConfig(),s=readSession();if(!c||!s)return null;
 if(s.expires_at>Date.now()+60000)return s.access_token;
 return s.refresh_token?(await grant(c,'refresh_token',{refresh_token:s.refresh_token})).access_token:null;
}
export async function signOut(){
 const c=await knowlyConfig(),s=readSession();writeSession(null);
 if(c&&s)timed(`${c.url}/auth/v1/logout`,{method:'POST',headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`}}).catch(()=>{});
}
/** Knowly chat 함수에 질문한다. 연결이 없으면 null(기존 샘플 답변 사용). 냥대리 대화 하나 = Knowly 대화 하나. */
export async function askKnowly(question,conversationId=null){
 const c=await knowlyConfig();if(!c)return null;
 const call=async token=>timed(`${c.url}/functions/v1/chat`,{method:'POST',headers:{apikey:c.key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({question,conversation_id:conversationId})});
 let token=await accessToken();if(!token)throw Error('사내 문서 검색 로그인이 만료됐어요. 로그아웃한 뒤 다시 로그인해 주세요.');
 let res=await call(token);
 if(res.status===401){const s=readSession();if(s){s.expires_at=0;writeSession(s);}token=await accessToken();if(token)res=await call(token);}
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error(typeof data?.error?.message==='string'?data.error.message:'문서 검색 서버가 답하지 못했어요. 잠시 후 다시 시도해 주세요.');
 return {conversationId:data.conversation_id||conversationId,answer:toNyangAnswer(data.answer)};
}
const text=(v,max=600)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v,max=8,len=600)=>(Array.isArray(v)?v:[]).map(x=>text(x,len)).filter(Boolean).slice(0,max);
/** chat 함수의 답을 냥대리 답변 카드가 쓰는 모양으로 줄인다. 근거 없는 답은 answered=false. */
export function toNyangAnswer(answer){
 const a=answer&&typeof answer==='object'?answer:{};
 const status=['answered','insufficient_evidence','conflicting_sources'].includes(a.status)?a.status:'insufficient_evidence';
 const summary=list(a.summary,4),steps=list(a.steps,12),seen=new Set(),citations=[];
 for(const c of Array.isArray(a.citations)?a.citations:[]){
  const title=text(c?.document_title,200);if(!title)continue;
  const start=Number(c.page_start)||0,end=Number(c.page_end)||start,pages=start?(end>start?`${start}–${end}쪽`:`${start}쪽`):'';
  const id=`${title}|${pages}`;if(seen.has(id))continue;seen.add(id);
  citations.push({title,version:text(c.version,40),pages});if(citations.length>=6)break;
 }
 return {answered:status==='answered'&&summary.length>0,status,mode:['faq','llm','search'].includes(a.mode)?a.mode:'search',summary,steps,details:steps.length?'':text(a.details,4000),warnings:list(a.warnings,4),citations};
}
