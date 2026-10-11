import {nativeInteriorAttackAnchor} from './native-interior-attack-anchor.mjs';
// Isolated experiment; the active campaign still imports the original proof.
import {nativeWorkerServiceProofV2} from './native-worker-service-proof-v2.mjs';
// Predictive native geometry check. Proposed pieces exist only in this view;
// it never modifies live state or certifies unpaid walls as actual protection.
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
import {nativeReusedServiceComponentProofV2} from './native-reused-service-component-proof-v2.mjs';
const proofViews=new WeakMap();
export function nativePerimeterReusedCandidateV2(s,nav,plan,bounds,{cache=true,outline=null}={}){
 // Native epochs invalidate obstacle/terrain/suppression changes. Bounds and
 // living crops are rechecked below on every call; they do not alter graph
 // geometry. Retain only one bounded native-query view per navigator.
 const key=JSON.stringify([nav.version,plan.pieces,plan.updates,plan.suppressed??[]]),old=cache?proofViews.get(nav):null;
 let view=old?.key===key&&old.state===s?old.view:null;
 if(!view){
  const updates=new Map(plan.updates.map(q=>[q.id,q]));
  view=nav.forBuildingPlacement({id:'qa-empty-proposal',x:1e12,z:1e12,radius:0,kind:'house'});
  view.obstacles=[...nav.obstacles.map(w=>updates.has(w.id)?{...w,...updates.get(w.id)}:w),...plan.pieces];
  if(cache)proofViews.set(nav,{key,state:s,view});
 }
 const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)],radii=[...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))];
 const checks=[];
 for(const radius of radii){
  const inside=nativeInteriorAttackAnchor(s,view,radius,outline);
  if(!inside)return {valid:false,reason:'no-clear-interior-crop',checks};
  const candidates=[{x:bounds[2]+6,z:inside.z},{x:bounds[0]-6,z:inside.z},{x:inside.x,z:bounds[1]-6},{x:inside.x,z:bounds[3]+6}];
  const outside=candidates.find(p=>view.walkable(p.x,p.z,radius,null,false));
  if(!outside)return {valid:false,reason:'no-clear-exterior-probe',checks};
  if(view.approachPath(outside,inside,radius,32))return {valid:false,reason:'native-animal-route-through-perimeter',radius,checks};
  const complete=view.approachGroupBlocked(outside,land,radius,.6+radius);checks.push({radius,inside:{x:inside.x,z:inside.z},anchorKind:inside.kind,anchorTargetId:inside.targetId,outside,completeClosedComponent:complete});
  if(!complete){
   if(!outline)return {valid:false,reason:'no-complete-native-component-certificate',checks};
   const targets=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)];
   const services=nativeReusedServiceComponentProofV2(s,view,targets,radius,outside,outline);checks.at(-1).services=services;
   if(!services.valid)return {valid:false,reason:services.reason,checks};
  }
 }
 const workerService=nativeWorkerServiceProofV2(s,view);
 if(!workerService.valid)return {...workerService,animalChecks:checks};
 return {valid:true,reason:'native-complete-components-and-worker-service-routes',checks,workerService,scope:'Predictive native geometry only; no paid protection or campaign outcome.'};
}
