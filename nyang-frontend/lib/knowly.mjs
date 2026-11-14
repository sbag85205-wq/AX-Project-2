// Knowly(main 브랜치 Supabase 백엔드) 연결 설정과 로그인 확인.
// 질문은 브라우저가 Knowly와 같은 방식으로 Supabase chat 함수를 직접 호출한다(public/knowly.js).
// 냥대리 서버는 Knowly 로그인 토큰이 진짜인지와 계정 역할만 확인해 기존 냥대리 세션(포인트·게시판·통계)을 연다.
import {AppError} from './community.mjs';

const TIMEOUT_MS=15000;

/** Supabase 주소와 publishable key(둘 다 브라우저에 공개되는 값). 없거나 형식이 틀리면 null → 기존 시연 계정으로 동작. */
export function knowlyPublicConfig(env={}){
 const url=String(env.KNOWLY_SUPABASE_URL||'').trim().replace(/\/+$/,''),key=String(env.KNOWLY_SUPABASE_KEY||'').trim();
 if(!/^https:\/\/[^\s/]+$/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))return null;
 if(!key)return null;
 const domain=String(env.KNOWLY_LOGIN_EMAIL_DOMAIN||'knowly.local').trim().toLowerCase();
 return {url,key,domain:/^[a-z0-9.-]+$/.test(domain)?domain:'knowly.local'};
}

async function timed(fetchImpl,url,init){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
 try{return await fetchImpl(url,{...init,signal:ctrl.signal});}finally{clearTimeout(timer);}
}

/** Knowly 접속 토큰으로 계정을 확인한다. Knowly 관리자(admin) → 냥대리 담당자(staff), 그 외 → 직원(employee). */
export async function verifyKnowlyToken(env,accessToken,fetchImpl=fetch){
 const config=knowlyPublicConfig(env);
 if(!config)throw new AppError('사내 문서 검색(Knowly)이 아직 연결되지 않았어요.',503);
 if(typeof accessToken!=='string'||accessToken.length<20||accessToken.length>8000)throw new AppError('아이디와 비밀번호를 확인해 주세요.',401);
 const headers={apikey:config.key,Authorization:`Bearer ${accessToken}`};
 const userRes=await timed(fetchImpl,`${config.url}/auth/v1/user`,{headers});
 if(userRes.status===401||userRes.status===403)throw new AppError('로그인이 만료됐어요. 다시 로그인해 주세요.',401);
 const user=await userRes.json().catch(()=>null);
 if(!userRes.ok||typeof user?.id!=='string')throw new AppError('Knowly 로그인을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',502);
 const profileRes=await timed(fetchImpl,`${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=login_id,display_name,role,departments(name)`,{headers});
 const rows=await profileRes.json().catch(()=>null),p=Array.isArray(rows)?rows[0]:null;
 if(!profileRes.ok||!p||typeof p.login_id!=='string')throw new AppError('Knowly 계정 정보를 찾을 수 없어요. 관리자에게 계정을 확인해 달라고 알려 주세요.',403);
 const username=p.login_id.trim().toLowerCase().slice(0,64);
 if(!/^[a-z0-9._-]+$/.test(username))throw new AppError('Knowly 계정 아이디 형식을 확인해 주세요.',403);
 return {username,role:p.role==='admin'?'staff':'employee',name:String(p.display_name||username).slice(0,40),department:String(p.departments?.name||'').slice(0,40)};
}
