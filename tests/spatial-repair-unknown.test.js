import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from
  '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {repairRoute} from '../src/world/work-points.js';
import {tick} from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const frozen=JSON.parse(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-pr42-d7-repair.json.gz',import.meta.url))));

test('unresolved native repair routes defer tasks without hiding a working automatic gate',()=>{
  const state=deserialize(frozen),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let cz=-2;cz<=2;cz++)for(let cx=0;cx<=4;cx++){
      if(session.core.selectChunk(cx,cz)<0)session.core.addChunk(cx,cz);
      loaded.set(`${cx},${cz}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    const worker=state.workers.find(w=>w.id==='worker-3519');
    const target=state.structures.find(s=>s.id==='structure-1586');
    const gate=state.structures.find(s=>s.id==='structure-3072');
    assert(worker&&target&&gate?.gate);
    assert.throws(()=>repairRoute(worker,target,nav),error=>
      error instanceof SpatialChunkUnavailable&&error.missing.length===0&&
      error.details?.routeReason==='native-graph');
    for(const portal of gatePortalPoints(gate,.28))
      assert.equal(session.routeActor(worker,portal,{worker:true}).status,'found');
    for(let i=0;i<50;i++)assert.doesNotThrow(()=>tick(state,.1,nav));
    assert.equal(state.day,7);
    for(const id of ['task-3677','task-3678']){
      const task=state.tasks.find(t=>t.id===id);
      assert(task,'an unresolved repair remains available for a later topology change');
      assert.equal(task.workerId,null);
      assert.equal(task.blocked,false,'unknown must not be recorded as blocked');
    }
  }finally{session.dispose();}
});
