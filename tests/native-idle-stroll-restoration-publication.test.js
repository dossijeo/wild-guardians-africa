import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledRestoredNativeIdleStroll} from './helpers/native-idle-stroll-restoration-control.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {strollAdmissionProtocol} from './helpers/native-idle-stroll-admission.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {pair,fixture as remoteFixture} from './helpers/remote-webgpu-fixture.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
// Native authority, direct publication and both resource ports are real.
// Preparation/drain receipts are doubles; these tests do not certify GPU use.
for(const profile of PROFILES)test(`${profile.id} restored source crosses the existing asynchronous22 preparation and drain protocol`,async()=>{
 const f=controlledRestoredNativeIdleStroll({saved:nativeIdleStrollGameSave({profile:profile.id})});let port,prepared;try{
  const q=f.c.pendingIdleStrollRequest(f.actor),body=f.body(1),rng=f.state.rng;
  port=await strollAdmissionProtocol(f,{onPrepare(resources){prepared=resources;assert.deepEqual(resources.nativeIdleStroll.sourceRequest,q);f.advance(.2);assert.deepEqual(f.body(1),body);},onDrain(){f.advance(.1);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);}});
  const result=await port.run();assert.equal(result.status,'committed',JSON.stringify(result));const released=await port.released,b=result.nativeIdleStrollBinding;assert.deepEqual(b.preparedReference,prepared.nativeIdleStroll);assert.deepEqual(b.reference.sourceRequest,q);assert.deepEqual(released.nativeStrolls,[b]);assert.equal(released.nativeIdleCycles,undefined);assert(b.reference.worldBoundary.effectiveTime>prepared.worldBoundary.effectiveTime);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.state.rng,rng);assert.deepEqual(f.body(1),body);assert(f.c.admitStroll(prepared.nativeIdleStroll).isCurrent());f.advance(.1);assert.notDeepEqual(f.body(1),body);assert.deepEqual(port.errors,[]);
 }finally{await port?.close();f.close();}
});

test('aborted restored preparation preserves the exact request, pose, destination and private RNG for retry',async()=>{
 const f=controlledRestoredNativeIdleStroll();let port,cancel=true;const controller=new AbortController();try{
  const q=f.c.pendingIdleStrollRequest(f.actor),body=f.body(1);port=await strollAdmissionProtocol(f,{onPrepare(){if(cancel){cancel=false;controller.abort();}}});const first=await port.run(controller.signal);assert.notEqual(first.status,'committed');assert.deepEqual(f.c.pendingIdleStrollRequest(f.actor),q);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);await flush();const second=await port.run();assert.equal(second.status,'committed',JSON.stringify(second));await port.released;assert.deepEqual(second.nativeIdleStrollBinding.reference.sourceRequest,q);assert.deepEqual(port.errors,[]);
 }finally{await port?.close();f.close();}
});

for(const corruption of ['missing-source','changed-source','wrong-family'])test(`a restored ${corruption} drain receipt cannot acquire a native route`,async()=>{
 const f=controlledRestoredNativeIdleStroll();let port;try{
  const body=f.body(1),q=f.c.pendingIdleStrollRequest(f.actor);port=await strollAdmissionProtocol(f,{receipt(m){if(corruption==='missing-source')delete m.preparedIdleStrollTemplate.sourceRequest;if(corruption==='changed-source')m.preparedIdleStrollTemplate.sourceRequest.walkRng++;if(corruption==='wrong-family'){delete m.nativeIdleStrollVersion;m.nativeIdleCycleVersion=1;}return m;}});const result=await port.run();assert.equal(result.status,'control-failed',JSON.stringify(result));assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.planner.nativeIdleStrollRequestReference(f.actor),q);assert(port.errors.some(e=>/acknowledgement/.test(e)));
 }finally{await port?.close();f.close();}
});

test('live Game anchor substitution during preparation cannot commit restored source ownership',async()=>{
 const f=controlledRestoredNativeIdleStroll();let port;try{
  const body=f.body(1);port=await strollAdmissionProtocol(f,{onPrepare(){f.state.plants.find(p=>p.id===f.worker.idleState.anchorId.slice(5)).x+=.01;}});const result=await port.run();assert.notEqual(result.status,'committed');assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.body(1),body);assert.equal(port.counters().commits,0);
 }finally{await port?.close();f.close();}
});

