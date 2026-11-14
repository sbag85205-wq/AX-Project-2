import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {accountRequest} from '../lib/demo-account.mjs';
import {toNyangAnswer} from '../public/knowly.js';
const env={KNOWLY_SUPABASE_URL:'https://knowly.test',KNOWLY_SUPABASE_KEY:'publishable-key'};
// 가짜 Knowly(Supabase): 토큰 → 계정
const users={['t'.repeat(30)]:{id:'u1',login_id:'kim',display_name:'김직원',role:'employee'},['a'.repeat(30)]:{id:'u2',login_id:'lee',display_name:'이관리',role:'admin'}};
globalThis.fetch=async(url,init={})=>{
 const user=users[(init.headers?.Authorization||'').slice(7)];
 if(!user)return Response.json({msg:'invalid'},{status:401});
 if(String(url).endsWith('/auth/v1/user'))return Response.json({id:user.id});
 if(String(url).includes('/rest/v1/profiles'))return Response.json([{...user,departments:null}]);
 return Response.json({},{status:404});
};
function fixture(){
 const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sql.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(q){return{args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(q).get(...this.args)??null;},async all(){return{results:sql.prepare(q).all(...this.args)};},async run(){return{meta:{changes:Number(sql.prepare(q).run(...this.args).changes)}};}};},async batch(ss){const out=[];for(const s of ss)out.push(await s.run());return out;}};
 return async(cookie='',body=null,path='')=>{
  const r=await accountRequest(db,env,new Request('https://nyang.test/api/account'+path,{method:body?'POST':'GET',headers:{cookie,origin:'https://nyang.test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
  return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};
 };
}
test('Knowly 계정으로 로그인하면 기존 냥대리 세션이 열리고, 역할은 Knowly 프로필을 따른다',async()=>{
 const call=fixture();
 assert.equal((await call()).data.knowly,true);
 const emp=await call('',{action:'login',role:'employee',access_token:'t'.repeat(30)});
 assert.equal(emp.status,200);assert.equal(emp.data.me.username,'kim');assert.equal(emp.data.me.role,'employee');assert.equal(emp.data.knowly,true);
 assert.equal((await call(emp.cookie)).data.member,true);
 assert.equal((await call(emp.cookie,{action:'question',question:'연차는?'})).data.wallet.questions,1);
 assert.equal((await call(emp.cookie,null,'?view=stats')).status,403);
 assert.equal((await call('',{action:'login',role:'staff',access_token:'t'.repeat(30)})).status,401);
 const admin=await call('',{action:'login',role:'staff',access_token:'a'.repeat(30)});
 assert.equal(admin.data.me.role,'staff');
 const stats=await call(admin.cookie,null,'?view=stats');assert.equal(stats.status,200);assert.equal(stats.data.accounts,1);assert.equal(stats.data.questions,1);
 assert.equal((await call('',{action:'login',role:'employee',access_token:'x'.repeat(30)})).status,401);
 assert.equal((await call('',{action:'login',role:'employee',username:'user01',password:'test-password'})).status,401);
});
test('Knowly 답변을 냥대리 답변 카드 모양으로 줄인다',()=>{
 const a=toNyangAnswer({status:'answered',mode:'llm',summary:['연차는 3일 전 신청'],steps:['결재 올리기'],details:'',warnings:[],citations:[{document_title:'취업규칙',page_start:3,page_end:4,version:'v2'},{document_title:'취업규칙',page_start:3,page_end:4}]});
 assert.equal(a.answered,true);assert.deepEqual(a.citations,[{title:'취업규칙',version:'v2',pages:'3–4쪽'}]);
 assert.equal(toNyangAnswer({status:'insufficient_evidence',summary:[]}).answered,false);
 assert.equal(toNyangAnswer(null).answered,false);
});
