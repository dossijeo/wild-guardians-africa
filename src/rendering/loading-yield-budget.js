import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
// Bound elapsed work between frame deliveries. Awaited work also advances this
// wall-clock budget by default. Explicit cpuBudget instead records synchronous
// invocations and resets only after a delivered presentation epoch or own RAF.
// Borrowed renderer state must already be restored.
// Cancellation/deadline remain observable while a native RAF is suspended.
export function loadingYieldBudget({frameBudget=0,now=()=>performance.now(),nextFrame,signal,cancelled=()=>false,timeout=30000,pollIntervalMs=100,onYield,frameSlack,cpuBudget=false,getFrame=()=>0}={}){
 if(!Number.isFinite(frameBudget)||frameBudget<0)throw Error('Invalid loading frame budget');
 let begin=now(),spent=0,frame=getFrame();const lane=frameSlack?.createLane();
 const delivered=()=>{if(!cpuBudget)return;const current=getFrame();if(current!==frame){frame=current;spent=0;begin=now();}};
 const owner=()=>{if(signal?.aborted||cancelled())throw Error('Loading frame cancelled');};
 const yieldWork=async()=>{
  owner();delivered();if(frameBudget){const current=now();if(cpuBudget?spent<frameBudget:lane?!lane.shouldYield(current,begin,frameBudget):current-begin<frameBudget)return;}
  const waiting=now(),check=()=>{owner();if(now()-waiting>timeout)throw Error('Loading frame timed out');};
  const budgetElapsed=waiting-begin,budgetCpu=cpuBudget?spent:null;let failed=false;
  try{await waitGpuFrame({check,nextFrame,signal,pollIntervalMs});}catch(error){failed=true;throw error;}finally{if(onYield){const end=now();try{onYield({label:'loading-budget-frame-wait',start:waiting,end,duration:end-waiting,budgetElapsed,budgetCpu,frameBudget,failed,scope:cpuBudget?'Awaited cooperative frame wall time; budgetCpu is accumulated synchronous invocation wall time in the delivered presentation epoch. Program/driver readiness waits are excluded.':'Awaited cooperative frame wall time; budgetElapsed is elapsed wall time since last reset, not accumulated synchronous CPU.'});}catch{}}}
  begin=now();spent=0;frame=getFrame();
 };
 yieldWork.recordWork=duration=>{delivered();if(cpuBudget&&Number.isFinite(duration)&&duration>=0)spent+=duration;lane?.recordWork(duration);};
 return yieldWork;
}
