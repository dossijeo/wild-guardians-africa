// Explicit QA candidate: preserve the v2 diagnostic and historical experiments.
import {nativeWorkerServiceProofV2} from './native-worker-service-proof-v2.mjs';
import {workerWallOverlapRecoveryPath} from '../src/world/worker-wall-overlap-recovery.js';
import {workerSlopeRecoveryPath} from '../src/world/worker-slope-recovery.js';
export function nativeWorkerServiceProofV3(state,view){
 const returning=state.workers.filter(w=>w.status!=='home'&&(w.incapacitated||['fleeing','returning'].includes(w.status)));
 const checks=[];
 for(const worker of returning){
  const village=state.villages.find(v=>v.id===worker.villageId);
  if(!village)return {valid:false,reason:'native-worker-home-missing',workerId:worker.id,returnChecks:checks};
  const destination=village.entry??village,radius=worker.radius??.28;
  let route=view.workerPath?.(worker,destination,radius,null)??null,via='native-home';
  if(!route){route=workerWallOverlapRecoveryPath(view,worker,destination,radius);via='wall-overlap-home';}
  if(!route){route=workerSlopeRecoveryPath(view,worker,destination,radius);via='slope-recovery-home';}
  if(!route)return {valid:false,reason:'native-worker-home-route-unproven',workerId:worker.id,returnChecks:checks};
  checks.push({workerId:worker.id,villageId:village.id,via,destination:{x:destination.x,z:destination.z},routePoints:route.length});
 }
 const excluded=new Set(returning);
 const service=nativeWorkerServiceProofV2({...state,workers:state.workers.filter(w=>!excluded.has(w))},view);
 return {...service,returnChecks:checks,workerProofVersion:'service-and-home-v3',scope:'Predictive static access: active workers and all living crops retain v2 service checks; returning workers require native home routes. No motion, animated gates, paid defense or economic acceptance.'};
}
