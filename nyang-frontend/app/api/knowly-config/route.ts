import {env} from 'cloudflare:workers';
import {knowlyPublicConfig} from '../../../lib/knowly.mjs';
export const dynamic='force-dynamic';
// Knowly 화면이 쓰는 Supabase 주소와 publishable key(둘 다 공개 값). 설정이 없으면 configured=false.
export const GET=()=>{const c=knowlyPublicConfig(env);return Response.json(c?{configured:true,url:c.url,key:c.key}:{configured:false},{headers:{'Cache-Control':'no-store'}});};
