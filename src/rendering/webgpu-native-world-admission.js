import {copyNativeWorldBoundary} from '../world/native-world-boundary.js';
import {waitGpuPreparation} from './wait-gpu-preparation.js';

// One structural admission while a native boundary is being recovered. It
// neither advances time nor repeatedly checks navigation during locomotion.
export async function prepareNativeWorldFrameBoundary({worldBoundary,scene,admission,isReady,assertCurrent,signal,
 now=()=>performance.now(),timeoutMs=30000,nextTask=()=>new Promise(resolve=>setTimeout(resolve,16))}={}){
 const boundary=copyNativeWorldBoundary(worldBoundary);
 if(!boundary||!scene?.isScene||typeof admission?.prepareTicket!=='function'||typeof isReady!=='function'||typeof assertCurrent!=='function'||
    typeof now!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0||typeof nextTask!=='function')throw TypeError('Invalid native world frame admission');
 const deadline=now()+timeoutMs;
 function current(){
  if(signal?.aborted)throw new DOMException('Native world admission cancelled','AbortError');
  assertCurrent();
 }
 function check(){current();if(now()>=deadline)throw Error('Native world presentation dependencies did not become ready');}
 for(;;){
  check();let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve;});
  if(isReady())resolveReady();
  await waitGpuPreparation(ready,{signal,nextFrame:nextTask,check(){check();if(isReady())resolveReady();}});
  let ticket;await waitGpuPreparation(Promise.resolve().then(()=>admission.prepareTicket(scene,{signal,requireShadowTarget:true})).then(value=>{ticket=value;}),{signal,check,nextFrame:nextTask});
  check();if(typeof ticket?.valid!=='function')throw TypeError('Native world admission lacks a resource ticket');
  if(ticket.valid()&&isReady())return Object.freeze({worldBoundary:boundary,valid(){try{current();return ticket.valid()&&isReady();}catch{return false;}}});
  // Let material/resource publication finish before another structural attempt.
  await nextTask();
 }
}
