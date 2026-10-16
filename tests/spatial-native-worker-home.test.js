import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialIntentBridge} from '../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;

test('native worker home route keeps a task-free handle across save restoration',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    let start,home;
    for(let z=-10;z<=10&&!home;z++)for(let x=-10;x<=10;x++){
      const from={x:x+.2,z:z+.2},to={x:x+1.2,z:z+.2};
      if(session.routeActor(from,to,{worker:true}).status==='found'){
        start=from;home=to;break;
      }
    }
    assert(home,'fixture needs a physically reachable worker home');
    const bridge=createSpatialIntentBridge(session);
    bridge.resetFromState(game);
    const worker={...game.workers[0],...start};
    const result=bridge.planHomeRoute(worker,home);
    assert.equal(result.status,'found');
    assert(result.path.length>0);
    assert(Math.hypot(result.path.at(-1).x-home.x,
      result.path.at(-1).z-home.z)<.01);
    assert.equal(session.core.wasm.nav_intent_actor(Number(worker.id.split('-').at(-1))),1);
    const record=new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_actor_ptr(),10);
    assert.equal(record[2],0,'returning home has no task');
    assert.equal(record[3],0,'returning home has no target lease');
    assert(bridge.cancelHomeIntent(worker.id));
    assert.equal(bridge.routePoints(result.routeHandle),null);
    bridge.resetFromState(game);
    const pointer=session.core.wasm.nav_intent_attack_route_input_ptr(
      result.path.length);
    new Float32Array(session.core.wasm.memory.buffer,pointer,
      result.path.length*2).set(result.path.flatMap(point=>[point.x,point.z]));
    assert.equal(session.core.wasm.nav_intent_restore_home(
      Number(worker.id.split('-').at(-1)),start.x,start.z,
      home.x,home.z,result.path.length),1);
    assert.equal(bridge.routePoints(result.routeHandle),null,
      'an old session handle never becomes valid after restoration');
  }finally{session.dispose();}
});
