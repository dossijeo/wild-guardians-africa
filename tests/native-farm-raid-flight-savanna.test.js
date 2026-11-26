import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSnapshot} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';

// Day two of the paid sabana712 microevent opening. The ordinary first night
// left two living crops and zero tasks. The second hire cost 30.
function source() {
  const state = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/sabana712-day2-farm-before-raid.json.gz', import.meta.url))));
  state.dayPlan = {at: state.time + 4, done: false, group: ['warthog']};
  return state;
}
const chunkKeys = Array.from({length: 25}, (_, i) => [i % 5, Math.floor(i / 5) - 2].join(','));

for(const complete of [false,true])test('terminal Draw loss requires both Flight Home and crop clocks: '+complete, async () => {
  const receipts=new Map();
  const f=await nativeProductionAuthority(source(),{qualifyFarmFlee:true,qualifyAnimalCrop:true,chunkKeys,
    onCommit(record,receipt){receipts.set(record.kind,receipt);}});
  const ports=new MessageChannel();
  let replacement;
  try{
    await untilProduction(f,()=>f.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    const fields=['nativeHome','nativeAnimalCrop'];
    let original,rows;
    for(let i=0;i<165;i++){
      const step=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
      for(const key of step.residency?.missing??[]){
        const [cx,cz]=key.split(',').map(Number);
        f.command({kind:'addChunk',cx,cz});
      }
      await f.present();
      original=f.host.inspect().nativeRouteFrame;
      rows=fields.map(field=>original?.bindings.find(row=>row[field]));
      if(rows.every(row=>row?.relativeTime>0))break;
    }
    assert(rows.every(row=>row?.relativeTime>0),'expected two clocks in the last original frame');
    const bindingFields=['nativeHomeRouteBinding','nativeAnimalCropRouteBinding'];
    const originals=['home-route','animal-crop-route'].map((kind,i)=>receipts.get(kind)[bindingFields[i]]);
    assert.notEqual(originals[0].reference.worldBoundary.ticket,originals[1].reference.worldBoundary.ticket);
    const before=f.snapshot();
    f.gpu.device.destroy();
    f.retireResourceEndpoint();
    const receipt=await f.authority.quiesceNativeIntentProduction();
    const retired=await f.authority.flushNativeResourcePreparation({allowRetired:true});
    assert(retired.terminal&&retired.callbacksSettled);
    const route=await f.authority.terminalWorkerRoute();
    assert.deepEqual(route,{version:2,members:[{kind:18,actorId:21},{kind:26,actorId:22}]});
    replacement=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1}},
      {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
    const {recoveredWorkerRoute:q}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,receipt,route);
    assert.deepEqual(q.worldBoundary,original.worldBoundary);
    const at=before.elapsed;
    const ages=q.members.map(({execution,resources},i)=>{
      assert.equal(execution.executedThrough,at);
      assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
      const ref=resources[bindingFields[i]].reference,epoch=ref.worldBoundary.effectiveTime;
      assert.deepEqual(ref,originals[i].reference);
      if(complete||i===0)replacement.client.registerClockBinding(replacement.buffer,{byteOffset:i*4,epoch,semantic:'relative',
        resourceEnd:nativeClockResourceEnd(epoch,ref.endTime),[fields[i]]:ref});
      return floorFloat32(at-epoch);
    });
    await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);
    const submit=replacement.frame(0,{nativeWorldBoundary:q.worldBoundary,
      clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(error=>error);
    await flush();await replacement.host.idle();replacement.host.present();
    const rendered=await submit;
    if(!complete){
      assert.match(rendered.message,/Replacement requires its bound worker clock/);
      assert.equal(replacement.host.inspect().nativeRouteFrame,null);
      await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted|Native GPU fence closed: consumer-retired/);
      assert.equal(f.snapshot().elapsed,at);
      return;
    }
    assert(!(rendered instanceof Error),rendered.message);
    const witness=await f.authority.checkHeldDraw(30,receipt,route);
    assert.deepEqual(witness.members.map(row=>row.relativeTime),ages);
    assert.deepEqual(witness.members.map(row=>row.assignmentSequence),q.members.map(({execution})=>execution.binding.assignmentSequence));
    assert.deepEqual([...new Float32Array(replacement.gpu.buffers[0].data.buffer).subarray(0,2)],ages);
    f.authority.resumeNativeIntentProduction(receipt);
    f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
    const after=f.snapshot();
    assert.equal(after.elapsed,at+.05);
    assert.equal(after.workers[0].nativeRouteAdmission,'native-home');
    assert.notDeepEqual(after.workers.map(({x,z})=>[x,z]),before.workers.map(({x,z})=>[x,z]));
    assert.notDeepEqual(after.raid.animals.map(({x,z})=>[x,z]),before.raid.animals.map(({x,z})=>[x,z]));
    assert.deepEqual(after.raid.reservations,before.raid.reservations);
    assert.deepEqual(f.faults,[]);
  }finally{
    replacement?.client.dispose();
    await replacement?.host.dispose();
    ports.port1.close();ports.port2.close();
    await f.close();
  }
});
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
import {copyNativeFarmArrivalRequestReference as copyFarmRequest} from '../src/world/native-farm-arrival-request-reference.js';

