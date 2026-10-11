// QA-only conservative rejection before the unchanged native wall sweep.
// The expanded envelope includes every query radius up to the supplied bound;
// larger queries fall back to the original broadphase without approximation.
import {wallCollisionBounds} from '../src/world/wall-collision-frame.js';
export function installProofWallBroadphase(view,maxRadius){
 if(!Number.isFinite(maxRadius)||maxRadius<=0)throw Error('Invalid proof radius bound');
 const originalBounds=view.obstacleBounds,records=new WeakMap();
 const bounds={get(obstacle){
  if(obstacle.kind!=='wall'||obstacle.gate)return originalBounds?.get(obstacle);
  let row=records.get(obstacle);
  const yaw=obstacle.yaw??0,base=obstacle.baseScaleX??1;
  if(!row||row.x!==obstacle.x||row.z!==obstacle.z||row.yaw!==yaw||row.base!==base||row.material!==obstacle.material){
   row={x:obstacle.x,z:obstacle.z,yaw,base,material:obstacle.material,bounds:wallCollisionBounds(obstacle,maxRadius)};records.set(obstacle,row);
  }
  return row.bounds;
 }};
 const coarse=view.coarseSegmentClear,walkable=view.testWalkable;
 // Navigation also adds the actual query radius: this deliberately overbounds
 // solid walls. Gates retain all native frame/moving-leaf checks unchanged.
 view.obstacleBounds=bounds;
 view.coarseSegmentClear=function(start,end,radius,...rest){
  if(radius<=maxRadius)return coarse.call(this,start,end,radius,...rest);
  const current=this.obstacleBounds;this.obstacleBounds=originalBounds;
  try{return coarse.call(this,start,end,radius,...rest);}finally{this.obstacleBounds=current;}
 };
 view.testWalkable=function(x,z,radius,...rest){
  if(radius<=maxRadius)return walkable.call(this,x,z,radius,...rest);
  const current=this.obstacleBounds;this.obstacleBounds=originalBounds;
  try{return walkable.call(this,x,z,radius,...rest);}finally{this.obstacleBounds=current;}
 };
}
