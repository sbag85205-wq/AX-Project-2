// User input starts motion; server confirmation only updates the expression/reward.
// guess(): 서버를 기다리지 않고 바로 보여 줄 표정('like'|'dislike'). 표정은 화면 꾸밈이라 바로 보여 주고,
// 포인트가 걸린 보너스(bonus)만 서버가 정한 대로 나중에 알려 준다.
export function createPetInteraction({commit,react,stroke=()=>{},indicate=()=>{},onBonus,onError,now=Date.now,cooldown,guess=null}){
 let pending=false,nextRequestAt=0,context=0,lastKind=null;
 return {
  async pet(){
   if(pending){stroke();return;}
   const at=now();
   if(at<nextRequestAt){
    if(lastKind)react(lastKind==='bonus'?'like':lastKind);
    stroke();
    return;
   }
   pending=true;nextRequestAt=at+cooldown;lastKind=null;
   const requestContext=context,shown=guess?guess():null;
   if(shown){lastKind=shown;react(shown);stroke();}else{react(null);indicate(true);stroke();}
   try{
    const result=await commit();
    const kind=result?.eventResult?.kind;
    if(!['like','dislike','bonus'].includes(kind))return;
    // The server starts its cooldown on receipt, which may be much later
    // than the click. Waiting from the response also covers slow networks.
    nextRequestAt=now()+cooldown;
    // 바로 보여 준 표정이 있으면 그대로 두고, 보너스일 때만 바꾼다(표정이 뒤늦게 바뀌지 않게)
    if(requestContext===context&&(!shown||kind==='bonus')){lastKind=kind;react(kind);}
    if(kind==='bonus')onBonus();
   }catch(error){onError?.(error);}
   finally{pending=false;if(requestContext===context&&!shown)indicate(false);}
  },
  reset(){context++;lastKind=null;indicate(false);react(null);}
 };
}
