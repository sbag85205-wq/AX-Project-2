import test from 'node:test';
import assert from 'node:assert/strict';
import {knowlyAdmin,textPages} from '../lib/knowly-admin.mjs';
import {knowlyAdminRequest} from '../lib/knowly-route.mjs';
import {resetKnowlyToken} from '../lib/knowly.mjs';
const env={KNOWLY_SUPABASE_URL:'https://demo.supabase.co',KNOWLY_SUPABASE_KEY:'pk',KNOWLY_ADMIN_EMAIL:'admin@knowly.local',KNOWLY_ADMIN_PASSWORD:'secret-pw'};
const ID='11111111-2222-3333-4444-555555555555';
function backend(routes={}){
 const calls=[];
 const fetchImpl=async(url,init={})=>{const path=url.replace(env.KNOWLY_SUPABASE_URL,'');calls.push({path,method:init.method||'GET',body:init.body?JSON.parse(init.body):undefined,headers:init.headers});
  if(path.startsWith('/auth/v1/token'))return Response.json({access_token:'admin-token',expires_in:3600});
  const hit=Object.entries(routes).find(([k])=>path.startsWith(k));return Response.json(hit?hit[1]:[]);};
 return {calls,fetchImpl};
}
test('long text is split into ingest pages and form feeds are respected',()=>{
 assert.deepEqual(textPages('가\f나\f'),[{page:1,text:'가'},{page:2,text:'나'}]);
 const pages=textPages(('문단'.repeat(900)+'\n\n').repeat(4));
 assert.ok(pages.length>=2&&pages.every(p=>p.text.length<=3000));
});
test('faq save validates input and uses the admin token',async()=>{
 resetKnowlyToken();const {calls,fetchImpl}=backend();
 await assert.rejects(knowlyAdmin(env,'faq.save',{question:'',answer:'a',category:'휴가'},fetchImpl),{status:400});
 await assert.rejects(knowlyAdmin(env,'faq.save',{question:'q',answer:'a',category:'없는분야'},fetchImpl),{status:400});
 await assert.rejects(knowlyAdmin(env,'faq.delete',{id:'1 or 1=1'},fetchImpl),{status:404});
 const r=await knowlyAdmin(env,'faq.save',{id:ID,question:'연차는?',answer:'3일 전',category:'휴가'},fetchImpl);
 assert.equal(r.ok,true);
 const patch=calls.find(c=>c.method==='PATCH');
 assert.equal(patch.path,`/rest/v1/faqs?id=eq.${ID}`);assert.equal(patch.headers.Authorization,'Bearer admin-token');assert.equal(patch.body.category,'휴가');
});
test('document registration sends extracted pages to ingest',async()=>{
 resetKnowlyToken();const {calls,fetchImpl}=backend({'/functions/v1/ingest':{chunks:3,embedded:true}});
 const r=await knowlyAdmin(env,'doc.create',{title:'취업규칙',category:'휴가',text:'제1조\n\n제2조'},fetchImpl);
 assert.match(r.notice,/검색 단위 3개/);
 const body=calls.find(c=>c.path==='/functions/v1/ingest').body;
 assert.equal(body.version,'v1');assert.equal(body.pages[0].page,1);
});
test('unknown operations and missing admin config are refused',async()=>{
 await assert.rejects(knowlyAdmin(env,'sql',{},backend().fetchImpl),{status:400});
 await assert.rejects(knowlyAdmin({},'faq.list',{},()=>assert.fail()),{status:503});
});
const req=(origin='https://nyang.test')=>new Request('https://nyang.test/api/knowly-admin',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op:'faq.list'})});
test('admin route is limited to the staff account on the same origin',async()=>{
 const run=async(_env,op)=>({op});
 assert.equal((await knowlyAdminRequest(null,env,req(),{session:async()=>'user01',knowlyAdmin:run})).status,401);
 assert.equal((await knowlyAdminRequest(null,env,req('https://evil.test'),{session:async()=>'admin01',knowlyAdmin:run})).status,403);
 const ok=await knowlyAdminRequest(null,env,req(),{session:async()=>'admin01',knowlyAdmin:run});
 assert.equal(ok.status,200);assert.deepEqual(await ok.json(),{op:'faq.list'});
});
