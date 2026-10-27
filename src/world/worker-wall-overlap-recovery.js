import {containsPoint} from './footprints.js';
import {wallCollisionFrame,wallCollisionPolygon} from './wall-collision-frame.js';
// A newly built wall can overlap a returning person's existing body. Only
// leave through its nearest face, continuously outward; never plan a shortcut
// through a wall from a valid origin or relocate the worker instantaneously.
function wallOverlapRecovery(nav,actor,end,radius,worker){
 if(worker&&!['fleeing','returning','incapacitated'].includes(actor.status))return null;
 if(!worker&&actor.status!=='retreating')return null;
 if(worker?(!nav.workerMotionClear||!nav.workerPath):
   (!nav.wallOverlapMotionClear||!nav.path))return null;
 if(![actor.x,actor.z,radius,end.x,end.z].every(Number.isFinite)||radius<=0)return null;
 const overlapping=(nav.obstacles??[]).filter(o=>o.kind==='wall'&&!o.gate&&containsPoint(wallCollisionPolygon(o,radius),actor.x,actor.z));
 // Adjacent modules can both overlap the same body at their shared seam.
 // Recover their collinear union, without treating an intersecting corner as
 // one wall or ignoring any solid that did not initially overlap the worker.
 if(!overlapping.length||overlapping.length>4)return null;
 const first=wallCollisionFrame(overlapping[0]);
 if(overlapping.some(o=>{const frame=wallCollisionFrame(o);return Math.abs(first.c*frame.s-first.s*frame.c)>1e-8||Math.abs((o.x-overlapping[0].x)*first.s+(o.z-overlapping[0].z)*first.c)>1e-8;}))return null;
 const wall=overlapping[0],{c,s}=wallCollisionFrame(wall),dx=actor.x-wall.x,dz=actor.z-wall.z;
 const x=dx*c-dz*s,z=dx*s+dz*c,epsilon=1e-5;
 const bounds=overlapping.map(o=>{const frame=wallCollisionFrame(o),dx=o.x-wall.x,dz=o.z-wall.z,cx=dx*c-dz*s,cz=dx*s+dz*c;return [cx-frame.width-radius,cx+frame.width+radius,cz-frame.depth-radius,cz+frame.depth+radius];});
 const minX=Math.min(...bounds.map(b=>b[0])),maxX=Math.max(...bounds.map(b=>b[1])),minZ=Math.min(...bounds.map(b=>b[2])),maxZ=Math.max(...bounds.map(b=>b[3]));
 const faces=[{x:maxX+epsilon,z,length:maxX-x},{x:minX-epsilon,z,length:x-minX},{x,z:maxZ+epsilon,length:maxZ-z},{x,z:minZ-epsilon,length:z-minZ}];
 const nearest=Math.min(...faces.map(face=>face.length));
 if(nearest<0||nearest>.75)return null;
 // Ignore exactly the initially overlapping wall for this short outward
 // prefix. All other solids, props, terrain, fluids and moving gate leaves
 // retain the native swept-body checks. The tail uses ordinary navigation.
 const collision=nav.wallOverlapMotionClear?null:Object.assign(Object.create(nav),{
   obstacles:nav.obstacles.filter(o=>!overlapping.includes(o)),
   walkCache:new Map(),segmentCache:new Map(),workerRouteCache:new Map()});
 for(const face of faces.filter(face=>face.length<=nearest+1e-9)){
  const exit={x:wall.x+face.x*c+face.z*s,z:wall.z-face.x*s+face.z*c};
  const wallIds=overlapping.map(o=>o.id);
  const clear=nav.wallOverlapMotionClear?
    nav.wallOverlapMotionClear(actor,exit,radius,wallIds,worker):
    collision.workerMotionClear(actor,exit,radius);
  if(!nav.walkable(exit.x,exit.z,radius,null,worker)||!clear)continue;
  const tail=worker?nav.workerPath({...actor,...exit},end,radius,null):
    nav.path({...actor,...exit},end,radius,null,false,64);
  if(tail)return {path:[exit,...tail],exit,wallIds};
 }
 return null;
}
export function workerWallOverlapRecoveryPath(nav,actor,end,radius=.28){
 return wallOverlapRecovery(nav,actor,end,radius,true)?.path??null;
}
export function animalWallOverlapRecovery(nav,actor,end,radius){
 return wallOverlapRecovery(nav,actor,end,radius,false);
}
