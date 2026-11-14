import {AppError,community,seoulDay} from './community.mjs';

// Guest data is separate from the existing, authenticated company workspace.
// Only table references in our fixed SQL are rewritten; values stay bound parameters.
export function visitorDatabase(db){
 return {
  prepare(sql){return db.prepare(sql.replace(/\b(FROM|INTO|UPDATE|JOIN)\s+(members|wallets|questions|posts|likes|replies|attendance|operations)\b/gi,(_,keyword,table)=>`${keyword} visitor_${table.toLowerCase()}`));},
  batch(statements){return db.batch(statements);}
 };
}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export async function visitorSession(request){
 const found=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nyang-visitor='))?.slice('nyang-visitor='.length);
 const valid=/^[a-f0-9]{64}$/.test(found||'');
 const token=valid?found:hex(crypto.getRandomValues(new Uint8Array(32)));
 const uid=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));
 return {uid,cookie:valid?null:`nyang-visitor=${token}; HttpOnly; SameSite=Lax; Path=/api/visitor; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`};
}
export async function visitorCommunity(database,uid,action=null,input={}){
 if(!/^[a-f0-9]{64}$/.test(uid))throw new AppError('방문자 정보를 확인해 주세요.',400);
 if(action&&!['question','attendance','post','like','reply','reward'].includes(action))throw new AppError('지원하지 않는 요청입니다.',403);
 const db=visitorDatabase(database),email=`${uid}@visitor.invalid`;
 await db.prepare("INSERT OR IGNORE INTO members(email,uid,role,department,name,active) VALUES(?,?,'staff','공개 체험','방문자',1)").bind(email,uid).run();
 if(action==='reply'){
  const cutoff=new Date(seoulDay()+'T00:00:00+09:00').toISOString();
  const count=await db.prepare('SELECT COUNT(*) AS n FROM replies WHERE staff=? AND created>=?').bind(uid,cutoff).first();
  const duplicate=typeof input.id==='string'&&await db.prepare('SELECT id FROM replies WHERE id=? AND staff=?').bind(input.id,uid).first();
  if(count.n>=30&&!duplicate)throw new AppError('오늘은 답변을 30개까지 등록할 수 있어요.',429);
 }
 const state=await community(db,{userId:uid,email,fullName:'방문자'},undefined,action,input);
 return {...state,visitorMode:true,me:{name:'방문자',role:'visitor',department:'공개 체험'},members:undefined,
  notice:state.notice?.replace('담당자의 답변을 기다려 주세요.','다른 방문자와 질문을 나눠요.').replace('담당자 답변을 등록했어요.','체험 답변을 등록했어요.')};
}
