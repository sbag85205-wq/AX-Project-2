import {env} from "cloudflare:workers";
import {getChatGPTUser} from "../../chatgpt-auth";
import {community} from "../../../lib/community.mjs";
export const dynamic="force-dynamic";
const output=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"}});
export async function GET(){
 try{return output(await community(env.DB,await getChatGPTUser(),env.NYANG_ADMIN_EMAIL));}
 catch(error){console.error("Community read failed",error);return output({error:"활동 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."},503);}
}
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return output({error:"허용되지 않은 요청입니다."},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return output({error:"JSON 요청이 필요합니다."},415);
 try{
  const raw=await request.text();if(raw.length>16000)return output({error:"내용이 너무 길어요."},413);
  const input=JSON.parse(raw);
  return output(await community(env.DB,await getChatGPTUser(),env.NYANG_ADMIN_EMAIL,input.action,input));
 }catch(error:any){
  if(error.status)return output({error:error.message},error.status);
  if(error instanceof SyntaxError)return output({error:"요청 내용을 확인해 주세요."},400);
  console.error("Community write failed",error);return output({error:"저장하지 못했어요. 잠시 후 다시 시도해 주세요."},503);
 }
}
