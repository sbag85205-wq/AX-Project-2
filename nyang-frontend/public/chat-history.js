// Store complete exchanges only; opening a thread never resubmits a question.
export const CHAT_LIMIT=100;
const kinds=new Set(['answer','plan','excerpt','unknown','scope','knowly']);
const categories=new Set(['hr','pay','trip','life']);
const label=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export const chatFolders=chats=>[...new Set(chats.map(x=>x.folder).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
export function updateChatDetails(chats,id,{customTitle,folder}){
 return normalizeChats(chats.map(x=>x.id===id?{...x,customTitle:label(customTitle,80),folder:label(folder,40)}:x));
}
export function renameChatFolder(chats,from,to){
 const name=label(to,40);
 if(!from||!name)return chats;
 return normalizeChats(chats.map(x=>x.folder===from?{...x,folder:name}:x));
}
export function completedMessages(messages){
 const out=[];
 for(let i=0;i+1<(Array.isArray(messages)?messages.length:0);i+=2){
  const q=messages[i],a=messages[i+1];
  if(q?.role!=='user'||typeof q.text!=='string'||!Number.isFinite(q.at)||a?.role!=='assistant'||!Number.isFinite(a.at)||typeof a.result?.messageId!=='string'||!kinds.has(a.result.kind)||!categories.has(a.result.category))break;
  out.push(structuredClone(q),structuredClone(a));
 }
 return out;
}
export function normalizeChats(value){
 const seen=new Set();
 return (Array.isArray(value)?value:[]).filter(x=>x&&typeof x.id==='string'&&!seen.has(x.id)&&seen.add(x.id)).map(x=>{
  const messages=completedMessages(x.messages);
  const customTitle=label(x.customTitle,80),folder=label(x.folder,40);
  return {id:x.id,customTitle,folder,title:customTitle||messages[0]?.text||'',updatedAt:messages.at(-1)?.at||0,category:categories.has(x.category)?x.category:messages.at(-1)?.result.category||'hr',messages};
 }).filter(x=>x.messages.length).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,CHAT_LIMIT);
}
export function rememberChat(chats,id,messages,category){
 const complete=completedMessages(messages);
 if(!id||!complete.length)return chats;
 return normalizeChats([{...chats.find(x=>x.id===id),id,messages:complete,category},...chats.filter(x=>x.id!==id)]);
}
export function removeChat(chats,history,id){
 const thread=chats.find(x=>x.id===id);
 const ids=new Set(thread?.messages.flatMap(m=>m.result?[m.result.messageId]:[])||[]);
 return {chats:chats.filter(x=>x.id!==id),history:history.filter(x=>!ids.has(x.id))};
}
export function importQuestionHistory(history){
 return normalizeChats(history.map(x=>({id:'legacy-'+x.id,category:x.result.category,messages:[{role:'user',text:x.q,at:x.at},{role:'assistant',result:{...x.result,messageId:x.id},at:x.at}]})));
}

// Classify each completed question by its own scope, not the thread's last scope.
export function questionsByCategory(chats,category){
 return chats.flatMap(thread=>thread.messages.flatMap((message,i)=>{
  if(message.role!=='assistant'||message.result.category!==category)return [];
  return [{threadId:thread.id,messageId:message.result.messageId,title:thread.messages[i-1].text,at:message.at,category:message.result.category}];
 })).sort((a,b)=>b.at-a.at);
}
