import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
import {nativeResourceAdmissionProfile} from '../src/world/native-resource-admission-profiles.js';

const flush=()=>new Promise(r=>setImmediate(r));
// Real WASM, authority/publication and both MessageChannels. The consumer only
// simulates a retained resource receipt/drain: this is NOT a graphical21 test.
async function protocol(f,{onPrepare=()=>{},onDrain=()=>{},onCommit=()=>{},receipt=m=>m,release=m=>m}={}){
 const session='idle-cycle-admission',{port1,port2}=new MessageChannel(),resourcePorts=new MessageChannel(),requests=[],errors=[];
 let preparations=0,commits=0,aborts=0,refreshes=0,resolveReleased;
 const released=new Promise(resolve=>{resolveReleased=resolve;});
 port2.onmessage=async({data:m})=>{
  if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  else if(m.type==='IntentMutationQuiesce'){
   requests.push(m);await onDrain(m);
   port2.postMessage(receipt({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeIdleCycleVersion:1}));
  }else if(m.type==='IntentMutationRelease'){requests.push(release(m));resolveReleased(m);}
  else if(m.type!=='IntentControlClosed')port2.postMessage({type:'intent-control-applied',session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
 };
 const source=createNativeIntentControlPublication({port:port1,session,observe:f.planner.observeNativeIntentControl,onError:e=>errors.push(e.message),timeoutMs:2000});
 const endpoint=attachNativeResourcePreparationEndpoint({port:resourcePorts.port2,session:'cycle-resources',isRunning:()=>true,
  async prepare(kind,resources,options){
   assert.equal(kind,'prepareNativeIdleCycleResources');preparations++;await onPrepare(resources,options);
   return {get preparedWorldBoundary(){return resources.worldBoundary;},get preparedIdleCycleTemplate(){return resources.nativeIdleCycle;},valid:()=>true,
    invalidate(){return true;},refresh(next){refreshes++;resources=next;return true;},
    commit(value){commits++;onCommit(value);return true;},abort(){aborts++;}};
  }
 });
 const connection=createNativeResourcePreparationConnection({port:resourcePorts.port1,session:'cycle-resources',timeoutMs:2000});
 await Promise.all([source.ready,connection.ready]);
 return {source,connection,requests,errors,released,counters:()=>({preparations,commits,aborts,refreshes}),
  run(signal){return f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,prepareResources:({resources,signal})=>connection.prepareNativeIdleCycleResources(resources,{signal}),signal});},
  async close(){connection.dispose();endpoint.dispose();source.dispose();port2.close();await flush();}
 };
}

for(const mode of ['rest','watch'])test(`native ${mode} cycle uses one common transaction and actual revalidated source while its peer advances`,async()=>{
 const f=nativeIdleCycleFixture({mode,peer:true});let p,prepared;try{
  const worker=structuredClone(f.worker),held=f.body(1),peer=f.body(3),rng=f.state.rng;
  p=await protocol(f,{onPrepare(resources){prepared=resources;assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(p.requests.length,0);f.advance(.2);},onDrain(){assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);f.advance(.1);},onCommit(value){assert.equal(value.resources.kind,21);assert.deepEqual(value.nativeIdleCycleBinding.preparedReference,prepared.nativeIdleCycle);}});
  const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));await p.released;
  const binding=result.nativeIdleCycleBinding;assert.deepEqual(binding,f.planner.nativeIdleCycleBinding(f.actor));assert.equal(result.receipt.nativeIdleCycleVersion,1);assert.deepEqual(binding.preparedReference,prepared.nativeIdleCycle);assert(binding.reference.worldBoundary.effectiveTime>binding.preparedReference.worldBoundary.effectiveTime);assert.equal(result.timeTranslation.compatible,true);assert.equal(binding.cycleSequence,binding.reference.sourceControlSequence+1);
  assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),held);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert.deepEqual(p.requests.at(-1).nativeIdleCycles,[binding]);assert.equal(p.requests.at(-1).nativeInitialIdleBodies,undefined);assert.deepEqual(p.errors,[]);
  // Preparation supplied no Graph21 association or ordinary Game projection.
  assert.equal(f.planner.nativeInitialIdleBodyState(f.actor),null);
 }finally{await p?.close();f.close();}
});

