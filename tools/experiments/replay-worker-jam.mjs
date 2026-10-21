import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const [path,secondsArg='10']=process.argv.slice(2);
const seconds=Number(secondsArg);
if(!path||!Number.isFinite(seconds)||seconds<=0||seconds>30)
  throw Error('Usage: replay-worker-jam <snapshot.json> [seconds <= 30]');
const bytes=readFileSync(path);
const state=deserialize((path.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
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
  const ids=['worker-8276','worker-8277','worker-8278'];
  const actors=ids.map(id=>state.workers.find(worker=>worker.id===id));
  if(actors.some(actor=>!actor))throw Error('The jam workers are missing');
  const rows=[];
  for(let step=0;step<Math.ceil(seconds*10);step++){
    tick(state,.1,nav);
    if(step%10!==9)continue;
    const pairs=[];
    for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){
      const a=actors[i],b=actors[j],distance=Math.hypot(a.x-b.x,a.z-b.z);
      pairs.push({a:a.id,b:b.id,distance,
        penetration:Math.max(0,(a.radius??.28)+(b.radius??.28)-distance)});
    }
    rows.push({time:state.time,actors:actors.map(actor=>({id:actor.id,
      status:actor.status,x:actor.x,z:actor.z,
      next:actor.path?.[0]??null,remaining:actor.path?.length??0,
      stall:actor.dynamicStallSeconds??0})),pairs});
  }
  console.log(JSON.stringify({source:path,seconds,rows},null,2));
}finally{session.dispose();}
