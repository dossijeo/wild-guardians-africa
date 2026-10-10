import {wallLayout,WALL_UNIT} from './wall-layout.js';
import {boundaryFaces} from './boundary-faces.js';
import {boundaryEdges} from './boundary-gates.js';
import {containsPoint,footprintDistance} from './footprints.js';

// Private per-navigator cache; no saved simulation data or random draws.
const cache=new WeakMap();
export function createRaidExteriorQuery(state,nav){
 // Scan geometry once per selection, not once per candidate or actor. A cache
 // hit does not construct wallLayout at all; direct edits still change the key.
 const signature=JSON.stringify([nav.version,state.structures.filter(p=>p.kind==='wall'&&p.hp>0&&p.status!=='collapsing').map(p=>[p.created,p.x,p.z,p.yaw,p.baseScaleX,p.gate,p.material]),state.suppressed]);
 let saved=cache.get(nav);if(!saved){saved=new Map();cache.set(nav,saved);}
 let geometry=saved.get(signature);
 if(!geometry||geometry.field!==nav.field){
  geometry={field:nav.field,regions:new Map()};if(saved.size>=8)saved.clear();saved.set(signature,geometry);
 }
 return {regionsFor(radius){
 if(geometry.regions.has(radius))return geometry.regions.get(radius);
 const layout=geometry.layout??=wallLayout(state.structures,{}),pieces=layout.pieces.filter(p=>p.hp>0&&!p.collapse);
 if(!pieces.length){geometry.regions.set(radius,[]);return geometry.regions.get(radius);}
 // Physical edges only. The omitted construction slots used to choose an
 // automatic gate are deliberately absent, especially traversable rivers.
 const natural=nav.field&&nav.propsAt&&nav.terrainValid?boundaryEdges({...layout,pieces},nav,{radius,worker:false}):[];
 const virtual=natural.map(([a,b],i)=>({id:-i-1,hp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT}));
 const ids=new Set(pieces.map(p=>p.id));
 const regions=boundaryFaces([...pieces,...virtual]).filter(f=>f.ids.some(id=>ids.has(id))).map(f=>f.polygon.map(([x,z])=>({x,z})));
 if(geometry.regions.size>=8)geometry.regions.clear();geometry.regions.set(radius,regions);return regions;
 }};
}
export function raidExteriorRegions(state,nav,radius){return createRaidExteriorQuery(state,nav).regionsFor(radius);}
export function outsideRaidRegions(point,radius,regions){
 return !!point&&Number.isFinite(point.x)&&Number.isFinite(point.z)&&regions.every(poly=>footprintDistance(poly,point.x,point.z)>=radius+.05);
}
export function exteriorRaidEntry(state,nav,specs,entry,bounds=nav.activeBounds){
 if(!entry||entry.entries?.length!==specs.length||entry.exits?.length!==specs.length||!bounds?.every(Number.isFinite))return false;
 const query=createRaidExteriorQuery(state,nav),[minX,minZ,maxX,maxZ]=bounds;
 const clear=(a,b,r)=>nav.segmentClear?nav.segmentClear(a,b,r,null,false):!!nav.path(a,b,r,null,false);
 return specs.every(({radius},i)=>{
  const regions=query.regionsFor(radius),a=entry.entries[i],b=entry.exits[i];
  return radius>0&&Number.isFinite(radius)&&outsideRaidRegions(a,radius,regions)&&outsideRaidRegions(b,radius,regions)&&
   [a,b].every(p=>p.x-radius>=minX&&p.z-radius>=minZ&&p.x+radius<=maxX&&p.z+radius<=maxZ&&nav.walkable(p.x,p.z,radius,null,false))&&
   entry.entries.slice(0,i).every((p,j)=>Math.hypot(p.x-a.x,p.z-a.z)>radius+specs[j].radius+1)&&clear(a,b,radius)&&clear(b,a,radius);
 });
}
export function raidPerimeterAnchors(regions,view){
 if(!view)return [];
 const result=[];
 for(const poly of regions){
  if(!containsPoint(poly,view.eye.x,view.eye.z)&&!containsPoint(poly,view.target.x,view.target.z))continue;
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-8)continue;
   const t=Math.max(0,Math.min(1,((view.eye.x-a.x)*dx+(view.eye.z-a.z)*dz)/(length*length)));
   const point={x:a.x+dx*t,z:a.z+dz*t};
   // Native bounded faces are CCW: the right normal points outward.
   result.push({point,bx:dz/length,bz:-dx/length,perimeter:true,distance:Math.hypot(point.x-view.eye.x,point.z-view.eye.z)});
  }
 }
 return result.sort((a,b)=>a.distance-b.distance).slice(0,8);
}
