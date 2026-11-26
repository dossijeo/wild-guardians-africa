import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {deserialize, serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {tick} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {nativeAnimalCropPublicationMatches,nativeRetreatBudgetAllowed} from '../src/simulation/raids.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {recoverRetreatAfterRuin} from './helpers/native-center-ruin-recovery.js';

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

async function restoreShelteredRetreat(checkpoint,manifest,source){
 const state=JSON.parse(checkpoint.snapshot);
 assert.equal(checkpoint.saveAvailable,true);
 const stored=prepareWorkerCheckpoint(checkpoint,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
 assert.equal(stored.saved,true);
 const [animal]=stored.state.raid.animals,options=savedNativeAuthorityOptions(serialize(stored.state));
 assert.ok(animal.path?.length);
 assert.equal(options.nativeWorkerLifecycle,true);
 const missingCorridor=structuredClone(stored.state);
 missingCorridor.raid.animals[0].path=null;
 assert.throws(()=>createSimulationAuthority(module,serialize(missingCorridor),options.chunkKeys,options),/Saved native Retreat has no restorable corridor/);

 let releaseReady;
 const restored=await nativeProductionAuthority(stored.state,{...options,getTerrainManifest:()=>manifest,
  onReady:()=>new Promise(resolve=>{releaseReady=resolve;})});
 const advance=()=>restored.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
 try{
  restored.command({kind:'setNavigationView',view:options.navigationView});
  await untilProduction(restored,()=>releaseReady);
  const [route]=restored.records,{reference,rows}=route.resources;
  assert.equal(reference.purpose,'retreat');
  assert.notEqual(reference.worldBoundary.authorityEpoch,source.retreat.reference.worldBoundary.authorityEpoch);
  assert.deepEqual(Array.from(rows.slice(1,5)),[animal.x,animal.z,0,animal.motionPhase]);
  assert.equal(reference.yaw,animal.heading);
  assert.deepEqual([reference.targetX,reference.targetZ],[animal.exit.x,animal.exit.z]);
  const rebuilt=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(rebuilt.nativeAuthorityCheckpoint.spatialState,checkpoint.nativeAuthorityCheckpoint.spatialState);
  assert.equal(rebuilt.nativeAuthorityCheckpoint.workerLifecycle,1);
  assert.deepEqual(JSON.parse(rebuilt.snapshot).raid.animals[0].path,animal.path);
  const held=await advance();
  assert.ok(held.elapsed>checkpoint.elapsed);
  assert.deepEqual(JSON.parse(held.snapshot).raid.animals[0],animal);
  assert.equal(route.committed,false);
  releaseReady();
  await untilProduction(restored,()=>route.committed);
  await route.packet.presented;
  const {bindings}=restored.host.inspect().nativeRouteFrame;
  assert(bindings.some(row=>row.nativeAnimalCrop?.purpose==='retreat'&&row.relativeTime===0));

  let final=JSON.parse(held.snapshot);
  const facts=[];
  for(let i=0;i<500&&!final.result;i++){
   const next=await advance();facts.push(...next.events);final=JSON.parse(next.snapshot);await restored.present();
  }
  assert.equal(final.result,'defeat');
  assert.equal(final.raid,null);
  assert.deepEqual(final.ledger,state.ledger);
  assert.deepEqual(facts.map(row=>row.type),['RaidEnded','GameOver']);
  assert.deepEqual(restored.faults,[]);
 }finally{releaseReady?.();await restored.close();}
}

async function restoreShelteredRetreatBeforeRuin(checkpoint,manifest,source){
 const saved=JSON.parse(checkpoint.snapshot);
 const stored=prepareWorkerCheckpoint(checkpoint,{slotId:saved.slotId,policy:{nativeAuthority:true},savedAt:0});
 assert.equal(stored.saved,true);
 const options=savedNativeAuthorityOptions(serialize(stored.state)),[animal]=stored.state.raid.animals;
 assert.equal(options.nativeWorkerLifecycle,true);
 assert.ok(animal.path?.length);
 assert.equal(saved.structures[0].status,'collapsing');
 let releaseRoute,releaseRuin;
 const restored=await nativeProductionAuthority(stored.state,{...options,getTerrainManifest:()=>manifest,
  onReady:row=>new Promise(resolve=>{
   if(row.kind==='animal-crop-route')releaseRoute=resolve;
   else if(row.kind==='center-ruin')releaseRuin=resolve;
   else resolve();
  })});
 let settled=false,failure;
 const wait=async condition=>{
  for(let i=0;i<1000;i++){
   if(failure)throw failure;
   assert.deepEqual(restored.faults,[]);
   if(condition())return;
   await restored.present();
  }
  assert.fail('restored Retreat did not reach its graphical boundary');
 };
 try{
  restored.command({kind:'setNavigationView',view:options.navigationView});
  await wait(()=>releaseRoute);
  const [route]=restored.records,{reference,rows}=route.resources;
  assert.equal(route.committed,false);
  assert.equal(reference.purpose,'retreat');
  assert.equal(reference.worldBoundary.effectiveTime,saved.elapsed);
  assert.deepEqual(Array.from(rows.slice(1,5)),[animal.x,animal.z,0,animal.motionPhase]);
  const before=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(before.nativeAuthorityCheckpoint.spatialState,checkpoint.nativeAuthorityCheckpoint.spatialState);
  const advancing=restored.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  assert(advancing instanceof Promise);
  advancing.then(()=>{settled=true;},error=>{failure=error;});
  await restored.present();
  assert.equal(settled,false);
  assert.equal(restored.records.length,1);
  assert.equal(restored.host.inspect().nativeCausalClock.committedThrough,saved.elapsed);

  releaseRoute();
  await wait(()=>releaseRuin);
  const [,ruin]=restored.records;
  const proof=ruin.resources.nativeCenterRuin;
  assert.equal(route.committed,true);
  await route.packet.presented;
  assert.equal(ruin.committed,false);
  assert.equal(settled,false);
  assert.equal(proof.polygon,source.polygon);
  assert.equal(proof.end,source.end);
  assert.notEqual(proof.boundary.authorityEpoch,source.boundary.authorityEpoch);
  releaseRuin();
  await wait(()=>ruin.committed);
  await restored.present();
  await ruin.packet.presented;
  const result=await advancing,state=JSON.parse(result.snapshot);
  assert.equal(result.stepsExecuted,2);
  assert.deepEqual(result.events.map(event=>[event.type,event.simulationTime]),[['StructureRuined',source.end]]);
  assert.equal(state.structures[0].status,'ruined');
  assert.equal(state.raid.animals[0].hitsRemaining,animal.hitsRemaining);
  assert.deepEqual(state.ledger,saved.ledger);
  const after=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert(!after.nativeAuthorityCheckpoint.spatialState.polygons.some(polygon=>polygon.id===source.polygon));
  assert.deepEqual(restored.host.inspect().nativeRouteFrame.worldBoundary,ruin.commit.worldBoundary);
 }finally{releaseRoute?.();releaseRuin?.();await restored.close();}
}

for(const savanna of [false,true])test(`center ruin spends its retained ticket inside the ordinary ${savanna?'Savanna':'Desert'} Retreat substep`, {timeout:90000}, async()=>{
 const snapshot=savanna?gunzipSync(readFileSync(new URL('./fixtures/sabana714-d5-before-rhino.json.gz',import.meta.url))).toString():savedAttack();
 const initial=deserialize(snapshot);
 const options=savanna?savedNativeAuthorityOptions(snapshot):{chunkKeys,navigationView:view,qualifyAnimalCrop:true};
 if(!savanna){initial.structures[0].hp=140;initial.raid.animals[0].hitsRemaining=1;}
 else assert.equal(options.nativeWorkerLifecycle,true);
 let releaseReady,replacement;
 const readyGate=new Promise(resolve=>{releaseReady=resolve;});
 const manifest={epoch:'savanna-rhino-loss',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const fixture=await nativeProductionAuthority(initial,{...options,getTerrainManifest:()=>manifest,
  onReady:record=>record.kind==='center-ruin'?readyGate:undefined});
 const checkpoint=()=>fixture.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
 const polygonIds=result=>result.nativeAuthorityCheckpoint.spatialState.polygons.map(row=>row.id);
 try{
  fixture.command({kind:'setNavigationView',view:options.navigationView});
  if(!savanna)await untilProduction(fixture,()=>fixture.records.some(row=>row.kind==='animal-crop-route'&&row.committed));
  const intact=checkpoint();
  let previous=JSON.parse(intact.snapshot),result,steps,beforeRuin;
  const events=[];
  for(let command=0;command<1100;command++){
   const collapsing=previous.structures[0].status==='collapsing';
   if(savanna&&collapsing&&previous.structures[0].collapseRemaining<=.10)beforeRuin=checkpoint();
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
  if(savanna){
   const [animal]=state.raid.animals;
   const ref=source.retreat.reference,matching={reference:ref};
   const departure=events.find(event=>event.type==='AnimalRetreating');
   const centerHit=events.find(event=>event.type==='StructureHit');
   assert.deepEqual([animal.species,animal.hitsRemaining],['rhino',4]);
   assert.deepEqual([centerHit.structureHit.previousHp,centerHit.structureHit.hp],[185,125]);
   assert.deepEqual([departure.reason,departure.hitsRemaining],['no-reachable-unleased-target',4]);
   assert.equal(events.filter(event=>event.type==='AnimalTargetUnavailable').length,1);
   const programs=fixture.records.filter(row=>row.resources.reference).map(row=>row.resources.reference);
   assert.deepEqual(programs.map(row=>[row.kind,row.purpose]),[[26,'center'],[27,'center'],[26,'retreat']]);
   assert(programs.every(row=>row.bodyId===ref.bodyId&&row.actorId===ref.actorId));
   assert.deepEqual(state.ledger,initial.ledger);
   assert(nativeAnimalCropPublicationMatches(state,matching));
   const unrelated=structuredClone(state);unrelated.raid.animals[0].attackId='attack-1';
   assert(!nativeAnimalCropPublicationMatches(unrelated,matching));
   const withoutDeparture={...state,events:state.events.filter(event=>event.type!=='AnimalRetreating')};
   assert(!nativeAnimalCropPublicationMatches(withoutDeparture,matching));
   const selecting=structuredClone(state),candidate=selecting.raid.animals[0];
   candidate.status='walking';selecting.structures[0].status='collapsing';
   assert(nativeRetreatBudgetAllowed(selecting,candidate));
   const target=createPlant('plant-1000000','platano',86,-3,source.center);
   selecting.plants.push(target);
   assert(!nativeRetreatBudgetAllowed(selecting,candidate));
   candidate.status='retreating';
   assert(nativeAnimalCropPublicationMatches(selecting,matching));
  }
  assert.deepEqual(copyPublishedNativeWorldBoundary(result,source.previous),acquired);
  const [record]=result.nativeWorldResources;
  assert.throws(()=>copyPublishedNativeWorldBoundary({...result,nativeWorldResources:[
   {...record,nativeCenterRuin:{...record.nativeCenterRuin,polygon:source.polygon+1}},
  ]},source.previous),/differs from its committed boundary/);
  if(savanna){
   await restoreShelteredRetreatBeforeRuin(beforeRuin,manifest,source);
   await restoreShelteredRetreat(checkpoint(),manifest,source);
   // Destroy the original Draw only after it submitted the kind4 packet.
   replacement=await recoverRetreatAfterRuin(fixture,retention.commit.nativeCenterRuin,state.elapsed,state);
   const step=()=>fixture.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
   let final=state;
   for(let i=0;i<500&&!final.result;i++){
    const next=await step();events.push(...next.events);final=JSON.parse(next.snapshot);
    await fixture.present();
   }
   assert.equal(final.raid,null);
   assert.equal(final.result,'defeat');
   assert.deepEqual(final.ledger,initial.ledger);
   const ended=events.filter(event=>event.type==='RaidEnded');
   assert.equal(ended.length,1);
   const gameOver=events.filter(event=>event.type==='GameOver');
   assert.deepEqual(gameOver.map(event=>event.simulationTime),[ended[0].simulationTime]);
   const stopped=await step();
   assert.equal(stopped.elapsed,final.elapsed);
   assert.deepEqual(stopped.events,[]);
   assert.deepEqual(fixture.faults,[]);
  }
 }finally{
  releaseReady();
  try{await fixture.close();}
  finally{replacement?.client.dispose();await replacement?.host.dispose();}
 }
});