for(const change of ['rng','pose','anchor','profile','contract','center','task'])test(`native cycle refuses changed ${change} before preparation`,async()=>{
 const f=nativeIdleCycleFixture();let p;try{
  const sequence=f.w.nav_intent_transition_sequence();
  if(change==='rng')f.worker.idleState.rng^=1;
  if(change==='pose')f.worker.heading+=.1;
  if(change==='anchor')f.state.plants.find(p=>p.id==='plant-900098').x+=1;
  if(change==='profile')f.worker.profile='youngFemale';
  if(change==='contract')f.worker.contractDay=f.state.day-1;
  if(change==='center')f.worker.centerId='structure-999999';
  if(change==='task')f.worker.taskId='task-1';
  // A still-present farm plant may move before the first proposal: this is a
  // genuine new anchor, not an immutable body pose. Outside radius is refused.
  if(change==='anchor')f.state.plants.find(p=>p.id==='plant-900098').x+=10;
  p=await protocol(f);const result=await p.run();assert.equal(result.status,'unsupported');assert.equal(p.counters().preparations,0);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{await p?.close();f.close();}
});

for(const failure of ['abort','prepare','semantic','receipt','replaced'])test(`native cycle ${failure} cannot acquire the prepared owner`,async()=>{
 const f=nativeIdleCycleFixture({peer:true}),controller=new AbortController();let p;try{
  const body=f.body(1),rng=f.state.rng;
  p=await protocol(f,{onPrepare(){
   if(failure==='abort')controller.abort();if(failure==='prepare')throw Error('cycle preparation failed');
   if(failure==='semantic')f.worker.idleState.elapsed+=.25;
  },onDrain(){if(failure==='replaced'){assert.equal(f.w.spatial_body_remove(1),1);f.planner.commitNativeCausalClock();}},receipt:m=>failure==='receipt'?{...m,nativeIdleCycleVersion:0}:m});
  const result=await p.run(controller.signal);assert.equal(result.status,{abort:'control-failed',prepare:'control-failed',semantic:'stale',receipt:'control-failed',replaced:'resources-changed'}[failure],JSON.stringify(result));await flush();
  assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(p.counters().commits,0);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);if(failure!=='replaced')assert.deepEqual(f.body(1),body);
 }finally{await p?.close();f.close();}
});

