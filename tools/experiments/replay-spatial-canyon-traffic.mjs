import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize} from '../../src/persistence/snapshots.js';
import {updateRaid} from '../../src/simulation/raids.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';

const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: replay-spatial-canyon-traffic <state.json> <report.json>');
const state=deserialize(readFileSync(input,'utf8'));
const binary=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(binary,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
});
try{
  const actors=state.raid?.animals??[];
  const points=[...actors.flatMap(a=>[a,a.spawn,a.exit]),...state.structures];
  const bounds=[Math.min(...points.map(p=>p.x))-64,Math.min(...points.map(p=>p.z))-64,
    Math.max(...points.map(p=>p.x))+64,Math.max(...points.map(p=>p.z))+64];
  for(let z=Math.floor((bounds[1]+24)/48);z<=Math.floor((bounds[3]+24)/48);z++)
    for(let x=Math.floor((bounds[0]+24)/48);x<=Math.floor((bounds[2]+24)/48);x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
  const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);
  const original=actors.map(a=>({id:a.id,status:a.status,x:a.x,z:a.z,hits:a.hitsRemaining}));
  const started=performance.now();let elapsed=0,movements=0,maxStep=0;
  const dt=.1;
  for(;elapsed<180&&state.raid;elapsed+=dt){
    const before=new Map((state.raid?.animals??[]).map(a=>[a.id,{x:a.x,z:a.z}]));
    state.elapsed+=dt;updateRaid(state,dt,nav);
    for(const a of actors){
      const from=before.get(a.id),step=Math.hypot(a.x-from.x,a.z-from.z);
      if(step<=1e-8)continue;
      movements++;maxStep=Math.max(maxStep,step);
      assert(step<=3.8*dt+1e-7,`${a.id} exceeded normal movement speed`);
      assert(nav.segmentClear(from,a,a.radius,null,false),
        `${a.id} crossed a static barrier`);
    }
  }
  const remaining=(state.raid?.animals??[]).filter(a=>a.status!=='gone');
  const report={input,elapsed,wallMs:performance.now()-started,movements,maxStep,
    original,remaining:remaining.map(a=>{
      const next=a.path?.[0],distance=next?Math.hypot(next.x-a.x,next.z-a.z):0;
      const probe=distance>1e-8?{x:a.x+(next.x-a.x)*Math.min(.5,distance)/distance,
        z:a.z+(next.z-a.z)*Math.min(.5,distance)/distance}:null;
      const blockers=actorBlockers(state,a,false);
      return {id:a.id,status:a.status,x:a.x,z:a.z,hits:a.hitsRemaining,
        pathLength:a.path?.length??0,progressAge:state.elapsed-(a.mobileProgressAt??state.elapsed),
        progressDistance:a.mobileProgressDistance,actualDistance:Math.hypot(a.x-(a.status==='retreating'?a.exit.x:a.approach?.x??a.x),a.z-(a.status==='retreating'?a.exit.z:a.approach?.z??a.z)),
        next,probe,staticClear:probe?nav.segmentClear(a,probe,a.radius,null,false):null,
        nextFree:next?actorSegmentClear(next,next,a,blockers):null,
        dynamicClear:probe?actorSegmentClear(a,probe,a,blockers):null};
    }),
    recoveryEvents:state.events.filter(e=>e.type==='ActorMobileCollisionRecovery')
      .map(e=>({actorId:e.actorId,x:e.x,z:e.z,elapsed:e.elapsed})),
    raidEnded:!state.raid};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({elapsed,wallMs:report.wallMs,
    remaining:remaining.length,recoveries:report.recoveryEvents.length,raidEnded:report.raidEnded}));
}finally{session.dispose();}
