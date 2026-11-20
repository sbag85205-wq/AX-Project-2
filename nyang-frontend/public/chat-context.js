// 대화 맥락: 같은 대화의 최근 몇 턴(직원 질문 + 냥대리 답변 요약)을 서버로 함께 보내
// 후속 질문("그럼 S2는?")을 서버가 이해할 수 있게 한다. 새 대화는 메시지가 비어 있어 맥락도 비어 있다.

/** 보내는 턴 수와 글자 수 (서버 supabase/functions/_shared/context.ts와 같게 둔다. 서버가 한 번 더 자른다) */
export const HISTORY_TURNS=3,HISTORY_Q_CHARS=300,HISTORY_A_CHARS=400;
const clip=(s,n)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,n);

/**
 * messages: 현재 대화의 메시지 목록 ({role:'user',text} / {role:'assistant',result:{knowly}}).
 * 방금 보낸 질문(맨 끝의 답 없는 질문)은 빼고, Knowly가 답한 턴만 최근 순으로 HISTORY_TURNS개 고른다.
 * 일정 카드·연결 오류처럼 문서 답변이 아닌 턴은 맥락으로 쓰지 않는다.
 */
export function recentTurns(messages){
 const turns=[];
 for(let i=0;i<messages.length-1;i++){
  const m=messages[i],next=messages[i+1];
  if(m?.role!=='user'||next?.role!=='assistant')continue;
  const k=next.result?.knowly;
  if(!k||k.error)continue;
  const q=clip(m.text,HISTORY_Q_CHARS);
  const a=clip((Array.isArray(k.summary)?k.summary:[]).join(' '),HISTORY_A_CHARS);
  if(q)turns.push({q,a});
 }
 return turns.slice(-HISTORY_TURNS);
}
