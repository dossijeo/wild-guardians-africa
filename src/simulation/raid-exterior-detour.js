// Rare preparation fallback. Positive routes only; never an enclosure classifier.
export const EXTERIOR_DETOUR_LIMITS=Object.freeze({paths:4,connectorChecks:8,connectorLength:24});
export function detourRaidFormation(proof,specs,bounds,nav){
 if(Object.hasOwn(proof,'version')&&proof.version!==nav.version)return null;
 const entries=[],exits=[],selectionBounds=[...bounds];
 for(const {radius} of specs){
  if(radius>proof.radius)return null;
  let selected=null;
  for(let i=0;i<proof.points.length&&!selected;i++){
   const point=proof.points[i];
   if(!nav.walkable(point.x,point.z,radius,null,false)||entries.some((p,k)=>Math.hypot(p.x-point.x,p.z-point.z)<=specs[k].radius+radius+1))continue;
   for(let j=i+1;j<proof.points.length;j++){
    const exit=proof.points[j],distance=Math.hypot(point.x-exit.x,point.z-exit.z);
    if(distance<3)continue;if(distance>6)break;
    if(nav.walkable(exit.x,exit.z,radius,null,false)&&nav.segmentClear(point,exit,radius,null,false)){
     selected={point,exit};break;
    }
   }
  }
  if(!selected)return null;
  entries.push({...selected.point});exits.push({...selected.exit});
  for(const p of [selected.point,selected.exit]){
   selectionBounds[0]=Math.min(selectionBounds[0],p.x-radius-1);selectionBounds[1]=Math.min(selectionBounds[1],p.z-radius-1);
   selectionBounds[2]=Math.max(selectionBounds[2],p.x+radius+1);selectionBounds[3]=Math.max(selectionBounds[3],p.z+radius+1);
  }
 }
 return {entries,exits,selectionBounds};
}
export function prepareExteriorDetour(start,radius,box,nav,witness){
 if(!box||!nav.approachPath||!nav.segmentClear||!nav.walkable(start.x,start.z,radius,null,false))return null;
 const active=nav.activeBounds??box;
 const bounds=[Math.min(active[0],box[0]-48),Math.min(active[1],box[1]-48),Math.max(active[2],box[2]+48),Math.max(active[3],box[3]+48)];
 const ends=[{x:start.x,z:bounds[3]+radius+2},{x:start.x,z:bounds[1]-radius-2},{x:bounds[2]+radius+2,z:start.z},{x:bounds[0]-radius-2,z:start.z}]
  .sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));
 for(const end of ends.slice(0,EXTERIOR_DETOUR_LIMITS.paths)){
  if(!nav.walkable(end.x,end.z,radius,null,false)||!witness(end,radius,box,nav))continue;
  const path=nav.approachPath(start,end,radius,16);
  if(!path?.length||Math.hypot(path.at(-1).x-end.x,path.at(-1).z-end.z)>1e-7)continue;
  const points=[start,...path];
  if(!points.every(p=>nav.walkable(p.x,p.z,radius,null,false))||!points.slice(1).every((p,i)=>nav.segmentClear(points[i],p,radius,null,false)))continue;
  // Certificate lifetime is this single preparation, never a geometry epoch.
  const cache=new Map(),version=nav.version;
  return {radius,points,version,witness(p,r){
   if(nav.version!==version||r>radius||!nav.walkable(p.x,p.z,r,null,false))return false;
   const key=JSON.stringify([p.x,p.z,r]);if(cache.has(key))return cache.get(key);
   const nearby=points.map(point=>({point,distance:Math.hypot(point.x-p.x,point.z-p.z)}))
    .filter(v=>v.distance<=EXTERIOR_DETOUR_LIMITS.connectorLength).sort((a,b)=>a.distance-b.distance).slice(0,EXTERIOR_DETOUR_LIMITS.connectorChecks);
   const valid=nearby.some(({point})=>nav.segmentClear(p,point,r,null,false));cache.set(key,valid);return valid;
  }};
 }
 return null;
}
