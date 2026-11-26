import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {deserialize, serialize} from '../src/persistence/snapshots.js';
import {tick} from '../src/simulation/game.js';
import {previewRaidStrike} from '../src/simulation/raids.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeAnimalCropPublicationMatches} from '../src/simulation/raids.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';

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

const snapshot = savedAttack();

test('the live Desert raid publishes a pending center approach and keeps the newborn still until GO', async () => {
  const initial = beforeRaid();
  let route, binding, release;
  const hold = new Promise(resolve => { release = resolve; });
  const world = await nativeProductionAuthority(initial, {
    chunkKeys, qualifyAnimalCrop:true,
    async onReady(record) {
      if (record.kind === 'animal-crop-route' && !route) {
        route = record;
        await hold;
      }
    },
    onCommit(_record, data) { binding ??= data.nativeAnimalCropRouteBinding; },
  });
  try {
    world.command({kind:'setNavigationView', view});
    assert.equal(world.snapshot().raid, null);
    const emptyClock = world.host.inspect().nativeCausalClock;
    assert.equal(emptyClock.committedThrough, initial.elapsed);
    const newborn = world.advance().raid.animals[0];
    const spawned = world.snapshot().events.filter(event => event.type === 'RaidSpawned');
    assert.equal(spawned.length, 1);
    assert.equal(newborn.id, spawned[0].raidFacts.actors[0].id);
    assert.equal(newborn.targetId, 'structure-2');
    assert.deepEqual([newborn.x,newborn.z], [newborn.spawn.x,newborn.spawn.z]);
    await untilProduction(world, () => !!route);
    assert.equal(route.resources.reference.purpose, 'center');
    for (let i = 0; i < 4; i++) {
      const retained = world.advance().raid.animals[0];
      await world.present();
      assert.deepEqual([retained.x,retained.z,retained.motionPhase], [newborn.x,newborn.z,newborn.motionPhase]);
      assert.equal(binding, undefined);
    }
    release();
    await untilProduction(world, () => binding &&
      world.host.inspect().nativeRouteFrame?.worldBoundary?.ticket === binding.reference.worldBoundary.ticket);
    const acquiredClock = world.host.inspect().nativeCausalClock;
    assert.deepEqual([acquiredClock.authorityEpoch,acquiredClock.nativeSession],
      [emptyClock.authorityEpoch,emptyClock.nativeSession]);
    assert(acquiredClock.intentSequence > emptyClock.intentSequence);
    assert.equal(captureNativeRoutePickFrame(world.host.inspect()).getAnimalCropAge(binding.preparedReference),0);
    const moving = world.advance().raid.animals[0];
    assert.notDeepEqual([moving.x,moving.z], [newborn.x,newborn.z]);
    assert.deepEqual(world.faults, []);
  } finally {
    release();
    await world.close();
  }
});

test('a live Desert raid without qualification keeps its ordinary approach', async () => {
  const world = await nativeProductionAuthority(beforeRaid(), {chunkKeys});
  try {
    world.command({kind:'setNavigationView', view});
    const animal = world.advance().raid.animals[0];
    assert.equal(animal.targetId, 'structure-2');
    assert.notDeepEqual([animal.x,animal.z], [animal.spawn.x,animal.spawn.z]);
    await world.present();
    assert.deepEqual(world.records, []);
    assert.deepEqual(world.faults, []);
  } finally {
    await world.close();
  }
});

test('the graphical publication after GO must confirm the typed target and attack', () => {
  const animal = {id:'animal-3',species:'warthog',targetId:'plant-2',status:'walking'};
  const raid = {animals:[animal],daytime:false,introCropLimit:0};
  const state={raid,biome:'sabana',structures:[{kind:'center',id:'structure-2'}],workers:[{status:'home'}]};
  const reference = {kind:26,purpose:'center',actorId:3,targetId:2};
  assert.equal(nativeAnimalCropPublicationMatches(state,{reference}),false);
  animal.targetId = 'structure-2';
  assert.equal(nativeAnimalCropPublicationMatches(state,{reference}),true);
  const strike = {reference:{...reference,kind:27},attackId:8};
  animal.status = 'attacking';
  animal.attackId = 'attack-5';
  assert.equal(nativeAnimalCropPublicationMatches(state,strike),false);
  animal.attackId = 'attack-8';
  assert.equal(nativeAnimalCropPublicationMatches(state,strike),true);
  for(const species of ['hyena','buffalo']){
   animal.species=species;
   assert.equal(nativeAnimalCropPublicationMatches(state,strike),true);
   assert.equal(nativeAnimalCropPublicationMatches({...state,workers:[{status:'fleeing'}]},strike),false);
   assert.equal(nativeAnimalCropPublicationMatches({...state,raid:{...raid,daytime:true}},strike),false);
   animal.targetId='plant-2';
   assert.equal(nativeAnimalCropPublicationMatches(state,{...strike,reference:{...strike.reference,purpose:undefined}}),false);
   animal.targetId='structure-2';
  }
});

