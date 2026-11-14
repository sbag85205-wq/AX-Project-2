// /api/knowly: 로그인한 직원 계정의 질문만 main 백엔드(Supabase chat)로 전달한다.
import {accountRole,session} from './demo-account.mjs';
import {askKnowly} from './knowly.mjs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export async function knowlyRequest(db,env,request,deps={}){
 const ask=deps.askKnowly||askKnowly,who=deps.session||session;
 try{
  if(request.method!=='POST')return Response.json({error:'지원하지 않는 요청입니다.'},{status:405,headers});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'허용되지 않은 요청입니다.'},{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'JSON 요청이 필요합니다.'},{status:415,headers});
  const raw=await request.text();if(raw.length>8000)return Response.json({error:'요청이 너무 커요.'},{status:413,headers});
  const username=await who(db,env,request);
  if(accountRole(username)!=='employee')return Response.json({error:'직원 계정으로 로그인한 뒤 질문해 주세요.'},{status:401,headers});
  const input=JSON.parse(raw);
  return Response.json({answer:await ask(env,input?.question)},{headers});
 }catch(e){
  const status=e?.status||(e instanceof SyntaxError?400:502);
  if(!e?.status&&!(e instanceof SyntaxError))console.error('Knowly request failed',e?.message);
  return Response.json({error:e?.status?e.message:e instanceof SyntaxError?'요청 내용을 확인해 주세요.':'문서 검색 서버에 연결하지 못했어요.'},{status,headers});
 }
}
