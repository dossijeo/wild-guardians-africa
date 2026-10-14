// Reproduce the day-10 native worker route retry using independent sessions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as Game from '../../src/simulation/game.js';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const [input,stepsText='10']=process.argv.slice(2),steps=Number(stepsText);
assert(input&&Number.isSafeInteger(steps)&&steps>0&&steps<=50,
  'Usage: benchmark-native-worker-null-path SNAPSHOT.json [1..50 ticks]');
const bytes=readFileSync(input),wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const results=[];
for(const mode of ['base','cache','cache','base']){
  const state=deserialize(bytes.toString()),loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48),radius=4;
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    // Disable only the blocked-proof cache for A. The native planner and all
    // game rules stay identical in both arms.
    if(mode==='base')session.core.chunkRevision=undefined;
    const routeActor=session.routeActor,routeStatuses={};
    session.routeActor=(...args)=>{
      const result=routeActor(...args);
      const key=`${result.status}:${result.reason??''}`;
      routeStatuses[key]=(routeStatuses[key]??0)+1;
      return result;
    };
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([(cx-radius)*48-24,(cz-radius)*48-24,
      (cx+radius)*48+24,(cz+radius)*48+24]);
    const original=nav.workerPath;
    let calls=0,nulls=0,workerMs=0;
    nav.workerPath=(start,end,actorRadius,ignore)=>{
      calls++;
      const at=performance.now(),path=original(start,end,actorRadius,ignore);
      workerMs+=performance.now()-at;
      if(!path)nulls++;
      return path;
    };
    const rows=[];
    for(let i=0;i<steps;i++){
      const at=performance.now();Game.tick(state,1,nav);
      rows.push(performance.now()-at);
      if(state.result)break;
    }
    results.push({mode,ticks:rows.length,totalMs:rows.reduce((a,b)=>a+b,0),
      warmMs:rows.slice(1).reduce((a,b)=>a+b,0),firstMs:rows[0],
      calls,nulls,workerMs,
      version:nav.version,loadedChunks:loaded.size,routeStatuses,
      stateSha256:sha(serialize(state))});
  }finally{session.dispose();}
}
assert.equal(new Set(results.map(r=>r.stateSha256)).size,1,'Simulation changed');
console.log(JSON.stringify({snapshotSha256:sha(bytes),steps,order:'AB/BA',results},null,2));
