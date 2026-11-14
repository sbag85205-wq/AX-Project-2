import {env} from 'cloudflare:workers';
import {visitorCommunity,visitorSession} from '../../../lib/visitor.mjs';
export const dynamic='force-dynamic';
const output=(body:unknown,status=200,cookie:string|null=null)=>{
 const headers:Record<string,string>={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
 if(cookie)headers['Set-Cookie']=cookie;
 return Response.json(body,{status,headers});
};
export async function GET(request:Request){
 try{const session=await visitorSession(request);return output(await visitorCommunity(env.DB,session.uid),200,session.cookie);}
 catch(error){console.error('Visitor read failed',error);return output({error:'체험 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return output({error:'허용되지 않은 요청입니다.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return output({error:'JSON 요청이 필요합니다.'},415);
 try{
  const raw=await request.text();if(raw.length>16000)return output({error:'내용이 너무 길어요.'},413);
  const input=JSON.parse(raw);
  if(!input||typeof input!=='object'||typeof input.action!=='string')return output({error:'요청 내용을 확인해 주세요.'},400);
  const session=await visitorSession(request);
  if(session.cookie)return output({error:'체험 연결을 준비 중이에요. 새로고침 후 다시 시도해 주세요.'},409,session.cookie);
  return output(await visitorCommunity(env.DB,session.uid,input.action,input));
 }catch(error:any){
  if(error.status)return output({error:error.message},error.status);
  if(error instanceof SyntaxError)return output({error:'요청 내용을 확인해 주세요.'},400);
  console.error('Visitor write failed',error);return output({error:'저장하지 못했어요. 잠시 후 다시 시도해 주세요.'},503);
 }
}
