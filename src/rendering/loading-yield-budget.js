import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
// Bound elapsed work between frame deliveries. Awaited work also advances this
// wall-clock budget; it is not an accumulator of exclusive CPU submission time.
// Borrowed renderer state must already be restored.
// Cancellation/deadline remain observable while a native RAF is suspended.
export function loadingYieldBudget({frameBudget=0,now=()=>performance.now(),nextFrame,signal,cancelled=()=>false,timeout=30000,pollIntervalMs=100,onYield,frameSlack}={}){
 if(!Number.isFinite(frameBudget)||frameBudget<0)throw Error('Invalid loading frame budget');
 let begin=now();const lane=frameSlack?.createLane();
 const owner=()=>{if(signal?.aborted||cancelled())throw Error('Loading frame cancelled');};
 const yieldWork=async()=>{
  owner();if(frameBudget){const current=now();if(lane?!lane.shouldYield(current,begin,frameBudget):current-begin<frameBudget)return;}
  const waiting=now(),check=()=>{owner();if(now()-waiting>timeout)throw Error('Loading frame timed out');};
  const budgetElapsed=waiting-begin;let failed=false;
  try{await waitGpuFrame({check,nextFrame,signal,pollIntervalMs});}catch(error){failed=true;throw error;}finally{if(onYield){const end=now();try{onYield({label:'loading-budget-frame-wait',start:waiting,end,duration:end-waiting,budgetElapsed,frameBudget,failed,scope:'Awaited cooperative frame wall time; budgetElapsed is elapsed wall time since last reset, not accumulated synchronous CPU.'});}catch{}}}
  begin=now();
 };
 yieldWork.recordWork=duration=>lane?.recordWork(duration);
 return yieldWork;
}
