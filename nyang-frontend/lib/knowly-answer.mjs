// Knowly chat 함수의 Answer를 냥대리 답변 카드가 쓰는 모양으로 정리한다.
// 통합 앱(src/nyang/transport.ts)과 이전 독립 프로토타입(lib/knowly.mjs)이 함께 쓴다.

const text=(v,max=600)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v,max=8,len=600)=>(Array.isArray(v)?v:[]).map(x=>text(x,len)).filter(Boolean).slice(0,max);
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)?v:'';

/** 쪽 표시: 3쪽, 3–5쪽, 없으면 '' */
export function pageLabel(start,end){
 const s=Number(start)||0,e=Number(end)||s;
 return s?(e>s?`${s}–${e}쪽`:`${s}쪽`):'';
}

/**
 * 근거가 있는 답(status 'answered' + 요약 1개 이상)만 answered=true.
 * 출처는 같은 문서·쪽을 한 번만, 최대 6개. details는 steps가 있어도 유지한다(Knowly 답변 카드와 같게).
 */
export function normalizeKnowlyAnswer(answer){
 const a=answer&&typeof answer==='object'?answer:{};
 const status=['answered','insufficient_evidence','conflicting_sources'].includes(a.status)?a.status:'insufficient_evidence';
 const summary=list(a.summary,4),steps=list(a.steps,12),warnings=list(a.warnings,4);
 const seen=new Set(),citations=[];
 for(const c of Array.isArray(a.citations)?a.citations:[]){
  const title=text(c?.document_title,200);if(!title)continue;
  const pages=pageLabel(c.page_start,c.page_end),id=`${title}|${pages}`;
  if(seen.has(id))continue;seen.add(id);
  citations.push({title,version:text(c.version,40),pages,document_id:uuid(c.document_id),chunk_id:uuid(c.chunk_id)});
  if(citations.length>=6)break;
 }
 const attachments=(Array.isArray(a.attachments)?a.attachments:[]).slice(0,3).map(n=>({name:text(n?.name,120),read:n?.read===true})).filter(n=>n.name);
 return {answered:status==='answered'&&summary.length>0,status,mode:['faq','llm','search'].includes(a.mode)?a.mode:'search',summary,steps,details:text(a.details,8000),warnings,citations,attachments};
}
