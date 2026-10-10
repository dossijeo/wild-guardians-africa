import {evictOldest} from './fifo-eviction.js';
const caches=new WeakMap();
export const FRACTIONAL_WALKABILITY_LIMIT=8192;
// Same topology contract as the existing integer-cell cache. Exact coordinates
// only; terrain/navigation-view identity and epoch changes invalidate all values.
export function cachedFractionalWalkability(nav,x,z,radius,ignore,worker){
 if(!Number.isFinite(x)||!Number.isFinite(z))return nav.testWalkable(x,z,radius,ignore,worker);
 let cache=caches.get(nav);
 if(!cache||cache.version!==nav.version||cache.field!==nav.field||cache.test!==nav.testWalkable){
  cache={version:nav.version,field:nav.field,test:nav.testWalkable,entries:new Map()};caches.set(nav,cache);
 }
 const key=`${x},${z}:${radius}:${ignore}:${worker}`,prior=nav.workerSweep,hit=cache.entries.get(key);
 if(hit){if(prior)prior.peak=Math.max(prior.peak,hit.peak);return hit.valid;}
 const sweep={peak:0};nav.workerSweep=sweep;let valid;
 try{valid=nav.testWalkable(x,z,radius,ignore,worker);}finally{nav.workerSweep=prior;if(prior)prior.peak=Math.max(prior.peak,sweep.peak);}
 if(cache.entries.size>=FRACTIONAL_WALKABILITY_LIMIT)evictOldest(cache.entries);
 cache.entries.set(key,{valid,peak:sweep.peak});return valid;
}
