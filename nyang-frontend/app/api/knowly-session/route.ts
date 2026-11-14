import {env} from 'cloudflare:workers';
import {knowlySessionRequest} from '../../../lib/knowly-route.mjs';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>knowlySessionRequest(env.DB,env,request);
