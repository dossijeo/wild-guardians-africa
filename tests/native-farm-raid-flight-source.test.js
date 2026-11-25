import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {serialize} from '../src/persistence/snapshots.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {nativeFarmArrivalStopSourceFixture} from './helpers/native-farm-arrival-stop-source.js';
import {copyNativeHomeRequestReference, sameNativeHomeRequestReference} from '../src/world/native-home-request-reference.js';
import {nativeResourceAdmissionProfile} from '../src/world/native-resource-admission-profiles.js';

function mixedDesertRaid() {
  const fixture = nativeFarmArrivalRouteFixture({peer:false});
  const state = structuredClone(fixture.state);
  fixture.close();
  state.dayPlan = {done:false,at:state.time+.8,group:['warthog']};
  const chunkKeys = Array.from({length:25}, (_,i)=>[i%5-2,Math.floor(i/5)-2].join(','));
  return {state,chunkKeys};
}

test('a southern Desert center approach and refuge acquire on their original bodies', async () => {
  const {state,chunkKeys} = mixedDesertRaid();
  const acquired = [];
  let releaseHome, home;
  const hold = new Promise(resolve => { releaseHome = resolve; });
  const world = await nativeProductionAuthority(state, {
    chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    onCommit(record,data) { acquired.push({kind:record.kind,data}); },
    async onReady(record) {
      if (record.kind === 'home-route' && !home) {
        home = record;
        await hold;
      }
    },
  });
  const pose = actor => [actor.x,actor.z,actor.motionPhase];
  async function step() {
    const ack = world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
    for (const key of ack.residency.missing) {
      const [cx,cz] = key.split(',').map(Number);
      world.command({kind:'addChunk',cx,cz});
    }
    await world.present();
    assert.deepEqual(world.faults,[]);
    return JSON.parse(ack.snapshot);
  }
  try {
    await untilProduction(world,()=>acquired.some(row=>row.kind==='farm-arrival'));
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    let next;
    for (let i=0;i<20&&!next?.raid;i++) next=await step();
    assert(next?.raid);
    const animal=next.raid.animals[0];
    assert.deepEqual(pose(animal).slice(0,2),[-16.6,-27.1]);
    assert.equal(animal.targetId,'structure-2');
    await untilProduction(world,()=>{world.snapshot();return !!home;});
    for (let i=0;i<4;i++) {
      const waiting=await step();
      assert.deepEqual(pose(waiting.raid.animals[0]),pose(animal));
      assert.equal(waiting.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
      assert(!acquired.some(row=>row.kind==='animal-crop-route'||row.kind==='home-route'));
    }
    releaseHome();
    for (let i=0;i<200&&next.workers[0].status!=='home';i++) next=await step();
    assert.equal(next.workers[0].status,'home');
    assert.equal(next.workers[0].hits,0);
    assert.equal(next.raid.animals[0].targetId,'structure-2');
    assert.equal(next.structures[0].hp,600);
    const farm=world.records.find(row=>row.kind==='farm-arrival');
    const homeReference=nativeResourceAdmissionProfile('home-route').reference(home.resources);
    assert.equal(homeReference.bodyId,farm.resources.bodyId);
    for (let i=0;i<1800&&next.raid;i++) next=await step();
    assert.equal(next.raid,null);
    const animalPrograms=acquired.filter(row=>row.kind.startsWith('animal-crop')).map(row=>
      row.data.nativeAnimalCropRouteBinding??row.data.nativeAnimalCropStrikeBinding);
    assert.deepEqual(animalPrograms.map(row=>[row.reference.kind,row.reference.purpose]),
      [[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'retreat']]);
    assert.equal(new Set(animalPrograms.map(row=>row.reference.bodyId)).size,1);
    assert.notEqual(animalPrograms[0].reference.bodyId,homeReference.bodyId);
    assert.deepEqual(next.events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560,540,520]);
    assert.equal(next.events.filter(event=>event.type==='WorkerHit'||event.type==='WorkerIncapacitated').length,0);
    for (let i=0;i<400&&next.workers[0].nativeRouteAdmission!=='native-idle';i++) next=await step();
    const arrival=acquired.find(row=>row.kind==='home-arrival').data.nativeHomeArrivalBinding;
    const returnToFarm=acquired.findLast(row=>row.kind==='farm-arrival').data.nativeFarmArrivalBinding.reference;
    assert.equal(next.workers[0].nativeRouteAdmission,'native-idle');
    assert.equal(next.workers[0].id,state.workers[0].id);
    assert.equal(returnToFarm.sourceRequest.refugeSequence,arrival.retiredSequence);
    assert.notEqual(returnToFarm.bodyId,homeReference.bodyId);
    assert.equal(returnToFarm.motionFlags,0);
    assert.deepEqual(world.faults,[]);
  } finally {
    releaseHome();
    await world.close();
  }
});

