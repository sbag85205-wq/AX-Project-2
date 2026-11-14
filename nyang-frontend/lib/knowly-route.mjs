// /api/knowly: 직원 질문·첨부·답변 평가를, /api/knowly-session: 냥대리 안의 Knowly 화면(관리자·문서 보기)용 짧은 접속 토큰을 다룬다.
import {accountRole,session} from './demo-account.mjs';
import {askKnowly,knowlyFeedback,knowlySession} from './knowly.mjs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
async function guarded(db,env,request,roles,limit,handle,who){
 try{
  if(request.method!=='POST')return reply({error:'지원하지 않는 요청입니다.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'허용되지 않은 요청입니다.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON 요청이 필요합니다.'},415);
  const raw=await request.text();if(raw.length>limit)return reply({error:'요청이 너무 커요. 첨부 크기를 줄여 주세요.'},413);
  const role=accountRole(await who(db,env,request));
  if(!roles.includes(role))return reply({error:roles.includes('employee')&&roles.length===1?'직원 계정으로 로그인한 뒤 질문해 주세요.':'로그인한 뒤 이용해 주세요.'},401);
  return reply(await handle(JSON.parse(raw||'{}')||{},role));
 }catch(e){
  const status=e?.status||(e instanceof SyntaxError?400:502);
  if(!e?.status&&!(e instanceof SyntaxError))console.error('Knowly request failed',e?.message);
  return reply({error:e?.status?e.message:e instanceof SyntaxError?'요청 내용을 확인해 주세요.':'문서 검색 서버에 연결하지 못했어요.'},status);
 }
}
export function knowlyRequest(db,env,request,deps={}){
 const ask=deps.askKnowly||askKnowly,feedback=deps.knowlyFeedback||knowlyFeedback;
 return guarded(db,env,request,['employee'],14_000_000,async input=>input.action==='feedback'?feedback(env,input.message_id,input.vote??null):{answer:await ask(env,input.question,undefined,undefined,input.attachments)},deps.session||session);
}
export function knowlySessionRequest(db,env,request,deps={}){
 const open=deps.knowlySession||knowlySession;
 return guarded(db,env,request,['employee','staff'],2000,(_input,role)=>open(env,role),deps.session||session);
}
