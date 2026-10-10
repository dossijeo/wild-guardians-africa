import {wallLayout,WALL_UNIT} from './wall-layout.js';
import {boundaryFaces} from './boundary-faces.js';
import {boundaryEdges} from './boundary-gates.js';
import {containsPoint,footprintDistance} from './footprints.js';

// Private per-navigator cache; no saved simulation data or random draws.
const cache=new WeakMap();
export function raidExteriorRegions(state,nav,radius){
 const layout=wallLayout(state.structures,{}),pieces=layout.pieces.filter(p=>p.hp>0&&!p.collapse);
 if(!pieces.length)return [];
 const signature=JSON.stringify([nav.version,radius,pieces.map(p=>[p.id,p.x,p.z,p.angle,p.scaleX,p.kind]),state.suppressed]);
 let saved=cache.get(nav);if(!saved){saved=new Map();cache.set(nav,saved);}
 if(saved.has(signature))return saved.get(signature);
 // Physical edges only. The omitted construction slots used to choose an
 // automatic gate are deliberately absent, especially traversable rivers.
 const natural=nav.field&&nav.propsAt&&nav.terrainValid?boundaryEdges({...layout,pieces},nav,{radius,worker:false}):[];
 const virtual=natural.map(([a,b],i)=>({id:-i-1,hp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT}));
 const ids=new Set(pieces.map(p=>p.id));
 const regions=boundaryFaces([...pieces,...virtual]).filter(f=>f.ids.some(id=>ids.has(id))).map(f=>f.polygon.map(([x,z])=>({x,z})));
 if(saved.size>=8)saved.clear();saved.set(signature,regions);return regions;
}
export function outsideRaidRegions(point,radius,regions){
 return !!point&&Number.isFinite(point.x)&&Number.isFinite(point.z)&&regions.every(poly=>footprintDistance(poly,point.x,point.z)>=radius+.05);
}
export function exteriorRaidEntry(state,nav,specs,entry){
 return !!entry&&entry.entries?.length===specs.length&&entry.exits?.length===specs.length&&specs.every(({radius},i)=>{
  const regions=raidExteriorRegions(state,nav,radius);
  return outsideRaidRegions(entry.entries[i],radius,regions)&&outsideRaidRegions(entry.exits[i],radius,regions);
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
