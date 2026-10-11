import {navigationPathKey} from './raid-navigation-warmth.js';
import {evictOldest} from './fifo-eviction.js';
const worlds=new WeakMap(),STEP=.25,LIMIT=12,MAX_ACTIVE=8;
const offsets=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
// A valid fractional position can have no swept connection to the metre grid.
// Search only a 3 m local patch, then rejoin ordinary worker navigation.
// Every edge retains native collision; this never escapes an invalid origin.
function* search(nav,actor,end,radius){
 const queue=[{x:actor.x,z:actor.z,ix:0,iz:0,parent:-1}],seen=new Set(['0,0']),tails=new Set();let attempts=0;
 for(let head=0;head<queue.length;head++){
  if(head&&head%8===0)yield;
  const point=queue[head],grid={x:Math.round(point.x),z:Math.round(point.z)},key=`${grid.x},${grid.z}`;
  if(!tails.has(key)&&nav.walkable(grid.x,grid.z,radius,null,true)&&nav.segmentClear(point,grid,radius,null,true)){
   tails.add(key);if(++attempts>8)return null;
   // Reuse the native resumable A*: do not synchronously drain a large
   // ordinary search merely to connect this short fractional prefix.
   const tail=yield*nav.findPathSteps(grid,end,radius,null,true,16,{yieldEvery:4});
   if(tail){const prefix=[];for(let node=head;node>0;node=queue[node].parent)prefix.push({x:queue[node].x,z:queue[node].z});prefix.reverse();return [...prefix,grid,...tail];}
  }
  for(const [dx,dz] of offsets){
   const ix=point.ix+dx,iz=point.iz+dz,id=`${ix},${iz}`;
   if(Math.abs(ix)>LIMIT||Math.abs(iz)>LIMIT||seen.has(id))continue;
   const next={x:actor.x+ix*STEP,z:actor.z+iz*STEP,ix,iz,parent:head};
   if(!nav.walkable(next.x,next.z,radius,null,true)){seen.add(id);continue;}
   // A blocked edge does not prove this point unreachable from another side.
   if(nav.segmentClear(point,next,radius,null,true)){seen.add(id);queue.push(next);}
  }
 }
 return null;
}
export function workerFractionalConnector(nav,actor,end,radius=.28){
 if(!['fleeing','returning','incapacitated'].includes(actor.status)||!nav.workerPath||!nav.findPathSteps||!nav.walkable||!nav.segmentClear)return null;
 if(![actor.x,actor.z,end.x,end.z,radius].every(Number.isFinite)||radius<=0)return null;
 let memo=worlds.get(nav);if(!memo||memo.version!==nav.version){memo={version:nav.version,active:new Map(),failed:new Map()};worlds.set(nav,memo);}
 const key=navigationPathKey(actor,end,radius,null,true,3)+JSON.stringify(actor.terrainAvoidance??[]);
 if(memo.failed.has(key))return null;
 let attempt=memo.active.get(actor);
 if(attempt?.key!==key){
  memo.active.delete(actor);
  attempt=null;
  for(const [body,row] of memo.active)if(body.path?.length||body.x!==row.x||body.z!==row.z||!['fleeing','returning','incapacitated'].includes(body.status)||Array.isArray(nav.state?.workers)&&!nav.state.workers.includes(body))memo.active.delete(body);
  if(memo.active.size>=MAX_ACTIVE)return null;
  const view=nav.workerNavigationView?.(actor,radius,null)??nav;
  let ordinary=false;
  if(view.walkable(actor.x,actor.z,radius,null,true)&&view.walkable(end.x,end.z,radius,null,true)){
   for(let dz=-1;dz<=1&&!ordinary;dz++)for(let dx=-1;dx<=1;dx++){
    const grid={x:Math.round(actor.x)+dx,z:Math.round(actor.z)+dz};
    if(view.walkable(grid.x,grid.z,radius,null,true)&&view.segmentClear(actor,grid,radius,null,true)){ordinary=true;break;}
   }
   if(!ordinary){attempt={key,x:actor.x,z:actor.z,slices:0,iterator:search(view,{...actor},end,radius)};memo.active.set(actor,attempt);}
  }
  if(!attempt){if(memo.failed.size>=256)evictOldest(memo.failed);memo.failed.set(key,true);return null;}
 }
 const step=attempt.iterator.next();attempt.slices++;
 if(!step.done&&attempt.slices<4096)return null;
 memo.active.delete(actor);if(step.value)return step.value;
 if(memo.failed.size>=256)evictOldest(memo.failed);memo.failed.set(key,true);return null;
}
