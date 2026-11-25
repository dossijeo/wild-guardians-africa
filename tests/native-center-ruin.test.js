import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {deserialize, serialize} from '../src/persistence/snapshots.js';
import {tick} from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';

const binary = process.env.QA_BARRIER_WASM ?? new URL('../src/world/wild-engine/spatial-savanna.wasm', import.meta.url);
const module = new WebAssembly.Module(readFileSync(binary));
const recording = new URL('../docs/qa/raid-spawn-navigation/prepared-complete-browser-desert.json', import.meta.url);
const recorded = JSON.parse(readFileSync(recording)).timing.navigationContext;
const {activeBounds} = recorded;
const view = {bounds: activeBounds, ...recorded.raidView};
const chunkCoordinate = value => Math.floor((value + 24) / 48);
const chunkKeys = [];
for (let z = chunkCoordinate(activeBounds[1]); z <= chunkCoordinate(activeBounds[3]); z++) {
  for (let x = chunkCoordinate(activeBounds[0]); x <= chunkCoordinate(activeBounds[2]); x++) {
    chunkKeys.push(x + ',' + z);
  }
}

function residentSession(state) {
  const loaded = new Map();
  const session = createSpatialGameSession(module, state, {loaded: () => loaded});
  for (const key of chunkKeys) {
    const [cx, cz] = key.split(',').map(Number);
    if (session.core.selectChunk(cx, cz) < 0) assert(session.core.addChunk(cx, cz) >= 0);
    loaded.set(key, session.core.chunkPayload());
  }
  return session;
}

function beforeRaid() {
  const state = deserialize(recorded.state);
  assert.equal(state.biome, 'desierto');
  assert.equal(state.workers.length, 0);
  assert.equal(state.plants.length, 0);
  state.dayPlan = {done:false, at:state.time+.05, group:['warthog']};
  return state;
}

function savedAttack() {
  const state = beforeRaid();
  const session = residentSession(state);
  try {
    const nav = createSpatialNavigationMovement(session, state);
    nav.setActiveBounds(activeBounds);
    nav.raidView = recorded.raidView;
    nav.intentTaskPlanner = createEventDrivenTaskPlanner(session);
    nav.intentTaskPlanner.resetFromState(state);
    for (let i = 0; i < 5 && !state.raid?.animals[0]?.targetId; i++) tick(state, .05, nav);
    assert.equal(state.raid.animals[0].targetId, 'structure-2');
    assert.equal(state.structures[0].hp, 600);
    return serialize(state);
  } finally {
    session.dispose();
  }
}

import {copyPublishedNativeWorldBoundary} from '../src/world/native-world-boundary.js';

test('center ruin spends its retained ticket inside the ordinary Retreat substep', {timeout:90000}, async()=>{
 const initial=deserialize(savedAttack());
 initial.structures[0].hp=140;
 initial.raid.animals[0].hitsRemaining=1;
 let releaseReady;
 const readyGate=new Promise(resolve=>{releaseReady=resolve;});
 const fixture=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,
  onReady:record=>record.kind==='center-ruin'?readyGate:undefined});
 const checkpoint=()=>fixture.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
 const polygonIds=result=>result.nativeAuthorityCheckpoint.spatialState.polygons.map(row=>row.id);
 try{
  fixture.command({kind:'setNavigationView',view});
  await untilProduction(fixture,()=>fixture.records.some(row=>row.kind==='animal-crop-route'&&row.committed));
  const intact=checkpoint();
  let previous=JSON.parse(intact.snapshot),result,steps;
  const events=[];
  for(let command=0;command<1100;command++){
   const collapsing=previous.structures[0].status==='collapsing';
   steps=fixture.command({kind:'advance',seconds:collapsing?.05:.10,steps:2,nightFastForward:false,visualTerrain:collapsing});
   if(steps instanceof Promise)break;
   events.push(...steps.events);
   previous=JSON.parse(steps.snapshot);
   await fixture.present();
   assert.deepEqual(fixture.faults,[]);
  }
  assert(steps instanceof Promise,'expected the ordinary batch to wait at the terminal substep');
  let advanceError=null;
  steps.catch(error=>{advanceError=error;});
  const wait=async condition=>{
   for(let retry=0;retry<1000;retry++){
    if(advanceError)throw advanceError;
    assert.deepEqual(fixture.faults,[]);
    if(condition())return;
    await fixture.present();
   }
   assert.fail('center ruin did not reach its graphical boundary');
  };
  let retention;
  await wait(()=>!!(retention=fixture.records.find(row=>row.kind==='center-ruin'&&row.packet)));
  const source=retention.resources.nativeCenterRuin;
  assert(polygonIds(intact).includes(source.polygon));
  assert.equal(previous.structures[0].status,'collapsing');
  assert(previous.elapsed<source.boundary.effectiveTime,'fixture must keep the last publication before the substep');
  assert.throws(()=>fixture.authority.execute({kind:'snapshot',sequence:-1}),/owns this advance/);
  const activeBefore=(await fixture.client.inspectAsync()).consumer.activeSequence;
  await fixture.present();
  assert.equal((await fixture.client.inspectAsync()).consumer.activeSequence,activeBefore);
  assert.equal(retention.committed,false);
  releaseReady();
  await wait(()=>retention.committed);
  let submitted=null;
  const presentation=retention.packet.presented.then(value=>{submitted=value;});
  presentation.catch(error=>{advanceError=error;});
  await wait(()=>submitted!==null);
  await presentation;
  result=await steps;
  events.push(...result.events);
  const state=JSON.parse(result.snapshot),acquired={...source.boundary,effectiveTime:source.end};
  assert.equal(result.stepsExecuted,2);
  assert(state.elapsed>source.end);
  assert.deepEqual(retention.commit.worldBoundary,acquired);
  assert.equal(submitted.sequence,retention.packet.sequence);
  const display=(await fixture.client.inspectAsync()).consumer.nativeRouteFrame;
  assert.equal(display.sequence,submitted.sequence);
  assert.equal(display.clockElapsed,source.end);
  assert.deepEqual(display.worldBoundary,acquired);
  assert(display.bindings.some(binding=>binding.nativeAnimalCrop?.purpose==='retreat'));
  assert.equal(state.structures[0].status,'ruined');
  assert.equal(state.structures[0].hp,0);
  assert.equal(state.raid.animals[0].status,'retreating');
  assert(!polygonIds(checkpoint()).includes(source.polygon));
  const ruins=events.filter(row=>row.type==='StructureRuined');
  assert.deepEqual(ruins.map(row=>[row.targetId,row.simulationTime]),[[source.center,source.end]]);
  assert.equal(events.filter(row=>row.type==='AnimalLogicalHit').length,1);
  assert.deepEqual(copyPublishedNativeWorldBoundary(result,source.previous),acquired);
  const [record]=result.nativeWorldResources;
  assert.throws(()=>copyPublishedNativeWorldBoundary({...result,nativeWorldResources:[
   {...record,nativeCenterRuin:{...record.nativeCenterRuin,polygon:source.polygon+1}},
  ]},source.previous),/differs from its committed boundary/);
 }finally{
  releaseReady();
  await fixture.close();
 }
});
