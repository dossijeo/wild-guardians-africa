// Experimental QA proof; not wired into live campaign policy yet.
import {centerServicePoint,centerDeliveryPoint} from '../src/world/centers.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import {operational} from '../src/simulation/rules.js';
export function nativeWorkerServiceProof(state,view){
 const crops=state.plants.filter(p=>p.alive),workers=state.workers.filter(w=>!w.incapacitated&&w.status!=='home');
 const checks={workers:[],crops:[]},reject=(reason,details={})=>({valid:false,reason,...details,checks});
 if(!crops.length||!workers.length)return reject('worker-passage-not-observable');
 // Keep all existing live actors observable; do not silently choose a more
 // convenient worker when one fails. Test native service poses, not crop pivots.
 const target=crops.find(p=>view.walkable(p.x,p.z,.28,null,true));
 if(!target)return reject('no-clear-worker-service-crop');
 for(const worker of workers){
  const route=wateringRoute(worker,target,view);
  if(!route||!canWaterFrom({...route.destination,radius:worker.radius??.28},target,view))return reject('native-worker-service-route-unproven',{workerId:worker.id,targetId:target.id});
  checks.workers.push({workerId:worker.id,targetId:target.id,destination:route.destination});
 }
 // Prove the complete living planting remains serviceable from its associated
 // centre and that a real route returns to the nearest authored delivery edge.
 // No bounded failure is interpreted as a geometric enclosure certificate.
 for(const plant of crops){
  const center=state.structures.find(c=>c.id===plant.centerId&&c.kind==='center'&&operational(c));
  if(!center)return reject('native-crop-centre-not-operational',{targetId:plant.id});
  const start=centerServicePoint(center,state,.8),route=wateringRoute({...start,radius:.28},plant,view);
  if(!route||!canWaterFrom({...route.destination,radius:.28},plant,view))return reject('native-centre-crop-service-unproven',{targetId:plant.id,centerId:center.id});
  const delivery=centerDeliveryPoint(center,plant,state,.8),back=view.path(route.destination,delivery,.28,null,true,32);
  if(!back)return reject('native-crop-delivery-route-unproven',{targetId:plant.id,centerId:center.id});
  checks.crops.push({targetId:plant.id,centerId:center.id,wateringDestination:route.destination,deliveryDestination:delivery});
 }
 return {valid:true,reason:'native-worker-and-all-crop-service-routes',checks,
  scope:'Predictive static service access only. No paid construction, actual worker movement, task completion, gate animation, attack interception or economic approval.'};
}
