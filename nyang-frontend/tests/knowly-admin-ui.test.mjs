import test from 'node:test';
import assert from 'node:assert/strict';
import {createKnowlyAdmin} from '../public/knowly-admin.js';
const flush=()=>new Promise(r=>setTimeout(r,0));
const fake={status:{connected:true},'faq.list':{faqs:[{id:'f1',question:'<b>연차</b>',answer:'3일 전',category:'휴가',active:true,updated_at:'2026-11-01'}]},'doc.list':{documents:[{id:'d1',title:'취업규칙',category:'휴가',version:'v2',page_count:3,status:'ready',created_at:'2026-11-01'}]},'user.list':{users:[{id:'u1',login_id:'kim',display_name:'김',role:'admin',department_id:null}],departments:[]},'settings.get':{settings:{llm_model:null,keyword_min:.35,vector_min:.55,vector_weight:.6},default_model:'openai/gpt',llm_configured:true,embedding_configured:false,models:[]},stats:{days:30,usage:{total:10,answered:7},groups:[{id:'g1',question:'주차 등록?',category:'기타',status:'신규',last_asked_at:'2026-11-02'}]}};
test('renders every admin view from the backend and escapes content',async()=>{
 const changed=[];const admin=createKnowlyAdmin({toast(){},onChange:v=>changed.push(v),call:async op=>fake[op]});
 for(const view of ['faq','documents','users','model']){assert.match(admin.html(view),/불러오는 중/);await flush();await flush();}
 assert.match(admin.html('faq'),/&lt;b&gt;연차&lt;\/b&gt;/);assert.doesNotMatch(admin.html('faq'),/<b>연차/);
 assert.match(admin.html('documents'),/취업규칙[\s\S]*사용 중/);
 assert.match(admin.html('users'),/kim[\s\S]*selected>관리자/);
 assert.match(admin.html('model'),/openai\/gpt/);
 admin.statsHTML();await flush();await flush();
 assert.match(admin.statsHTML(),/7건 \(70%\)[\s\S]*주차 등록/);
 assert.deepEqual([...new Set(changed)].sort(),['documents','faq','model','statistics','users']);
});
test('falls back to the sample screens when the server is not configured',async()=>{
 const admin=createKnowlyAdmin({toast(){},onChange(){},call:async()=>{const e=Error('x');e.status=503;throw e;}});
 admin.html('faq');await flush();await flush();
 assert.equal(admin.html('faq'),null);assert.equal(admin.statsHTML(),'');
});
test('shows a retryable error when the admin login fails',async()=>{
 const admin=createKnowlyAdmin({toast(){},onChange(){},call:async()=>{const e=Error('문서 검색 서버에 로그인하지 못했어요.');e.status=502;throw e;}});
 admin.html('users');await flush();await flush();
 assert.match(admin.html('users'),/로그인하지 못했어요[\s\S]*다시 시도/);
});
