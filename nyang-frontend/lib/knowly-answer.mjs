// Knowly chat 함수의 Answer를 냥대리 답변 카드가 쓰는 모양으로 정리한다.
// 통합 앱(src/nyang/transport.ts)과 이전 독립 프로토타입(lib/knowly.mjs)이 함께 쓴다.

// 서버(chat 함수)가 보낸 글은 줄이지 않는다(개수·길이는 서버가 정한다). 문자열이 아닌 값과 빈 글만 걸러 낸다.
const text=v=>typeof v==='string'?v.trim():'';
const list=v=>(Array.isArray(v)?v:[]).map(text).filter(Boolean);
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)?v:'';

/** 쪽 표시: 3쪽, 3–5쪽, 없으면 '' */
export function pageLabel(start,end){
 const s=Number(start)||0,e=Number(end)||s;
 return s?(e>s?`${s}–${e}쪽`:`${s}쪽`):'';
}

/**
 * 근거가 있는 답(status 'answered' + 요약 1개 이상)만 answered=true.
 * 요약·절차·주의·설명은 서버가 보낸 그대로(줄이지 않음). details는 steps가 있어도 유지한다(Knowly 답변 카드와 같게).
 * 출처는 같은 문서·쪽을 한 번만, 최대 6개.
 * outside_category: 고른 분야에 근거가 없어 전체 문서에서 찾은 답(chat 함수가 true일 때만 보낸다).
 */
export function normalizeKnowlyAnswer(answer){
 const a=answer&&typeof answer==='object'?answer:{};
 const status=['answered','insufficient_evidence','conflicting_sources'].includes(a.status)?a.status:'insufficient_evidence';
 const summary=list(a.summary),steps=list(a.steps),warnings=list(a.warnings);
 const seen=new Set(),citations=[];
 for(const c of Array.isArray(a.citations)?a.citations:[]){
  const title=text(c?.document_title);if(!title)continue;
  const pages=pageLabel(c.page_start,c.page_end),id=`${title}|${pages}`;
  if(seen.has(id))continue;seen.add(id);
  citations.push({title,version:text(c?.version),pages,document_id:uuid(c.document_id),chunk_id:uuid(c.chunk_id)});
  if(citations.length>=6)break;
 }
 const attachments=(Array.isArray(a.attachments)?a.attachments:[]).map(n=>({name:text(n?.name),read:n?.read===true})).filter(n=>n.name);
 return {answered:status==='answered'&&summary.length>0,status,mode:['faq','llm','search'].includes(a.mode)?a.mode:'search',summary,steps,details:text(a.details),warnings,citations,attachments,...(a.outside_category===true?{outside_category:true}:{})};
}
