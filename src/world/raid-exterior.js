import {wallLayout,WALL_UNIT} from './wall-layout.js';
import {boundaryFacesSteps} from './boundary-faces.js';
import {boundaryEdgesSteps} from './boundary-gates.js';
import {drainGeometrySteps} from './geometry-steps.js';
import {containsPoint,footprintDistance} from './footprints.js';

// Private per-navigator cache; no saved simulation data or random draws.
const cache=new WeakMap(),diagnostics=new WeakMap();
const counters=nav=>{let value=diagnostics.get(nav);if(!value){value={builds:0,adoptions:0};diagnostics.set(nav,value);}return value;};
export const raidExteriorDiagnostics=nav=>({...counters(nav)});
// Exact physical inputs. Remaining HP, shield duration, camera and simulation
// clocks are deliberately absent when they do not change collision geometry.
export function raidExteriorInputKey(state,nav){
 const shape=p=>[p.id,p.created,p.kind,p.status,p.hp>0,p.x,p.z,p.yaw,p.angle,p.baseScaleX,p.scaleX,p.scale,p.gate,p.material,p.culture,p.radius,p.footprint];
 return JSON.stringify([nav.version,state.seed,state.biome,state.culture,state.terrainVersion,nav.config,nav.profile,
  state.structures.map(shape),state.villages.map(v=>[v.id,v.x,v.z,v.culture,v.terrainSite,v.buildings]),state.suppressed,
  state.spells.filter(p=>p.kind==='shield'&&p.remaining>0).map(p=>[p.id,p.x,p.z,p.radius])]);
}
const freezeRegions=regions=>Object.freeze(regions.map(poly=>Object.freeze(poly.map(p=>Object.freeze({x:p.x,z:p.z})))));
function geometryFor(nav,signature){
 let saved=cache.get(nav);if(!saved){saved=new Map();cache.set(nav,saved);}
 let geometry=saved.get(signature);
 if(!geometry||geometry.field!==nav.field){geometry={field:nav.field,regions:new Map()};if(saved.size>=8)saved.clear();saved.set(signature,geometry);}
 return geometry;
}
export function raidExteriorPayload(state,nav,radii){
 const inputKey=raidExteriorInputKey(state,nav),query=createRaidExteriorQuery(state,nav);
 return {protocol:1,inputKey,regions:[...new Set(radii)].map(radius=>[radius,query.regionsFor(radius)])};
}
// Validate everything before touching the cache. A malformed late reply cannot
// install a subset of its polygons. Ownership/origin is checked by the preparer.
export function adoptRaidExteriorPayload(state,nav,payload,radii){
 if(!payload||payload.protocol!==1||payload.inputKey!==raidExteriorInputKey(state,nav)||!Array.isArray(payload.regions)||payload.regions.length>8)return false;
 if(!Array.isArray(radii)||!radii.length||radii.some(r=>!Number.isFinite(r)||r<=0||r>100))return false;
 const expected=[...new Set(radii)],seen=new Set();let vertices=0,polygons=0;
 for(const item of payload.regions){
  if(!Array.isArray(item)||item.length!==2)return false;
  const [radius,regions]=item;if(!expected.includes(radius)||seen.has(radius)||!Array.isArray(regions))return false;seen.add(radius);
  for(const poly of regions){if(!Array.isArray(poly)||poly.length<3||++polygons>4096)return false;
   for(const point of poly){if(++vertices>50000||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>1e8||Math.abs(point.z)>1e8)return false;}
  }
 }
 if(seen.size!==expected.length)return false;
 const prepared=payload.regions.map(([radius,regions])=>[radius,freezeRegions(regions)]);
 const geometry=geometryFor(nav,payload.inputKey);for(const [radius,regions] of prepared)geometry.regions.set(radius,regions);
 counters(nav).adoptions++;return true;
}
export function createRaidExteriorQuery(state,nav){
 // Scan geometry once per selection, not once per candidate or actor. A cache
 // hit does not construct wallLayout at all; direct edits still change the key.
 const signature=raidExteriorInputKey(state,nav),geometry=geometryFor(nav,signature);
 return {regionsFor(radius){return drainGeometrySteps(this.regionsForSteps(radius));},*regionsForSteps(radius){
 if(geometry.regions.has(radius))return geometry.regions.get(radius);
 counters(nav).builds++;
 yield {phase:"exterior-wall-layout"};
 const layout=geometry.layout??=wallLayout(state.structures,{}),pieces=layout.pieces.filter(p=>p.hp>0&&!p.collapse);
 if(!pieces.length){geometry.regions.set(radius,Object.freeze([]));return geometry.regions.get(radius);}
 // Physical edges only. The omitted construction slots used to choose an
 // automatic gate are deliberately absent, especially traversable rivers.
 const natural=nav.field&&nav.propsAt&&nav.terrainValid?yield* boundaryEdgesSteps({...layout,pieces},nav,{radius,worker:false}):[];
 const virtual=[];for(let i=0;i<natural.length;i++){yield {phase:"exterior-virtual-edge"};const [a,b]=natural[i];virtual.push({id:-i-1,hp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT});}
 const ids=new Set(pieces.map(p=>p.id));
 const faces=yield* boundaryFacesSteps([...pieces,...virtual]),regions=[];
 for(const face of faces){yield {phase:"exterior-face-filter"};if(face.ids.some(id=>ids.has(id)))regions.push(face.polygon.map(([x,z])=>({x,z})));}
 yield {phase:"exterior-freeze"};
 if(geometry.regions.size>=8)geometry.regions.clear();const immutable=freezeRegions(regions);geometry.regions.set(radius,immutable);return immutable;
 }};
}
export function raidExteriorRegions(state,nav,radius){return createRaidExteriorQuery(state,nav).regionsFor(radius);}
export function outsideRaidRegions(point,radius,regions){
 return !!point&&Number.isFinite(point.x)&&Number.isFinite(point.z)&&regions.every(poly=>footprintDistance(poly,point.x,point.z)>=radius+.05);
}
export function exteriorRaidEntry(state,nav,specs,entry,bounds=nav.activeBounds){
 if(!entry||!Array.isArray(entry.entries)||!Array.isArray(entry.exits)||entry.entries.length!==specs.length||entry.exits.length!==specs.length||!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[0]>=bounds[2]||bounds[1]>=bounds[3])return false;
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
