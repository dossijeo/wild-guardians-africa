// Predictive native geometry check. Proposed pieces exist only in this view;
// it never modifies live state or certifies unpaid walls as actual protection.
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
import {nativeServiceComponentProof} from './native-service-component-proof.mjs';
import {withNativeProofLatticeCache} from './native-proof-lattice-cache.mjs';
const proofViews=new WeakMap();
let latticeMode='off',latticeTotals={proofs:0,surfaceCalls:0,latticeCalls:0,nativeLatticeCalls:0,hits:0,capacityBypasses:0,coordinateBypasses:0,coarseCollisionCalls:0,epochInvalidations:0,maxEntries:0};
export function setNativePerimeterLatticeMode(mode){if(!['off','diagnose','cache','flat'].includes(mode))throw Error('Invalid QA lattice mode');latticeMode=mode;latticeTotals={proofs:0,surfaceCalls:0,latticeCalls:0,nativeLatticeCalls:0,hits:0,capacityBypasses:0,coordinateBypasses:0,coarseCollisionCalls:0,epochInvalidations:0,maxEntries:0};}
export function nativePerimeterLatticeDiagnostics(){return {...latticeTotals,mode:latticeMode};}
let serviceCertificateEnabled=false,certificateTotals={proofs:0,queries:0,certificates:0};
export function setNativePerimeterServiceCertificate(enabled){if(typeof enabled!=='boolean')throw Error('Expected explicit QA certificate flag');serviceCertificateEnabled=enabled;certificateTotals={proofs:0,queries:0,certificates:0};}
export function nativePerimeterServiceCertificateDiagnostics(){return {...certificateTotals};}
export function nativePerimeterProof(s,nav,plan,bounds,{cache=true,outline=null,sharedCertificate=serviceCertificateEnabled}={}){
 certificateTotals.proofs++;
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
 return withNativeProofLatticeCache(view,privateView=>evaluatePerimeter(s,privateView,bounds,outline,sharedCertificate),{mode:latticeMode==='flat'?'cache':latticeMode,storage:latticeMode==='flat'?'flat':'nested',onDiagnostics:r=>{latticeTotals.proofs++;for(const k of ['surfaceCalls','latticeCalls','nativeLatticeCalls','hits','capacityBypasses','coordinateBypasses','coarseCollisionCalls','epochInvalidations'])latticeTotals[k]+=r[k];latticeTotals.maxEntries=Math.max(latticeTotals.maxEntries,r.entries);}});
}
function evaluatePerimeter(s,view,bounds,outline,sharedCertificate){
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
  if(!complete){
   if(!outline)return {valid:false,reason:'no-complete-native-component-certificate',checks};
   const targets=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)];
   const services=nativeServiceComponentProof(s,view,targets,radius,outside,outline,{sharedCertificate,onCertificate:r=>{certificateTotals.queries++;certificateTotals.certificates+=Number(r.certificate);}});checks.at(-1).services=services;
   if(!services.valid)return {valid:false,reason:services.reason,checks};
  }
 }
 const worker=s.workers.find(w=>!w.incapacitated&&w.status!=='home'),destination=s.plants.find(p=>p.alive&&view.walkable(p.x,p.z,.28,null,true));
 if(!worker||!destination)return {valid:false,reason:'worker-passage-not-observable',checks};
 if(!view.path(worker,destination,.28,null,true,32))return {valid:false,reason:'native-worker-route-blocked',checks};
 return {valid:true,reason:'native-complete-components-and-worker-route',checks,scope:'Predictive native geometry, not paid campaign interception.'};
}
