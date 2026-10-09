import {evictOldest} from './fifo-eviction.js';
const caches=new WeakMap();
// Coarse quarter-metre samples can miss a narrow slope peak that the exact
// movement endpoint then rejects forever. Refine only the same near-limit
// band already used by worker routes; ordinary flat animal edges stay coarse.
export function animalSegmentClearance(nav,start,end,radius,ignore,escapeProps=false){
 // Solids, props and gate leaves are live. Their authoritative native sweep
 // must run even when this edge has an unchanged terrain-only proof.
 const prior=nav.workerSweep,sweep={peak:0};nav.workerSweep=sweep;let valid;
 try{valid=nav.coarseSegmentClear(start,end,radius,ignore,false,escapeProps);}finally{nav.workerSweep=prior;}
 if(!valid||sweep.peak<.46)return valid;
 const field=nav.field;
 let memo=caches.get(nav);
 if(!memo||memo.version!==nav.version||memo.field!==field||memo.slope!==field?.slope||memo.surface!==field?.surface||memo.fluid!==field?.fluidInside||memo.water!==field?.waterInfo||memo.terrain!==nav.terrainValid){
  memo={version:nav.version,field,slope:field?.slope,surface:field?.surface,fluid:field?.fluidInside,water:field?.waterInfo,terrain:nav.terrainValid,edges:new Map()};caches.set(nav,memo);
 }
 const key=JSON.stringify([start.x,start.z,end.x,end.z,radius]);
 if(memo.edges.has(key))return memo.edges.get(key);
 const count=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.01));
 for(let i=1;i<count;i++)if(!nav.terrainValid(start.x+(end.x-start.x)*i/count,start.z+(end.z-start.z)*i/count,radius,false)){valid=false;break;}
 if(memo.edges.size>=10000)evictOldest(memo.edges);memo.edges.set(key,valid);
 return valid;
}
