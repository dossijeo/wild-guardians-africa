import {evictOldest} from './fifo-eviction.js';

const attempts=new WeakMap();

// A failed approach often precedes hundreds of nearby service-point queries.
// A wider native forward search can leave an exhaustive-region certificate
// reusable by those contained corridors. Its route is NEVER used: the current
// query already failed under its original bounds and retains that result.
// Navigation.findPathSteps alone decides whether exhaustion proves anything;
// hitting a pop limit or finding a route does not produce a failure certificate.
export function warmFailedApproach(nav,start,end,radius,margin){
  if(margin!==32)return;
  // The original reverse search may already have exhausted a finite closed
  // island. Its existing certificates handle future service poses directly;
  // exploring the outer actor component then adds needless work.
  if(nav.closedRegions?.size){
    let connectors=0,known=true;const sx=Math.round(start.x),sz=Math.round(start.z);
    for(let z=sz-1;z<=sz+1;z++)for(let x=sx-1;x<=sx+1;x++){
      if(!nav.walkable(x,z,radius,null,false)||!nav.segmentClear(start,{x,z},radius,null,false))continue;
      connectors++;if(!nav.closedRegions.has(`${radius}:null:false|${x},${z}`))known=false;
    }
    if(connectors&&known)return;
  }
  // An invalid service endpoint returns before exploring any component. Do
  // not consume the actor's warming attempt on that empty/non-proof query.
  if(!nav.walkable(start.x,start.z,radius,null,false))return;
  let memo=attempts.get(nav);
  if(!memo||memo.version!==nav.version||memo.search!==nav.findPath){
    memo={version:nav.version,search:nav.findPath,keys:new Set()};attempts.set(nav,memo);
  }
  const key=`${end.x},${end.z}:${radius}`;
  if(memo.keys.has(key))return;
  if(memo.keys.size>=128)evictOldest(memo.keys);
  memo.keys.add(key);
  nav.findPath(end,start,radius,null,false,64);
}
