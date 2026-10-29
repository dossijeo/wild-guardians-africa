import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {applyGuardianAttack} from '../src/simulation/guardian-combat.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
test('Guardian releases a committed strike in the shipped native WASM before replanning',()=>{
 const state=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/desierto712-d79-pending-attack.json.gz',import.meta.url))));
 const animal=state.raid.animals[0];animal.status='attacking';animal.path=[];animal.attackRemaining=1;animal.hitApplied=false;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-2;z<=2;z++)for(let x=0;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const planner=createEventDrivenTaskPlanner(session);const restored=planner.resetFromState(state);assert.ok(restored.restoredAnimalAttacks>0,'fixture restores a committed native strike');
  const reservation=animal.reservation,hits=animal.hitsRemaining;
  assert.equal(planner.cancelAttackIntent(animal.id),false,'native committed action refuses ordinary cancellation');
  applyGuardianAttack(state,animal,{nav:{intentTaskPlanner:planner}});
  assert.equal(animal.status,'walking');assert.equal(animal.targetId,null);assert.equal(state.raid.reservations[reservation],undefined);
  assert.equal(animal.hitsRemaining,hits,'interruption does not apply the interrupted strike');
  assert.doesNotThrow(()=>planner.planAttackCrop(state,animal),'new selection must not retain the committed action');
 }finally{session.dispose();}
});
