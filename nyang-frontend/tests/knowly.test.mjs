import test from 'node:test';
import assert from 'node:assert/strict';
import {knowlyPublicConfig,verifyKnowlyToken} from '../lib/knowly.mjs';
const env={KNOWLY_SUPABASE_URL:'https://demo.supabase.co/',KNOWLY_SUPABASE_KEY:'sb_publishable_test'};
const token='x'.repeat(40);
function supabase(profile,userStatus=200){
 const calls=[];
 const fetchImpl=async(url,init)=>{calls.push({url,init});
  if(url.includes('/auth/v1/user'))return userStatus===200?Response.json({id:'11111111-1111-1111-1111-111111111111'}):Response.json({},{status:userStatus});
  return Response.json(profile?[profile]:[]);};
 return {calls,fetchImpl};
}
test('public config needs a https url and key only',()=>{
 assert.equal(knowlyPublicConfig({}),null);
 assert.equal(knowlyPublicConfig({...env,KNOWLY_SUPABASE_KEY:''}),null);
 assert.equal(knowlyPublicConfig({...env,KNOWLY_SUPABASE_URL:'http://evil.example'}),null);
 assert.deepEqual(knowlyPublicConfig(env),{url:'https://demo.supabase.co',key:'sb_publishable_test'});
});
test('Knowly admin becomes nyang staff, others employee, using the user token',async()=>{
 const a=supabase({login_id:'Admin',display_name:'관리자',role:'admin',departments:{name:'인사팀'}});
 assert.deepEqual(await verifyKnowlyToken(env,token,a.fetchImpl),{username:'admin',role:'staff',name:'관리자',department:'인사팀'});
 assert.equal(a.calls[0].init.headers.Authorization,'Bearer '+token);
 const e=supabase({login_id:'kim',display_name:'',role:'employee',departments:null});
 assert.equal((await verifyKnowlyToken(env,token,e.fetchImpl)).role,'employee');
});
test('rejects bad tokens, missing profiles and missing config',async()=>{
 await assert.rejects(verifyKnowlyToken(env,token,supabase(null,401).fetchImpl),e=>e.status===401);
 await assert.rejects(verifyKnowlyToken(env,token,supabase(null).fetchImpl),e=>e.status===403);
 await assert.rejects(verifyKnowlyToken(env,'short',supabase({}).fetchImpl),e=>e.status===401);
 await assert.rejects(verifyKnowlyToken({},token,supabase({}).fetchImpl),e=>e.status===503);
});
