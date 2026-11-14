// /api/knowly: 로그인한 직원의 질문을, /api/knowly-admin: 담당자의 관리 작업을 main 백엔드(Supabase)로 전달한다.
import {accountRole,session} from './demo-account.mjs';
import {askKnowly} from './knowly.mjs';
import {knowlyAdmin} from './knowly-admin.mjs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
async function guarded(db,env,request,role,limit,handle,who){
 try{
  if(request.method!=='POST')return reply({error:'지원하지 않는 요청입니다.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'허용되지 않은 요청입니다.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON 요청이 필요합니다.'},415);
  const raw=await request.text();if(raw.length>limit)return reply({error:'요청이 너무 커요.'},413);
  if(accountRole(await who(db,env,request))!==role)return reply({error:role==='staff'?'담당자 계정으로 로그인한 뒤 이용해 주세요.':'직원 계정으로 로그인한 뒤 질문해 주세요.'},401);
  return reply(await handle(JSON.parse(raw)||{}));
 }catch(e){
  const status=e?.status||(e instanceof SyntaxError?400:502);
  if(!e?.status&&!(e instanceof SyntaxError))console.error('Knowly request failed',e?.message);
  return reply({error:e?.status?e.message:e instanceof SyntaxError?'요청 내용을 확인해 주세요.':'문서 검색 서버에 연결하지 못했어요.'},status);
 }
}
export function knowlyRequest(db,env,request,deps={}){
 const ask=deps.askKnowly||askKnowly;
 return guarded(db,env,request,'employee',8000,async input=>({answer:await ask(env,input.question)}),deps.session||session);
}
export function knowlyAdminRequest(db,env,request,deps={}){
 const run=deps.knowlyAdmin||knowlyAdmin;
 return guarded(db,env,request,'staff',1600000,input=>run(env,typeof input.op==='string'?input.op:'',input),deps.session||session);
}
