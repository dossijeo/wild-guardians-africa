import {edgeDistance} from './footprints.js';

// Fractional corners supplement an existing route; they never relax clearance.
// Cache authored corner directions only, not terrain-dependent usable points.
const cornerCache=new WeakMap();
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
 const candidates=[];
 for(const obstacle of nav.obstacles){
  if(obstacle.id===ignore||!['center','house'].includes(obstacle.kind)||!obstacle.footprint?.length)continue;
  if(!obstacle.footprint.some(p=>edgeDistance(start,end,p.x,p.z)<radius+2))continue;
  for(const corner of corners(obstacle))for(const clearance of [.05,.3,.55,1]){
   const reach=radius+clearance,point={x:corner.x+corner.nx*reach,z:corner.z+corner.nz*reach};
   const proposed=distance(start,point)+distance(point,end);
   if(proposed<length-1)candidates.push({point,length:proposed});
  }
 }
 candidates.sort((a,b)=>a.length-b.length);
 // At most 48 candidates per destination/topology change, never per frame.
 // Every candidate must pass the same swept body, slope and fluid tests as A*.
 for(const {point} of candidates.slice(0,48)){
  if(nav.walkable(point.x,point.z,radius,ignore,true)&&nav.segmentClear(start,point,radius,ignore,true)&&nav.segmentClear(point,end,radius,ignore,true))return [point,{x:end.x,z:end.z}];
 }
 return route;
}
