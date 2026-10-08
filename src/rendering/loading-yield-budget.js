// Bound cooperative CPU work, rather than adding one frame of delay to every
// already-cheap submission. Call only after borrowed renderer state is restored.
export function loadingYieldBudget({frameBudget=0,now=()=>performance.now(),nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve))}={}){
 if(!Number.isFinite(frameBudget)||frameBudget<0)throw Error('Invalid loading frame budget');
 let begin=now();
 return async()=>{if(frameBudget&&now()-begin<frameBudget)return;await nextFrame();begin=now();};
}
