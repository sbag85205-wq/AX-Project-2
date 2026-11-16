// 계정별 개인 기록을 서버와 맞춰, 어느 기기로 로그인해도 같은 기록이 보이게 한다.
// (내 일정·대화 기록·보던 대화·내 활동 기록·읽은 답변·추가 자료·성격·움직임·화면 테마·고른 배경·직접 올린 배경 이미지)
// 화면은 전처럼 브라우저 저장소(localStorage)에서 바로 읽고 쓰고, 이 모듈이 뒤에서 서버와 맞춘다.
//  · 로그인·새로고침·창으로 돌아올 때 서버 기록을 받아 브라우저에 넣는다(다른 기기에서 바꾼 것이 보인다).
//  · 저장하면 곧바로(잠깐 모아서) 서버로 보낸다. 못 보낸 기록은 표시해 두고 다시 보낸다(창을 닫을 때도 한 번 더).
//  · 이 브라우저에서 처음 맞출 때는 서버 기록에 이 브라우저에만 있던 기록을 합쳐서 올린다.

/** 서버와 맞추는 기록 이름 (서버 함수의 STATE_KEY와 같아야 한다) */
export const isSyncKey=key=>/^(om-tasks|om-question-history|om-seen-replies|om-chat-sessions|om-chat-active|om-docs|om-personality|om-cat-motion|nyang-color-theme|om-bg-(theme|uploads)-[a-z]{1,12})$/.test(key);
const FIXED_KEYS=['om-tasks','om-question-history','om-seen-replies','om-chat-sessions','om-chat-active','om-docs','om-personality','om-cat-motion','nyang-color-theme'];
// 항목마다 id가 있는 목록: 처음 맞출 때 id가 겹치지 않는 항목을 합친다
const isListKey=key=>['om-tasks','om-question-history','om-chat-sessions','om-docs'].includes(key)||key.startsWith('om-bg-uploads-');
const parse=text=>{try{return JSON.parse(text);}catch{return undefined;}};

/**
 * 이 브라우저에서 처음 맞출 때 서버 기록(remote)과 브라우저 기록(local)을 합친다. 둘 다 JSON 글자, 없으면 null.
 * 목록은 서버 항목에 브라우저에만 있는 항목(id 기준)을 더하고, 읽은 답변 수는 큰 쪽, 나머지 설정은 서버 값을 쓴다.
 */
