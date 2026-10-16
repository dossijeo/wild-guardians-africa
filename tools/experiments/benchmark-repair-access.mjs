import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {planRepairAccess} from '../../src/simulation/game.js';
import {createSpatialGameSession} from
  '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';

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
    wallCount:game.structures.filter(piece=>piece.kind==='wall').length,
    workerCount:game.workers.length}));
}finally{session.dispose();}
