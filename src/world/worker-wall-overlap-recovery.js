import {containsPoint} from './footprints.js';
import {wallCollisionFrame,wallCollisionPolygon} from './wall-collision-frame.js';
// A newly built wall can overlap a returning person's existing body. Only
// leave through its nearest face, continuously outward; never plan a shortcut
// through a wall from a valid origin or relocate the worker instantaneously.
export function workerWallOverlapRecoveryPath(nav,actor,end,radius=.28){
 if(!['fleeing','returning','incapacitated'].includes(actor.status)||!nav.workerMotionClear||!nav.workerPath)return null;
 if(![actor.x,actor.z,radius,end.x,end.z].every(Number.isFinite)||radius<=0)return null;
 const overlapping=(nav.obstacles??[]).filter(o=>o.kind==='wall'&&!o.gate&&containsPoint(wallCollisionPolygon(o,radius),actor.x,actor.z));
 if(overlapping.length!==1)return null;
 const wall=overlapping[0],{c,s,width,depth}=wallCollisionFrame(wall),dx=actor.x-wall.x,dz=actor.z-wall.z;
 const x=dx*c-dz*s,z=dx*s+dz*c,w=width+radius,d=depth+radius,epsilon=1e-5;
 const faces=[{x:w+epsilon,z,length:w-x},{x:-w-epsilon,z,length:w+x},{x,z:d+epsilon,length:d-z},{x,z:-d-epsilon,length:d+z}];
 const nearest=Math.min(...faces.map(face=>face.length));
 if(nearest<0||nearest>.75)return null;
 // Ignore exactly the initially overlapping wall for this short outward
 // prefix. All other solids, props, terrain, fluids and moving gate leaves
 // retain the native swept-body checks. The tail uses ordinary navigation.
 const collision=Object.assign(Object.create(nav),{obstacles:nav.obstacles.filter(o=>o!==wall),walkCache:new Map(),segmentCache:new Map(),workerRouteCache:new Map()});
 for(const face of faces.filter(face=>face.length<=nearest+1e-9)){
  const exit={x:wall.x+face.x*c+face.z*s,z:wall.z-face.x*s+face.z*c};
  if(!nav.walkable(exit.x,exit.z,radius,null,true)||!collision.workerMotionClear(actor,exit,radius))continue;
  const tail=nav.workerPath({...actor,...exit},end,radius,null);
  if(tail)return [exit,...tail];
 }
 return null;
}