for(const kind of [26,27])test('terminal Draw loss preserves the acquired center resource '+kind,async()=>{
  const initial=beforeRaid(),receipts=new Map(),manifest={epoch:'center-replacement',chunks:chunkKeys.map(key=>{
    const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
  })};
  const world=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,getTerrainManifest:()=>manifest,
    onCommit(record,receipt){receipts.set(record.kind,receipt);}});
  const ports=new MessageChannel();
  let replacement,rig;
  const step=()=>world.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
  try{
    world.command({kind:'setNavigationView',view});
    step();
    await untilProduction(world,()=>receipts.has('animal-crop-route'));
    let row;
    for(let i=0;i<1000;i++){
      const result=step();
      for(const key of result.residency?.missing??[]){
        const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});
      }
      await world.present();
      row=world.host.inspect().nativeRouteFrame?.bindings.find(b=>b.nativeAnimalCrop?.kind===kind&&b.nativeAnimalCrop?.purpose==='center');
      if(row?.relativeTime>.15)break;
    }
    assert(row?.relativeTime>.15);
    const frozen=world.snapshot(),animal=frozen.raid.animals[0],field=kind===26?'nativeAnimalCropRouteBinding':'nativeAnimalCropStrikeBinding';
    const proof=receipts.get(kind===26?'animal-crop-route':'animal-crop-strike')[field];
    assert.equal(animal.targetId,'structure-2');
    assert.equal(frozen.structures[0].hp,600);
    world.gpu.device.destroy();world.retireResourceEndpoint();
    const hold=await world.authority.quiesceNativeIntentProduction();
    const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true});
    const route=await world.authority.terminalWorkerRoute();
    assert(retired.terminal&&retired.callbacksSettled);
    assert.deepEqual(route,{kind,actorId:proof.reference.actorId});
    replacement=await fixture({capabilities:{nativeAnimalCropVersion:1}},
      {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
    const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
    const ref=q.resources[field].reference,origin=ref.worldBoundary.effectiveTime,at=frozen.elapsed,age=floorFloat32(at-origin);
    assert.deepEqual(ref,proof.reference);
    assert.equal(q.execution.executedThrough,at);
    if(kind===27)assert.equal(q.execution.binding.attackId,proof.attackId);

    const wrongTarget=structuredClone(frozen);
    wrongTarget.raid.animals[0].targetId='plant-2';
    rig=await originalRig(wrongTarget,manifest);
    await assert.rejects(rig.recover(q),/Animal crop source or original clip bank unavailable/);
    rig.update(structuredClone(frozen));
    assert.deepEqual(await rig.recover(q),kind===26?[4]:[4,4]);
    replacement.client.registerClockBinding(replacement.buffer,{byteOffset:0,epoch:origin,semantic:'relative',
      nativeAnimalCrop:ref,resourceEnd:kind===26?nativeClockResourceEnd(origin,ref.endTime):ref.endTime});
    await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
    const submit=replacement.frame(0,{nativeWorldBoundary:ref.worldBoundary,
      clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
    submit.catch(()=>{});
    await flush();await replacement.host.idle();replacement.host.present();await submit;
    const draw=await world.authority.checkHeldDraw(30,hold,route);
    assert.equal(draw.relativeTime,age);
    assert.deepEqual(draw.nativeAnimalCrop,ref);
    assert.equal(new Float32Array(replacement.gpu.buffers[0].data.buffer)[0],age);
    const pickAge=captureNativeRoutePickFrame(replacement.host.inspect()).getAnimalCropAge(ref);
    assert.equal(pickAge,age);rig.presented(pickAge);
    world.authority.resumeNativeIntentProduction(hold);
    let state=JSON.parse(step().snapshot);
    if(kind===26){
      const next=state.raid.animals[0];
      assert.notDeepEqual([next.x,next.z],[animal.x,animal.z]);
      assert.equal(state.structures[0].hp,600);
    }else{
      while(state.elapsed<ref.endTime)state=JSON.parse(step().snapshot);
      rig.update(structuredClone(state));
      const impacts=state.events.filter(e=>e.type==='AnimalLogicalHit');
      assert.deepEqual(impacts.map(e=>[e.attackId,e.targetId]),[['attack-'+proof.attackId,'structure-2']]);
      assert.equal(state.structures[0].hp,580);
      assert.equal(rig.centerReturns,1);
    }
    assert.deepEqual(world.faults,[]);
  }finally{
    rig?.close();replacement?.client.dispose();await replacement?.host.dispose();
    ports.port1.close();ports.port2.close();await world.close();
  }
});

test('the Desert center route, both strikes and retreat keep one acquired animal body', async () => {
  const initial = deserialize(snapshot);
  const manifest = {epoch:'desert-center',chunks:chunkKeys.map(key => {
    const [cx,cz] = key.split(',').map(Number);
    return {cx,cz,revision:1};
  })};
  const rig = await originalRig(structuredClone(initial), manifest);
  let firstRoute, firstStrike, releaseRoute, releaseStrike;
  const routeReady = new Promise(resolve => { releaseRoute = resolve; });
  const strikeReady = new Promise(resolve => { releaseStrike = resolve; });
  const acquired = [];
  let world;
  try {
    world = await nativeProductionAuthority(initial, {
      chunkKeys, qualifyAnimalCrop:true, getTerrainManifest:() => manifest,
      onPrepare:record => rig.prepare(record.resources),
      async onReady(record) {
        if (record.kind === 'animal-crop-route' && !firstRoute) {
          firstRoute = record;
          await routeReady;
        } else if (record.kind === 'animal-crop-strike' && !firstStrike) {
          firstStrike = record;
          await strikeReady;
        }
      },
      onCommit(record, data) {
        const proof = data.nativeAnimalCropRouteBinding ?? data.nativeAnimalCropStrikeBinding;
        rig.commit(proof, data);
        acquired.push(proof);
      },
    });
    const visible = state => {
      rig.update(structuredClone(state));
      return state;
    };
    world.command({kind:'setNavigationView', view});
    await untilProduction(world, () => !!firstRoute);
    const pose = ({x,z,motionPhase}) => [x,z,motionPhase];
    const source = world.snapshot().raid.animals[0];
    assert.equal(firstRoute.resources.reference.purpose, 'center');
    assert.deepEqual([firstRoute.resources.reference.targetId, firstRoute.resources.reference.centerId], [2,2]);
    for (let i = 0; i < 6; i++) {
      const retained = visible(world.advance());
      await world.present();
      assert.deepEqual(pose(retained.raid.animals[0]), pose(source));
      assert.equal(retained.structures[0].hp, 600);
      assert.equal(acquired.length, 0);
    }
    releaseRoute();
    const waitDrawn = async (record,index) => {
      await untilProduction(world, () => record.committed && acquired[index] &&
        world.host.inspect().nativeRouteFrame?.worldBoundary?.ticket === acquired[index].reference.worldBoundary.ticket);
      await record.packet.presented;
      const age = captureNativeRoutePickFrame(world.host.inspect()).getAnimalCropAge(acquired[index].preparedReference);
      assert.equal(age,0);
      rig.presented(age);
    };
    await waitDrawn(firstRoute,0);

    async function advance() {
      const next = world.command({kind:'advance', seconds:.05, nightFastForward:false, steps:1});
      for (const key of next.residency?.missing ?? []) {
        const [cx, cz] = key.split(',').map(Number);
        world.command({kind:'addChunk', cx, cz});
      }
      const state = visible(JSON.parse(next.snapshot));
      await world.present();
      assert.deepEqual(world.faults, []);
      return state;
    }

    for (let i = 0; i < 1000 && !firstStrike; i++) await advance();
    assert(firstStrike);
    const terminal = world.snapshot().raid.animals[0];
    assert.equal(firstStrike.resources.reference.purpose, 'center');
    assert.equal(firstStrike.resources.reference.bodyId, acquired[0].reference.bodyId);
    for (let i = 0; i < 6; i++) {
      const retained = await advance();
      assert.deepEqual(pose(retained.raid.animals[0]), pose(terminal));
      assert.equal(retained.raid.animals[0].hitsRemaining, source.hitsRemaining);
      assert.equal(retained.structures[0].hp, 600);
      assert.equal(acquired.length, 1);
    }
    releaseStrike();
    await waitDrawn(firstStrike,1);
    let final = world.snapshot();
    for (let i = 0; i < 1000 && final.raid; i++) final = await advance();
    assert.equal(final.raid, null);
    assert.deepEqual(acquired.map(({reference}) => [reference.kind, reference.purpose]),
      [[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'retreat']]);
    assert.equal(new Set(acquired.map(({reference}) => reference.bodyId)).size, 1);
    assert.equal(acquired[2].reference.endTime, acquired[2].reference.worldBoundary.effectiveTime);
    assert.deepEqual([acquired[2].reference.x,acquired[2].reference.z], pose(terminal).slice(0,2));
    assert.equal(rig.centerReturns,2);
    const structureHits = final.events.filter(event => event.type === 'StructureHit');
    assert.deepEqual(structureHits.map(({targetId,structureHit}) => [targetId,structureHit.previousHp,structureHit.hp]),
      [['structure-2',600,580],['structure-2',580,560]]);
    const logical = final.events.filter(event => event.type === 'AnimalLogicalHit');
    assert.deepEqual(logical.map(event => event.attackId), [acquired[1],acquired[3]].map(row => 'attack-' + row.attackId));
    assert.deepEqual(logical.map(event => event.simulationTime), structureHits.map(event => event.simulationTime));
    assert.equal(final.events.filter(event => event.type === 'RaidEnded').length, 1);
  } finally {
    releaseRoute();
    releaseStrike();
    await world?.close();
    rig.close();
  }
});

test('a center that becomes ruined while its strike is prepared cannot acquire or spend that strike', () => {
  const state = deserialize(snapshot);
  const [animal] = state.raid.animals, [center] = state.structures;
  const session = residentSession(state);
  try {
    const planner = createEventDrivenTaskPlanner(session);
    const wasm = session.core.wasm;
    assert.equal(planner.resetFromState(state).restoredAnimalRoutes, 1);
    assert.equal(wasm.spatial_body_upsert(1, animal.x, animal.z, animal.radius, 1, 1), 1);
    assert.equal(planner.requestNativeAnimalCropRoute(state, animal, 1), true);
    planner.commitNativeCausalClock();
    const request = planner.nativeAnimalCropState(animal.id);
    const nativeSession = wasm.nav_intent_session();
    const ticket = () => {
      assert.equal(wasm.nav_intent_barrier_proposal_ticket(), 1);
      return Array.from(new Float64Array(wasm.memory.buffer, wasm.nav_intent_barrier_proposal_ticket_ptr(), 6));
    };
    assert.equal(wasm.nav_animal_route_proposal_stage(request.actor, nativeSession, request.requestSequence), 1);
    const route = ticket();
    assert.equal(wasm.nav_animal_route_proposal_commit_bound(...route.slice(0,5), route[1]), 1);
    assert.equal(planner.beginNativeRouteExecution().status, 'started');
    const assignment = planner.intentChanges().at(-1);
    state.elapsed = planner.nativeAnimalRouteBinding(assignment.routeHandle).endTime;
    assert.equal(planner.advanceNativeRouteExecution(state.elapsed).status, 'advanced');
    planner.commitNativeCausalClock();
    const {index, duration} = previewRaidStrike(state, animal);
    const before = [state.rng, state.sequence, animal.hitsRemaining, animal.attackId];
    assert.equal(wasm.nav_animal_strike_proposal_stage(request.actor, nativeSession, assignment.sequence, index, duration), 1);
    const stale = ticket();
    planner.applyEvents(state, [{type:'structureDamage', entity:{...center, status:'ruined', hp:0}}]);
    assert.equal(wasm.nav_animal_strike_proposal_revalidate(nativeSession, stale[1]), -2);
    assert.notEqual(wasm.nav_animal_strike_proposal_commit_bound(...stale.slice(0,5), stale[1], state.sequence), 1);
    assert.equal(wasm.nav_animal_strike_snapshot(request.actor), 0);
    assert.deepEqual([state.rng, state.sequence, animal.hitsRemaining, animal.attackId], before);
  } finally {
    session.dispose();
  }
});
