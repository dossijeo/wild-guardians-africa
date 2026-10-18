import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {planRepairAccess} from '../../src/simulation/game.js';
import {operational} from '../../src/simulation/rules.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {createSpatialGameSession} from
  '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../../src/world/wild-engine/spatial-navigation-movement.js';

const wasmPath=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
if(!wasmPath)throw Error('Set WILD_ENGINE_NATIVE_ROUTE_WASM');
const snapshotPath=process.argv[2];
const targetId=process.argv[3];
const iterations=Number(process.argv[4]??3);
if(!snapshotPath||!targetId||!Number.isInteger(iterations)||iterations<1)
  throw Error('Usage: benchmark-repair-access.mjs SNAPSHOT.gz WALL_ID [ITERATIONS]');

const bytes=readFileSync(snapshotPath);
const game=deserialize((snapshotPath.endsWith('.gz')?
  gunzipSync(bytes):bytes).toString());
const target=game.structures.find(piece=>piece.id===targetId);
if(!target||target.kind!=='wall')throw Error(`No wall ${targetId}`);
target.status='ruined';target.hp=0;
const module=new WebAssembly.Module(readFileSync(wasmPath));
const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const desired=new Map();
  const points=[...game.structures.filter(piece=>piece.kind==='wall'),
    ...game.structures.filter(piece=>piece.kind==='center'),
    ...game.workers,...game.villages.map(village=>village.entry??village)];
  const chunk=value=>Math.floor((value+24)/48);
  const margin=48;
  for(let z=chunk(Math.min(...points.map(point=>point.z))-margin);
    z<=chunk(Math.max(...points.map(point=>point.z))+margin);z++)
    for(let x=chunk(Math.min(...points.map(point=>point.x))-margin);
      x<=chunk(Math.max(...points.map(point=>point.x))+margin);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,game),timings=[];
  const villages=new Map(game.villages.map(village=>[village.id,village]));
  const witnesses=[...game.structures.filter(operational).map(center=>({
    start:centerServicePoint(center,game,.8),
    end:villages.get(center.villageId)?.entry})),
  ...game.workers.filter(worker=>worker.status!=='home').map(worker=>({
    start:worker,end:villages.get(worker.villageId)?.entry}))]
    .filter(query=>query.end);
  const routeTiming={sequentialMs:[],batchMs:[],connectivityMs:[],
    batchMatches:true,routeStatuses:[],connectivityStatuses:[]};
  for(let i=0;i<3;i++){
    let start=performance.now();
    const sequential=witnesses.map(query=>session.routeActorNative(
      query.start,query.end,{worker:true,cached:false}));
    if(i===0)routeTiming.routeStatuses=sequential.map(result=>result.status);
    routeTiming.sequentialMs.push(performance.now()-start);
    start=performance.now();
    const batch=session.routeActorNativeBatch(witnesses,{worker:true});
    routeTiming.batchMs.push(performance.now()-start);
    routeTiming.batchMatches&&=batch.every((result,index)=>
      result.status===sequential[index].status);
    start=performance.now();
    const connected=witnesses.map(query=>session.actorConnectivity(
      query.start,query.end,{worker:true}));
    if(i===0)routeTiming.connectivityStatuses=connected;
    routeTiming.connectivityMs.push(performance.now()-start);
  }
  let previewCalls=0,routeCalls=0,previewMs=0,routeMs=0;
  const previewBatch={calls:0,ms:0,mismatches:0,examples:[],connectivity:[]};
  const preview=nav.withWallStatePreview,physicalRoute=nav.workerPhysicalRoute;
  nav.withWallStatePreview=(walls,inspect)=>{
    previewCalls++;
    const start=performance.now();
    try{return preview(walls,({route})=>{
      const queries=[],results=[];
      previewBatch.connectivity.push(witnesses.map(query=>
        session.actorConnectivity(query.start,query.end,{worker:true})));
      let batch=null;
      if(process.env.WILD_ENGINE_COMPARE_BATCH==='1'){
        const batchStart=performance.now();
        batch=session.routeActorNativeBatch(witnesses,{worker:true});
        previewBatch.calls++;
        previewBatch.ms+=performance.now()-batchStart;
      }
      const value=inspect({route:(from,to)=>{
        routeCalls++;
        const routeStart=performance.now();
        try{
          const result=route(from,to);
          queries.push({start:from,end:to});results.push(result);
          return result;
        }finally{routeMs+=performance.now()-routeStart;}
      }});
      if(batch&&queries.length){
        previewBatch.mismatches+=results.filter((result,index)=>{
          const query=queries[index],batchIndex=witnesses.findIndex(witness=>
            Math.hypot(witness.start.x-query.start.x,
              witness.start.z-query.start.z)<1e-5&&
            Math.hypot(witness.end.x-query.end.x,
              witness.end.z-query.end.z)<1e-5);
          const mismatch=batchIndex<0||result.status!==batch[batchIndex].status;
          if(mismatch&&previewBatch.examples.length<8)
            previewBatch.examples.push({index,batchIndex,
              sequential:result.status,batch:batch[batchIndex]?.status});
          return mismatch;
        }).length;
      }
      return value;
    });}finally{previewMs+=performance.now()-start;}
  };
  nav.workerPhysicalRoute=(start,end)=>{
    routeCalls++;
    const routeStart=performance.now();
    try{return physicalRoute(start,end);}finally{routeMs+=performance.now()-routeStart;}
  };
  let plan;
  for(let i=0;i<iterations;i++){
    const start=performance.now();
    plan=planRepairAccess(game,target,nav);
    timings.push(performance.now()-start);
  }
  console.log(JSON.stringify({snapshot:snapshotPath,targetId,iterations,
    status:plan.status,gates:plan.updates.filter(piece=>piece.gate)
      .map(piece=>({id:piece.id,x:piece.x,z:piece.z})),
    timingsMs:timings,meanMs:timings.reduce((a,b)=>a+b,0)/timings.length,
    previewCalls,routeCalls,previewMs,routeMs,routeTiming,previewBatch,
    wallCount:game.structures.filter(piece=>piece.kind==='wall').length,
    workerCount:game.workers.length}));
}finally{session.dispose();}