export function mergeFirst(key,remote,local){
 if(local==null)return remote;
 if(remote==null)return local;
 const r=parse(remote),l=parse(local);
 if(isListKey(key)&&Array.isArray(r)&&Array.isArray(l)){
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
 * storage: localStorage 모양. delay: 저장 뒤 서버로 보내기까지 모으는 시간(ms), retryDelay: 연결 실패 뒤 다시 보내기까지(ms).
 */
export function createAccountSync({keyFor,send,storage=globalThis.localStorage,delay=300,retryDelay=15000,later=setTimeout,cancel=clearTimeout}){
 let account=null,dirty=new Set(),timer=null,sending=null;
 const tooBig=new Set();
 const get=k=>{try{return storage.getItem(k);}catch{return null;}};
 const set=(k,v)=>{try{storage.setItem(k,v);return true;}catch{return false;}};
 const dirtyName=a=>'nyang-sync-dirty:'+a,firstName=a=>'nyang-sync-first:'+a,largeName=a=>'nyang-sync-large:'+a;
 const remember=()=>{if(account)set(dirtyName(account),JSON.stringify([...dirty]));};
 const schedule=(wait=delay)=>{cancel(timer);if(account&&[...dirty].some(k=>!tooBig.has(k)))timer=later(()=>{push();},wait);};
 // 이 계정으로 브라우저에 저장된 기록 이름들(배경은 화면 종류마다 이름이 다르다)
 function localKeys(a){
  const keys=new Set(FIXED_KEYS);
  for(const kind of ['theme','uploads']){
   const prefix=keyFor(a,`om-bg-${kind}-`);
   try{for(let i=0;i<storage.length;i++){const name=storage.key(i);if(name?.startsWith(prefix)){const key=`om-bg-${kind}-`+name.slice(prefix.length);if(isSyncKey(key))keys.add(key);}}}catch{}
  }
  return keys;
 }
 /** 서버 기록(remote: {이름: JSON 글자})을 브라우저 저장소에 넣는다. first면 이 브라우저 기록과 합친다. 바뀌었으면 true. */
 function absorb(mine,remote,{first=false,all=true,skip=[]}={}){
  let changed=false;
  const names=all?new Set([...localKeys(mine),...Object.keys(remote).filter(isSyncKey)]):new Set(Object.keys(remote).filter(isSyncKey));
  for(const key of names){
   if(dirty.has(key)||skip.includes(key))continue; // 이 브라우저에서 바꾸고 아직 못 보낸 기록이 더 새것이다
   const name=keyFor(mine,key),local=get(name),server=typeof remote[key]==='string'?remote[key]:null;
   if(server===null){if(local!==null&&first)dirty.add(key);continue;} // 처음 맞출 때 서버에 없는 기록은 올린다
   const want=first?mergeFirst(key,server,local):server;
   if(want!==local&&set(name,want))changed=true;
   if(want!==server)dirty.add(key);
  }
  return changed;
 }
 // 큰 기록(배경 이미지 등)은 화면 응답에 이름과 저장 시각({이름: 시각})만 오고, 바뀐 것만 따로 받는다
 const largeKeys=large=>large&&typeof large==='object'&&!Array.isArray(large)?Object.keys(large).filter(isSyncKey):[];
 /** 큰 기록 중 이 브라우저에 없거나 다른 기기에서 바뀐 것만 받아 넣는다. 바뀌었으면 true. */
 async function absorbLarge(mine,large,first){
  const seen=parse(get(largeName(mine)))||{};
  const keys=largeKeys(large).filter(k=>!dirty.has(k)&&(get(keyFor(mine,k))===null||seen[k]!==large[k]));
  if(!keys.length)return false;
  let remote;try{remote=(await send({action:'state',keys}))?.state;}catch{return false;}
  if(account!==mine||!remote||typeof remote!=='object')return false;
  const changed=absorb(mine,remote,{first,all:false});
  for(const k of keys)if(typeof remote[k]==='string')seen[k]=large[k];
  set(largeName(mine),JSON.stringify(seen));remember();schedule();return changed;
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
    catch(e){
     // 너무 크거나 서버가 받지 않는 기록(4xx)은 이번 화면에서는 다시 보내지 않는다(브라우저에는 남는다).
     // 로그인 만료(401)·시간 초과(408)·요청 과다(429)나 연결 문제는 표시를 남겨 두고 나중에 다시 보낸다.
     const s=e?.status;if(s>=400&&s<500&&![401,408,429].includes(s)){tooBig.add(key);continue;}
     failed=true;return;
    }
    if(account!==mine)return;
    if(get(keyFor(mine,key))===value){dirty.delete(key);remember();} // 보내는 사이에 또 바뀌었으면 한 번 더 보낸다
   }
  })().finally(()=>{
   sending=null;if(account!==mine)return;
   schedule(failed?retryDelay:delay);
  });
  return sending;
 }
 return {
  /**
   * 계정이 바뀔 때 부른다(로그아웃이면 null). given: 화면을 불러올 때 함께 받은 서버 기록({이름: JSON 글자}),
   * large: 따로 받아야 하는 큰 기록({이름: 저장 시각}). given이 있으면 기다리지 않고 곧바로 브라우저 저장소에 넣고,
   * 그 뒤에(큰 기록을 받아) 더 바뀐 것이 있으면 true를 돌려준다. given이 없으면 서버에 물어보고, 바뀌었으면 true.
   * 서버에 닿지 못하면 false(브라우저 기록 그대로 쓴다).
   */
  async start(next,given,large){
   cancel(timer);account=next||null;dirty=new Set();tooBig.clear();
   if(!account)return false;
   const mine=account,saved=parse(get(dirtyName(mine)));
   if(Array.isArray(saved))for(const k of saved)if(isSyncKey(k))dirty.add(k);
   const first=get(firstName(mine))===null;
   if(given&&typeof given==='object'){
    // 큰 기록은 아직 받지 않았으니 '서버에 없는 기록'으로 잘못 보지 않게 건너뛴다
    absorb(mine,given,{first,skip:largeKeys(large)});set(firstName(mine),'1');remember();schedule();
    return absorbLarge(mine,large,first);
   }
   let remote;
   try{remote=(await send({action:'state'}))?.state;}catch{schedule();return false;}
   if(account!==mine||!remote||typeof remote!=='object')return false;
   const changed=absorb(mine,remote,{first});
   set(firstName(mine),'1');remember();schedule();
   return changed;
  },
  /**
   * 같은 계정으로 화면을 다시 불러왔을 때(창으로 돌아옴 등) 함께 받은 서버 기록을 넣는다. 다른 기기에서 바꾼 기록이 보이게 한다.
   * 바뀌었으면 true. 큰 기록(배경 이미지)은 이 브라우저에 없거나 바뀐 것만 따로 받고, 받아서 바뀌면 onLater()를 부른다.
   */
  refresh(given,large,onLater){
   if(!account||!given||typeof given!=='object')return false;
   const mine=account,changed=absorb(mine,given,{skip:largeKeys(large)});remember();
   absorbLarge(mine,large,false).then(more=>{if(more&&account===mine)onLater?.();});
   return changed;
  },
  /** 브라우저 저장소에 기록을 저장한 뒤 부른다. */
  changed(key){if(!account||!isSyncKey(key))return;tooBig.delete(key);dirty.add(key);remember();schedule();},
  /** 지금 바로 보내고 끝날 때까지 기다린다(창을 닫을 때, 테스트). */
  flush(){cancel(timer);return push();},
  pending:()=>[...dirty]
 };
}