test('a contract that ends during resource preparation keeps Home and never commits the old restored WALK',async()=>{
 const saved=nativeIdleStrollGameSave(),w=saved.state.workers[0];saved.state.time=PROFILES.find(p=>p.id===w.profile).end-.05;const f=controlledRestoredNativeIdleStroll({saved});let port;try{
  const body=f.body(1);port=await strollAdmissionProtocol(f,{onPrepare(){f.advance(.1);}});const result=await port.run();assert.notEqual(result.status,'committed');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert(f.planner.nativeHomeRequestReference(f.actor));assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(port.counters().commits,0);
 }finally{await port?.close();f.close();}
});

test('pthread restored source uses the existing two-port asynchronous transaction',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,port;try{f=controlledRestoredNativeIdleStroll({core:runtime.core});port=await strollAdmissionProtocol(f,{onPrepare(){f.advance(.1);}});const result=await port.run();assert.equal(result.status,'committed',JSON.stringify(result));await port.released;assert(result.nativeIdleStrollBinding.reference.sourceRequest);assert.deepEqual(port.errors,[]);}finally{await port?.close();f?.close();}
});

test('the original remote Host validates restored metadata instead of ignoring duplicate or foreign-session baselines',async()=>{
 for(const duplicate of [false,true]){const f=controlledRestoredNativeIdleStroll();let graphics,source;const incoming=[],outgoing=[];try{
  const [sourcePort,drawPort]=pair();const post=sourcePort.postMessage;sourcePort.postMessage=data=>{outgoing.push(data);post(data);};graphics=await remoteFixture({}, {intentControl:{port:drawPort,session:'restored-stroll-negative'}});source=createNativeIntentControlPublication({port:sourcePort,session:'restored-stroll-negative',timeoutMs:500,observe(options){return f.planner.observeNativeIntentControl({...options,onBaseline(b){const q=b.pendingIdleStrollRequests[0];options.onBaseline({...b,pendingIdleStrollRequests:duplicate?[q,q]:[{...q,nativeSession:q.nativeSession+1}]});}});}});const receive=sourcePort.onmessage;sourcePort.onmessage=e=>{incoming.push(e.data);receive(e);};let rejected;await assert.rejects(source.ready,error=>{rejected=error;return /timed out|Native intent control closed: consumer-retired/.test(error.message);});await flush();await graphics.host.idle();const retired=incoming.filter(m=>m.type==='intent-control-retired');assert.equal(incoming.some(m=>m.type==='intent-control-applied'&&m.accepted),false);if(source.status().drained){assert.match(rejected.message,/consumer-retired/);assert.equal(retired.length,1);assert.equal(retired[0].consumerToken,outgoing.find(m=>m.type==='IntentBaseline').consumerToken);assert.equal(retired[0].drained,true);}else{assert.match(rejected.message,/timed out/);assert.equal(retired.length,0);}assert.equal(graphics.host.inspect().failed,true);assert.match(graphics.errors[0].message,/stroll/);assert.equal(graphics.gpu.submitted.length,0);
 }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}}
});

test('the original remote Host acknowledges a valid restored source without submitting invented graphical resources',async()=>{
 const f=controlledRestoredNativeIdleStroll();let graphics,source;try{
  const [sourcePort,drawPort]=pair();graphics=await remoteFixture({}, {intentControl:{port:drawPort,session:'restored-stroll-baseline'}});source=createNativeIntentControlPublication({port:sourcePort,session:'restored-stroll-baseline',timeoutMs:1000,observe:f.planner.observeNativeIntentControl});await source.ready;await graphics.host.idle();assert.equal(graphics.host.inspect().failed,false);assert.equal(graphics.gpu.submitted.length,0);assert.deepEqual(graphics.errors,[]);assert(f.c.pendingIdleStrollRequest(f.actor));
 }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}
});
