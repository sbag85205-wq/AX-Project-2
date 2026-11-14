// Knowly가 연결된 경우: 브라우저가 Knowly에 로그인해 받은 토큰을 서버가 확인하고 역할(관리자→담당자)에 맞춰 냥대리 세션을 연다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {accountRequest} from '../lib/demo-account.mjs';
const env={KNOWLY_SUPABASE_URL:'https://demo.supabase.co',KNOWLY_SUPABASE_KEY:'sb_publishable_test'};
const profiles={['a'.repeat(40)]:{login_id:'admin',display_name:'관리자',role:'admin',departments:{name:'인사팀'}},['e'.repeat(40)]:{login_id:'kim',display_name:'김직원',role:'employee',departments:null}};
globalThis.fetch=async(url,init)=>{
 const token=init.headers.Authorization.slice(7),p=profiles[token];
 if(String(url).includes('/auth/v1/user'))return p?Response.json({id:'11111111-1111-1111-1111-111111111111'}):Response.json({},{status:401});
 return Response.json(p?[p]:[]);
};
function fixture(){
 const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sql.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(q){return{args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(q).get(...this.args)??null;},async all(){return{results:sql.prepare(q).all(...this.args)};},async run(){return{meta:{changes:Number(sql.prepare(q).run(...this.args).changes)}};}};},async batch(ss){const out=[];for(const s of ss)out.push(await s.run());return out;}};
 return async(cookie='',body=null,path='')=>{const r=await accountRequest(db,env,new Request('https://nyang.test/api/account'+path,{method:body?'POST':'GET',headers:{cookie,origin:'https://nyang.test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};};
}
test('Knowly accounts sign in with their own role; tab mismatch, bad token and demo password are refused',async()=>{
 const call=fixture();
 assert.equal((await call()).data.knowly,true);
 const admin=await call('',{action:'login',role:'staff',access_token:'a'.repeat(40)});
 assert.equal(admin.status,200);assert.deepEqual(admin.data.me,{username:'admin',role:'staff',name:'관리자',department:'인사팀'});assert.equal(admin.data.knowlyAccount,true);
 assert.equal((await call(admin.cookie,null,'?view=stats')).status,200);
 const user=await call('',{action:'login',role:'employee',access_token:'e'.repeat(40)});
 assert.equal(user.data.me.role,'employee');assert.equal((await call(user.cookie,null,'?view=stats')).status,403);
 assert.equal((await call(user.cookie,{action:'question',question:'연차 신청 방법'})).data.wallet.points,10);
 assert.equal((await call('',{action:'login',role:'employee',access_token:'a'.repeat(40)})).status,401);
 assert.equal((await call('',{action:'login',role:'employee',access_token:'x'.repeat(40)})).status,401);
 assert.equal((await call('',{action:'login',role:'employee',username:'user01',password:'pw'})).status,401);
});
