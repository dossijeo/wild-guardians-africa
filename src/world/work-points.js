import {centerGeometry} from './centers.js';
import {findBuildingRoute} from './building-route-shortcut.js';
const failedWaterRoutes=new WeakMap(),FAILED_ROUTE_LIMIT=8192;
function failedWaterRouteCache(nav){
  if(!Number.isSafeInteger(nav.version)||!nav.state)return null;
  let cache=failedWaterRoutes.get(nav);
  if(!cache||cache.version!==nav.version||cache.field!==nav.field||cache.obstacles!==nav.obstacles){
    cache={version:nav.version,field:nav.field,obstacles:nav.obstacles,entries:new Set()};
    failedWaterRoutes.set(nav,cache);
  }
  return cache.entries;
}
// Service points outside the same footprints used by Navigation.
export function repairRoutePoints(worker,target,nav){
  const radius=.28,clearance=.1;
  let points;
  if(target.kind==='center'){
    const angle=Math.atan2(worker.x-target.x,worker.z-target.z);
    points=Array.from({length:16},(_,i)=>{
      const offset=i===0?0:Math.ceil(i/2)*(i%2?1:-1)*Math.PI/8;
      return {x:target.x+Math.sin(angle+offset)*(centerGeometry(target,nav.state).radius+radius+clearance),z:target.z+Math.cos(angle+offset)*(centerGeometry(target,nav.state).radius+radius+clearance)};
    });
  }else{
    const scale=target.gate?(target.material==='reforzado'?1.6:['adobe','piedra'].includes(target.material)?1.4:1):1;
    const width=1.09*scale+radius+clearance,depth=.22+radius+clearance,c=Math.cos(target.yaw??0),s=Math.sin(target.yaw??0);
    points=[[0,depth],[0,-depth],[width,0],[-width,0]].map(([x,z])=>({x:target.x+x*c+z*s,z:target.z-x*s+z*c}));
    points.sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z));
  }
  return points.map((point,index)=>({...point,id:`repair-point-${target.id}-${index}`}));
}
export function repairRoute(worker,target,nav){
  const radius=.28;
  for(const destination of repairRoutePoints(worker,target,nav)){
    const path=nav.path(worker,destination,radius,null,true);
    if(path)return {destination,path};
  }
  return null;
}

// Keep the worker body outside the crop interaction envelope. Try the near
// side first; blocked terrain/props/buildings use another physical approach.
export function canWaterFrom(worker,plant,nav){
  const reach=(plant.species==='platano'?.65:.45)+(worker.radius??.28)+.22;
  if(Math.hypot(worker.x-plant.x,worker.z-plant.z)>reach)return false;
  if(!nav.field?.surface||!nav.workerSurface)return true;
  // A close point on the canyon floor is not a watering point for a crop on
  // the plateau above it. River crossing permission does not extend the spout.
  return Math.abs(nav.workerSurface(worker.x,worker.z)-nav.field.surface(plant.x,plant.z))<=.5;
}
export function wateringRoutePoints(worker,plant,nav){
 const radius=worker.radius??.28,standOff=(plant.species==='platano'?.65:.45)+radius+.1;
 const angle=Math.atan2(worker.x-plant.x,worker.z-plant.z);
 return [0,1,-1,2,-2,3,-3,4].map((offset,index)=>{
  const yaw=angle+offset*Math.PI/4;
  return {x:plant.x+Math.sin(yaw)*standOff,z:plant.z+Math.cos(yaw)*standOff,id:`water-point-${plant.id}-${index}`};
 }).filter(point=>canWaterFrom({...point,radius},plant,nav));
}
export function wateringRoute(worker,plant,nav){
  const radius=worker.radius??.28,standOff=(plant.species==='platano'?.65:.45)+radius+.1;
  // An idle worker retries blocked tasks every 0.1 simulated seconds. Exact
  // negative results stay negative while both actor coordinates and the live
  // navigation epoch are unchanged; a move or topology update retries fully.
  const failures=failedWaterRouteCache(nav),key=failures?JSON.stringify([worker.x,worker.z,radius,plant.id,plant.x,plant.z,plant.species]):null;
  if(key&&failures.has(key))return null;
  const angle=Math.atan2(worker.x-plant.x,worker.z-plant.z);
  // Bounded geometric probe before an expensive A* fallback. Every edge
  // uses the same native body, terrain, slope and fluid constraints.
  if(nav.segmentClear&&nav.obstacles){
    const offsets=[0,1,-1,2,-2,3,-3,4];
    for(const index of [0,4,1,3,2]){
      const yaw=angle+offsets[index]*Math.PI/4,destination={x:plant.x+Math.sin(yaw)*standOff,z:plant.z+Math.cos(yaw)*standOff,id:`water-point-${plant.id}-${index}`};
      if(!canWaterFrom({...destination,radius},plant,nav)||nav.walkable?.(destination.x,destination.z,radius,null,true)===false)continue;
      if(nav.segmentClear(worker,destination,radius,null,true))return {destination,path:[{x:destination.x,z:destination.z}]};
      const direct=Math.hypot(destination.x-worker.x,destination.z-worker.z);
      const path=findBuildingRoute(nav,worker,destination,radius,null,direct*1.5+1);
      if(path)return {destination,path};
    }
  }
  for(const [index,offset] of [0,1,-1,2,-2,3,-3,4].entries()){
    const yaw=angle+offset*Math.PI/4,destination={x:plant.x+Math.sin(yaw)*standOff,z:plant.z+Math.cos(yaw)*standOff,id:`water-point-${plant.id}-${index}`};
    if(!canWaterFrom({...destination,radius},plant,nav))continue;
    if(nav.walkable?.(destination.x,destination.z,radius,null,true)===false)continue;
    const path=nav.path(worker,destination,radius,null,true);
    if(path)return {destination,path};
  }
  if(key){if(failures.size>=FAILED_ROUTE_LIMIT)failures.delete(failures.values().next().value);failures.add(key);}
  return null;
}
