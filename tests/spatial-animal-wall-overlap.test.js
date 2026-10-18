import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {animalWallOverlapRecovery} from '../src/world/worker-wall-overlap-recovery.js';
import {walkTo} from '../src/simulation/game.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL(
  './fixtures/spatial-animal-wall-overlap.json',import.meta.url),'utf8'));

test('retreating animal escapes only its initially overlapping wall',()=>{
  const state=structuredClone(fixture),loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    const actor=state.raid.animals[0],destination={...actor.exit,id:`exit-${actor.id}`};
    for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      session.core.selectChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    assert.equal(nav.walkable(actor.x,actor.z,actor.radius,null,false),false);
    const recovery=animalWallOverlapRecovery(nav,actor,destination,actor.radius);
    assert(recovery);
    assert.deepEqual(recovery.wallIds,['structure-1944']);
    assert(nav.walkable(recovery.exit.x,recovery.exit.z,actor.radius,null,false));
    assert(nav.wallOverlapMotionClear(actor,recovery.exit,actor.radius,
      recovery.wallIds,false));
    assert.equal(nav.segmentClear(actor,recovery.exit,actor.radius,null,false),false);
    for(let i=0;i<40&&!actor.wallEscape;i++)walkTo(state,actor,destination,
      .001,nav,{speed:3.8,worker:false,expandRoute:true,routeVia:actor.spawn});
    assert(actor.wallEscape,'the bounded prefix must survive a saved movement step');
    const restored=JSON.parse(JSON.stringify(state)),restoredActor=restored.raid.animals[0];
    let moved=false;
    for(let i=0;i<40&&!nav.walkable(actor.x,actor.z,actor.radius,null,false);i++){
      const before={x:actor.x,z:actor.z};
      walkTo(state,actor,destination,.05,nav,{speed:3.8,worker:false,
        expandRoute:true,routeVia:actor.spawn});
      walkTo(restored,restoredActor,destination,.05,nav,{speed:3.8,
        worker:false,expandRoute:true,routeVia:restoredActor.spawn});
      assert.deepEqual({x:restoredActor.x,z:restoredActor.z},
        {x:actor.x,z:actor.z},'save/reload keeps the same physical prefix');
      const distance=Math.hypot(actor.x-before.x,actor.z-before.z);
      assert(distance<=.190001);
      moved||=distance>1e-8;
    }
    assert(moved);
    assert(nav.walkable(actor.x,actor.z,actor.radius,null,false));
    assert.equal(actor.wallEscape,undefined);
    assert(state.events.some(event=>event.type==='AnimalWallOverlapRecovery'));
    const blocker=session.core.addOrientedBarrier(actor.x,recovery.exit.z-.15,
      .4,.15,0,0);
    assert(blocker>0);
    assert.equal(nav.wallOverlapMotionClear(fixture.raid.animals[0],recovery.exit,
      actor.radius,recovery.wallIds,false),false,
      'an unrelated new barrier remains solid during exceptional recovery');
  }finally{session.dispose();}
});

test('destroying the overlapped wall invalidates the exceptional prefix',()=>{
  const state=structuredClone(fixture),loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    const actor=state.raid.animals[0],destination={...actor.exit,id:`exit-${actor.id}`};
    for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      session.core.selectChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    for(let i=0;i<40&&!actor.wallEscape;i++)walkTo(state,actor,destination,
      .001,nav,{speed:3.8,worker:false,expandRoute:true,routeVia:actor.spawn});
    assert(actor.wallEscape);
    state.structures.find(item=>item.id==='structure-1944').status='ruined';
    nav.setState(state);
    const before={x:actor.x,z:actor.z};
    walkTo(state,actor,destination,.05,nav,{speed:3.8,worker:false,
      expandRoute:true,routeVia:actor.spawn});
    assert.equal(actor.wallEscape,undefined);
    assert(Math.hypot(actor.x-before.x,actor.z-before.z)<=.190001);
  }finally{session.dispose();}
});
