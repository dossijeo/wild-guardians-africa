import {evictOldest} from './fifo-eviction.js';

const attempts=new WeakMap();

// A failed approach often precedes hundreds of nearby service-point queries.
// A slightly wider native search can leave an exhaustive-region certificate
// reusable by those contained corridors. Its route is NEVER used: the current
// query already failed under its original bounds and retains that result.
// Navigation.findPathSteps alone decides whether exhaustion proves anything;
// hitting a pop limit or finding a route does not produce a failure certificate.
export function warmFailedApproach(nav,start,end,radius,margin){
  if(margin!==32)return;
  let memo=attempts.get(nav);
  if(!memo||memo.version!==nav.version||memo.search!==nav.findPath){
    memo={version:nav.version,search:nav.findPath,keys:new Set()};attempts.set(nav,memo);
  }
  const key=`${end.x},${end.z}:${radius}`;
  if(memo.keys.has(key))return;
  if(memo.keys.size>=128)evictOldest(memo.keys);
  memo.keys.add(key);
  nav.findPath(start,end,radius,null,false,48);
}
