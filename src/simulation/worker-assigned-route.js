import {shortenBuildingRoute} from '../world/building-route-shortcut.js';

const searches=new WeakMap();
const TOTAL_SLICES_PER_STEP=40,MAX_SLICES_PER_WORKER=4;
function memoFor(nav){
 let memo=searches.get(nav);
 if(!memo||memo.version!==nav.version){memo={version:nav.version,remaining:TOTAL_SLICES_PER_STEP,active:new Map()};searches.set(nav,memo);}
 return memo;
}

// The native grid iterator yields every eight explored nodes. Keeping this
// transient search outside the save avoids persisting a large A* frontier;
// a reload safely restarts the same route against the restored geometry.
export function beginAssignedWorkerRouteStep(nav){memoFor(nav).remaining=TOTAL_SLICES_PER_STEP;}
export function assignedWorkerRouteStep(nav,worker,end,radius,ignore=null){
 if(!nav.findPathSteps)return {pending:false,path:nav.workerPath?nav.workerPath(worker,end,radius,ignore):nav.path(worker,end,radius,ignore,true)};
 const memo=memoFor(nav),signature=JSON.stringify(worker.terrainAvoidance??[]);
 const key=JSON.stringify([nav.version,worker.taskId,worker.x,worker.z,end.id,end.x,end.z,radius,ignore,signature]);
 let attempt=memo.active.get(worker);
 if(attempt?.key!==key){
  const view=nav.workerNavigationView?.(worker,radius,ignore)??nav;
  attempt={key,view,iterator:view.findPathSteps({x:worker.x,z:worker.z},{x:end.x,z:end.z},radius,ignore,true,16)};
  memo.active.set(worker,attempt);
 }
 for(let i=0;i<MAX_SLICES_PER_WORKER&&memo.remaining>0;i++){
  memo.remaining--;
  const step=attempt.iterator.next();
  if(!step.done)continue;
  memo.active.delete(worker);
  if(!step.value)return {pending:false,path:null};
  const smoothed=attempt.view.smoothPath(worker,step.value,radius,ignore,true);
  return {pending:false,path:shortenBuildingRoute(attempt.view,worker,end,smoothed,radius,ignore)};
 }
 return {pending:true,path:null};
}
