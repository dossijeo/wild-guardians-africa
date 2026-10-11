import {edgeDistance} from './footprints.js';

// Fractional corners supplement an existing route; they never relax clearance.
// Cache authored corner directions only, not terrain-dependent usable points.
const cornerCache=new WeakMap();
const candidateCaches=new WeakMap();
const CANDIDATE_QUERY_LIMIT=128;
function corners(obstacle){
 if(cornerCache.has(obstacle))return cornerCache.get(obstacle);
 const polygon=obstacle.footprint,result=[];
 const sign=Math.sign(polygon.reduce((sum,p,i)=>sum+p.x*polygon[(i+1)%polygon.length].z-p.z*polygon[(i+1)%polygon.length].x,0));
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],a=polygon[(i+polygon.length-1)%polygon.length],b=polygon[(i+1)%polygon.length];
  const al=Math.hypot(p.x-a.x,p.z-a.z),bl=Math.hypot(b.x-p.x,b.z-p.z);if(!al||!bl)continue;
  const nx=(p.z-a.z)/al+(b.z-p.z)/bl,nz=-(p.x-a.x)/al-(b.x-p.x)/bl,length=Math.hypot(nx,nz);if(length<1e-9)continue;
  result.push({x:p.x,z:p.z,nx:sign*nx/length,nz:sign*nz/length});
 }
 cornerCache.set(obstacle,result);return result;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function shortenBuildingRoute(nav,start,end,route,radius,ignore){
 const direct=distance(start,end);let length=0,previous=start;
 for(const point of route){length+=distance(previous,point);previous=point;}
 // Ordinary routes and small grid quantization errors need no extra work.
 if(length<direct*1.5||length-direct<2)return route;
 return findBuildingRoute(nav,start,end,radius,ignore,length)??route;
}

// A bounded one-corner probe can also precede a full grid search. Each accepted
// edge is still validated by native navigation; no terrain-dependent cache.
export function findBuildingRoute(nav,start,end,radius,ignore,maximumLength){
 const candidates=buildingCandidates(nav,start,end,radius,ignore,maximumLength);
 // Geometry-only candidates are reusable; their physical admission is not.
 // Every query still executes the native swept body, slope and fluid checks.
 for(const {point:coordinates} of candidates){
  const point={...coordinates};
  if(nav.walkable(point.x,point.z,radius,ignore,true)&&nav.segmentClear(start,point,radius,ignore,true)&&nav.segmentClear(point,end,radius,ignore,true))return [point,{x:end.x,z:end.z}];
 }
 return null;
}
function buildingCandidates(nav,start,end,radius,ignore,maximumLength){
 let cache,key;
 if(Number.isSafeInteger(nav.version)&&[start.x,start.z,end.x,end.z,radius,maximumLength].every(Number.isFinite)&&(ignore===null||typeof ignore==='string')){
  cache=candidateCaches.get(nav);
  if(!cache||cache.version!==nav.version||cache.obstacles!==nav.obstacles){
   cache={version:nav.version,obstacles:nav.obstacles,entries:new Map()};candidateCaches.set(nav,cache);
  }
  key=JSON.stringify([start.x,start.z,end.x,end.z,radius,ignore,maximumLength]);
  if(cache.entries.has(key))return cache.entries.get(key);
 }
 const candidates=[];
 // Reject distant vertices before evaluating their projection onto the segment.
 // Inclusive bounds only remove impossible candidates; the original strict
 // distance test still decides admission and preserves candidate ordering.
 const reach=radius+2,minX=Math.min(start.x,end.x)-reach,maxX=Math.max(start.x,end.x)+reach,
  minZ=Math.min(start.z,end.z)-reach,maxZ=Math.max(start.z,end.z)+reach;
 for(const obstacle of nav.obstacles){
  if(obstacle.id===ignore||!['center','house'].includes(obstacle.kind)||!obstacle.footprint?.length)continue;
  if(!obstacle.footprint.some(p=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ&&edgeDistance(start,end,p.x,p.z)<reach))continue;
  for(const corner of corners(obstacle))for(const clearance of [.05,.3,.55,1]){
   const reach=radius+clearance,point={x:corner.x+corner.nx*reach,z:corner.z+corner.nz*reach};
   const proposed=distance(start,point)+distance(point,end);
   if(proposed<maximumLength-1)candidates.push({point,length:proposed});
  }
 }
 candidates.sort((a,b)=>a.length-b.length);
 const selected=candidates.slice(0,48);
 if(cache){
  if(cache.entries.size>=CANDIDATE_QUERY_LIMIT)cache.entries.delete(cache.entries.keys().next().value);
  cache.entries.set(key,selected);
 }
 return selected;
}
