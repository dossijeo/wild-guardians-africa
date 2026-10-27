import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const file=process.argv[2];
if(!file)throw Error('Usage: profile-task-query-burst.mjs state.json');
const snapshot=readFileSync(file);
const state=deserialize((file.endsWith('.gz')?gunzipSync(snapshot):snapshot).toString());
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const points=[...state.structures.filter(x=>x.kind==='wall'||x.kind==='center'),
    ...state.workers,...state.villages.map(x=>x.entry??x)];
  const chunk=value=>Math.floor((value+24)/48),desired=new Map();
  for(let z=chunk(Math.min(...points.map(x=>x.z))-48);
    z<=chunk(Math.max(...points.map(x=>x.z))+48);z++)
    for(let x=chunk(Math.min(...points.map(p=>p.x))-48);
      x<=chunk(Math.max(...points.map(p=>p.x))+48);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);await session.stream.whenIdle();
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(state);
  const idle=state.workers.filter(worker=>worker.status==='idle');
  const home=state.villages[0].entry??state.villages[0];
  const idleRoutes=idle.map(worker=>{
    const route=session.routeActorNative(worker,home,{worker:true,cached:false});
    let previous=worker;
    const invalidSegments=[];
    for(const point of route.points??[]){
      if(!session.actorStepClear(previous,point,{worker:true}))
        invalidSegments.push([previous,point]);
      previous=point;
    }
    return {id:worker.id,x:worker.x,z:worker.z,
    stand:session.actorCanStand(worker,{worker:true}),
    route:route.status,points:route.points?.length,invalidSegments,
    anchors:Array.from({length:5},(_,ix)=>ix-2).flatMap(dx=>
      Array.from({length:5},(_,iz)=>iz-2).map(dz=>({x:Math.round(worker.x)+dx,
        z:Math.round(worker.z)+dz})))
      .filter(point=>session.actorStepClear(worker,point,{worker:true}))
      .map(point=>({...point,stand:session.actorCanStand(point,{worker:true})}))};
  });
  const start=performance.now(),rows=bridge.planTasks();
  const elapsed=performance.now()-start;
  const statusCounts={};for(const row of rows)
    statusCounts[row.status]=(statusCounts[row.status]??0)+1;
  console.log(JSON.stringify({day:state.day,time:state.time,workers:state.workers.length,
    tasks:state.tasks.length,rows:rows.length,statusCounts,
    nativeRouteQueries:session.core.wasm.nav_intent_route_queries(),
    nativeCandidates:session.core.wasm.nav_intent_candidate_count(),
    elapsedMs:elapsed,idleRoutes,
    samples:rows.filter(row=>row.status!==1).slice(0,8)}));
}finally{session.dispose();}
