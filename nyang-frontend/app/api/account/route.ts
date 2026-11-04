import {env} from 'cloudflare:workers';
import {accountRequest} from '../../../lib/demo-account.mjs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>accountRequest(env.DB,env,request);
export const POST=(request:Request)=>accountRequest(env.DB,env,request);
