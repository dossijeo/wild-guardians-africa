import {Navigation} from '../src/world/navigation.js';
import {navigationPathKey} from '../src/world/raid-navigation-warmth.js';
import {navigationQueryResult} from '../src/world/navigation-query-scope.js';
import {evictOldest} from '../src/world/fifo-eviction.js';
const methods=['path','approachPath','findPath','findPathSteps'].map(k=>[k,Navigation.prototype[k]]);
// QA-only, opt-in caller. This is the exact exhausted-region early-return of
// native findPathSteps for the reversed approach search, not a bounded failure.
export function nativeClosedApproachCertificate(view,outside,point,radius){
 if(!methods.every(([k,v])=>view[k]===v)||!view.closedRegions?.size)return false;
 const key=navigationPathKey(point,outside,radius,null,false,32);
 if(view.failedPaths.has(key))return true;
 const prepared=view.preparedPaths?.version===view.version&&view.preparedPaths.entries.get(key);
 if(prepared||navigationQueryResult(view,key))return false;
 if(!view.walkable(outside.x,outside.z,radius,null,false)||view.segmentClear(point,outside,radius,null,false))return false;
 const sx=Math.round(point.x),sz=Math.round(point.z),ex=Math.round(outside.x),ez=Math.round(outside.z),known=[];
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const q={x:sx+dx,z:sz+dz};
  if(!view.walkable(q.x,q.z,radius,null,false)||!view.segmentClear(point,q,radius,null,false))continue;
  const region=view.closedRegions.get(`${radius}:null:false|${q.x},${q.z}`);if(!region)return false;known.push(region);
 }
 if(!known.length)return false;
 for(const region of new Set(known))for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const q={x:ex+dx,z:ez+dz};if(region.has(`${q.x},${q.z}`)&&view.segmentClear(q,outside,radius,null,false))return false;
 }
 // Preserve path()'s failed-result memoization and FIFO capacity semantics.
 if(view.failedPaths.size>=50000)evictOldest(view.failedPaths);view.failedPaths.add(key);return true;
}
