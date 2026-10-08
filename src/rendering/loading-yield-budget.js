import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
// Bound cooperative CPU work. Borrowed renderer state must already be restored.
// Cancellation/deadline remain observable while a native RAF is suspended.
export function loadingYieldBudget({frameBudget=0,now=()=>performance.now(),nextFrame,signal,cancelled=()=>false,timeout=30000,pollIntervalMs=100}={}){
 if(!Number.isFinite(frameBudget)||frameBudget<0)throw Error('Invalid loading frame budget');
 let begin=now();
 const owner=()=>{if(signal?.aborted||cancelled())throw Error('Loading frame cancelled');};
 return async()=>{
  owner();if(frameBudget&&now()-begin<frameBudget)return;
  const waiting=now(),check=()=>{owner();if(now()-waiting>timeout)throw Error('Loading frame timed out');};
  await waitGpuFrame({check,nextFrame,signal,pollIntervalMs});begin=now();
 };
}
