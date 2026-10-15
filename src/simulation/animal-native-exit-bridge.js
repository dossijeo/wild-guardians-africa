// A native route can fail to connect a valid fractional animal position to
// its grid. Probe a few nearby physical positions and reuse Wild Engine for
// the long route. Only the short first leg is new, and it must pass the same
// swept collision test as ordinary movement.
const attempts=new WeakMap();
const reaches=[.5,1,2,4,8,16],angles=16,samples=reaches.length*angles;
const probesPerTick=8,routesPerTick=2;

export function animalNativeExitBridge(actor,end,nav){
 if(actor.status!=='retreating'||!nav.spatialSectorRevision||
   !nav.walkable||!nav.segmentClear||!nav.path)
  return {pending:false,path:null};
 const radius=actor.radius??.28;
 const key=JSON.stringify([nav.version,nav.residencyRevision,
   actor.x,actor.z,end.x,end.z,radius]);
 let attempt=attempts.get(actor);
 if(!attempt||attempt.nav!==nav||attempt.key!==key){
  attempt={nav,key,next:0};attempts.set(actor,attempt);
 }
 const verify=()=>{
  if(!attempt.route)return null;
  const limit=Math.min(attempt.route.length,attempt.verified+8);
  for(;attempt.verified<limit;attempt.verified++){
   const from=attempt.verified?attempt.route[attempt.verified-1]:actor;
   const to=attempt.route[attempt.verified];
   if(!nav.walkable(to.x,to.z,radius,null,false)||
     !nav.segmentClear(from,to,radius,null,false)){
    attempt.route=null;return null;
   }
  }
  if(attempt.verified<attempt.route.length)return {pending:true,path:null};
  const path=attempt.route;attempts.delete(actor);
  return {pending:false,path};
 };
 const prior=verify();if(prior)return prior;
 let inspected=0,routes=0;
 const heading=Math.atan2(end.x-actor.x,end.z-actor.z);
 while(attempt.next<samples&&inspected<probesPerTick&&routes<routesPerTick){
  const index=attempt.next++,sample=index%angles;
  const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/8;
  const reach=reaches[Math.floor(index/angles)];
  const point={x:actor.x+Math.sin(heading+offset)*reach,
    z:actor.z+Math.cos(heading+offset)*reach};
  inspected++;
  if(!nav.walkable(point.x,point.z,radius,null,false)||
    !nav.segmentClear(actor,point,radius,null,false))continue;
  routes++;
  let route;
  try{route=nav.path(point,end,radius,null,false);}
  catch(error){
   if(error?.name!=='SpatialChunkUnavailable')throw error;
   nav.requestRaidConnectivity?.(point,end,radius);
   continue;
  }
  if(!route)continue;
  attempt.route=[point,...route];attempt.verified=0;
  return verify()??{pending:attempt.next<samples,path:null};
 }
 return {pending:attempt.next<samples,path:null};
}
