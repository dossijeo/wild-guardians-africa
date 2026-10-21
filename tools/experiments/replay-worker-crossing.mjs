import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {actorBlockers,actorSegmentClear,workerYieldPoint} from '../../src/simulation/actor-motion.js';

// Retain the continuous campaign's saved paths through a fresh native session
// to isolate mobile avoidance. This intentionally does not model load/replan.
const state=deserialize(gunzipSync(readFileSync(new URL(
  '../../docs/qa/worker-passage-replay/sabana-712-day9-crossing.json.gz',
  import.meta.url))).toString());
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48);
  for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([(cx-1)*48-24,(cz-1)*48-24,
    (cx+1)*48+24,(cz+1)*48+24]);
  for(const worker of state.workers)if(worker.path){
    worker.pathVersion=nav.version;
    worker.mobileRecoveryVersion=nav.version;
  }
  const ids=['worker-7072','worker-7088'];
  const actors=ids.map(id=>state.workers.find(worker=>worker.id===id));
  if(actors.some(actor=>!actor))throw Error('The frozen crossing workers are missing');
  const before=actors.map(({id,x,z,path})=>({id,x,z,next:path?.[0]??null}));
  const trace=[];
  const routeRemaining=actor=>{
    let prior=actor,total=0;
    for(const point of actor.path??[]){
      total+=Math.hypot(point.x-prior.x,point.z-prior.z);prior=point;
    }
    return total;
  };
  let yieldCandidates,proposedYield;
  if(process.argv.includes('--probe-yield')){
    for(let step=0;step<3;step++)tick(state,.1,nav);
    const actor=actors[1],blockers=actorBlockers(state,actor,true,8);
    proposedYield=workerYieldPoint(state,actor,actors[0],nav,blockers);
    yieldCandidates=[];
    for(const reach of [.5,1,1.5,2,3,4])for(let i=0;i<32;i++){
      const angle=i*Math.PI/16,point={x:actor.x+Math.sin(angle)*reach,
        z:actor.z+Math.cos(angle)*reach};
      if(!nav.workerMotionClear(actor,point,actor.radius??.28)||
        !actorSegmentClear(actor,point,actor,blockers))continue;
      yieldCandidates.push({point,reach,angle,
        rejoinClearNow:actorSegmentClear(point,actor.path[0],actor,blockers),
        routeDistance:Math.hypot(
        point.x-(actor.path?.[0]?.x??point.x),
        point.z-(actor.path?.[0]?.z??point.z))});
    }
    yieldCandidates.sort((a,b)=>a.reach-b.reach||a.routeDistance-b.routeDistance);
  }
  if(process.argv.includes('--trace-progress')){
    for(let step=0;step<10;step++){
      tick(state,.1,nav);
      trace.push(actors.map(actor=>({id:actor.id,x:actor.x,z:actor.z,
        destinationDistance:Math.hypot(actor.x-(actor.taskApproach?.destination?.x??actor.x),
          actor.z-(actor.taskApproach?.destination?.z??actor.z)),
        routeRemaining:routeRemaining(actor),waypoints:actor.path?.length??0,
        next:actor.path?.[0]??null,progressAt:actor.mobileProgressAt,
        phaseRemaining:actor.mobilePhaseRemaining??0})));
    }
  }else if(!yieldCandidates)tick(state,1,nav);
  const [a,b]=actors,distance=Math.hypot(a.x-b.x,a.z-b.z);
  console.log(JSON.stringify({day:state.day,time:state.time,
    mode:'saved paths retained for collision diagnosis',before,
    after:actors.map(({id,x,z,path,mobilePhaseRemaining})=>({id,x,z,
      next:path?.[0]??null,mobilePhaseRemaining:mobilePhaseRemaining??0})),
    distance,penetration:Math.max(0,(a.radius??.28)+(b.radius??.28)-distance),
    ...(trace.length?{trace}:{}),...(yieldCandidates?{
      blockerIds:actorBlockers(state,actors[1],true,8).map(body=>body.id),
      proposedYield,
      yieldCandidateCount:yieldCandidates.length,
      rejoinClearCount:yieldCandidates.filter(candidate=>candidate.rejoinClearNow).length,
      yieldCandidates:yieldCandidates.slice(0,15)}:{}),
    recoveryEvents:state.events.filter(event=>
      event.type==='ActorMobileCollisionRecovery'&&ids.includes(event.actorId))
      .map(({actorId,x,z,elapsed,duration})=>({actorId,x,z,elapsed,duration}))},null,2));
}finally{session.dispose();}
