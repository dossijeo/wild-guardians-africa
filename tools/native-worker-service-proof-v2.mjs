// Isolated second QA candidate; preserve v1 while its benchmark is running.
import {centerServicePoint,centerDeliveryPoint} from '../src/world/centers.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import {operational} from '../src/simulation/rules.js';
export function nativeWorkerServiceProofV2(state,view){
 const crops=state.plants.filter(p=>p.alive),workers=state.workers.filter(w=>!w.incapacitated&&w.status!=='home');
 const centers=new Map(state.structures.filter(c=>c.kind==='center'&&operational(c)).map(c=>[c.id,c])),byCenter=new Map();
 const checks={workers:[],crops:[]},reject=(reason,details={})=>({valid:false,reason,...details,checks});
 if(!crops.length||!workers.length)return reject('worker-passage-not-observable');
 for(const crop of crops){if(!byCenter.has(crop.centerId))byCenter.set(crop.centerId,[]);byCenter.get(crop.centerId).push(crop);}
 for(const worker of workers){
  const center=centers.get(worker.centerId);if(!center)return reject('native-worker-centre-not-operational',{workerId:worker.id});
  const start=centerServicePoint(center,state,.8);
  // First prove access to the worker's own operational service entrance,
  // rather than forcing every worker across the map to the first crop.
  const direct=view.path(worker,start,.28,null,true,32);
  if(direct){checks.workers.push({workerId:worker.id,centerId:center.id,via:'centre-service',destination:start});continue;}
  const local=[...(byCenter.get(center.id)??[])].sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z)||(String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0));
  let connected=null;
  // Bounded alternatives are a proof-search limit, never a gameplay crop cap.
  for(const crop of local.slice(0,8)){
   const route=wateringRoute(worker,crop,view);if(!route||!canWaterFrom({...route.destination,radius:worker.radius??.28},crop,view))continue;
   const delivery=centerDeliveryPoint(center,crop,state,.8),back=view.path(route.destination,delivery,.28,null,true,32);
   if(back){connected={workerId:worker.id,centerId:center.id,targetId:crop.id,via:'crop-service-and-return',destination:route.destination,deliveryDestination:delivery};break;}
  }
  if(!connected)return reject('native-worker-centre-service-unproven',{workerId:worker.id});
  checks.workers.push(connected);
 }
 for(const crop of crops){
  const center=centers.get(crop.centerId);if(!center)return reject('native-crop-centre-not-operational',{targetId:crop.id});
  const start=centerServicePoint(center,state,.8),route=wateringRoute({...start,radius:.28},crop,view);
  if(!route||!canWaterFrom({...route.destination,radius:.28},crop,view))return reject('native-centre-crop-service-unproven',{targetId:crop.id,centerId:center.id});
  const delivery=centerDeliveryPoint(center,crop,state,.8),back=view.path(route.destination,delivery,.28,null,true,32);
  if(!back)return reject('native-crop-delivery-route-unproven',{targetId:crop.id,centerId:center.id});
  checks.crops.push({targetId:crop.id,centerId:center.id,wateringDestination:route.destination,deliveryDestination:delivery});
 }
 return {valid:true,reason:'native-associated-centre-and-all-crop-service-routes',checks,
  scope:'Predictive static access only. All workers linked to their operational centre, all living crops serviced and returned. No paid construction, motion, animated gates, animal interception or economic approval.'};
}
