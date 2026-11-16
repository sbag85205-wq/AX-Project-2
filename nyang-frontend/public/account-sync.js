// 계정별 개인 기록(내 일정·대화 기록·내 활동 기록·배경/성격 설정)을 서버와 맞춘다.
// 화면은 전처럼 브라우저 저장소(localStorage)에서 바로 읽고 쓰고, 이 모듈이 뒤에서 서버와 맞춘다.
//  · 로그인하면 서버 기록을 받아 브라우저에 넣는다(다른 PC에서 쓰던 기록이 보인다).
//  · 저장할 때마다 바뀐 기록을 잠시 뒤 서버로 보낸다. 아직 못 보낸 기록은 표시해 두고 다음에 다시 보낸다.
//  · 이 브라우저에서 처음 맞출 때는 서버 기록에 이 브라우저에만 있던 기록을 합쳐서 올린다.
// 직접 올린 배경 이미지(om-bg-uploads-*)와 화면 밝기(nyang-color-theme)는 기기마다 따로 둔다.

/** 서버와 맞추는 기록 이름 (서버 함수의 STATE_KEY와 같아야 한다) */
export const isSyncKey=key=>/^(om-tasks|om-question-history|om-seen-replies|om-chat-sessions|om-personality|om-cat-motion|om-bg-theme-[a-z]{1,12})$/.test(key);
const FIXED_KEYS=['om-tasks','om-question-history','om-seen-replies','om-chat-sessions','om-personality','om-cat-motion'];
// 항목마다 id가 있는 목록: 처음 맞출 때 id가 겹치지 않는 항목을 합친다
const LIST_KEYS=new Set(['om-tasks','om-question-history','om-chat-sessions']);
const parse=text=>{try{return JSON.parse(text);}catch{return undefined;}};

/**
 * 이 브라우저에서 처음 맞출 때 서버 기록(remote)과 브라우저 기록(local)을 합친다. 둘 다 JSON 글자, 없으면 null.
 * 목록은 서버 항목에 브라우저에만 있는 항목(id 기준)을 더하고, 읽은 답변 수는 큰 쪽, 나머지 설정은 서버 값을 쓴다.
 */
export function mergeFirst(key,remote,local){
 if(local==null)return remote;
 if(remote==null)return local;
 const r=parse(remote),l=parse(local);
 if(LIST_KEYS.has(key)&&Array.isArray(r)&&Array.isArray(l)){
  const ids=new Set(r.map(x=>x?.id)),extra=l.filter(x=>x&&typeof x.id==='string'&&!ids.has(x.id));
  return extra.length?JSON.stringify([...r,...extra]):remote;
 }
 if(key==='om-seen-replies'&&r&&l&&typeof r==='object'&&typeof l==='object'&&!Array.isArray(r)&&!Array.isArray(l)){
  const out={...l,...r};for(const id of Object.keys(l))if(id in r)out[id]=Math.max(Number(l[id])||0,Number(r[id])||0);
  return JSON.stringify(out)===JSON.stringify(r)?remote:JSON.stringify(out);
 }
 return remote;
}

/**
 * keyFor(account,key): 브라우저 저장소에서 쓰는 실제 이름. send(body): 서버 요청(실패하면 예외, 너무 크면 status 413).
 * storage: localStorage 모양. delay: 저장 뒤 서버로 보내기까지 기다리는 시간(ms), retryDelay: 연결 실패 뒤 다시 보내기까지(ms).
 */
