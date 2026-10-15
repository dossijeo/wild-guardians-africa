import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {reserveTasks} from '../../src/simulation/tasks.js';
import {wateringRoute,repairRoute} from '../../src/world/work-points.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from
 '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from
 '../../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
if(!binary)throw Error('Set WILD_ENGINE_NATIVE_ROUTE_WASM to the candidate binary');
const fixture=process.argv[2]??'tests/fixtures/desierto983-d15-partial-state.json.gz';
const workerCount=Number(process.argv[3]??5);
const taskCount=Number(process.argv[4]??30);
const state=deserialize(gunzipSync(readFileSync(fixture)).toString());
// The standalone JS control reserves only idle workers. In Game.tick the
// arrival phase temporarily makes new contracts idle before reservation;
// exclude other arriving workers here so both probes compare the same pool.
for(const worker of state.workers)if(worker.status==='arriving')worker.status='waiting';
for(const worker of state.workers.slice(0,workerCount)){
  const assigned=state.tasks.find(task=>task.id===worker.taskId);
  if(assigned)assigned.workerId=null;
  worker.taskId=null;worker.status='idle';worker.contractDay=state.day;
}
state.tasks=state.tasks.filter(task=>!task.workerId).slice(0,taskCount);
const loaded=new Map();
const session=createSpatialGameSession(new WebAssembly.Module(readFileSync(binary)),state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
   cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([(cx-4)*48-24,(cz-4)*48-24,
    (cx+4)*48+24,(cz+4)*48+24]);
  const calls={path:0,workerPath:0,segmentClear:0,walkable:0};
  for(const name of Object.keys(calls))if(typeof nav[name]==='function'){
    const original=nav[name].bind(nav);
    nav[name]=(...args)=>{calls[name]++;return original(...args);};
  }
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(state);
  const nativeStart=performance.now();
  const native=bridge.planTasks();
  const routeDiagnostics=process.argv.includes('--route-diagnostics');
  const originByWorker=new Map(state.workers.map(worker=>[worker.id,worker]));
  const routeLength=(origin,route)=>{
    let length=0,previous=origin;
    for(const point of route){
      length+=Math.hypot(point.x-previous.x,point.z-previous.z);
      previous=point;
    }
    return length;
  };
  const nativeRoutes=routeDiagnostics?new Map(native.filter(row=>row.status===1)
    .map(row=>{
      const workerId=`worker-${row.workerId}`;
      return [`task-${row.taskId}`,{
        workerId,length:routeLength(originByWorker.get(workerId),
          bridge.proposalRoute(row))}];
    })):null;
  const nativeMilliseconds=performance.now()-nativeStart;
  const nativeQueries=session.core.wasm.nav_intent_route_queries();
  bridge.discard();
  let jsCandidates=0;
  const jsRoutes=new Map();
  const jsStart=performance.now();
  reserveTasks(state,(worker,task,target)=>{
    jsCandidates++;
    try{
      if(task.kind==='repair')return repairRoute(worker,target,nav);
      if(task.kind==='initial'||task.kind==='water')return wateringRoute(worker,target,nav);
      return nav.workerPath(worker,target,.28,null);
    }catch(error){if(error instanceof SpatialChunkUnavailable)return null;throw error;}
  },(worker,task,target,route)=>{
    if(routeDiagnostics)jsRoutes.set(task.id,{workerId:worker.id,
      length:routeLength(worker,Array.isArray(route)?route:route.path)});
  });
  const jsMilliseconds=performance.now()-jsStart;
  const selected=state.tasks.filter(task=>task.workerId).map(task=>({
    taskId:task.id,workerId:task.workerId}));
  const nativeSelected=native.filter(row=>row.status===1).map(row=>({
    taskId:`task-${row.taskId}`,workerId:`worker-${row.workerId}`}));
  const mismatchCount=selected.filter(row=>!nativeSelected.some(nativeRow=>
    nativeRow.taskId===row.taskId&&nativeRow.workerId===row.workerId)).length+
    nativeSelected.filter(row=>!selected.some(jsRow=>
      jsRow.taskId===row.taskId&&jsRow.workerId===row.workerId)).length;
  const report={fixture,workerCount,taskCount,jsCandidates,nativeQueries,
    jsCalls:calls,nativeMilliseconds,jsMilliseconds,
    selected,native:native.map(row=>({taskId:row.taskId,workerId:row.workerId,
      status:row.status,cause:row.cause})),
    mismatches:mismatchCount};
  if(routeDiagnostics)report.routeComparisons=[...nativeRoutes].map(([taskId,nativeRoute])=>{
    const js=jsRoutes.get(taskId);
    return {taskId,workerId:nativeRoute.workerId,
      nativeLength:nativeRoute.length,jsLength:js?.workerId===nativeRoute.workerId?
        js.length:null};
  });
  if(process.argv.includes('--summary'))delete report.native;
  if(process.argv.includes('--summary'))delete report.selected;
  console.log(JSON.stringify(report,null,2));
}finally{session.dispose();}
