// Predictive native geometry check. Proposed pieces exist only in this view;
// it never modifies live state or certifies unpaid walls as actual protection.
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
export function nativePerimeterProof(s,nav,plan,bounds){
 const updates=new Map(plan.updates.map(q=>[q.id,q]));
 const view=nav.forBuildingPlacement({id:'qa-empty-proposal',x:1e12,z:1e12,radius:0,kind:'house'});
 view.obstacles=[...nav.obstacles.map(w=>updates.has(w.id)?{...w,...updates.get(w.id)}:w),...plan.pieces];
 const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)],radii=[...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))];
 const checks=[];
 for(const radius of radii){
  const inside=s.plants.find(p=>p.alive&&view.walkable(p.x,p.z,radius,null,false));
  if(!inside)return {valid:false,reason:'no-clear-interior-crop',checks};
  const candidates=[{x:bounds[2]+6,z:inside.z},{x:bounds[0]-6,z:inside.z},{x:inside.x,z:bounds[1]-6},{x:inside.x,z:bounds[3]+6}];
  const outside=candidates.find(p=>view.walkable(p.x,p.z,radius,null,false));
  if(!outside)return {valid:false,reason:'no-clear-exterior-probe',checks};
  if(view.approachPath(outside,inside,radius,32))return {valid:false,reason:'native-animal-route-through-perimeter',radius,checks};
  const complete=view.approachGroupBlocked(outside,land,radius,.6+radius);checks.push({radius,inside:{x:inside.x,z:inside.z},outside,completeClosedComponent:complete});
  if(!complete)return {valid:false,reason:'no-complete-native-component-certificate',checks};
 }
 const worker=s.workers.find(w=>!w.incapacitated&&w.status!=='home'),destination=s.plants.find(p=>p.alive&&view.walkable(p.x,p.z,.28,null,true));
 if(!worker||!destination)return {valid:false,reason:'worker-passage-not-observable',checks};
 if(!view.path(worker,destination,.28,null,true,32))return {valid:false,reason:'native-worker-route-blocked',checks};
 return {valid:true,reason:'native-complete-components-and-worker-route',checks,scope:'Predictive native geometry, not paid campaign interception.'};
}
