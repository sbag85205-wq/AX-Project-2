import {env} from 'cloudflare:workers';
import {knowlyAdminRequest} from '../../../lib/knowly-route.mjs';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>knowlyAdminRequest(env.DB,env,request);
