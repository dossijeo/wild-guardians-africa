import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';
import {applyBalanceCandidate} from './balance-candidate.mjs';

const file=process.argv[2],seconds=Number(process.argv[3]??10);
if(!file||!Number.isInteger(seconds)||seconds<1||seconds>600)
  throw Error('Usage: node profile-frozen-native-tick.mjs state.json[.gz] seconds [--dt 0.1] [--candidate candidate.json] [--campaign-residency] [--prune-history]');
const dtIndex=process.argv.indexOf('--dt');
const dt=dtIndex<0?1:Number(process.argv[dtIndex+1]);
if(!Number.isFinite(dt)||dt<=0||dt>1||!Number.isInteger(1/dt))
  throw Error('--dt must divide one simulated second');
const candidateIndex=process.argv.indexOf('--candidate');
if(candidateIndex>=0){
  const candidateFile=process.argv[candidateIndex+1];
  if(!candidateFile)throw Error('Missing --candidate file');
  applyBalanceCandidate(JSON.parse(readFileSync(candidateFile,'utf8')));
}
const bytes=readFileSync(file),state=deserialize((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
// Diagnostic A/B only: compare the same active world with retired entities
// removed before constructing the native projection. Never write this state.
const pruneHistory=process.argv.includes('--prune-history');
const campaignResidency=process.argv.includes('--campaign-residency');
const radiusIndex=process.argv.indexOf('--resident-radius');
const residentRadius=radiusIndex<0?1:Number(process.argv[radiusIndex+1]);
if(!Number.isInteger(residentRadius)||residentRadius<1||residentRadius>6)
  throw Error('--resident-radius must be an integer from 1 to 6');
if(pruneHistory){state.plants=state.plants.filter(plant=>plant.alive);state.crates=state.crates.filter(crate=>!crate.delivered);}
const module=new WebAssembly.Module(readFileSync(process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const points=[...state.structures.filter(piece=>piece.kind==='wall'||piece.kind==='center'),
    ...state.villages.map(village=>village.entry??village)];
  const chunk=value=>Math.floor((value+24)/48),margin=48,desired=new Map();
  const center=state.structures.find(piece=>piece.kind==='center'&&piece.status==='intact'&&piece.hp>0);
  if(campaignResidency&&!center)throw Error('Campaign residency needs an operational center');
  if(campaignResidency){
    const cx=chunk(center.x),cz=chunk(center.z);
    for(let dz=-residentRadius;dz<=residentRadius;dz++)
      for(let dx=-residentRadius;dx<=residentRadius;dx++)
      desired.set(`${cx+dx},${cz+dz}`,{cx:cx+dx,cz:cz+dz,score:Math.hypot(dx,dz)});
  }else for(let z=chunk(Math.min(...points.map(point=>point.z))-margin);
    z<=chunk(Math.max(...points.map(point=>point.z))+margin);z++)
    for(let x=chunk(Math.min(...points.map(point=>point.x))-margin);
      x<=chunk(Math.max(...points.map(point=>point.x))+margin);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state),planner=createEventDrivenTaskPlanner(session);
  if(campaignResidency){
    const cx=chunk(center.x),cz=chunk(center.z);
    nav.setActiveBounds([(cx-residentRadius)*48-24,
      (cz-residentRadius)*48-24,(cx+residentRadius)*48+24,
      (cz+residentRadius)*48+24]);
    const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,
      nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
    nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
    nav.serviceRaidConnectivityDemand=()=>{
      const key=[...(nav.raidConnectivityDemand??[])].find(value=>!loaded.has(value));
      if(!key)return false;
      const [x,z]=key.split(',').map(Number);
      if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)
        throw Error(`Could not load demanded chunk ${key}`);
      loaded.set(key,session.core.chunkPayload());return true;
    };
  }
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
      const beforeElapsed=state.elapsed,start=performance.now();
      for(let step=0;step<Math.round(1/dt);step++){
        tick(state,dt,nav);nav.serviceRaidConnectivityDemand?.();
      }
      if(state.elapsed<=beforeElapsed)throw Error(`Frozen tick did not advance at second ${second}: ${JSON.stringify({day:state.day,time:state.time,pauses:state.pauses,result:state.result})}`);
      const ms=performance.now()-start,metrics=planner.metrics(state.elapsed);
      console.log(JSON.stringify({second,day:state.day,time:state.time,ms,pruneHistory,campaignResidency,
        workers:state.workers.length,plants:state.plants.length,crates:state.crates.length,animals:state.raid?.animals.length??0,
        taskQueries:metrics.nativeTaskRouteQueries,planningCalls:metrics.nativePlanningCalls,
        routeCacheHits:Number(session.core.wasm.spatial_route_cache_hits()),
        routeCacheMisses:Number(session.core.wasm.spatial_route_cache_misses()),
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
