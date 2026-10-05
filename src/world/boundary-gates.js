import {WALL_UNIT} from './wall-layout.js';
import {boundaryFaces} from './boundary-faces.js';
import {containsPoint} from './footprints.js';

// Virtual edges complete the enclosure graph; they never become game entities.
const terrainSamples=new WeakMap();
function bounds(pieces){
 const points=pieces.flatMap(p=>{const h=WALL_UNIT*p.scaleX/2,c=Math.cos(p.angle),s=Math.sin(p.angle);return [[p.x-c*h,p.z-s*h],[p.x+c*h,p.z+s*h]];});
 return [Math.min(...points.map(p=>p[0]))-3,Math.min(...points.map(p=>p[1]))-3,Math.max(...points.map(p=>p[0]))+3,Math.max(...points.map(p=>p[1]))+3];
}
function terrainEdges(nav,box){
 if(!nav.field.canyon)return [];
 // Bounded, cached contour queries run on construction, never on render frames.
 const step=Math.max(2,Math.ceil(Math.sqrt((box[2]-box[0])*(box[3]-box[1])/4096))),x0=Math.floor(box[0]/step),z0=Math.floor(box[1]/step),x1=Math.ceil(box[2]/step),z1=Math.ceil(box[3]/step);
 let cache=terrainSamples.get(nav.field);if(!cache){cache=new Map();terrainSamples.set(nav.field,cache);}
 const blocked=(x,z)=>{const key=x+','+z;if(!cache.has(key)){if(cache.size>=16384)cache.clear();cache.set(key,!nav.terrainValid(x,z,.28,true));}return cache.get(key);};
 const edges=[];
 for(let iz=z0;iz<z1;iz++)for(let ix=x0;ix<x1;ix++){
  const x=ix*step,z=iz*step,points=[[x,z],[x+step,z],[x+step,z+step],[x,z+step]],values=points.map(p=>blocked(...p)),cuts=[];
  for(let i=0;i<4;i++)if(values[i]!==values[(i+1)%4]){const a=points[i],b=points[(i+1)%4];cuts.push([(a[0]+b[0])/2,(a[1]+b[1])/2]);}
  if(cuts.length===2)edges.push(cuts);
  else if(cuts.length===4){const middle=blocked(x+step/2,z+step/2);if(middle===values[0])edges.push([cuts[0],cuts[1]],[cuts[2],cuts[3]]);else edges.push([cuts[0],cuts[3]],[cuts[1],cuts[2]]);}
 }
 return edges;
}
export function boundaryEdges(layout,nav){
 const walls=layout.pieces.filter(p=>p.hp>0&&!p.collapse);if(!walls.length)return [];
 const box=bounds(walls),edges=[];
 for(const obstacle of nav.obstacles??[]){
  if(!obstacle.footprint||obstacle.kind==='wall')continue;
  const poly=obstacle.footprint;
  if(Math.max(...poly.map(p=>p.x))<box[0]||Math.min(...poly.map(p=>p.x))>box[2]||Math.max(...poly.map(p=>p.z))<box[1]||Math.min(...poly.map(p=>p.z))>box[3])continue;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];edges.push([[a.x,a.z],[b.x,b.z]]);}
 }
 // Large rocks/trees also complete physical enclosures where wall modules are
 // skipped. Use the same solid-prop categories and clearance as navigation.
 const cx=(box[0]+box[2])/2,cz=(box[1]+box[3])/2;
 for(const prop of nav.propsAt(cx,cz,Math.max(box[2]-box[0],box[3]-box[1])/2+4)){
  if(!(prop.slot<4||prop.slot>=10&&prop.slot<=12||prop.slot>=18))continue;
  const radius=((prop.radius??1.5)+.28)/Math.cos(Math.PI/24);
  if(prop.x+radius<box[0]||prop.x-radius>box[2]||prop.z+radius<box[1]||prop.z-radius>box[3])continue;
  const poly=Array.from({length:24},(_,i)=>[prop.x+Math.cos(i*Math.PI/12)*radius,prop.z+Math.sin(i*Math.PI/12)*radius]);
  for(let i=0;i<poly.length;i++)edges.push([poly[i],poly[(i+1)%poly.length]]);
 }
 return edges.concat(terrainEdges(nav,box));
}
export function ensureBoundaryGates(layout,nav,canHost,isFree,omitted=[],rank=()=>0,eligible=()=>true){
 if(!layout.pieces.length)return 0;
 const edges=boundaryEdges(layout,nav).concat(omitted);
 const virtual=edges.map(([a,b],i)=>({id:-i-1,kind:'boundary',material:'',hp:1,maxHp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT}));
 const augmented={...layout,pieces:[...layout.pieces,...virtual]},byId=new Map(layout.pieces.map(p=>[p.id,p]));let added=0;
 for(const face of boundaryFaces(augmented.pieces)){
  const perimeter=face.ids.map(id=>byId.get(id)).filter(Boolean);
  // Ignore solid-object interiors and unchanged old enclosures before asking
  // navigation for walkable probes. Only new wall pieces can become doors.
  if(!perimeter.some(eligible))continue;
  const polygon=face.polygon.map(([x,z])=>({x,z}));
  // Faces wholly occupied by buildings or rocks are not playable rooms.
  const probes=polygon.flatMap((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;return [.1,.5,1,2].map(offset=>({x:(a.x+b.x)/2-dz/length*offset,z:(a.z+b.z)/2+dx/length*offset}));});
  if(!probes.some(p=>containsPoint(polygon,p.x,p.z)&&isFree(p.x,p.z)))continue;
  // An existing door remains the enclosure's door even if its approach is
  // temporarily obstructed. Reconstruction must never add a second one.
  if(perimeter.some(p=>p.kind==='gate'))continue;
  const candidates=face.hosts.map(id=>byId.get(id)).filter(p=>p?.kind==='wall'&&p.scaleX>=.55&&eligible(p));
  candidates.sort((a,b)=>rank(a,face)-rank(b,face)||Math.round(a.x*1e5)-Math.round(b.x*1e5)||Math.round(a.z*1e5)-Math.round(b.z*1e5)||a.id-b.id);
  const chosen=candidates.find(canHost);if(!chosen)continue;
  const health=chosen.hp/chosen.maxHp,scale=({adobe:1.4,piedra:1.4,reforzado:1.6}[chosen.material]??1);
  chosen.kind='gate';chosen.autoGate=true;chosen.baseScaleX=chosen.baseScaleX??chosen.scaleX;chosen.scaleX=chosen.baseScaleX*scale;chosen.scaleY=chosen.scaleZ=scale;chosen.maxHp=layout.settings.hp[chosen.material]*.6;chosen.hp=chosen.maxHp*health;chosen.visual=health;added++;
 }
 return added;
}
