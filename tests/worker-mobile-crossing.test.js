import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {tick} from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

test('day-9 worker recovery keeps mobile body clearance',()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    '../docs/qa/worker-passage-replay/sabana-712-day9-crossing.json.gz',
    import.meta.url))).toString());
  const wasm=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
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
    assert.ok(actors.every(Boolean));
    tick(state,1,nav);
    const [a,b]=actors;
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=(a.radius??.28)+(b.radius??.28)-1e-6,
      'a recovery must not let a worker pass through another body');
  }finally{session.dispose();}
});
