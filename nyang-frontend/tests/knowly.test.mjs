import test from 'node:test';
import assert from 'node:assert/strict';
import {askKnowly,knowlyConfig,resetKnowlyToken,toNyangAnswer} from '../lib/knowly.mjs';
import {knowlyRequest} from '../lib/knowly-route.mjs';
const env={KNOWLY_SUPABASE_URL:'https://demo.supabase.co/',KNOWLY_SUPABASE_KEY:'sb_publishable_test',KNOWLY_LOGIN_EMAIL:'user01@knowly.local',KNOWLY_LOGIN_PASSWORD:'pw'};
const answer={status:'answered',mode:'llm',summary:['연차는 3일 전까지 신청해요.'],steps:['그룹웨어 접속','연차 신청서 작성'],details:'',warnings:[],citations:[{document_title:'취업규칙',version:'v2',page_start:3,page_end:4},{document_title:'취업규칙',version:'v2',page_start:3,page_end:4}]};
function server(chatStatuses=[200]){
 const calls=[];let i=0;
 const fetchImpl=async(url,init)=>{calls.push({url,init});
  if(url.includes('/auth/v1/token'))return Response.json({access_token:'tok'+calls.length,expires_in:3600});
  const status=chatStatuses[Math.min(i++,chatStatuses.length-1)];
  return status===200?Response.json({answer}):Response.json({error:{message:'실패'}},{status});};
 return {calls,fetchImpl};
}
test('config requires every value and a https url',()=>{
 assert.equal(knowlyConfig({}),null);
 assert.equal(knowlyConfig({...env,KNOWLY_LOGIN_PASSWORD:''}),null);
 assert.equal(knowlyConfig({...env,KNOWLY_SUPABASE_URL:'http://evil.example'}),null);
 assert.equal(knowlyConfig(env).url,'https://demo.supabase.co');
});
test('answer is reduced to display fields and duplicate citations are merged',()=>{
 const a=toNyangAnswer(answer);
 assert.equal(a.answered,true);assert.deepEqual(a.summary,['연차는 3일 전까지 신청해요.']);
 assert.deepEqual(a.citations,[{title:'취업규칙',version:'v2',pages:'3–4쪽'}]);
 assert.equal(toNyangAnswer({status:'insufficient_evidence',summary:['없음']}).answered,false);
 assert.equal(toNyangAnswer(null).answered,false);
});
test('signs in once, forwards the question with the user token, and never returns secrets',async()=>{
 resetKnowlyToken();const {calls,fetchImpl}=server();
 const a=await askKnowly(env,'연차 신청 방법',fetchImpl);await askKnowly(env,'두 번째',fetchImpl);
 assert.equal(calls.filter(c=>c.url.includes('/auth/v1/token')).length,1);
 const chat=calls.find(c=>c.url.endsWith('/functions/v1/chat'));
 assert.equal(chat.init.headers.Authorization,'Bearer tok1');assert.equal(JSON.parse(chat.init.body).question,'연차 신청 방법');
 assert.ok(!JSON.stringify(a).includes('pw')&&!JSON.stringify(a).includes('tok'));
});
test('expired token is refreshed once on 401',async()=>{
 resetKnowlyToken();const {calls,fetchImpl}=server([401,200]);
 assert.equal((await askKnowly(env,'질문',fetchImpl)).answered,true);
 assert.equal(calls.filter(c=>c.url.includes('/auth/v1/token')).length,2);
});
test('missing config and bad input are rejected before any network call',async()=>{
 await assert.rejects(askKnowly({},'질문',()=>assert.fail()),{status:503});
 await assert.rejects(askKnowly(env,' ',()=>assert.fail()),{status:400});
 await assert.rejects(askKnowly(env,'가'.repeat(1001),()=>assert.fail()),{status:400});
});
const req=(origin='https://nyang.test',body={question:'연차'})=>new Request('https://nyang.test/api/knowly',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('route only serves signed-in employees from the same origin',async()=>{
 const ask=async()=>toNyangAnswer(answer);
 assert.equal((await knowlyRequest(null,env,req('https://other.test'),{ask,session:async()=>'user01',askKnowly:ask})).status,403);
 assert.equal((await knowlyRequest(null,env,req(),{session:async()=>null,askKnowly:ask})).status,401);
 assert.equal((await knowlyRequest(null,env,req(),{session:async()=>'admin01',askKnowly:ask})).status,401);
 const ok=await knowlyRequest(null,env,req(),{session:async()=>'user01',askKnowly:ask});
 assert.equal(ok.status,200);assert.equal((await ok.json()).answer.answered,true);
 const off=await knowlyRequest(null,{},req(),{session:async()=>'user01'});
 assert.equal(off.status,503);
});
