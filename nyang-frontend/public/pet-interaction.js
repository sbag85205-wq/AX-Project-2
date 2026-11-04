// User input starts motion; server confirmation only updates the expression/reward.
export function createPetInteraction({commit,react,stroke=()=>{},indicate=()=>{},onBonus,onError,now=Date.now,cooldown}){
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
   const requestContext=context;
   react(null);indicate(true);stroke();
   try{
    const result=await commit();
    const kind=result?.eventResult?.kind;
    if(!['like','dislike','bonus'].includes(kind))return;
    // The server starts its cooldown on receipt, which may be much later
    // than the click. Waiting from the response also covers slow networks.
    nextRequestAt=now()+cooldown;
    if(requestContext===context){lastKind=kind;react(kind);}
    if(kind==='bonus')onBonus();
   }catch(error){onError?.(error);}
   finally{pending=false;if(requestContext===context)indicate(false);}
  },
  reset(){context++;lastKind=null;indicate(false);react(null);}
 };
}