for(const order of ['retired-active','absence-first','foreign-retirement']){
 test('paid civilian returns after the actual RaidEnded: '+order,async()=>{
  const initial=source(),original=initial.workers[0],receipts=new Map();
  let release,ready,absent=false,firstHome,retreat,heldState;
  const wait=new Promise(resolve=>{release=resolve;});
  const f=await nativeProductionAuthority(initial,{qualifyFarmFlee:true,qualifyAnimalCrop:true,chunkKeys,
   onCommit(record,data){receipts.set(record,data);},
   async onPrepare(record){
    if(record.kind!=='farm-arrival'||!firstHome||order!=='absence-first')return;
    // The ordinary render stream can remove the departed animal before the new 23.
    const at=f.snapshot().elapsed;
    f.client.beginFrame({nativeWorldBoundary:retreat.worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
    const encoder=f.client.device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
    pass.end();f.client.device.queue.submit([encoder.finish()]);
    const drawn=f.client.endFrame();await f.present();await drawn;
    assert.equal(f.host.inspect().nativeRouteFrame.bindings.length,0);absent=true;
   },
   async onReady(record){
    if(record.kind==='farm-arrival'&&firstHome){ready=record;await wait;}
   }
  });
  try{
   const committed=kind=>f.records.findLast(r=>r.kind===kind&&r.committed);
   await untilProduction(f,()=>committed('farm-arrival'));
   const hire=receipts.get(committed('farm-arrival')).nativeFarmArrivalBinding.reference;
   f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
   const post=f.controlPort.postMessage;
   f.controlPort.postMessage=e=>{
    if(order==='foreign-retirement'&&e.farmArrivalRequest?.version===2)e={...e,farmArrivalRequest:{...e.farmArrivalRequest,refugeSequence:e.farmArrivalRequest.refugeSequence-1}};
    post(e);
   };
   let state,advanceCount=0,atHome=false,ended,secondFarm,seenCivilDraw=false;
   for(;advanceCount<2400;advanceCount++){
    await f.present();
    if(order==='foreign-retirement'&&f.host.inspect().failed)break;
    if(committed('home-arrival'))firstHome=receipts.get(committed('home-arrival')).nativeHomeArrivalBinding;
    const crop=committed('animal-crop-route');
    if(crop){
     const binding=receipts.get(crop).nativeAnimalCropRouteBinding;
     if(binding.reference.purpose==='retreat')retreat=binding.reference;
    }
    if(ready&&heldState===undefined){
     heldState=f.snapshot();assert.equal(heldState.workers[0].nativeRouteAdmission,'pending-farm-arrival-resources');
     assert.equal(heldState.workers[0].nativeRefugeSequence,firstHome.retiredSequence);
     assert.equal(heldState.workers[0].raidReturn,true);
     assert.deepEqual([heldState.workers[0].x,heldState.workers[0].z],[60,0]);
     assert.throws(()=>validateSnapshot(heldState),/Invalid live Farm return/);
     for(let i=0;i<2;i++){const w=f.advance(.05).workers[0];assert.deepEqual([w.x,w.z,w.walkPhase],[60,0,heldState.workers[0].walkPhase]);}
     release();
    }
    if(ready?.committed){
     secondFarm=receipts.get(ready).nativeFarmArrivalBinding;
     const frame=f.host.inspect().nativeRouteFrame;
     if(frame?.worldBoundary?.ticket===secondFarm.reference.worldBoundary.ticket)seenCivilDraw=true;
    }
    if(seenCivilDraw&&state.workers[0].nativeRouteAdmission==='native-idle'&&committed('idle-cycle'))break;
    const step=f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});state=JSON.parse(step.snapshot);
    for(const key of step.residency?.missing??[]){const [cx,cz]=key.split(',').map(Number);f.command({kind:'addChunk',cx,cz});}
    if(state.workers[0].status==='home')atHome=true;
    ended??=state.events.find(e=>e.type==='RaidEnded');
   }
   if(order==='foreign-retirement'){
    assert.match(f.host.inspect().errors.join('\n'),/Civil Farm request lacks its acquired Home absence/);
    assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length,1);return;
   }
   assert(atHome&&ended&&retreat&&seenCivilDraw&&secondFarm);
   assert.equal(absent,order==='absence-first');assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length,2);
   const r=secondFarm.reference,q=r.sourceRequest;
   assert.throws(()=>copyFarmRequest({...hire.sourceRequest,refugeSequence:undefined}),/Invalid native farm arrival source/);
   assert.throws(()=>copyFarmRequest({...q,refugeSequence:q.requestSequence}),/Invalid native farm arrival source/);
   assert.equal(q.version,2);assert.equal(q.refugeSequence,firstHome.retiredSequence);
   assert.equal(q.actorId,hire.actorId);assert.notEqual(r.bodyId,hire.bodyId);assert.notEqual(r.bodyId,retreat.bodyId);
   assert(q.requestedAt>=ended.simulationTime);assert.equal(r.motionFlags,0);
   assert.deepEqual([q.pose.x,q.pose.z],[60,0]);
   for(const key of ['yaw','walkPhase','runPhase','carryPhase','runRemaining'])assert.equal(q.pose[key],firstHome.reference.pose[key]);
   const last=state.workers[0];assert.equal(last.status,'idle');assert.equal(last.raidReturn,false);
   assert.equal(last.nativeRouteAdmission,'native-idle');assert.equal(last.nativeRefugeSequence,undefined);
   assert.equal(last.contractDay,original.contractDay);assert.equal(last.personId,original.personId);
   assert.deepEqual(state.ledger,initial.ledger);assert.deepEqual(f.faults,[]);
  }finally{release();await f.close();}
 });
}
