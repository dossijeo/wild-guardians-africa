import {sweptFootprintDistance} from '../world/footprints.js';
const attempts=new WeakMap(),BUDGET=8,MAX_NODES=96,MAX_FOOTPRINTS=4;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Miter points supplement grid sampling; they are proposals, not clearance.
// Both adjacent offset half-planes define the point, then native walk/swept
// tests decide whether the full animal can actually use it.
function offsetCorners(polygon,radius){
 const sign=Math.sign(polygon.reduce((sum,p,i)=>sum+p.x*polygon[(i+1)%polygon.length].z-p.z*polygon[(i+1)%polygon.length].x,0)),points=[];
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],a=polygon[(i+polygon.length-1)%polygon.length],b=polygon[(i+1)%polygon.length];
  const al=distance(a,p),bl=distance(p,b);if(!al||!bl)continue;
  const ax=sign*(p.z-a.z)/al,az=-sign*(p.x-a.x)/al,bx=sign*(b.z-p.z)/bl,bz=-sign*(b.x-p.x)/bl;
  const divisor=1+ax*bx+az*bz;if(divisor<1e-8)continue;
  const dx=(ax+bx)*(radius+.025)/divisor,dz=(az+bz)*(radius+.025)/divisor;
  if(Math.hypot(dx,dz)>4*(radius+.025))continue;
  points.push({x:p.x+dx,z:p.z+dz});
 }
 return points;
}
const providerKeys=['walkable','segmentClear','terrainValid','propsAt'],fieldKeys=['slope','surface','fluidInside','waterInfo'];
function same(a,nav,actor,end,radius){
 if(a.nav!==nav||a.version!==nav.version||a.obstacles!==nav.obstacles||a.obstacleCount!==(nav.obstacles?.length??0)||a.field!==nav.field||a.x!==actor.x||a.z!==actor.z||a.ex!==end.x||a.ez!==end.z||a.radius!==radius)return false;
 for(const key of providerKeys)if(a.providers[key]!==nav[key])return false;
 for(const key of fieldKeys)if(a.fieldProviders[key]!==nav.field?.[key])return false;
 for(const o of a.selected){
  if(o.source.footprint!==o.polygon||o.polygon.length!==o.geometry.length)return false;
  for(let i=0;i<o.polygon.length;i++)if(o.polygon[i].x!==o.geometry[i].x||o.polygon[i].z!==o.geometry[i].z)return false;
 }
 return true;
}
function init(nav,actor,end,radius){return {
 nav,version:nav.version,obstacles:nav.obstacles,obstacleCount:nav.obstacles?.length??0,field:nav.field,
 providers:Object.fromEntries(providerKeys.map(k=>[k,nav[k]])),fieldProviders:Object.fromEntries(fieldKeys.map(k=>[k,nav.field?.[k]])),
 x:actor.x,z:actor.z,ex:end.x,ez:end.z,radius,scan:0,selected:[],phase:'scan',raw:null,points:[],point:0,costs:[],previous:[],closed:new Set(),current:null,edge:1,failed:false
};}
export function animalFootprintConnector(actor,end,nav){
 if(actor.status!=='retreating'||!nav.walkable||!nav.segmentClear)return null;
 const radius=actor.radius??.28;let a=attempts.get(actor);
 if(!a||!same(a,nav,actor,end,radius)){
  // Selected footprint edits change collision topology even if their objects
  // were mutated in place. Invalidate native queries before rebuilding.
  const edited=a&&a.nav===nav&&a.version===nav.version&&a.selected.some(o=>o.source.footprint!==o.polygon||o.polygon.length!==o.geometry.length||o.polygon.some((p,i)=>p.x!==o.geometry[i]?.x||p.z!==o.geometry[i]?.z));
  if(edited)nav.invalidateGeometryQueries?.();
  a=init(nav,actor,end,radius);attempts.set(actor,a);
 }
 if(a.failed)return null;
 if(a.phase==='scan'){
  const obstacles=nav.obstacles??[],limit=Math.min(obstacles.length,a.scan+16);
  for(;a.scan<limit;a.scan++){
   const o=obstacles[a.scan],p=o.footprint;
   if(!['center','house'].includes(o.kind)||!p||p.length<3||p.length>128)continue;
   const score=sweptFootprintDistance(actor,end,p);if(score>16+radius)continue;
   a.selected.push({source:o,polygon:p,geometry:p.map(p=>({x:p.x,z:p.z})),score,id:String(o.id??a.scan)});a.selected.sort((p,q)=>p.score-q.score||p.id.localeCompare(q.id));if(a.selected.length>MAX_FOOTPRINTS)a.selected.pop();
  }
  if(a.scan<obstacles.length)return null;
  a.raw=[{x:actor.x,z:actor.z},{x:end.x,z:end.z}];
  for(const o of a.selected)for(const p of offsetCorners(o.polygon,radius)){
   if(a.raw.length>=MAX_NODES)break;
   if(Math.abs(p.x-actor.x)<=64&&Math.abs(p.z-actor.z)<=64)a.raw.push(p);
  }
  a.phase='points';return null;
 }
 if(a.phase==='points'){
  const limit=Math.min(a.raw.length,a.point+BUDGET);
  for(;a.point<limit;a.point++){
   const p=a.raw[a.point],valid=nav.walkable(p.x,p.z,radius,null,false);
   if(a.point<2&&!valid){a.failed=true;return null;}
   if(valid)a.points.push(p);
  }
  if(a.point<a.raw.length)return null;
  a.costs=a.points.map(()=>Infinity);a.costs[0]=0;a.previous=a.points.map(()=>null);a.raw=null;a.phase='edges';return null;
 }
 if(a.phase==='verify'){
  const limit=Math.min(a.route.length,a.verify+BUDGET);
  for(;a.verify<limit;a.verify++){
   const point=a.route[a.verify];if(!nav.segmentClear(a.last,point,radius,null,false)){a.failed=true;return null;}a.last=point;
  }
  if(a.verify<a.route.length)return null;
  attempts.delete(actor);delete actor.exitConnectorSearch;return a.route.map(p=>({...p}));
 }
 // At most eight proposed native edges per call. The complete graph has at
 // most 96 nodes, hence at most 9120 directed edge proposals before exhaustion.
 let checked=0;
 while(checked<BUDGET){
  if(a.current===null){
   let best=-1;for(let i=0;i<a.points.length;i++)if(!a.closed.has(i)&&Number.isFinite(a.costs[i])&&(best<0||a.costs[i]+distance(a.points[i],end)<a.costs[best]+distance(a.points[best],end)))best=i;
   if(best<0){a.failed=true;return null;}
   if(best===1){a.phase='verify';a.route=[];for(let i=1;i!==0;i=a.previous[i])a.route.unshift(a.points[i]);a.verify=0;a.last={x:actor.x,z:actor.z};return null;}
   a.current=best;a.closed.add(best);a.edge=1;
  }
  const current=a.current;
  for(;a.edge<a.points.length&&checked<BUDGET;a.edge++){
   const next=a.edge,cost=a.costs[current]+distance(a.points[current],a.points[next]);if(a.closed.has(next)||cost>=a.costs[next])continue;
   checked++;if(nav.segmentClear(a.points[current],a.points[next],radius,null,false)){a.costs[next]=cost;a.previous[next]=current;}
  }
  if(a.edge>=a.points.length)a.current=null;
 }
 return null;
}
