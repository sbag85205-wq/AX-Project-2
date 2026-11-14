const kinds=new Set(['answer','plan','excerpt','unknown','scope','knowly']);
const categories=new Set(['hr','pay','trip','life']);
export const canSaveAnswer=result=>['answer','plan','excerpt'].includes(result?.kind)||result?.kind==='knowly'&&result.knowly?.answered===true;
export function normalizeHistory(value){
 const seen=new Set();
 const valid=(Array.isArray(value)?value:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.q==='string'&&Number.isFinite(x.at)&&kinds.has(x.result?.kind)&&categories.has(x.result?.category)&&!seen.has(x.id)&&seen.add(x.id));
 const sorted=valid.map(x=>({...x,saved:x.saved===true})).sort((a,b)=>b.at-a.at);
 const saved=sorted.filter(x=>x.saved).slice(0,100);
 const recent=sorted.slice(0,100);
 return [...new Map([...recent,...saved].map(x=>[x.id,x])).values()].sort((a,b)=>b.at-a.at);
}
export function recordAnswer(history,result,at=Date.now()){
 const {kind,id,q,category,messageId,personal,target,title,text,ref,scheduleType,start,end,knowly}=result;
 const record={id:messageId,q,at,saved:history.find(x=>x.id===messageId)?.saved===true,result:{kind,id,q,category,messageId,personal,target,title,text,ref,scheduleType,start,end,knowly}};
 return normalizeHistory([record,...history.filter(x=>x.id!==messageId)]);
}
export function toggleSaved(history,id){
 const item=history.find(x=>x.id===id);
 if(!item||!canSaveAnswer(item.result))return history;
 if(!item.saved&&history.filter(x=>x.saved).length>=100)throw Error('답변은 최대 100개까지 저장할 수 있어요. 이전 저장을 해제한 뒤 다시 시도해 주세요.');
 return history.map(x=>x.id===id?{...x,saved:!x.saved}:x);
}
export function unseenReplies(posts,seen={}){
 return (posts||[]).filter(p=>p.mine&&p.replies?.length>(Number(seen[p.id])||0));
}
