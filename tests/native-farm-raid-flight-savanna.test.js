import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSnapshot} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';

// Day two of the paid sabana712 microevent opening. The ordinary first night
// left two living crops and zero tasks. The second hire cost 30.
function source() {
  const state = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/sabana712-day2-farm-before-raid.json.gz', import.meta.url))));
  state.dayPlan = {at: state.time + 4, done: false, group: ['warthog']};
  return state;
}
const chunkKeys = Array.from({length: 25}, (_, i) => [i % 5, Math.floor(i / 5) - 2].join(','));
for (const enabled of [false, true]) {
  test('Savanna Farm admission ' + (enabled ? 'retains the original body through the daytime Stop' : 'stays gated in the ordinary profile'), async () => {
    const initial = source();
    const f = await nativeProductionAuthority(initial, {qualifyFarmFlee: enabled, qualifyAnimalCrop: true, chunkKeys});
    try {
      if (!enabled) {
        await untilProduction(f, () => f.authority.nativeIntentProductionStatus().last?.status === 'blocked');
        assert.equal(f.records.length, 0);
        assert.deepEqual(f.faults, []);
        return;
      }
      await untilProduction(f, () => f.records.some(r => r.kind === 'farm-arrival' && r.committed));
      const farm = f.records.find(r => r.kind === 'farm-arrival');
      const view = {bounds: [24,-72,168,72], eye: {x: 83,z: 24}, target: {x: 83,z: 0}};
      f.command({kind: 'setNavigationView', view});
      const requests = [];
      const post = f.controlPort.postMessage;
      f.controlPort.postMessage = data => {
        if (data.homeRequest) requests.push(data.homeRequest);
        post(data);
      };
      let state;
      for (let i = 0; i < 100; i++) {
        const step = f.command({kind: 'advance', seconds: .05, nightFastForward: false, steps: 1});
        state = JSON.parse(step.snapshot);
        if (state.raid) break;
        for (const key of step.residency?.missing ?? []) {
          const [cx, cz] = key.split(',').map(Number);
          f.command({kind: 'addChunk', cx, cz});
        }
        await f.present();
      }
      const event = state.events.findLast(e => e.type === 'RaidSpawned');
      const worker = state.workers[0];
      assert.ok(event);
      assert.equal(worker.nativeRouteAdmission, 'pending-farm-flight-stop');
      assert.equal(worker.id, 'worker-21');
      assert.ok(Math.abs(worker.x - 64.32) < 1e-8);
      assert.equal(worker.z, 0);
      assert.deepEqual(state.ledger.balance, {n: '190', d: '1'});
      await untilProduction(f, () => {
        f.snapshot();
        return requests.length && f.records.some(r => r.kind === 'farm-arrival-stop' && r.committed);
      });
      const stop = f.records.find(r => r.kind === 'farm-arrival-stop');
      await f.present();
      await stop.packet.presented;
      const request = requests.at(-1);
      assert.equal(request.version, 2);
      assert.equal(request.bodyId, farm.resources.bodyId);
      assert.equal(request.raidSpawnSequence, Number(event.id.split('-').at(-1)));
      for (const field of ['x','z','walkPhase','runPhase','carryPhase','runRemaining']) assert.equal(request.pose[field], worker[field]);
      assert.equal(request.pose.yaw, worker.heading);
      assert.deepEqual([request.home.x,request.home.z], [60,0]);
      assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.effectiveTime, state.elapsed);
      assert.deepEqual(f.faults, []);
    } finally { await f.close(); }
  });
}

