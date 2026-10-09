import {actorFluidClear} from './actor-fluid-clearance.js';
import {animalSlopeRecoveryClear} from './animal-slope-recovery.js';
const verified=new WeakMap();

// A native route can be restored or have its connectors replaced by a local
// body detour. Validate bounded prefixes and reuse them, rather than repeating
// terrain/prop sampling on every tiny movement step or scanning remote bends.
export function animalRouteClearance(actor,nav,{radius,ignore,escapeProps=false},dynamicClear){
 let blocked=false;
 const clear=(start,end)=>{
  if(dynamicClear&&!dynamicClear(start,end))return false;
  if(!actorFluidClear(nav,end,radius)){blocked=true;verified.delete(actor);return false;}
  if(escapeProps&&animalSlopeRecoveryClear(actor,nav,start,end,radius))return true;
  // A sampled prefix does not prove that the actual footprint landing is on
  // a legal slope. Keep the native limit even when reusing that prefix.
  if(nav.terrainValid&&!nav.terrainValid(end.x,end.z,radius,false)){blocked=true;verified.delete(actor);return false;}
  const point=actor.path[0];if(!point)return true;
  const cached=verified.get(actor);
  let boundary=point;
  if(!(cached&&cached.nav===nav&&cached.version===nav.version&&cached.path===actor.path&&
    cached.radius===radius&&cached.ignore===ignore&&cached.escapeProps===escapeProps&&
    cached.point===point&&cached.px===point.x&&cached.pz===point.z&&cached.x===start.x&&cached.z===start.z&&
    Math.hypot(end.x-start.x,end.z-start.z)<=Math.hypot(cached.boundary.x-start.x,cached.boundary.z-start.z)+1e-9)){
   const safe=target=>(nav.segmentClear?.(start,target,radius,ignore,false)??true)||
    (escapeProps&&nav.testSegmentClear?.(start,target,radius,ignore,false,true));
   const length=Math.hypot(point.x-start.x,point.z-start.z),look=Math.max(4,Math.hypot(end.x-start.x,end.z-start.z));
   if(length>look)boundary={x:start.x+(point.x-start.x)*look/length,z:start.z+(point.z-start.z)*look/length};
   let valid=safe(boundary);
   // A future collision is not a reason to rebuild a route yet: the existing
   // local body detour may replace this connector before the actor reaches it.
   // Still verify the complete movement requested by this step before moving.
   if(!valid){boundary={x:end.x,z:end.z};valid=safe(boundary);}
   if(!valid){blocked=true;verified.delete(actor);return false;}
  }else boundary=cached.boundary;
  verified.set(actor,{nav,version:nav.version,path:actor.path,point,px:point.x,pz:point.z,x:end.x,z:end.z,radius,ignore,escapeProps,boundary});
  return true;
 };
 return {clear,blocked:()=>blocked};
}
