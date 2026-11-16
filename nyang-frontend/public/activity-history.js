const kinds=new Set(['answer','plan','excerpt','unknown','scope','knowly','event']);
import {isCategoryId} from './shared.js?v=76a19ab6baf7';
// 고정 분야와 담당자가 추가한 분야(custom:<이름>)를 유효한 분야로 본다(shared.js)
const categories={has:isCategoryId};
export const canSaveAnswer=result=>['answer','plan','excerpt','knowly'].includes(result?.kind);
export function normalizeHistory(value){
 const seen=new Set();
 const valid=(Array.isArray(value)?value:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.q==='string'&&Number.isFinite(x.at)&&kinds.has(x.result?.kind)&&categories.has(x.result?.category)&&!seen.has(x.id)&&seen.add(x.id));
 const sorted=valid.map(x=>({...x,saved:x.saved===true})).sort((a,b)=>b.at-a.at);
 const saved=sorted.filter(x=>x.saved).slice(0,100);
 const recent=sorted.slice(0,100);
 return [...new Map([...recent,...saved].map(x=>[x.id,x])).values()].sort((a,b)=>b.at-a.at);
}
export function recordAnswer(history,result,at=Date.now()){
 const {kind,id,q,category,messageId,personal,target,title,text,ref,scheduleType,start,end,knowly,event}=result;
 const record={id:messageId,q,at,saved:history.find(x=>x.id===messageId)?.saved===true,result:{kind,id,q,category,messageId,personal,target,title,text,ref,scheduleType,start,end,...(kind==='knowly'?{knowly}:{}),...(kind==='event'?{event}:{})}};
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
// 질문 레벨 단계. 서버 lib/community.mjs의 levelFor와 같아야 한다(tests/activity-history.test.mjs에서 비교).
export const questionLevels=[{at:0,name:'호기심 새싹'},{at:5,name:'질문 탐험가'},{at:15,name:'업무 탐정'},{at:30,name:'지식 연결자'},{at:50,name:'질문 마스터'}];
export function levelLadder(questions){
 const count=Math.max(0,Number(questions)||0),current=questionLevels.findLastIndex(l=>count>=l.at);
 return questionLevels.map((l,i)=>({level:i+1,name:l.name,at:l.at,state:i<current?'done':i===current?'current':'locked',left:Math.max(0,l.at-count)}));
}