test('a moving Farm and a new crop share two submitted clocks through the Home absence', async () => {
  let releaseStop, held;
  const hold = new Promise(resolve => { releaseStop = resolve; });
  const f = await nativeProductionAuthority(source(), {
    qualifyFarmFlee:true, qualifyAnimalCrop:true, chunkKeys,
    async onReady(record) {
      if (record.kind === 'farm-arrival-stop' && !held) { held = record; await hold; }
    },
  });
  const events=[];
  const post=f.controlPort.postMessage;
  f.controlPort.postMessage = event => { if(event.actorId) events.push(event); post(event); };
  try {
    const acquired = kind => f.records.find(r => r.kind === kind && r.committed);
    await untilProduction(f, () => acquired('farm-arrival'));
    f.command({kind:'setNavigationView', view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    let state;
    for(let i=0;i<100;i++){
      const step=f.command({kind:'advance',seconds:.05,steps:i===79?2:1,nightFastForward:false});
      state=JSON.parse(step.snapshot);
      if(state.raid)break;
      for(const key of step.residency?.missing??[]){
        const [cx,cz]=key.split(',').map(Number); f.command({kind:'addChunk',cx,cz});
      }
      await f.present();
    }
    assert.equal(state.workers[0].nativeRouteAdmission,'pending-farm-flight-stop');
    const spawn=state.events.findLast(e=>e.type==='RaidSpawned');
    assert.ok(spawn);
    await untilProduction(f,()=>held);
    const animalEvents=events.filter(e=>e.actorId===22);
    assert.equal(animalEvents.length,1);
    const [birth]=animalEvents;
    assert.equal(birth.type,'IntentChanged');assert.equal(birth.state,6);
    assert.equal(birth.routeHandle,null);
    assert.equal(birth.pendingAnimalCrop.targetId,5);
    assert.equal(birth.raidFlightBirth.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    const resting=JSON.parse(f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false}).snapshot);
    const sample=resting.workers[0].nativeFarmFlightSample;
    assert.ok(sample,'moving Farm execution must publish its Stop24 sample');
    assert.throws(()=>validateSnapshot(resting),/Muestra de evacuación/);
    assert.equal(sample.at,resting.elapsed);
    assert.equal(sample.spawnTime,spawn.simulationTime);
    assert.equal(sample.eventId,Number(spawn.id.slice(6)));
    assert.equal(sample.nativeRoute.actorId,21);
    assert.equal(sample.bodyId,1);
    for(const [key,actual] of Object.entries(sample.pose))assert.equal(actual,resting.workers[0][key],key);
    assert.ok(resting.workers[0].x>state.workers[0].x);
    assert.equal(resting.raid.animals[0].x,state.raid.animals[0].x);
    assert.equal(resting.raid.animals[0].z,state.raid.animals[0].z);
    releaseStop();
    await untilProduction(f,()=>{f.snapshot();return acquired('farm-arrival-stop');});
    const ages=[];
    for(let i=0;i<150;i++){
      await f.present();
      const frame=f.host.inspect().nativeRouteFrame;
      const worker=frame?.bindings.find(b=>b.nativeHome?.actorId===21);
      const animal=frame?.bindings.find(b=>b.nativeAnimalCrop?.actorId===22);
      if(worker&&animal){
        assert.equal(worker.nativeHome.bodyId,1);assert.equal(animal.nativeAnimalCrop.bodyId,2);
        assert.equal(animal.nativeAnimalCrop.targetId,5);ages.push([worker.relativeTime,animal.relativeTime]);
      }
      state=f.advance(.05);
      if(state.workers[0].status==='home')break;
    }
    assert.ok(ages.some(([w,a],i)=>i>0&&w>ages[i-1][0]&&a>ages[i-1][1]));
    assert.equal(state.workers[0].status,'home');assert.equal(state.workers[0].hits,0);
    assert.equal(state.workers[0].nativeFarmFlightSample,undefined);
    assert.equal(state.raid.animals[0].targetId,'plant-5');
    assert.deepEqual([state.workers[0].x,state.workers[0].z],[60,0]);
    await untilProduction(f,()=>acquired('home-arrival'));
    await f.present();await acquired('home-arrival').packet.presented;
    const final=f.host.inspect().nativeRouteFrame;
    assert.ok(final.bindings.some(b=>b.nativeAnimalCrop?.bodyId===2));
    assert.ok(!final.bindings.some(b=>b.nativeHome));
    assert.equal(f.advance(.05).workers[0].status,'home');
    assert.deepEqual(f.faults,[]);
  } finally {releaseStop();await f.close();}
});

test('Farm corridor includes future positions, semantic tangency and the interval between ticks', () => {
  const state=source();
  const mod=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM ?? new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(mod,state,{loaded:()=>loaded,onData:d=>loaded.set(d.cx+','+d.cz,d)});
try {
 for(let z=-2;z<=2;z++)for(let x=0;x<5;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.stream.onData(session.core.chunkPayload());}
 const planner=createEventDrivenTaskPlanner(session,{qualifyFarmFlee:true});planner.resetFromState(state);
 const w=session.core.wasm,worker=state.workers[0],actor=21,body=1;
 session.actorSectorRevision({worker:true});assert.equal(w.nav_intent_set_time(state.elapsed),1);
 assert.equal(w.spatial_body_upsert(body,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,body),1);
 const stop1=planner.observeTasks(state),stop2=planner.observeWorld(state);
 try{
 const q=planner.requestNativeFarmArrivalResources(state,worker);assert.ok(q);planner.commitNativeCausalClock();
 const sess=w.nav_intent_session();
 const req=planner.nativeFarmArrivalRequestReference(actor);
 assert.equal(w.nav_farm_arrival_route_proposal_stage_savanna(actor,sess,req.requestSequence,0),1);
 assert.equal(w.nav_intent_barrier_proposal_ticket(),1);
 const t=Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));
 assert.equal(w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),t[1]),1);
 assert.equal(w.nav_intent_execution_begin(),1);w.nav_intent_clock_commit(1,0);
 const seq=planner.nativeFarmArrivalRouteBinding(actor).assignmentSequence;
 const clear=(x,z)=>w.nav_flight_crop_origin_clear(sess,actor,seq,x,z,1.1);
 assert.ok(Math.hypot(worker.x-68,worker.z-2)>2.2);
 assert.equal(clear(68,2),0);assert.equal(clear(57.8,0),0);assert.equal(clear(57.7995,0),1);
 const halfStep=.05*1.08/2,offset=2.19995;assert.ok(Math.hypot(halfStep,offset)>2.2);assert.equal(clear(62+halfStep,offset),0);
 assert.equal(clear(83,27.1),1);assert.equal(w.nav_flight_crop_origin_clear(sess+1,actor,seq,83,27.1,1.1),-2);
 assert.equal(w.nav_flight_crop_origin_clear(sess,actor,seq+1,83,27.1,1.1),-2);
 }finally{stop2();stop1();}
}finally {session.dispose();}
});