export function createAccountSync({keyFor,send,storage=globalThis.localStorage,delay=1200,retryDelay=30000,later=setTimeout,cancel=clearTimeout}){
 let account=null,dirty=new Set(),timer=null,sending=null;
 const tooBig=new Set();
 const get=k=>{try{return storage.getItem(k);}catch{return null;}};
 const set=(k,v)=>{try{storage.setItem(k,v);return true;}catch{return false;}};
 const dirtyName=a=>'nyang-sync-dirty:'+a,firstName=a=>'nyang-sync-first:'+a;
 const remember=()=>{if(account)set(dirtyName(account),JSON.stringify([...dirty]));};
 const schedule=()=>{cancel(timer);if(account&&dirty.size)timer=later(()=>{push();},delay);};
 // 이 계정으로 브라우저에 저장된 기록 이름들(고른 배경은 화면 종류마다 이름이 다르다)
 function localKeys(a){
  const keys=new Set(FIXED_KEYS),prefix=keyFor(a,'om-bg-theme-');
  try{for(let i=0;i<storage.length;i++){const name=storage.key(i);if(name?.startsWith(prefix)&&isSyncKey('om-bg-theme-'+name.slice(prefix.length)))keys.add('om-bg-theme-'+name.slice(prefix.length));}}catch{}
  return keys;
 }
 /** 아직 못 보낸 기록을 서버로 보낸다(기록 하나에 요청 하나). */
 function push(){
  if(sending)return sending;
  const mine=account;let failed=false;
  sending=(async()=>{
   for(const key of [...dirty]){
    if(account!==mine)return;
    if(tooBig.has(key))continue;
    const value=get(keyFor(mine,key));
    try{await send({action:'state-set',key,value});}
    catch(e){if(e?.status===413){tooBig.add(key);continue;}failed=true;return;} // 연결 문제면 표시를 남겨 두고 나중에 다시 보낸다
    if(account!==mine)return;
    if(get(keyFor(mine,key))===value){dirty.delete(key);remember();} // 보내는 사이에 또 바뀌었으면 한 번 더 보낸다
   }
  })().finally(()=>{
   sending=null;if(account!==mine)return;
   if(failed){cancel(timer);timer=later(()=>{push();},retryDelay);}
   else if([...dirty].some(k=>!tooBig.has(k)))schedule();
  });
  return sending;
 }
 return {
  /**
   * 계정이 바뀔 때 부른다(로그아웃이면 null). 서버 기록을 받아 브라우저 저장소에 넣고,
   * 화면이 다시 읽어야 할 만큼 바뀌었으면 true를 돌려준다. 서버에 닿지 못하면 false(브라우저 기록 그대로 쓴다).
   */
  async start(next){
   cancel(timer);account=next||null;dirty=new Set();tooBig.clear();
   if(!account)return false;
   const mine=account,saved=parse(get(dirtyName(mine)));
   if(Array.isArray(saved))for(const k of saved)if(isSyncKey(k))dirty.add(k);
   let remote;
   try{remote=(await send({action:'state'}))?.state;}catch{schedule();return false;}
   if(account!==mine||!remote||typeof remote!=='object')return false;
   const first=get(firstName(mine))===null;let changed=false;
   for(const key of new Set([...localKeys(mine),...Object.keys(remote).filter(isSyncKey)])){
    if(dirty.has(key))continue; // 이 브라우저에서 바꾸고 아직 못 보낸 기록이 더 새것이다
    const name=keyFor(mine,key),local=get(name),server=typeof remote[key]==='string'?remote[key]:null;
    if(server===null){if(local!==null)dirty.add(key);continue;} // 서버에 아직 없는 기록은 올린다
    const want=first?mergeFirst(key,server,local):server;
    if(want!==local&&set(name,want))changed=true;
    if(want!==server)dirty.add(key);
   }
   set(firstName(mine),'1');remember();schedule();
   return changed;
  },
  /** 브라우저 저장소에 기록을 저장한 뒤 부른다. */
  changed(key){if(!account||!isSyncKey(key))return;tooBig.delete(key);dirty.add(key);remember();schedule();},
  /** 테스트·마무리용: 지금 바로 보내고 끝날 때까지 기다린다. */
  flush(){cancel(timer);return push();},
  pending:()=>[...dirty]
 };
}