test('a next native REST can prepare another cycle only from its actual semantic request',async()=>{
 const f=nativeIdleCycleFixture({mode:'watch',rng:0x12345678});let p;try{
  const first=f.propose();f.commit(first);assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');
  f.advance(first.header[23]);const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert.equal(next.idleState.mode,'rest');
  assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported','Old Game semantics cannot stand in for the issued next request');
  // A semantic projection fixture only; the ordinary Game projector remains
  // pending. Permission is still obtained through the real native transaction.
  f.worker.idleState=structuredClone(next.idleState);p=await protocol(f);const body=f.body(1),rng=f.state.rng;
  const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(result.nativeIdleCycleBinding.reference.sourceCycleSequence,next.sourceCycle.cycleSequence);assert.deepEqual(result.nativeIdleCycleBinding.reference.initialState,next.idleState);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{await p?.close();f.close();}
});

test('a pending native stroll cannot borrow the stationary cycle transaction',async()=>{
 const f=nativeIdleCycleFixture({mode:'watch',rng:0});let p;try{
  const first=f.propose();f.commit(first);f.advance(first.header[23]);assert.equal(f.planner.nativeIdleCycleNextRequest(f.actor).idleState.mode,'walk');
  p=await protocol(f);assert.equal((await p.run()).status,'unsupported');assert.equal(p.counters().preparations,0);
 }finally{await p?.close();f.close();}
});

test('the source release rejects missing, duplicate, foreign and mixed cycle attestations before sending',async()=>{
 const f=nativeIdleCycleFixture();let p;try{
  p=await protocol(f);const release=p.source.releaseGpuAfterMutation.bind(p.source);let rejected=0;
  p.source.releaseGpuAfterMutation=(receipt,options)=>{
   const binding=options.nativeIdleCycles[0];
   for(const bad of [[],[binding,binding],[{...binding,reference:{...binding.reference,bodyId:binding.reference.bodyId+1}}]]){assert.throws(()=>release(receipt,{...options,nativeIdleCycles:bad}));rejected++;}
   assert.throws(()=>release(receipt,{...options,nativeInitialIdleBodies:[f.bodyBinding]}));rejected++;
   assert.throws(()=>release(receipt,{...options,committed:false}));rejected++;
   return release(receipt,options);
  };
  const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(rejected,5);await p.released;assert.equal(p.requests.filter(m=>m.type==='IntentMutationRelease').length,1);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});

test('failure to release after native cycle acquisition closes control and does not report rollback',async()=>{
 const f=nativeIdleCycleFixture();let p;try{
  p=await protocol(f);p.source.releaseGpuAfterMutation=()=>{throw Error('cycle release failure');};const body=f.body(1),result=await p.run();
  assert.equal(result.status,'committed-control-failed');assert.match(result.error,/cycle release failure/);assert(f.planner.nativeIdleCycleBinding(f.actor));assert.deepEqual(f.body(1),body);assert(p.source.status().closed);
 }finally{await p?.close();f.close();}
});

test('an already exhausted watch carries acquisition and its next request through the same release',async()=>{
 const f=nativeIdleCycleFixture({mode:'watch',remaining:0,rng:0x12345678});let p;try{
  p=await protocol(f);const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));const message=await p.released,binding=result.nativeIdleCycleBinding;
  assert.equal(binding.reference.duration,0);assert.equal(p.source.status().sentSequence,binding.cycleSequence+1);assert.equal(f.planner.nativeIdleCycleNextRequest(f.actor).requestSequence,binding.cycleSequence+1);assert.deepEqual(message.nativeIdleCycles,[binding]);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});

test('cycle resources refresh by their own typed class on the existing connection without another preparation',async()=>{
 const f=nativeIdleCycleFixture({peer:true});let p,handle;try{
  p=await protocol(f);const proposal=f.planner.prepareNativeIdleCycleProposal(f.actor).proposal;handle=await p.connection.prepareNativeIdleCycleResources(proposal);
  f.advance(.2);const next=f.planner.revalidateNativeIdleCycleProposal(proposal.ticket);assert.equal(next.status,'revalidated');assert.equal(handle.invalidate(),true);assert.equal(await handle.refresh(next.proposal),true);
  assert.deepEqual(handle.preparedIdleCycleTemplate,next.proposal.nativeIdleCycle);assert.deepEqual(handle.preparedWorldBoundary,next.proposal.worldBoundary);assert.equal(p.counters().refreshes,1);assert.equal(p.counters().preparations,1);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);handle.abort();assert.equal(p.connection.status().retained,0);f.planner.cancelNativeIdleCycleProposal(next.proposal.ticket);
 }finally{handle?.abort();await p?.close();f.close();}
});

test('native cycle profile rejects another family and never mistakes metadata for its issued association',()=>{
 const f=nativeIdleCycleFixture();try{
  const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');const profile=nativeResourceAdmissionProfile('idle-cycle'),r=profile.reference(p.proposal);
  assert.deepEqual(r,p.proposal.nativeIdleCycle);assert.equal(profile.receiptCompatible({nativeIdleCycleVersion:1,preparedIdleCycleTemplate:r},r),true);assert.equal(profile.receiptCompatible({nativeInitialIdleBodyVersion:1,preparedInitialIdleBodyTemplate:r},r),false);
  assert.throws(()=>profile.attest({nativeIdleCycleBinding:()=>null},r,r),/association unavailable/);assert.throws(()=>profile.reference({...p.proposal,kind:'native-initial-idle-body-proposal'}));
  assert.equal(f.planner.cancelNativeIdleCycleProposal(p.proposal.ticket),true);
 }finally{f.close();}
});