for (const tampered of [null, 'body', 'event']) {
  test(tampered ? 'crop birth rejects a mismatched evacuation '+tampered :
      'late Farm readiness leaves the evacuation source and the new animal on separate bodies', async () => {
    let release, held;
    const wait = new Promise(resolve => { release = resolve; });
    const f = await nativeProductionAuthority(source(), {
      qualifyFarmFlee:true, qualifyAnimalCrop:true, chunkKeys,
      async onReady(record) {
        if (!tampered && record.kind === 'farm-arrival' && !held) { held=record; await wait; }
      },
    });
    try {
      await untilProduction(f,()=>tampered ? f.records.some(r=>r.kind==='farm-arrival'&&r.committed) : !!held);
      const post=f.controlPort.postMessage;
      const events=[];
      f.controlPort.postMessage=data=>{
        if(data.actorId)events.push(data);
        if(tampered&&data.raidFlightBirth)
          data={...data,raidFlightBirth:{...data.raidFlightBirth,...(tampered==='body'?{workerBody:data.pendingAnimalCrop.bodyId}:{raidSpawnSequence:data.raidFlightBirth.raidSpawnSequence+1})}};
        post(data);
      };
      f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
      let state;
      for(let i=0;i<100;i++){
        const step=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
        state=JSON.parse(step.snapshot);
        if(state.raid)break;
        for(const key of step.residency?.missing??[]){
          const [cx,cz]=key.split(',').map(Number); f.command({kind:'addChunk',cx,cz});
        }
        await f.present();
      }
      if(tampered){
        await assert.rejects(untilProduction(f,()=>{f.snapshot();return false;}),tampered==='body'?/Crop birth lacks its current raid flight peer/:/Animal crop preparation lacks its current native source/);
        assert.ok(!f.records.some(r=>r.kind==='animal-crop-route'&&r.committed));
        return;
      }
      release();
      await untilProduction(f,()=>held.aborted);
      assert.equal(held.committed,false);
      assert.equal(state.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
      assert.deepEqual([state.workers[0].x,state.workers[0].z],[60,0]);
      const request=events.find(e=>e.homeRequest)?.homeRequest;
      const animal=events.find(e=>e.pendingAnimalCrop);
      assert.equal(request.version,2);assert.equal(request.bodyId,1);
      assert.equal(animal.pendingAnimalCrop.bodyId,2);
      assert.equal(animal.raidFlightBirth.raidSpawnSequence,request.raidSpawnSequence);
      assert.equal(animal.raidFlightBirth.sourceSequence,request.requestSequence);
      assert.equal(animal.raidFlightBirth.farmTicket,null);
      for(let i=0;i<50&&!f.records.some(r=>r.kind==='home-arrival'&&r.committed);i++){await f.present();state=f.advance(.05);}
      assert.ok(f.records.some(r=>r.kind==='home-arrival'&&r.committed));assert.equal(state.workers[0].status,'home');
      assert.deepEqual(f.faults,[]);
    } finally { release();await f.close(); }
  });
}