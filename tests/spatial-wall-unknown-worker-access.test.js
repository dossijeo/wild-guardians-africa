import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {quoteWallChain} from '../src/simulation/game.js';

test('a pre-existing pathless fleeing worker does not veto a legal farm gate',async()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/manglares712-d10-pathless-fleeing.json.gz',import.meta.url))).toString());
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map();
  const session=createSpatialGameSession(binary,state,
    {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-2;z<=2;z++)for(let x=0;x<=4;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-2)+Math.abs(z)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-72,-120,168,120]);
    const stranded=state.workers.find(worker=>worker.id==='worker-4866');
    assert.equal(stranded.status,'fleeing');
    assert.equal(stranded.path,null);
    assert(stranded.x<72,'the stranded worker lies outside the proposed ring');
    const home=state.villages.find(village=>village.id===stranded.villageId).entry;
    assert.equal(nav.regionConnected(stranded,home,.28,null,true),null);
    assert.equal(nav.workerPath(stranded,home),null);
    let routes=0,previews=0;
    const originalPath=nav.path,originalPreview=nav.withWallPreview;
    nav.path=(...args)=>{routes++;return originalPath(...args);};
    nav.withWallPreview=(...args)=>{previews++;return originalPreview(...args);};
    const before=serialize(state),updates=session.core.wasm.lazy_sector_updates();
    const plan=quoteWallChain(state,'zarzas',
      [[72,-18],[102,-18],[102,18],[72,18],[72,-18]],nav,
      {smooth:false,snap:false});
    assert.equal(plan.pieces.length,56);
    assert.equal(plan.gates,1);
    assert.equal(plan.cost,560);
    assert.equal(routes,0);
    assert.equal(previews,0);
    assert.equal(session.core.wasm.lazy_sector_updates(),updates);
    assert.equal(serialize(state),before);
  }finally{session.dispose();}
});
