import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './helpers/native-initial-idle-game.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {tick} from '../src/simulation/game.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

// Actual source/ports/retained packet/Host. The shared vertical uses a
// simulated GPU queue; original worker geometry is validated separately.
for(const mode of ['rest','watch'])test(`initial ${mode} body uses the common prepared transaction while its peer advances`,async()=>{
 const f=nativeInitialIdleGameFixture({mode,peer:true});let v;try{
  const worker=structuredClone(f.worker),body=f.body(1),peer=f.body(3),rng=f.state.rng;
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body',onPrepare(){tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);},onDrain(){tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);}});
  const result=await v.run(options=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...options}));
  assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));assert.equal(result.receipt.nativeInitialIdleBodyVersion,1);assert.equal(result.resources.kind,20);assert(result.nativeInitialIdleBodyBinding.reference.worldBoundary.effectiveTime>result.nativeInitialIdleBodyBinding.preparedReference.worldBoundary.effectiveTime);
  assert.deepEqual(f.worker,{...worker,nativeRouteAdmission:'native-idle'});assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);
  await v.present();tick(f.state,.2,f.nav);await flush();await v.host.idle();v.host.present();
  const consumer=v.host.inspect(),frame=consumer.nativeRouteFrame,binding=frame.bindings.find(b=>b.nativeInitialIdleBody?.actorId===f.actor);assert(binding);assert.equal(binding.executionEpoch,result.nativeInitialIdleBodyBinding.reference.worldBoundary.effectiveTime);assert.equal(Math.fround(binding.relativeTime),binding.relativeTime);assert.deepEqual(binding.nativeInitialIdleBody,result.nativeInitialIdleBodyBinding.preparedReference);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,{...worker,nativeRouteAdmission:'native-idle'});assert.deepEqual(v.errors,[]);
  const pick=captureNativeRoutePickFrame(consumer);assert.equal(pick.getInitialIdleBodyElapsed(binding.nativeInitialIdleBody),binding.relativeTime);
 }finally{await v?.close();f.close();}
});

test('uninitialized initial Idle cannot borrow a prepared body transaction',async()=>{
 const f=nativeInitialIdleGameFixture({mode:null,peer:true});let v;try{
  const worker=structuredClone(f.worker),sequence=f.w.nav_intent_transition_sequence();v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body'});
  const result=await v.run(options=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...options}));assert.equal(result.status,'unsupported');assert.equal(v.counters().preparations,0);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.worker,worker);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
 }finally{await v?.close();f.close();}
});

for(const reason of ['cancelled','semantic-change'])test(`initial body admission retires prepared resources before acquisition when ${reason}`,async()=>{
 const f=nativeInitialIdleGameFixture({mode:'watch',peer:true}),controller=new AbortController();let v;try{
  const before=f.body(1),rng=f.state.rng;
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body',onReady(){if(reason==='cancelled')controller.abort();else f.worker.idleState.elapsed+=.25;}});
  const result=await v.run(options=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...options}),{signal:controller.signal});
  assert.equal(result.status,reason==='cancelled'?'control-failed':'stale',JSON.stringify(result));await flush();await v.host.idle();
  assert.equal(v.counters().preparations,1);assert.equal(v.counters().commits,0);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.deepEqual(f.body(1),before);assert.equal(f.state.rng,rng);assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{await v?.close();f.close();}
});

test('initial body acquisition waits for the actual submitted GPU queue drain while its peer advances',async()=>{
 const f=nativeInitialIdleGameFixture({mode:'rest',peer:true});let v,releaseDrain,signalDrain,originalDrain;
 const draining=new Promise(resolve=>{signalDrain=resolve;});try{
  const before=f.body(1),peer=f.body(3),worker=structuredClone(f.worker);
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body',onReady({gpu}){originalDrain=gpu.device.queue.onSubmittedWorkDone;gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;signalDrain();});}});
  const pending=v.run(options=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...options}));await draining;
  assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(v.counters().commits,0);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),before);
  tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.body(1),before);v.gpu.device.queue.onSubmittedWorkDone=originalDrain;releaseDrain();
  const result=await pending;assert.equal(result.status,'committed',JSON.stringify(result));await v.present();assert.equal(v.counters().commits,1);assert.deepEqual(f.body(1),before);assert.deepEqual(v.errors,[]);
 }finally{releaseDrain?.();await v?.close();f.close();}
});
