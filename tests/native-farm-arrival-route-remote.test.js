import {setup,admit,present} from './helpers/native-farm-arrival-remote.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {pair,fixture as graphicsFixture,preparedWorldDraw,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Native authority, retained packet, direct control and actual client/Host are
// real. The GPU device/queue is the fixture double, not hardware/roster proof.

for(const profile of PROFILES)for(const mode of ['exact','late'])test(`${profile.id} ${mode} Farm acquire uses actual retained Host receipt, relative clock and first submitted pick witness`,async()=>{
 const f=await setup({profile:profile.id});let p;try{const body=f.body(1),peer=f.body(3);p=admit(f,{mode,urgent:true});const r=await p.promise;assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(r.receipt.nativeFarmArrivalVersion,1);assert.deepEqual(r.receipt.preparedFarmArrivalTemplate,p.reference);assert.equal(r.resources.kind,23);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.deepEqual(f.body(1),body);const first=await present(f,p),binding=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert.equal(first.getFarmArrivalElapsed(p.reference),0);assert.equal(first.getFarmArrivalExecutionTime(p.reference),binding.reference.worldBoundary.effectiveTime);assert(f.gpu.calls.some(c=>c[0]==='writeBuffer'&&c[1]===4&&new Float32Array(Uint8Array.from(c[2]).buffer)[0]===Math.fround(binding.reference.worldBoundary.effectiveTime%2.5)));if(mode==='late'){assert(binding.reference.worldBoundary.effectiveTime>p.reference.worldBoundary.effectiveTime+.3);assert.notDeepEqual(f.body(3),peer);}f.advance(.2);await flush();f.host.present();const next=captureNativeRoutePickFrame(f.host.inspect());assert(next.getFarmArrivalElapsed(p.reference)>.19);assert(next.getFarmArrivalExecutionTime(p.reference)<=f.state.elapsed);assert.notDeepEqual(f.body(1),body);assert.equal(f.planner.nativeGameExecutionState(),1);assert.deepEqual(f.errors,[]);assert.deepEqual(f.sourceErrors,[]);}finally{p?.prepared?.abort();await f.close();}
});

for(const mode of ['missing-relative','missing-template','foreign-source','wrong-epoch'])test(`a ${mode} Farm retained packet cannot acquire native movement through the real Host`,async()=>{
 const f=await setup();let p;try{const body=f.body(1),q=f.requestSource;p=admit(f,{mode});const r=await p.promise;assert.notEqual(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),q);assert.equal(f.worker.nativeRouteAdmission,'pending-farm-arrival-resources');}finally{p?.prepared?.abort();await f.close();}
});

test('a consumer without advertised Farm support rejects the binding before a frame can be prepared',async()=>{
 const f=await setup({capability:false});try{const body=f.body(1),p=admit(f),r=await p.promise;assert.equal(r.status,'control-failed');assert.match(r.error,/does not yet support native farm/);assert.equal(p.prepared,null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.gpu.submitted.length,0);}finally{await f.close();}
});

test('zero Farm arrival keeps the exact native endpoint while the actual Host installs the zero-age route',async()=>{
 const f=await setup({inside:true});let p;try{const body=f.body(1),worker=structuredClone(f.worker);p=admit(f,{urgent:true});const r=await p.promise;assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(r.nativeFarmArrivalBinding.reference.distance,0);const pick=await present(f,p);assert.equal(pick.getFarmArrivalElapsed(p.reference),0);assert.equal(pick.getFarmArrivalExecutionTime(p.reference),r.nativeFarmArrivalBinding.reference.worldBoundary.effectiveTime);assert.deepEqual(f.body(1),body);for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],worker[k]);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);}finally{p?.prepared?.abort();await f.close();}
});

test('the physical owner remains pending until the actual Host submitted-work drain completes',async()=>{
 const f=await setup();let p,releaseDrain,startedResolve;const started=new Promise(r=>startedResolve=r),original=f.gpu.device.queue.onSubmittedWorkDone;try{const body=f.body(1);p=admit(f,{afterReady(){f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;startedResolve();});}});await started;assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'pending-farm-arrival-resources');f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain();const r=await p.promise;assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));await present(f,p);assert.deepEqual(f.body(1),body);}finally{f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain?.();p?.prepared?.abort();await f.close();}
});

test('missing final Farm release stays an explicit committed/control failure and never adopts the prepared image',async()=>{
 const f=await setup();let p;try{p=admit(f,{mode:'missing-release'});const r=await p.promise;assert.equal(r.status,'committed-control-failed');assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert(f.source.status().closed);await assert.rejects(p.prepared.presented);assert.equal(f.host.inspect().activeSequence,null);}finally{p?.prepared?.abort();await f.close();}
});

test('pthread obtains the same real Host Farm receipt and submitted clock',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,p;try{f=await setup({core:runtime.core});p=admit(f,{mode:'late'});const r=await p.promise;assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));const pick=await present(f,p);assert.equal(pick.getFarmArrivalElapsed(p.reference),0);assert.deepEqual(r.receipt.preparedFarmArrivalTemplate,p.reference);}finally{p?.prepared?.abort();await f?.close();await runtime.dispose();}
});

test('cancellation during the actual Host drain preserves the original physical source',async()=>{
 const f=await setup(),controller=new AbortController();let p,releaseDrain,startedResolve;const started=new Promise(r=>startedResolve=r),original=f.gpu.device.queue.onSubmittedWorkDone;try{const body=f.body(1),source=f.requestSource;p=admit(f,{signal:controller.signal,afterReady(){f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;startedResolve();});}});await started;controller.abort();f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain();const r=await p.promise;assert.notEqual(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),source);assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'pending-farm-arrival-resources');await assert.rejects(p.prepared.presented);}finally{f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain?.();p?.prepared?.abort();await f.close();}
});

test('a Farm clock cannot borrow a Home reference or another prepared epoch on the actual client',async()=>{
 const f=await setup();try{const proposal=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal,r=proposal.nativeFarmArrival;assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:r.worldBoundary.effectiveTime,nativeFarmArrival:r,nativeHome:r}),/Invalid native farm arrival clock/);assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:r.worldBoundary.effectiveTime+.1,nativeFarmArrival:r}),/Invalid native farm arrival clock/);assert.equal(f.gpu.submitted.length,0);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);}finally{await f.close();}
});
