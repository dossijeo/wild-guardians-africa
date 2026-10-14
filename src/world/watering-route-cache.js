// Exact static queries only. Worker movement, target geometry, world replacement
// and every native navigation epoch invalidate admission; no rounded positions.
const worlds=new WeakMap(),MAX_ENTRIES=8192,MAX_POINTS=20000;
const context=nav=>[nav.version,nav.residencyRevision,nav.state,nav.field,nav.obstacles,nav.suppressed,
  nav.preparedPaths,nav.walkable,nav.segmentClear,nav.path,nav.workerSurface,
  nav.field?.surface,nav.field?.blocked,nav.field?.slope,nav.field?.waterInfo,
  nav.field?.canyon,nav.field?.riverLevel];
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const copy=route=>route?{...route,destination:{...route.destination},path:route.path.map(p=>({...p}))}:null;
export function cachedWateringRoute(worker,plant,nav,compute){
 const radius=worker.radius??.28;
 if(!Number.isSafeInteger(nav.version)||nav.version<1||!nav.state||
    ![worker.x,worker.z,plant.x,plant.z,radius].every(Number.isFinite))return compute(worker,plant,nav);
 const epoch=[compute,...context(nav)];let cache=worlds.get(nav);
 if(!cache||!same(cache.epoch,epoch)){cache={epoch,entries:new Map(),points:0};worlds.set(nav,cache);}
 // JSON normally folds -0 into 0, although atan2 can choose the opposite side.
 const key=JSON.stringify([worker.x,worker.z,radius,plant.x,plant.z,String(plant.id),plant.species,worker.terrainAvoidance??null],(_key,value)=>Object.is(value,-0)?{negativeZero:true}:value);
 if(cache.entries.has(key))return copy(cache.entries.get(key));
 const route=compute(worker,plant,nav),points=route?.path.length??0;
 // An injected navigator may change its epoch during the query. Do not admit
 // that answer under the old context, or retain an unbounded route.
 if(!same(epoch,[compute,...context(nav)])||points>MAX_POINTS)return route;
 while(cache.entries.size&&(cache.entries.size>=MAX_ENTRIES||cache.points+points>MAX_POINTS)){
  const oldest=cache.entries.keys().next().value;cache.points-=cache.entries.get(oldest)?.path.length??0;cache.entries.delete(oldest);
 }
 cache.entries.set(key,copy(route));cache.points+=points;return route;
}
