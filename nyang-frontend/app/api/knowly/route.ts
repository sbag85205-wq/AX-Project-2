import {env} from 'cloudflare:workers';
import {knowlyRequest} from '../../../lib/knowly-route.mjs';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>knowlyRequest(env.DB,env,request);
