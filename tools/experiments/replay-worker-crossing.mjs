import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

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
  tick(state,1,nav);
  const [a,b]=actors,distance=Math.hypot(a.x-b.x,a.z-b.z);
  console.log(JSON.stringify({day:state.day,time:state.time,
    mode:'saved paths retained for collision diagnosis',before,
    after:actors.map(({id,x,z,path,mobilePhaseRemaining})=>({id,x,z,
      next:path?.[0]??null,mobilePhaseRemaining:mobilePhaseRemaining??0})),
    distance,penetration:Math.max(0,(a.radius??.28)+(b.radius??.28)-distance),
    recoveryEvents:state.events.filter(event=>
      event.type==='ActorMobileCollisionRecovery'&&ids.includes(event.actorId))
      .map(({actorId,x,z,elapsed,duration})=>({actorId,x,z,elapsed,duration}))},null,2));
}finally{session.dispose();}