test('the northern center corridor cannot acquire either motion across a possible worker encounter', async () => {
  const {state,chunkKeys} = mixedDesertRaid();
  const world = await nativeProductionAuthority(state, {chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true});
  try {
    await untilProduction(world,()=>world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:24},target:{x:-10,z:0}}});
    let next;
    for (let i=0;i<20&&!next?.raid;i++) {
      next=world.advance();
      await world.present();
    }
    assert.equal(next.raid.animals[0].targetId,'structure-2');
    for (let i=0;i<10;i++) {
      next=world.advance();
      await world.present();
    }
    assert(world.records.every(row=>row.kind==='farm-arrival'||row.kind==='farm-arrival-stop'));
    assert.deepEqual(world.records.filter(row=>row.committed).map(row=>row.kind),['farm-arrival','farm-arrival-stop']);
    const [animal]=next.raid.animals;
    assert.deepEqual([animal.x,animal.z],[animal.spawn.x,animal.spawn.z]);
    assert.equal(next.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    assert.equal(world.authority.nativeIntentProductionStatus().last?.status,'blocked');
    assert.equal(next.structures[0].hp,600);
    assert.deepEqual(world.faults,[]);
  } finally {
    await world.close();
  }
});

for (const moving of [false, true]) {
  test('RaidSpawned transfers ' + (moving ? 'an acquired Farm through Stop24' : 'a pending Farm despite late READY') + ' to its stationary refuge request', async () => {
    const fixture = nativeFarmArrivalRouteFixture({peer: false});
    const save = structuredClone(fixture.state);
    fixture.close();
    save.dayPlan = {done: false, at: save.time + 0.8, group: ['warthog']};
    save.ledger.balance = {n: '100000', d: '1'};
    const chunkKeys = Array.from({length: 25}, (_, i) => (i % 5 - 2) + ',' + (Math.floor(i / 5) - 2));
    let release, farm, stopGo;
    const ready = new Promise(resolve => { release = resolve; });
    const f = await nativeProductionAuthority(save, {
      qualifyFarmFlee: true, chunkKeys,
      onCommit(record, data) { if (record.kind === 'farm-arrival-stop') stopGo = data.worldBoundary; },
      async onReady(record) {
        if (record.kind === 'farm-arrival' && !farm) {
          farm = record;
          if (!moving) await ready;
        }
      },
    });
    // Let the semantic request overtake the first RAF after Stop24 GO.
    // The stopped rig must already be drawable with the new intent watermark.
    const present = f.host.present.bind(f.host);
    let holdStopRaf = moving;
    f.host.present = (...args) => {
      if (holdStopRaf && f.records.some(r => r.kind === 'farm-arrival-stop' && r.committed)) return;
      return present(...args);
    };
    const requests = [];
    const post = f.controlPort.postMessage;
    f.controlPort.postMessage = data => {
      if (data.homeRequest) requests.push(data.homeRequest);
      post(data);
    };
    try {
      await untilProduction(f, () => moving ? farm?.committed : !!farm);
      f.command({kind: 'setNavigationView', view: {bounds: [-48,-48,48,48], eye: {x: -10,z: 24}, target: {x: -10,z: 0}}});
      let state;
      for (let i = 0; i < 25; i++) {
        const step = f.command({kind: 'advance', seconds: 0.05, nightFastForward: false, steps: 1});
        state = JSON.parse(step.snapshot);
        if (state.raid) break;
        for (const key of step.residency?.missing ?? []) {
          const [cx, cz] = key.split(',').map(Number);
          f.command({kind: 'addChunk', cx, cz});
        }
        await f.present();
      }
      const spawn = state.events.findLast(event => event.type === 'RaidSpawned');
      assert.ok(spawn);
      assert.equal(state.workers[0].status, 'fleeing');
      assert.equal(state.workers[0].nativeRouteAdmission, moving ? 'pending-farm-flight-stop' : 'pending-raid-flight-resources');
      release();
      await untilProduction(f, () => {
        f.snapshot();
        return requests.length > 0 && (moving ? f.records.some(r => r.kind === 'farm-arrival-stop' && r.committed) : farm.aborted);
      });
      if (moving) {
        const stop = f.records.find(r => r.kind === 'farm-arrival-stop');
        await f.present();
        const pending = f.host.inspect();
        assert.ok(pending.pendingSequence);
        const clock = pending.nativeCausalClock;
        assert.equal(clock.committedThrough, state.elapsed);
        assert.ok(clock.intentSequence >= requests.at(-1).requestSequence, 'Stationary request exceeds draw clock watermark');
        assert.ok(stopGo);
        assert.equal(pending.samples.some(row => row.nativeWorldBoundary?.ticket === stopGo.ticket), false);
        holdStopRaf = false;
        await f.present();
        assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.effectiveTime, state.elapsed);
        assert.deepEqual(f.host.inspect().nativeRouteFrame.worldBoundary, stopGo);
        await stop.packet.presented;
      }
      const final = f.snapshot(), worker = final.workers[0], request = requests.at(-1);
      assert.equal(final.elapsed, state.elapsed);
      assert.equal(worker.nativeRouteAdmission, 'pending-raid-flight-resources');
      assert.equal(confirmedStateSaveAvailable(final), false);
      assert.throws(() => serialize(final), /Solicitud de recursos/);
      assert.deepEqual(f.records.map(r => r.kind), moving ? ['farm-arrival', 'farm-arrival-stop'] : ['farm-arrival']);
      assert.equal(farm.committed, moving);
      assert.equal(request.version, 2);
      assert.equal(request.raidSpawnSequence, Number(spawn.id.split('-').at(-1)));
      assert.equal(request.bodyId, farm.resources.bodyId);
      const village = state.villages.find(v => v.id === worker.villageId);
      assert.deepEqual(request.home, {villageId: Number(village.id.split('-').at(-1)), x: village.entry.x, z: village.entry.z});
      for (const field of ['x','z','runPhase','walkPhase','carryPhase','runRemaining']) assert.equal(request.pose[field], worker[field], field);
      assert.equal(request.pose.yaw, worker.heading);
      assert.deepEqual(f.faults, []);
    } finally {
      release();
      await f.close();
    }
  });
}

