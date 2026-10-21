import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {actorSegmentClear} from '../../src/simulation/actor-motion.js';

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
  const yieldCandidates=[];
  const inspectYield=()=>actors.map(actor=>{
    const other=actors.find(candidate=>candidate!==actor);
    const waypoint=actor.path?.[0];
    if(!waypoint)return {actorId:actor.id,candidates:[]};
    const heading=Math.atan2(waypoint.x-actor.x,waypoint.z-actor.z);
    const candidates=[];
    for(const distance of [.65,.9,1.2,1.6,2.2])for(const angle of
      [Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
      const point={x:actor.x+Math.sin(heading+angle)*distance,
        z:actor.z+Math.cos(heading+angle)*distance};
      if(!nav.workerMotionClear(actor,point,actor.radius??.28))continue;
      if(!actorSegmentClear(actor,point,actor,[other]))continue;
      candidates.push({distance,angle,x:point.x,z:point.z});
    }
    return {actorId:actor.id,position:{x:actor.x,z:actor.z},
      waypoint,available:candidates.length,candidates:candidates.slice(0,5)};
  });
  const routeRemaining=actor=>{
    let prior=actor,total=0;
    for(const point of actor.path??[]){
      total+=Math.hypot(point.x-prior.x,point.z-prior.z);prior=point;
    }
    return total;
  };
  if(process.argv.includes('--trace-progress')){
    for(let step=0;step<10;step++){
      const beforeElapsed=state.elapsed;
      const beforeYield=process.argv.includes('--yield-candidates')?inspectYield():null;
      tick(state,.1,nav);
      if(beforeYield&&state.events.some(event=>
        event.type==='ActorMobileCollisionRecovery'&&ids.includes(event.actorId)&&
        event.elapsed>beforeElapsed+1e-8))
        yieldCandidates.push({step,beforeYield});
      trace.push(actors.map(actor=>({id:actor.id,x:actor.x,z:actor.z,
        destinationDistance:Math.hypot(actor.x-(actor.taskApproach?.destination?.x??actor.x),
          actor.z-(actor.taskApproach?.destination?.z??actor.z)),
        routeRemaining:routeRemaining(actor),waypoints:actor.path?.length??0,
        next:actor.path?.[0]??null,progressAt:actor.mobileProgressAt,
        phaseRemaining:actor.mobilePhaseRemaining??0})));
    }
  }else tick(state,1,nav);
  const [a,b]=actors,distance=Math.hypot(a.x-b.x,a.z-b.z);
  console.log(JSON.stringify({day:state.day,time:state.time,
    mode:'saved paths retained for collision diagnosis',before,
    after:actors.map(({id,x,z,path,mobilePhaseRemaining})=>({id,x,z,
      next:path?.[0]??null,mobilePhaseRemaining:mobilePhaseRemaining??0})),
    distance,penetration:Math.max(0,(a.radius??.28)+(b.radius??.28)-distance),
    ...(trace.length?{trace}:{}),...(yieldCandidates.length?{yieldCandidates}:{}),
    recoveryEvents:state.events.filter(event=>
      event.type==='ActorMobileCollisionRecovery'&&ids.includes(event.actorId))
      .map(({actorId,x,z,elapsed,duration})=>({actorId,x,z,elapsed,duration}))},null,2));
}finally{session.dispose();}
