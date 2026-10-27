import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {quoteWallChain,walkTo} from '../src/simulation/game.js';

test('a pathless fleeing worker does not veto a farm quote with a traversable water opening',async()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/manglares712-d10-pathless-fleeing.json.gz',import.meta.url))).toString());
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
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
    // The water previously closed this perimeter. The five unbuildable
    // modules now leave traversable openings, so a door is unnecessary.
    assert.equal(plan.gates,0);
    assert.equal(plan.blockedPieces.length,5);
    assert.equal(plan.cost,560);
    assert.equal(routes,0);
    assert.equal(previews,0);
    assert.equal(session.core.wasm.lazy_sector_updates(),updates);
    assert.equal(serialize(state),before);
    assert.deepEqual(nav.wallWorkerReachability({x:105,z:-11},
      [{x:99,z:-11}],plan.pieces,plan.suppressed),['found'],
      'the proposed walls retain a physical worker crossing through the opening');
  }finally{session.dispose();}
});

test('a pathless fleeing worker reconnects locally and reaches the village',async()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/manglares712-d10-pathless-fleeing.json.gz',import.meta.url))).toString());
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
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
    const worker=state.workers.find(item=>item.id==='worker-4866');
    const village=state.villages.find(item=>item.id===worker.villageId);
    const home={...village.entry,id:`home-${village.id}`};
    assert.equal(nav.workerPath(worker,home),null);
    let reached=false;
    for(let i=0;i<3000&&!reached;i++){
      state.elapsed+=.1;
      const previous={x:worker.x,z:worker.z};
      reached=walkTo(state,worker,home,.1,nav,{motion:{flight:true}});
      if(Math.hypot(worker.x-previous.x,worker.z-previous.z)>1e-9)
        assert(nav.workerMotionClear(previous,worker,.28),
          'every recovery movement must respect native static collisions');
    }
    assert.equal(reached,true);
    assert(Math.hypot(worker.x-home.x,worker.z-home.z)<.05);
  }finally{session.dispose();}
});
