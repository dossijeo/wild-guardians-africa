import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';

test('a retreating animal near a crop does not block a valid attack site',async()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/sabana712-d19-retreat-site-conflict.json.gz',import.meta.url))).toString());
  const wasm=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-2;z<=2;z++)for(let x=0;x<=4;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-2)+Math.abs(z)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-72,-120,168,120]);
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    const stopTasks=planner.observeTasks(state),stopWorld=planner.observeWorld(state);
    nav.intentTaskPlanner=planner;
    try{
      const retreater=state.raid.animals.find(a=>a.id==='animal-19857');
      const attacker=state.raid.animals.find(a=>a.id==='animal-19865');
      const exit=retreater.exit??retreater.spawn;
      assert.equal(retreater.status,'retreating');
      assert.equal(attacker.status,'walking');
      assert(Math.hypot(exit.x-attacker.approach.x,
        exit.z-attacker.approach.z)<attacker.radius+.1,
      'the frozen retreat exit overlaps the proposed attack site');
      assert.doesNotThrow(()=>Game.tick(state,.1,nav));
      assert.equal(attacker.status,'attacking');
      assert.equal(attacker.targetId,'plant-19596');
      assert.equal(state.raid.reservations[attacker.reservation],attacker.id);
      assert.equal(retreater.status,'retreating');
      assert.equal(retreater.targetId,null);
      assert.equal(session.core.wasm.nav_intent_actor(19857),1);
      assert.equal(session.core.wasm.nav_intent_actor(19865),1);
    }finally{stopTasks();stopWorld();}
  }finally{session.dispose();}
});
