import {containsPoint} from './footprints.js';
import {wallCollisionFrame,wallCollisionPolygon} from './wall-collision-frame.js';
// A newly built wall can overlap a returning person's existing body. Only
// leave through its nearest face, continuously outward; never plan a shortcut
// through a wall from a valid origin or relocate the worker instantaneously.
export function workerWallOverlapRecoveryPath(nav,actor,end,radius=.28){
 if(!['fleeing','returning','incapacitated'].includes(actor.status)||!nav.workerMotionClear||!nav.workerPath)return null;
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
 const collision=Object.assign(Object.create(nav),{obstacles:nav.obstacles.filter(o=>!overlapping.includes(o)),walkCache:new Map(),segmentCache:new Map(),workerRouteCache:new Map()});
 for(const face of faces.filter(face=>face.length<=nearest+1e-9)){
  const exit={x:wall.x+face.x*c+face.z*s,z:wall.z-face.x*s+face.z*c};
  if(!nav.walkable(exit.x,exit.z,radius,null,true)||!collision.workerMotionClear(actor,exit,radius))continue;
  const tail=nav.workerPath({...actor,...exit},end,radius,null);
  if(tail)return [exit,...tail];
 }
 return null;
}
