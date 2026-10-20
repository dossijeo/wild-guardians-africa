import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import * as Game from '../../src/simulation/game.js';
import {deserialize} from '../../src/persistence/snapshots.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {animalExitConnector} from '../../src/simulation/animal-exit-connectors.js';

const input=process.argv[2],steps=Number(process.argv[3]??10),
  output=process.argv[4];
// Opt in to the campaign's native task planner when replaying saved native
// intent runs. The standalone profiler also supports legacy navigation.
const nativeIntents=process.env.WG_SPATIAL_PROFILE_NATIVE_INTENTS==='1';
if(!input||!Number.isSafeInteger(steps)||steps<1||steps>1000)
  throw Error('Usage: profile-spatial-campaign-snapshot <saved-state.json> [steps] [report.json]');
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const state=deserialize(readFileSync(input,'utf8'));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
});
let stopIntentTasks=null,stopIntentWorld=null,nav=null;
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48),residentRadius=Number(process.env.WG_SPATIAL_PROFILE_RADIUS??1);
  if(!Number.isSafeInteger(residentRadius)||residentRadius<1||residentRadius>4)
    throw RangeError('Expected resident radius 1–4 chunks');
  for(let z=cz-residentRadius;z<=cz+residentRadius;z++)for(let x=cx-residentRadius;x<=cx+residentRadius;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  nav=createSpatialNavigationMovement(session,state);
  session.core.enableConnectivityDiagnostics();
  nav.raidSelectionStats={};
  if(process.env.WG_UNSTABLE_SPATIAL_OBSTACLES==='1'){
    const getter=Object.getOwnPropertyDescriptor(nav,'obstacles').get;
    Object.defineProperty(nav,'obstacles',{configurable:true,
      get(){return [...getter.call(nav)];}});
  }
  if(process.env.WG_STABLE_SPATIAL_OBSTACLES==='1'){
    const getter=Object.getOwnPropertyDescriptor(nav,'obstacles').get;
    let version=-1,obstacles=null;
    Object.defineProperty(nav,'obstacles',{configurable:true,get(){
      if(obstacles===null||version!==nav.version){
        obstacles=getter.call(nav);version=nav.version;
      }
      return obstacles;
    }});
  }
  nav.setActiveBounds([(cx-residentRadius)*48-24,(cz-residentRadius)*48-24,
    (cx+residentRadius)*48+24,(cz+residentRadius)*48+24]);
  if(nativeIntents){
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    stopIntentTasks=planner.observeTasks(state);
    stopIntentWorld=planner.observeWorld(state);
    nav.intentTaskPlanner=planner;
  }
  const calls={},approachTargets=new Map();
  for(const name of ['workerPath','path','approachPath','walkable',
    'segmentClear','workerMotionClear','propsAt','regionFor',
    'regionConnected','setState','wallPlacement']){
    const fn=nav[name];if(typeof fn!=='function')continue;
    calls[name]={count:0,ms:0,...(name==='approachPath'?{found:0,blocked:0,unknown:0,
      unknownCauses:{},unknownExamples:[]}:{})};
    nav[name]=(...args)=>{
      const start=performance.now();
      try{const result=fn(...args);
        if(name==='approachPath'){
          calls[name][result?'found':'blocked']++;
          const id=String(args[1]?.id??'unknown');
          const row=approachTargets.get(id)??{calls:0,found:0,blocked:0,ms:0};
          row.calls++;row[result?'found':'blocked']++;
          row.ms+=performance.now()-start;approachTargets.set(id,row);
        }
        return result;
      }catch(error){if(name==='approachPath'&&error?.name==='SpatialChunkUnavailable')
        {calls[name].unknown++;
          const cause=error.details?.routeReason??'unspecified';
          calls[name].unknownCauses[cause]=(calls[name].unknownCauses[cause]??0)+1;
          if(calls[name].unknownExamples.length<3)
          calls[name].unknownExamples.push({start:error.start,end:error.end,
            missing:error.missing,details:error.details});}throw error;
      }finally{calls[name].count++;
        calls[name].ms+=performance.now()-start;}
    };
  }
  const rows=[];
  const heapBefore=process.memoryUsage().heapUsed;
  const sectorUpdatesBefore=session.core.wasm.lazy_sector_updates();
  const initialAnimals=new Map((state.raid?.animals??[]).map(a=>[a.id,
    {x:a.x,z:a.z,hits:a.hitsRemaining}]));
  for(let i=0;i<steps;i++){
    const start=performance.now(),day=state.day,time=state.time;
    Game.tick(state,1,nav);
    if(process.env.WG_SPATIAL_PROFILE_SERVICE_DEMAND==='1'){
      const key=[...(nav.raidConnectivityDemand??[])].find(item=>!loaded.has(item));
      if(key){const [x,z]=key.split(',').map(Number);
        if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
        loaded.set(key,session.core.chunkPayload());
      }
    }
    rows.push({day,time,ms:performance.now()-start,
      sectorUpdates:session.core.wasm.lazy_sector_updates()-sectorUpdatesBefore,
      connectivityDemand:nav.raidConnectivityDemand?.size??0,
      workers:state.workers.filter(w=>w.status!=='home').length,
      tasks:state.tasks.length,raidAnimals:state.raid?.animals?.length??0});
    if(state.day!==day||state.result)break;
  }
  const enclosureSamples={};
  for(const species of [...new Set((state.raid?.animals??[]).map(a=>a.species))]){
    const counts={};
    for(const plant of state.plants.filter(p=>p.alive)){
      session.actorRegions(plant,{worker:false,species});
      const code=session.core.enclosureAt({x:Math.round(plant.x),z:Math.round(plant.z)});
      counts[code]=(counts[code]??0)+1;
    }
    enclosureSamples[species]=counts;
  }
  const report={input,steps:rows.length,residentRadius,nativeIntents,calls,rows,
    topApproachTargets:[...approachTargets].sort((a,b)=>b[1].calls-a[1].calls).slice(0,30),
    raidSelection:nav.raidSelectionStats,
    connectivityDemand:[...(nav.raidConnectivityDemand??[])],
    sectorUpdates:session.core.wasm.lazy_sector_updates()-sectorUpdatesBefore,
    nativeConnectivityReasons:session.core.connectivityDiagnostics(),
    enclosureSamples,
    heapDeltaBytes:process.memoryUsage().heapUsed-heapBefore,
    totalMs:rows.reduce((sum,row)=>sum+row.ms,0),
    stateSha256:createHash('sha256').update(serialize(state)).digest('hex'),
    animals:(state.raid?.animals??[]).map(a=>({id:a.id,status:a.status,
      targetId:a.targetId,x:a.x,z:a.z,
      moved:Math.hypot(a.x-(initialAnimals.get(a.id)?.x??a.x),
        a.z-(initialAnimals.get(a.id)?.z??a.z)),
      hitsUsed:(initialAnimals.get(a.id)?.hits??a.hitsRemaining)-a.hitsRemaining,
      pathPoints:a.path?.length??0,pathHead:a.path?.[0]??null,
      pathHeadStaticClear:a.path?.[0]?nav.segmentClear(a,a.path[0],a.radius,null,false):null,
      exitDistance:a.exit?Math.hypot(a.x-a.exit.x,a.z-a.exit.z):null,
      pathVersion:a.pathVersion,recoveryAttempts:a.mobileRecoveryAttempts??0,
      secondsSinceProgress:state.elapsed-(a.mobileProgressAt??state.elapsed),
      mobilePhaseRemaining:a.mobilePhaseRemaining??0,
      dynamicStallSeconds:a.dynamicStallSeconds??0})),
    mobileRecoveryEvents:state.events.filter(e=>
      e.type==='ActorMobileCollisionRecovery').length,
    mobileRecoverySamples:state.events.filter(e=>
      e.type==='ActorMobileCollisionRecovery').map(e=>({actorId:e.actorId,
      elapsed:e.elapsed,x:e.x,z:e.z})),
    raidEventCounts:Object.fromEntries([...new Set(state.events.map(e=>e.type).filter(type=>type.startsWith('Animal')||type.startsWith('Crop')||type.startsWith('Structure')))].map(type=>[type,state.events.filter(e=>e.type===type).length])),
    wallRecoveryEvents:state.events.filter(e=>
      e.type==='AnimalWallOverlapRecovery').length,
    raidEnded:state.events.some(e=>e.type==='RaidEnded')};
  if(process.env.WG_RETREAT_CONNECTOR_PROBE==='1'){
    const actor=state.raid?.animals.find(a=>a.status==='retreating');
    if(actor){let path=null,attempts=0;const started=performance.now();
      for(;attempts<600&&!path;attempts++)path=animalExitConnector(actor,actor.exit,nav);
      report.retreatConnectorProbe={attempts,ms:performance.now()-started,
        pathPoints:path?.length??0,first:path?.[0]??null};
    }
  }
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  if(process.env.WG_SPATIAL_PROFILE_SAVE_STATE)
    writeFileSync(process.env.WG_SPATIAL_PROFILE_SAVE_STATE,serialize(state));
  console.log(JSON.stringify(report));
}finally{
  stopIntentTasks?.();stopIntentWorld?.();
  if(nav)delete nav.intentTaskPlanner;
  session.dispose();
}
