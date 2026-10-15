import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {repairCost} from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialIntentBridge,createEventDrivenTaskPlanner} from
 '../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const load=()=>deserialize(gunzipSync(readFileSync(new URL(
 './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());

test('native damaged lists update by HP event without rebuilding topology',
 {skip:!module&&'Build and select the spatial-services WASM first'},()=>{
 const game=load(),walls=game.structures.filter(item=>item.kind==='wall');
 const [first,second]=walls,center=game.structures.find(item=>item.kind==='center');
 first.hp=first.maxHp*.5;second.hp=second.maxHp*.75;
 center.hp=center.maxHp*.9;
 const session=createSpatialGameSession(module,game,{loaded:()=>new Map()});
 try{
  const bridge=createSpatialIntentBridge(session),wasm=session.core.wasm;
  bridge.resetFromState(game);
  assert.deepEqual(bridge.getDamagedWalls().map(item=>item.id),[first.id,second.id]);
  assert.deepEqual(bridge.getDamagedCenters().map(item=>item.id),[center.id]);
  assert.deepEqual(bridge.getDamagedWalls()[0].cost,repairCost(first));
  assert.equal(bridge.getDamagedWalls()[0].paidCoins,Math.ceil(first.cost*.5));
  const topology=wasm.nav_intent_topology_revision();
  const actionRevision=wasm.nav_intent_entity_revision();
  const damageRevision=wasm.nav_intent_damage_revision();

  second.hp=second.maxHp*.2;
  bridge.applyEvents(game,[{type:'structureDamage',entity:second}]);
  assert.deepEqual(bridge.getDamagedWalls().map(item=>item.id),[second.id,first.id]);
  assert.equal(wasm.nav_intent_topology_revision(),topology,'HP-only changes do not touch paths');
  assert.equal(wasm.nav_intent_entity_revision(),actionRevision,
   'HP-only changes do not invalidate an unrelated action plan');
  assert.equal(wasm.nav_intent_damage_revision(),damageRevision+1);
  first.hp=first.maxHp;
  bridge.applyEvents(game,[{type:'structureDamage',entity:first}]);
  assert.deepEqual(bridge.getDamagedWalls().map(item=>item.id),[second.id]);

  second.hp=0;second.status='ruined';
  bridge.applyEvents(game,[{type:'structureDamage',entity:second}]);
  assert.equal(bridge.getDamagedWalls()[0].paidCoins,second.cost,
   'ruined modules quote complete replacement');
  assert.equal(bridge.getDamagedWalls()[0].status,'ruined');
  const forged={...second,hp:second.maxHp+1};
  assert.throws(()=>bridge.applyEvents(game,[{type:'structureDamage',entity:forged}]),
   /rejected/);
  assert.equal(bridge.getDamagedWalls()[0].hp,0,
   'rejected event restores authoritative damage state');

  game.structures=game.structures.filter(item=>item.id!==second.id);
  bridge.applyEvents(game,[{type:'target',remove:true,id:second.id}]);
  assert.deepEqual(bridge.getDamagedWalls(),[]);
  assert.equal(wasm.nav_intent_topology_revision(),topology);
  const restored=deserialize(serialize(game));
  bridge.resetFromState(restored);
  assert.deepEqual(bridge.getDamagedWalls(),[]);
  assert.deepEqual(bridge.getDamagedCenters().map(item=>item.id),[center.id]);
 }finally{session.dispose();}
});

test('HP-only events do not wake the event-driven action planner',
 {skip:!module&&'Build and select the spatial-services WASM first'},()=>{
 const game=load(),wall=game.structures.find(item=>item.kind==='wall');
 const session=createSpatialGameSession(module,game,{loaded:()=>new Map()});
 try{
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(game);
  planner.planIfNeeded(0);planner.discard();
  const before=planner.metrics(0).nativePlanningCalls;
  wall.hp=wall.maxHp*.8;
  planner.applyEvents(game,[{type:'structureDamage',entity:wall}]);
  assert.equal(planner.planIfNeeded(1),null);
  assert.equal(planner.metrics(1).nativePlanningCalls,before);
 }finally{session.dispose();}
});
