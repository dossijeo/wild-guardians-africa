import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const file=process.argv[2],seconds=Number(process.argv[3]??10);
if(!file||!Number.isInteger(seconds)||seconds<1||seconds>120)
  throw Error('Usage: node profile-frozen-native-tick.mjs state.json[.gz] seconds');
const bytes=readFileSync(file),state=deserialize((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
// Diagnostic A/B only: compare the same active world with retired entities
// removed before constructing the native projection. Never write this state.
const pruneHistory=process.argv.includes('--prune-history');
if(pruneHistory){state.plants=state.plants.filter(plant=>plant.alive);state.crates=state.crates.filter(crate=>!crate.delivered);}
const module=new WebAssembly.Module(readFileSync(new URL('../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const points=[...state.structures.filter(piece=>piece.kind==='wall'||piece.kind==='center'),
    ...state.villages.map(village=>village.entry??village)];
  const chunk=value=>Math.floor((value+24)/48),margin=48,desired=new Map();
  for(let z=chunk(Math.min(...points.map(point=>point.z))-margin);
    z<=chunk(Math.max(...points.map(point=>point.z))+margin);z++)
    for(let x=chunk(Math.min(...points.map(point=>point.x))-margin);
      x<=chunk(Math.max(...points.map(point=>point.x))+margin);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state),planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(state);const stopTasks=planner.observeTasks(state),stopWorld=planner.observeWorld(state);
  const timed=['planIfNeeded','flushWorldEvents','flushTaskEvents','reconcileNavigationRevision','reconcileWorkerRoutes','planHomeRoute'];
  const timing=Object.fromEntries(timed.map(name=>[name,0]));
  for(const name of timed){
    const original=planner[name];
    if(typeof original!=='function')continue;
    planner[name]=(...args)=>{
      const start=performance.now();
      try{return original(...args);}finally{timing[name]+=performance.now()-start;}
    };
  }
  nav.intentTaskPlanner=planner;
  try{
    for(let second=1;second<=seconds;second++){
      for(const name of timed)timing[name]=0;
      const start=performance.now();tick(state,1,nav);
      const ms=performance.now()-start,metrics=planner.metrics(state.elapsed);
      console.log(JSON.stringify({second,day:state.day,time:state.time,ms,pruneHistory,
        workers:state.workers.length,plants:state.plants.length,crates:state.crates.length,animals:state.raid?.animals.length??0,
        taskQueries:metrics.nativeTaskRouteQueries,planningCalls:metrics.nativePlanningCalls,
        timingMs:{...timing}}));
    }
    const active={day:state.day,time:state.time,elapsed:state.elapsed,nextId:state.nextId,
      rng:state.rng,ledger:state.ledger,workers:state.workers,tasks:state.tasks,
      plants:state.plants.filter(plant=>plant.alive),crates:state.crates.filter(crate=>!crate.delivered),
      structures:state.structures,raid:state.raid};
    console.log(JSON.stringify({phase:'final',pruneHistory,
      activeSha256:createHash('sha256').update(JSON.stringify(active)).digest('hex')}));
  }finally{stopTasks();stopWorld();delete nav.intentTaskPlanner;}
}finally{session.dispose();}