for (const pending of [true, false]) {
  test('Native flight keeps the ' + (pending ? 'pending' : 'stopped') + ' Farm body and proves its own route', () => {
    const module = new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM ?? new URL('../src/world/wild-engine/spatial-savanna.wasm', import.meta.url)));
    const core = createSpatialWorld(module);
    const f = pending ? nativeFarmArrivalRouteFixture({core, peer: false}) : nativeFarmArrivalStopSourceFixture({core, peer: false});
    try {
      const {w, actor} = f, session = w.nav_intent_session();
      const village = f.state.villages.find(v => v.id === f.worker.villageId);
      const issue = (seq, generation, event = 29208) => w.nav_intent_farm_flight_request(
        actor, session, seq, generation, Number(village.id.split('-').at(-1)), village.entry.x, village.entry.z, event);
      let seq, generation, pose, stale;
      if (pending) {
        seq = f.requestSource.requestSequence;
        generation = 0;
        pose = f.requestSource.pose;
        f.stage();
        stale = f.tuple();
        assert.equal(issue(seq + 1, 0), -2);
        assert.equal(w.nav_farm_arrival_route_proposal_snapshot(...stale.slice(0,2)), 1);
      } else {
        assert.equal(issue(f.binding.assignmentSequence, f.handle.generation), -2);
        const stop = f.stop();
        assert.equal(f.commitStop(stop), 1);
        assert.ok(w.nav_intent_clock_commit(1, 0) >= 0);
        const held = f.planner.nativeFarmArrivalHeldExecution(actor);
        seq = held.assignmentSequence;
        generation = held.resumeHandle.generation;
        pose = held.pose;
      }
      assert.equal(issue(seq, generation), 1);
      assert.equal(issue(seq, generation), 1);
      assert.equal(issue(seq, generation, 29209), -2);
      if (stale) assert.notEqual(w.nav_farm_arrival_route_proposal_commit_bound(...stale.slice(0,5), stale[1]), 1);
      const source = f.planner.nativeHomeRequestReference(actor);
      assert.equal(source.bodyId, 1);
      assert.equal(source.raidSpawnSequence, 29208);
      assert.throws(() => copyNativeHomeRequestReference({...source, version: 1}));
      assert.equal(sameNativeHomeRequestReference(source, {...source, raidSpawnSequence: 29209}), false);
      for (const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining']) assert.equal(source.pose[key], pose[key]);
      assert.ok(w.nav_intent_clock_commit(1, 0) >= 0);
      assert.equal(w.nav_home_route_proposal_stage(actor, session, source.requestSequence), 1);
      const tuple = f.tuple();
      assert.equal(w.nav_home_flight_event(actor, tuple[1]), 29208);
      assert.equal(w.nav_home_route_proposal_commit_bound(...tuple.slice(0,5), tuple[1]), 1);
      assert.equal(w.nav_intent_execution_begin(), 1);
      assert.ok(w.nav_intent_clock_commit(1, 0) >= 0);
      f.move(.05);
      assert.equal(w.nav_intent_home_execution(actor), 1);
      const execution = f.read('nav_intent_home_execution_ptr', 30);
      assert.equal(execution[2], source.bodyId);
      assert.equal(execution[26], pose.runRemaining);
      assert.ok(execution[21] > pose.runPhase);
      assert.ok(Math.abs(execution[28] - 2.4) < 1e-12);
    } finally {
      f.close();
    }
  });
}
