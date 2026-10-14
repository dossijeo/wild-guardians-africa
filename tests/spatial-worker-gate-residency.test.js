import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

test('a saved desert gate gains its worker portal when neighboring chunks arrive',()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    // Session construction creates the worker graph before the neighboring
    // chunks are resident. Their arrival must invalidate portal connectors.
    for(let z=-1;z<=1;z++)for(let x=0;x<=2;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-24,-72,120,72]);
    const missing=state.structures.find(s=>s.id==='structure-3072');
    const connected=state.structures.find(s=>s.id==='structure-9865');
    for(const gate of [missing,connected]){
      const [a,b]=gatePortalPoints(gate,.28);
      assert.equal(nav.segmentClear(a,b,.28,null,true),true);
      assert.equal(nav.regionConnected(a,b,.28,null,true),true,gate.id);
      const route=nav.path(a,b,.28,null,true);
      assert(route?.length>0,gate.id);
      assert.equal(nav.path(a,b,1.1,null,false),null,
        'worker-only portal must not join animal regions');
    }
  }finally{session.dispose();}
});
