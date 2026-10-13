import {wallCollisionFrame} from '../world/wall-collision-frame.js';
import {segmentNavigationObstacles} from '../world/navigation-obstacle-index.js';

// A wall may finish while a worker is brushing its edge. Native path search
// cannot start from inside the actor-expanded collision rectangle. Move only
// the small penetration distance to a reachable side, then route normally.
export function recoverWorkerWallOverlap(nav,worker,destination,radius=.28){
 if(nav.walkable(worker.x,worker.z,radius,null,true))return false;
 const candidates=[];
 for(const wall of segmentNavigationObstacles(nav,worker,worker,radius)){
  if(wall.kind!=='wall'||wall.gate||wall.status==='ruined')continue;
  const frame=wallCollisionFrame(wall),dx=worker.x-wall.x,dz=worker.z-wall.z;
  const lx=dx*frame.c-dz*frame.s,lz=dx*frame.s+dz*frame.c;
  if(Math.abs(lx)>=frame.width+radius||Math.abs(lz)>=frame.depth+radius)continue;
  const edges=[
   {x:Math.sign(lx||1)*(frame.width+radius+.06),z:lz},
   {x:lx,z:Math.sign(lz||1)*(frame.depth+radius+.06)},
   {x:lx,z:-Math.sign(lz||1)*(frame.depth+radius+.06)},
  ];
  for(const p of edges){
   const x=wall.x+p.x*frame.c+p.z*frame.s,z=wall.z-p.x*frame.s+p.z*frame.c;
   const moved=Math.hypot(x-worker.x,z-worker.z);
   if(moved<=1.1&&nav.walkable(x,z,radius,null,true))candidates.push({x,z,moved});
  }
 }
 candidates.sort((a,b)=>a.moved-b.moved||a.x-b.x||a.z-b.z);
 for(const p of candidates){
  const path=nav.path(p,destination,radius,null,true);
  if(!path)continue;
  worker.x=p.x;worker.z=p.z;worker.path=path;worker.pathVersion=nav.version;
  return true;
 }
 return false;
}
