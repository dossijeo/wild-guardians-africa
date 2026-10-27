import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {workerWallOverlapRecoveryPath} from '../src/world/worker-wall-overlap-recovery.js';
import {walkTo} from '../src/simulation/game.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL(
  './fixtures/spatial-worker-wall-overlap.json',import.meta.url),'utf8'));

test('native worker can leave only its initially overlapping wall',()=>{
  const state={...fixture,workers:[structuredClone(fixture.worker)],spells:[]};
  const loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    const stableObstacles=nav.obstacles;
    assert.equal(nav.obstacles,stableObstacles,
      'unchanged topology must retain its obstacle-list identity');
    const actor=state.workers[0];
    const destination={id:'return-point',x:85,z:9};
    assert.equal(nav.walkable(actor.x,actor.z,.28,null,true),false);
    assert.equal(nav.workerPath(actor,destination,.28,null),null);
    const recovered=workerWallOverlapRecoveryPath(nav,actor,destination,.28);
    assert(recovered?.length>0);
    assert(nav.walkable(recovered[0].x,recovered[0].z,.28,null,true));
    assert(nav.wallOverlapMotionClear(actor,recovered[0],.28,['structure-2151']));
    assert.equal(nav.workerMotionClear(actor,recovered[0],.28),false);
    let from=recovered[0];
    for(const point of recovered.slice(1)){
      assert(nav.workerMotionClear(from,point,.28));
      from=point;
    }
    let moved=false;
    for(let tick=0;tick<30&&!nav.walkable(actor.x,actor.z,.28,null,true);tick++){
      const before={x:actor.x,z:actor.z};
      walkTo(state,actor,destination,.05,nav,{speed:2});
      assert(Math.hypot(actor.x-before.x,actor.z-before.z)<=.100001);
      moved||=Math.hypot(actor.x-before.x,actor.z-before.z)>1e-8;
    }
    assert(moved);
    assert(nav.walkable(actor.x,actor.z,.28,null,true));
    // The exceptional prefix ignores only the wall already containing the
    // worker. An unrelated new solid remains authoritative in C++.
    const blocker=session.core.addOrientedBarrier(actor.x,recovered[0].z-.15,
      .4,.15,0,0);
    assert(blocker>0);
    const trapped={...fixture.worker};
    assert.equal(nav.wallOverlapMotionClear(trapped,recovered[0],.28,
      ['structure-2151']),false);
    assert.equal(workerWallOverlapRecoveryPath(nav,trapped,destination,.28),null);
    const wall=state.structures.find(item=>item.id==='structure-2151');
    wall.status='ruined';nav.setState(state);
    assert.notEqual(nav.obstacles,stableObstacles,
      'removing a wall must invalidate the obstacle list');
  }finally{session.dispose();}
});
