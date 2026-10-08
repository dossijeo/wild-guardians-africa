import {fluidAt} from '../world/fluid-placement.js';
import {actorFluidClear} from './actor-fluid-clearance.js';
const verified=new WeakMap();
const peak=(nav,p,r)=>Math.max(...[[0,0],[r,0],[-r,0],[0,r],[0,-r]].map(([dx,dz])=>nav.field.canyon?Math.hypot(nav.workerSurface(p.x+dx+.8,p.z+dz)-nav.workerSurface(p.x+dx-.8,p.z+dz),nav.workerSurface(p.x+dx,p.z+dz+.8)-nav.workerSurface(p.x+dx,p.z+dz-.8))/1.6:nav.field.slope(p.x+dx,p.z+dz)));
export function workerRiskClearance(actor,nav,{radius,ignore},dynamicClear){
 // Minimal navigation adapters preserve their existing dynamic-motion contract.
 // Native Navigation always provides the terrain-risk metadata methods.
 if(typeof nav.knownWorkerSegmentRisk!=='function'||typeof nav.workerSegmentRisk!=='function')return null;
 let blocked=false;
 const clear=(start,end)=>{
  if(dynamicClear&&!dynamicClear(start,end))return false;
  const point=actor.path[0];if(!point)return true;
  nav.workerMotionStats??={classified:0,guarded:0,rejected:0,reused:0,fallback:0};
  let record=verified.get(actor);
  if(!(record&&record.nav===nav&&record.version===nav.version&&record.radius===radius&&record.ignore===ignore&&record.path===actor.path&&record.point===point&&record.px===point.x&&record.pz===point.z&&record.x===start.x&&record.z===start.z&&Math.hypot(end.x-start.x,end.z-start.z)<=Math.hypot(record.boundary.x-start.x,record.boundary.z-start.z)+1e-9)){
   const known=nav.knownWorkerSegmentRisk(start,point,radius,ignore);
   const length=Math.hypot(point.x-start.x,point.z-start.z),look=Math.max(4,Math.hypot(end.x-start.x,end.z-start.z));
   const boundary=known?point:length>look?{x:start.x+(point.x-start.x)*look/length,z:start.z+(point.z-start.z)*look/length}:point;
   const risk=known??nav.workerSegmentRisk(start,boundary,radius,ignore);nav.workerMotionStats.classified++;
   if(known)nav.workerMotionStats.reused++;else nav.workerMotionStats.fallback++;
   record={nav,version:nav.version,radius,ignore,path:actor.path,point,px:point.x,pz:point.z,boundary,risky:!risk.valid||risk.peak>=.46};
  }
  if(record.risky)nav.workerMotionStats.guarded++;
  if(record.risky?!nav.terrainValid(end.x,end.z,radius,true):!actorFluidClear(nav,end,radius)){
    // Retain the existing marginal, improving recovery, never a new task exception.
    const recovering=['fleeing','returning','incapacitated'].includes(actor.status)&&!nav.terrainValid(start.x,start.z,radius,true);
    const before=recovering?peak(nav,start,radius):Infinity,after=recovering?peak(nav,end,radius):Infinity;
    const collision=Object.assign(Object.create(nav),{terrainValid:(x,z,r)=>nav.field.canyon||[[0,0],[r,0],[-r,0],[0,r],[0,-r]].every(([dx,dz])=>!fluidAt(nav.field,x+dx,z+dz)),segmentCache:new Map(),workerRouteCache:new Map()});
    if(!(recovering&&before<=.51&&after<=before+1e-10&&collision.workerMotionClear(start,end,radius))){
     actor.terrainAvoidance??=[];actor.terrainAvoidance.push({x:end.x,z:end.z});if(actor.terrainAvoidance.length>8)actor.terrainAvoidance.shift();
     blocked=true;nav.workerMotionStats.rejected++;verified.delete(actor);return false;
    }
  }
  record.x=end.x;record.z=end.z;verified.set(actor,record);return true;
 };
 return {clear,blocked:()=>blocked};
}
