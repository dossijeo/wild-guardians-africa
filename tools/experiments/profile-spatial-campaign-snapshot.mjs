import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import * as Game from '../../src/simulation/game.js';
import {deserialize} from '../../src/persistence/snapshots.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const input=process.argv[2],steps=Number(process.argv[3]??10),
  output=process.argv[4];
if(!input||!Number.isSafeInteger(steps)||steps<1||steps>1000)
  throw Error('Usage: profile-spatial-campaign-snapshot <saved-state.json> [steps] [report.json]');
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const state=deserialize(readFileSync(input,'utf8'));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48),residentRadius=Number(process.env.WG_SPATIAL_PROFILE_RADIUS??1);
  if(!Number.isSafeInteger(residentRadius)||residentRadius<1||residentRadius>4)
    throw RangeError('Expected resident radius 1–4 chunks');
  for(let z=cz-residentRadius;z<=cz+residentRadius;z++)for(let x=cx-residentRadius;x<=cx+residentRadius;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
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
  const calls={};
  for(const name of ['workerPath','path','approachPath','walkable',
    'segmentClear','workerMotionClear','propsAt','regionFor',
    'regionConnected','setState','wallPlacement']){
    const fn=nav[name];if(typeof fn!=='function')continue;
    calls[name]={count:0,ms:0,...(name==='approachPath'?{found:0,blocked:0,unknown:0,unknownExamples:[]}:{})};
    nav[name]=(...args)=>{
      const start=performance.now();
      try{const result=fn(...args);
        if(name==='approachPath')calls[name][result?'found':'blocked']++;
        return result;
      }catch(error){if(name==='approachPath'&&error?.name==='SpatialChunkUnavailable')
        {calls[name].unknown++;if(calls[name].unknownExamples.length<3)
          calls[name].unknownExamples.push({start:error.start,end:error.end,
            missing:error.missing,details:error.details});}throw error;
      }finally{calls[name].count++;
        calls[name].ms+=performance.now()-start;}
    };
  }
  const rows=[];
  const initialAnimals=new Map((state.raid?.animals??[]).map(a=>[a.id,
    {x:a.x,z:a.z,hits:a.hitsRemaining}]));
  for(let i=0;i<steps;i++){
    const start=performance.now(),day=state.day,time=state.time;
    Game.tick(state,1,nav);
    rows.push({day,time,ms:performance.now()-start,
      workers:state.workers.filter(w=>w.status!=='home').length,
      tasks:state.tasks.length,raidAnimals:state.raid?.animals?.length??0});
    if(state.day!==day||state.result)break;
  }
  const report={input,steps:rows.length,residentRadius,calls,rows,
    totalMs:rows.reduce((sum,row)=>sum+row.ms,0),
    stateSha256:createHash('sha256').update(serialize(state)).digest('hex'),
    animals:(state.raid?.animals??[]).map(a=>({id:a.id,status:a.status,
      moved:Math.hypot(a.x-(initialAnimals.get(a.id)?.x??a.x),
        a.z-(initialAnimals.get(a.id)?.z??a.z)),
      hitsUsed:(initialAnimals.get(a.id)?.hits??a.hitsRemaining)-a.hitsRemaining,
      mobilePhaseRemaining:a.mobilePhaseRemaining??0,
      dynamicStallSeconds:a.dynamicStallSeconds??0})),
    mobileRecoveryEvents:state.events.filter(e=>
      e.type==='ActorMobileCollisionRecovery').length,
    wallRecoveryEvents:state.events.filter(e=>
      e.type==='AnimalWallOverlapRecovery').length,
    raidEnded:state.events.some(e=>e.type==='RaidEnded')};
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{session.dispose();}
