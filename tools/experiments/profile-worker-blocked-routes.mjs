import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import * as Game from '../../src/simulation/game.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString();
const classify=process.argv.includes('--classify');

function run(workerProof){
  const state=deserialize(snapshot),loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=0;x<=2;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-24,-72,120,72]);
    if(!workerProof)nav.workerPath=undefined;
    const counts={found:0,blocked:0,unknown:0},callers={},routeActor=session.routeActor;
    session.routeActor=(...args)=>{
      const result=routeActor(...args);counts[result.status]++;
      if(classify){
        const stack=new Error().stack;
        const caller=stack.includes('computeWateringRoute')?'watering-approach':
          stack.includes('repairRoute')?'repair-approach':
          stack.includes('walkTo')?'worker-movement':'other-task-planning';
        callers[caller]=(callers[caller]??0)+1;
      }
      return result;
    };
    const start=performance.now();
    Game.tick(state,1,nav);Game.tick(state,1,nav);
    const tickMs=performance.now()-start;
    const stateSha256=createHash('sha256').update(serialize(state)).digest('hex');
    return {workerProof,counts,...(classify?{callers}:{}),tickMs,stateSha256};
  }finally{session.dispose();}
}

const runs=[false,true,true,false].map(run);
if(new Set(runs.map(run=>run.stateSha256)).size!==1)throw Error('State diverged');
console.log(JSON.stringify({fixture:'desierto983-d15-partial-state',order:'ABBA',classify,runs},null,2));
