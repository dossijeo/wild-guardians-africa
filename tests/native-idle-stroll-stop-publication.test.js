import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {nativeSuspendedBodiesFromProposal} from '../src/world/native-suspended-body-reference.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {pair,fixture as remoteFixture} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
// Native source and MessagePort are real. The drain/retained frame receipt is
// a deterministic metadata double, not evidence of graphical stop preparation.
async function fixture({receipt=m=>m,onDrain=()=>{},...options}={}){
 const f=controlledNativeIdleStroll(options);let source;const {port1,port2}=new MessageChannel(),errors=[],requests=[];
 try{
  port2.onmessage=async({data:m})=>{try{
   if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session:'stroll-stop',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
   else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session:'stroll-stop',authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
   else if(m.type==='IntentMutationQuiesce'){requests.push(m);await onDrain(f,m);port2.postMessage(receipt({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeIdleStrollStopVersion:1}));}
   else if(m.type==='IntentMutationRelease'){requests.push(m);if(m.committed&&m.nativeStrollStops?.length)f.c.installStrollStops(m.worldBoundary,m.nativeStrollStops);}
   else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session:'stroll-stop',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
  }catch(error){errors.push(error.message);source?.dispose('test-consumer-error');}};
  source=createNativeIntentControlPublication({port:port1,session:'stroll-stop',observe:f.planner.observeNativeIntentControl,onError:error=>errors.push(error.message),timeoutMs:2000});await source.ready;
  const walk=f.prepare(),binding=f.commitStroll(walk);f.c.installStrolls(binding.reference.worldBoundary,[binding]);f.advance(.12);
  const prepared=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(prepared.status,'proposed');
  return {...f,source,prepared,requests,errors,hold:()=>source.quiesceGpuForMutation({preparedWorldBoundary:prepared.proposal.worldBoundary,preparedIdleStrollStopTemplate:prepared.proposal.nativeStop}),acquire(){const fresh=f.planner.revalidateNativeIdleStrollStopProposal(prepared.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=f.planner.nativeIdleStrollStopBinding(fresh.proposal.nativeStop,prepared.proposal.nativeStop);assert(proof);return {fresh,proof};},async close(){source.dispose();port2.close();f.close();await flush();}};
 }catch(error){source?.dispose();port2.close();f.close();throw error;}
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id}: original direct port preserves prepared stop identity and final acquisition`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=await fixture({profile:profile.id,core:runtime?.core,onDrain:native=>native.advance(.1)});const p=f.prepared.proposal,body=f.body(1),lease=f.c.admitStrollStop(p.nativeStop,{preparingWorldBoundary:p.worldBoundary});f.advance(.2);
  const receipt=await f.hold();assert.equal(receipt.nativeIdleStrollStopVersion,1);assert.deepEqual(receipt.preparedIdleStrollStopTemplate,p.nativeStop);assert.equal(receipt.nativeIdleStrollVersion,undefined);assert(receipt.effectiveTime>p.worldBoundary.effectiveTime);assert.notDeepEqual(f.body(1),body);assert(lease.isPrepared());
  const {proof,fresh}=f.acquire();assert.equal(lease.isCurrent(),false);assert(proof.reference.worldBoundary.effectiveTime>receipt.effectiveTime);assert.throws(()=>f.source.releaseGpuAfterMutation({...receipt}),/stale/);
  assert(f.source.releaseGpuAfterMutation(receipt,{committed:true,worldBoundary:proof.reference.worldBoundary,nativeStrollStops:[proof]}));for(let i=0;i<100&&!lease.isCurrent();i++)await flush();assert(lease.isCurrent());assert.deepEqual(lease.binding,proof);
  const release=f.requests.at(-1);assert.equal(release.type,'IntentMutationRelease');assert.deepEqual(release.nativeStrollStops,[proof]);assert.equal(release.nativeSuspendedBodies,undefined);assert.equal(release.nativeStrolls,undefined);assert.equal(release.effectiveTime,fresh.proposal.worldBoundary.effectiveTime);assert.equal(f.source.status().pendingMutationHold,null);assert.throws(()=>f.source.releaseGpuAfterMutation(receipt),/stale/);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();await runtime?.dispose();}
});

for(const corruption of ['version','family','template','missing-template','frame'])test(`stop drain rejects a substituted ${corruption}`,async()=>{
 const f=await fixture({receipt(m){if(corruption==='version')m.nativeIdleStrollStopVersion=0;if(corruption==='family'){delete m.nativeIdleStrollStopVersion;m.nativeIdleStrollVersion=1;}if(corruption==='template')m.preparedIdleStrollStopTemplate={...m.preparedIdleStrollStopTemplate,worldBoundary:{...m.preparedIdleStrollStopTemplate.worldBoundary,ticket:m.preparedIdleStrollStopTemplate.worldBoundary.ticket+1}};if(corruption==='missing-template')delete m.preparedIdleStrollStopTemplate;if(corruption==='frame')m.preparedFrameSequence=0;return m;}});
 try{const body=f.body(1);await assert.rejects(f.hold(),/acknowledgement/);assert(f.source.status().closed);assert.deepEqual(f.body(1),body);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);assert.equal(f.requests.filter(m=>m.type==='IntentMutationRelease').length,0);}finally{await f.close();}
});

test('stop release rejects missing, duplicate and body-only proofs without consuming its hold',async()=>{
 const f=await fixture();try{
  const receipt=await f.hold(),{proof,fresh}=f.acquire(),worldBoundary=proof.reference.worldBoundary,base={committed:true,worldBoundary};
  assert.throws(()=>f.source.releaseGpuAfterMutation(receipt,base),/retained template/);
  assert.throws(()=>f.source.releaseGpuAfterMutation(receipt,{...base,nativeStrollStops:[proof,proof]}),/moving stops/);
  assert.throws(()=>f.source.releaseGpuAfterMutation(receipt,{...base,nativeSuspendedBodies:nativeSuspendedBodiesFromProposal(fresh.proposal,worldBoundary)}),/retained template/);
  assert.throws(()=>f.source.releaseGpuAfterMutation(receipt,{...base,nativeStrollStops:[proof],nativeSuspendedBodies:nativeSuspendedBodiesFromProposal(fresh.proposal,worldBoundary)}),/repeats an owner/);
  const wrong=structuredClone(proof);wrong.preparedReference.worldBoundary.ticket++;assert.throws(()=>f.source.releaseGpuAfterMutation(receipt,{...base,nativeStrollStops:[wrong]}),/retained template|compatible/);
  assert(f.source.status().pendingMutationHold);assert(f.source.releaseGpuAfterMutation(receipt,{...base,nativeStrollStops:[proof]}));for(let i=0;i<20;i++)await flush();assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('prepared stop needs its own packet, issued owners and exclusive template; abort grants no body',async()=>{
 const f=await fixture();try{
  const r=f.prepared.proposal.nativeStop,b=f.prepared.proposal.worldBoundary;
  assert.throws(()=>f.source.quiesceGpuForMutation({preparedIdleStrollStopTemplate:r}),/prepared packet/);
  assert.throws(()=>f.source.quiesceGpuForMutation({preparedWorldBoundary:b,preparedIdleStrollStopTemplate:r,preparedIdleStrollTemplate:{}}),/Conflicting/);
  const future=structuredClone(r);future.sourceRoute.assignmentSequence=f.source.status().sentSequence+1;future.routes[0].nativeRoute.assignmentSequence=future.sourceRoute.assignmentSequence;assert.throws(()=>f.source.quiesceGpuForMutation({preparedWorldBoundary:b,preparedIdleStrollStopTemplate:future}),/issued source/);
  assert.throws(()=>f.source.quiesceGpuForMutation({preparedWorldBoundary:{...b,ticket:b.ticket+1},preparedIdleStrollStopTemplate:r}),/prepared native mutation boundary/);
  const receipt=await f.hold();assert(f.source.releaseGpuAfterMutation(receipt));for(let i=0;i<20;i++)await flush();assert.equal(f.requests.at(-1).committed,false);assert.equal(f.requests.at(-1).nativeStrollStops,undefined);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('Host rejects a malformed moving-stop template instead of acknowledging a legacy packet',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair(),f=await remoteFixture({}, {intentControl:{port:drawPort,session:'unsupported-stop'}});let source;
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'unsupported-stop',observe:native.bridge.observeNativeIntentControl});await source.ready;
  // Injecting an unsupported field tests fail-closed dispatch. This is neither
  // a native proof nor a retained moving-stop graphical resource.
  const post=sourcePort.postMessage;sourcePort.postMessage=m=>post(m.type==='IntentMutationQuiesce'?{...m,preparedIdleStrollStopTemplate:{unsupported:true}}:m);
  await assert.rejects(source.quiesceGpuForMutation(),/acknowledgement/);await flush();assert.equal(f.gpu.submitted.length,0);assert(f.errors.some(error=>/native Idle stroll stop reference|native stop reference/i.test(error.message)));
 }finally{source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();}
});
