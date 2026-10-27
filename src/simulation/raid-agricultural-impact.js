import {fluidAt} from '../world/fluid-placement.js';
import {applyCropImpact} from './crop-impact-health.js';
import {activeCrops} from './active-crops.js';
import {sweptFootprintDistance,edgeDistance,segmentDistance} from '../world/footprints.js';
import {wallCollisionPolygon} from '../world/wall-collision-frame.js';
// Plants never move in gameplay. Editors must invalidate, or update nav topology.
// Replaced snapshot arrays own a new index; append and death are handled lazily.
const cropIndexes=new WeakMap(),solidIndexes=new WeakMap(),CELL=2;
// Current pressure-plan bounds, not generic permission for arbitrary splash.
export const AGRICULTURAL_PROFILE_LIMITS=Object.freeze({cropDamage:4,structureDamage:90,attackRadius:3.640001,areaCap:7});
export function validDamageProfile(p){
 const keys=['cropDamage','structureDamage','attackRadius','areaCap','peripheralWeight'];
 return !!p&&typeof p==='object'&&!Array.isArray(p)
  &&Object.keys(p).every(k=>keys.includes(k))
  &&Number.isInteger(p.cropDamage)&&p.cropDamage>=0&&p.cropDamage<=AGRICULTURAL_PROFILE_LIMITS.cropDamage
  &&Number.isInteger(p.structureDamage)&&p.structureDamage>=0&&p.structureDamage<=AGRICULTURAL_PROFILE_LIMITS.structureDamage
  &&Number.isFinite(p.attackRadius)&&p.attackRadius>=0&&p.attackRadius<=AGRICULTURAL_PROFILE_LIMITS.attackRadius
  &&Number.isInteger(p.areaCap)&&p.areaCap>=1&&p.areaCap<=AGRICULTURAL_PROFILE_LIMITS.areaCap
  &&(p.peripheralWeight===undefined||p.peripheralWeight===.5);
}
const cell=(x,z)=>Math.floor(x/CELL)+','+Math.floor(z/CELL);
function add(grid,item,x,z){const key=cell(x,z);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);}
export function invalidateAgriculturalIndex(plants){cropIndexes.delete(plants);}
function cropIndex(plants,version){
 let index=cropIndexes.get(plants);
 if(!index||index.version!==version||index.length>plants.length){index={version,length:plants.length,cells:new Map(),builds:(index?.builds??0)+1,visited:0};for(const p of activeCrops(plants))add(index.cells,p,p.x,p.z);cropIndexes.set(plants,index);}
 for(let i=index.length;i<plants.length;i++){const p=plants[i];if(p.alive)add(index.cells,p,p.x,p.z);}index.length=plants.length;return index;
}
export function agriculturalQueryStats(plants){const i=cropIndexes.get(plants);return i?{builds:i.builds,visited:i.visited,cells:i.cells.size}:null;}
function nearby(plants,point,radius,version){const index=cropIndex(plants,version),result=[];for(let z=Math.floor((point.z-radius)/CELL);z<=Math.floor((point.z+radius)/CELL);z++)for(let x=Math.floor((point.x-radius)/CELL);x<=Math.floor((point.x+radius)/CELL);x++){const key=x+','+z,bucket=index.cells.get(key)??[],living=[];for(const p of bucket){index.visited++;if(p.alive){living.push(p);result.push(p);}}if(living.length!==bucket.length){if(living.length)index.cells.set(key,living);else index.cells.delete(key);}}return result;}
function solidIndex(state,nav){
 let index=solidIndexes.get(nav);if(index?.version===nav.version&&index.source===nav.obstacles&&index.structures===state.structures)return index;
 const live=new Map(state.structures.map(s=>[s.id,s]));index={version:nav.version,source:nav.obstacles,structures:state.structures,cells:new Map(),large:[]};
 for(const o of nav.obstacles??[]){if(!['wall','center','house'].includes(o.kind))continue;const entity=live.get(o.id)??o,polygon=o.kind==='wall'?wallCollisionPolygon(o,0):o.footprint;
  const bounds=polygon?[Math.min(...polygon.map(p=>p.x)),Math.min(...polygon.map(p=>p.z)),Math.max(...polygon.map(p=>p.x)),Math.max(...polygon.map(p=>p.z))]:[o.x-o.radius,o.z-o.radius,o.x+o.radius,o.z+o.radius],item={o,entity,polygon};
  item.bounds=bounds;
  const minX=Math.floor(bounds[0]/CELL),maxX=Math.floor(bounds[2]/CELL),minZ=Math.floor(bounds[1]/CELL),maxZ=Math.floor(bounds[3]/CELL);
  if((maxX-minX+1)*(maxZ-minZ+1)>4096){index.large.push(item);continue;}
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=x+','+z;if(!index.cells.has(key))index.cells.set(key,[]);index.cells.get(key).push(item);}
 }solidIndexes.set(nav,index);return index;
}
function closestPolygonGap(a,b){
 let best=Infinity,from=null,to=null;
 const inspect=(vertices,edges,swap)=>{
  for(const p of vertices)for(let i=0;i<edges.length;i++){
   const q=edges[i],next=edges[(i+1)%edges.length],dx=next.x-q.x,dz=next.z-q.z;
   const length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((p.x-q.x)*dx+(p.z-q.z)*dz)/length)):0;
   const foot={x:q.x+t*dx,z:q.z+t*dz},distance=(p.x-foot.x)**2+(p.z-foot.z)**2;
   if(distance<best){best=distance;from=swap?foot:p;to=swap?p:foot;}
  }
 };
 inspect(a,b,false);inspect(b,a,true);
 return {distance:Math.sqrt(best),from,to};
}
function narrowBarrierGapBlocks(index,start,end,radius){
 if(!(radius>0))return false;
 // A zero-width hit ray can slip between two wall footprints even when the
 // animal cannot. The neighboring solid may also be a building or center.
 // Treat only a local gap with at least one wall as opaque.
 const solids=new Set(),eligible=item=>item.polygon&&item.entity.status!=='ruined';
 for(let x=Math.floor((Math.min(start.x,end.x)-radius*2)/CELL);x<=Math.floor((Math.max(start.x,end.x)+radius*2)/CELL);x++)
  for(let z=Math.floor((Math.min(start.z,end.z)-radius*2)/CELL);z<=Math.floor((Math.max(start.z,end.z)+radius*2)/CELL);z++)
   for(const item of index.cells.get(x+','+z)??[])if(!solids.has(item)&&eligible(item)
    &&sweptFootprintDistance(start,end,item.polygon)<radius*2)solids.add(item);
 for(const item of index.large)if(eligible(item)
  &&sweptFootprintDistance(start,end,item.polygon)<radius*2)solids.add(item);
 const nearby=[...solids];
 for(let i=0;i<nearby.length;i++)for(let j=i+1;j<nearby.length;j++){
  if(nearby[i].o.kind!=='wall'&&nearby[j].o.kind!=='wall')continue;
  const a=nearby[i].bounds,b=nearby[j].bounds;
  if(Math.hypot(Math.max(0,a[0]-b[2],b[0]-a[2]),Math.max(0,a[1]-b[3],b[1]-a[3]))>=radius*2)continue;
  const gap=closestPolygonGap(nearby[i].polygon,nearby[j].polygon);
  if(gap.distance>1e-8&&gap.distance<radius*2-1e-8&&
   segmentDistance(start,end,gap.from,gap.to)<=1e-8)return true;
 }
 return false;
}
export function agriculturalRayClear(state,nav,start,end,radius=0){
 // A canyon river stops physical agricultural impacts as well as hostile feet.
 // Reuse the native fluid classification; this runs only when resolving a hit.
 if(nav.field?.canyon){
  const samples=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.25));
  for(let i=0;i<=samples;i++)if(fluidAt(nav.field,start.x+(end.x-start.x)*i/samples,start.z+(end.z-start.z)*i/samples))return false;
 }

 const index=solidIndex(state,nav),items=new Set(index.large);
 for(let x=Math.floor(Math.min(start.x,end.x)/CELL);x<=Math.floor(Math.max(start.x,end.x)/CELL);x++)for(let z=Math.floor(Math.min(start.z,end.z)/CELL);z<=Math.floor(Math.max(start.z,end.z)/CELL);z++)for(const item of index.cells.get(x+','+z)??[])items.add(item);
 for(const {o,entity,polygon} of items){if(entity.status==='ruined')continue;if(polygon?sweptFootprintDistance(start,end,polygon)<=1e-8:edgeDistance(start,end,o.x,o.z)<=o.radius)return false;}
 return !narrowBarrierGapBlocks(index,start,end,radius);
}
function shieldBlocks(state,start,end){return state.spells.some(s=>s.kind==='shield'&&s.remaining>0&&edgeDistance(start,end,s.x,s.z)<=s.radius);}
export function resolveAgriculturalImpact(state,animal,target,nav){
 const profile=animal.damageProfile,point={x:target.x,z:target.z},heading=animal.heading??Math.atan2(point.x-animal.x,point.z-animal.z),fact={point,heading,radius:profile?.attackRadius??0,sectorDegrees:90,hits:[]};
 if(!validDamageProfile(profile))return {...fact,blocked:'invalid-profile'};
 if(animal.agriculturalAttackIds?.includes(animal.attackId))return {...fact,duplicate:true};
 if(!target.alive)return {...fact,blocked:'inactive-target'};
 if(typeof animal.attackId!=='string'||!animal.attackId.length||animal.attackId.length>96||animal.agriculturalAttackIds?.length>=64)return {...fact,blocked:'invalid-attack'};
 animal.agriculturalAttackIds??=[];animal.agriculturalAttackIds.push(animal.attackId);
 if(shieldBlocks(state,animal,point))return {...fact,blocked:'shield'};
 const dx=point.x-animal.x,dz=point.z-animal.z,distance=Math.hypot(dx,dz),forward={x:Math.sin(heading),z:Math.cos(heading)};
 const facesContact=distance<=1e-8||(dx*forward.x+dz*forward.z)/distance>=Math.SQRT1_2-1e-8;
 if(!Number.isFinite(animal.radius)||animal.radius<=0||!Number.isFinite(heading)
  ||distance>animal.radius+.65||!facesContact
  ||!nav.walkable(animal.x,animal.z,animal.radius,null,false)
  ||!agriculturalRayClear(state,nav,animal,point,animal.radius))return {...fact,blocked:'contact'};
 const candidates=nearby(state.plants,point,profile.attackRadius,nav.version).filter(p=>p!==target&&Math.hypot(p.x-point.x,p.z-point.z)<=profile.attackRadius+1e-8).filter(p=>{const x=p.x-point.x,z=p.z-point.z,d=Math.hypot(x,z);return d<1e-8||(x*forward.x+z*forward.z)/d>=Math.SQRT1_2-1e-8;}).sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z)||a.id.localeCompare(b.id));
 let reached=0;
 for(const p of [target,...candidates]){
  if(reached>=profile.areaCap)break;if(!p.alive||shieldBlocks(state,animal,p)||shieldBlocks(state,point,p)||!agriculturalRayClear(state,nav,animal,p,animal.radius)||!agriculturalRayClear(state,nav,point,p,animal.radius))continue;
  const central=p===target,requestedDamage=profile.cropDamage*(central?1:profile.peripheralWeight??.5),hit=applyCropImpact(state,p,requestedDamage);
  if(!hit)continue;reached++;
  fact.hits.push({targetId:p.id,...hit,central,attackId:animal.attackId,animalId:animal.id});
 }
 return fact;
}
