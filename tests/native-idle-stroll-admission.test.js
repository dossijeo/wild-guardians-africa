import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {strollAdmissionProtocol} from './helpers/native-idle-stroll-admission.js';
import {nativeResourceAdmissionProfile} from '../src/world/native-resource-admission-profiles.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const flush=()=>new Promise(r=>setImmediate(r));
for(const peer of [false,true])test(`common stroll transaction retains its chosen source through preparation/drain/retiming (${peer?'peer':'first mover'})`,async()=>{
 const f=controlledNativeIdleStroll({peer});let p,prepared,lease;try{
  const worker=structuredClone(f.worker),body=f.body(1),b=f.body(3),rng=f.state.rng;
  p=await strollAdmissionProtocol(f,{onPrepare(resources){prepared=resources;lease=f.c.admitStroll(resources.nativeIdleStroll,{preparingWorldBoundary:resources.worldBoundary});assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);f.advance(.2);assert.deepEqual(f.body(1),body);},onDrain(){assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(lease.isCurrent(),false);f.advance(.1);},onCommit(value){assert.equal(value.resources.kind,22);assert.deepEqual(value.nativeIdleStrollBinding.preparedReference,prepared.nativeIdleStroll);}});
  const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));const released=await p.released;await flush();const binding=result.nativeIdleStrollBinding;assert.deepEqual(binding,f.planner.nativeIdleStrollBinding(f.actor));assert.equal(result.receipt.nativeIdleStrollVersion,1);assert(result.timeTranslation.sameRelativeProgram);assert(result.timeTranslation.sameRelativeGateProgram);assert(binding.reference.worldBoundary.effectiveTime>binding.preparedReference.worldBoundary.effectiveTime);assert.equal(binding.reference.walkRng,f.next.idleState.rng);assert.equal(binding.reference.destination.x,f.next.idleState.destination.x);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);if(peer)assert.notDeepEqual(f.body(3),b);assert.equal(f.state.rng,rng);assert(lease.isCurrent());assert.deepEqual(released.nativeStrolls,[binding]);assert.equal(released.nativeHomes,undefined);assert.equal(released.nativeIdleCycles,undefined);assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert.deepEqual(p.errors,[]);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);f.advance(.1);assert(f.planner.nativeIdleStrollExecution(f.actor).distance>0);
 }finally{await p?.close();f.close();}
});

for(const change of ['pose','rng','contract','role'])test(`stroll source rejects changed Game ${change} before allocating resources`,async()=>{
 const f=controlledNativeIdleStroll();let p;try{
  const body=f.body(1),sequence=f.w.nav_intent_transition_sequence();if(change==='pose')f.worker.heading+=1;if(change==='rng')f.worker.idleState.rng^=1;if(change==='contract')f.worker.contractDay--;if(change==='role')f.worker.nativeRouteAdmission='native-home';p=await strollAdmissionProtocol(f);const result=await p.run();assert.equal(result.status,'unsupported');assert.equal(p.counters().preparations,0);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);
 }finally{await p?.close();f.close();}
});

for(const phase of ['preparation','drain'])test(`changed Game context during ${phase} cannot consume the retained stroll packet`,async()=>{
 const f=controlledNativeIdleStroll();let p;try{
  const body=f.body(1),change=()=>{f.worker.contractDay--;};p=await strollAdmissionProtocol(f,phase==='preparation'?{onPrepare:change}:{onDrain:change});const result=await p.run();assert.equal(result.status,'stale',JSON.stringify(result));await flush();assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert(f.planner.nativeIdleCycleBinding(f.actor));assert.deepEqual(f.body(1),body);assert.equal(p.counters().commits,0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);if(phase==='preparation')assert.equal(p.requests.length,0);else{const release=await p.released;assert.equal(release.committed,false);assert.equal(release.nativeStrolls,undefined);}
 }finally{await p?.close();f.close();}
});

test('aborted preparation holds the same body and retries the same native goal and RNG',async()=>{
 const f=controlledNativeIdleStroll();let p;try{
  const body=f.body(1),next=f.next,controller=new AbortController();let cancel=true;p=await strollAdmissionProtocol(f,{onPrepare(){if(cancel){cancel=false;controller.abort();}}});const result=await p.run(controller.signal);assert.notEqual(result.status,'committed');assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleCycleNextRequest(f.actor),next);assert.equal(p.counters().commits,0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);await flush();
  const retry=await p.run();assert.equal(retry.status,'committed',JSON.stringify(retry));await p.released;assert.equal(retry.nativeIdleStrollBinding.reference.walkRng,next.idleState.rng);assert.equal(retry.nativeIdleStrollBinding.reference.destination.x,next.idleState.destination.x);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});

for(const corrupt of ['version','template','family'])test(`a ${corrupt} substituted in the drain receipt cannot acquire stroll ownership`,async()=>{
 const f=controlledNativeIdleStroll();let p;try{
  const body=f.body(1);p=await strollAdmissionProtocol(f,{receipt(m){if(corrupt==='version')m.nativeIdleStrollVersion=0;if(corrupt==='template')m.preparedIdleStrollTemplate={...m.preparedIdleStrollTemplate,bodyId:m.preparedIdleStrollTemplate.bodyId+1};if(corrupt==='family'){delete m.nativeIdleStrollVersion;m.nativeHomeRouteVersion=1;}return m;}});const result=await p.run();assert.equal(result.status,'control-failed',JSON.stringify(result));assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(p.counters().commits,0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert(p.errors.some(e=>/acknowledgement/.test(e)));
 }finally{await p?.close();f.close();}
});

test('resource refresh preserves its stroll template across both ports and rejects a Home alias',async()=>{
 const f=controlledNativeIdleStroll();let p,handle;try{
  p=await strollAdmissionProtocol(f);const initial=f.prepare();handle=await p.connection.prepareNativeIdleStrollResources(initial);assert.deepEqual(handle.preparedIdleStrollTemplate,initial.nativeIdleStroll);assert.equal(handle.preparedHomeRouteTemplate,undefined);assert(handle.valid());assert(handle.invalidate());assert.equal(handle.valid(),false);f.advance(.2);const renewed=f.planner.revalidateNativeIdleStrollProposal(initial.ticket);assert.equal(renewed.status,'revalidated');assert(await handle.refresh(renewed.proposal));assert.deepEqual(handle.preparedIdleStrollTemplate,renewed.proposal.nativeIdleStroll);assert.equal(p.counters().refreshes,1);assert(handle.valid());await assert.rejects(p.connection.prepareNativeHomeRouteResources(renewed.proposal),/pending/);handle.abort();handle=null;assert(f.planner.cancelNativeIdleStrollProposal(renewed.proposal.ticket));
 }finally{handle?.abort();await p?.close();f.close();}
});

test('stroll resource preparation requires its retained typed template before requesting a drain',async()=>{
 const f=controlledNativeIdleStroll();let p;try{
  const body=f.body(1);p=await strollAdmissionProtocol(f,{template:()=>undefined});const result=await p.run();assert.equal(result.status,'control-failed');assert.equal(p.requests.length,0);assert.equal(p.counters().commits,0);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{await p?.close();f.close();}
});

test('a Home-class renewal on the resource port cancels the retained stroll without acquiring its body',async()=>{
 const f=controlledNativeIdleStroll();let p,handle;try{
  p=await strollAdmissionProtocol(f);const body=f.body(1),proposal=f.prepare();handle=await p.connection.prepareNativeIdleStrollResources(proposal);assert.equal(p.endpointStatus().pending,1);p.sendResource({kind:'refreshNativeHomeRouteResources',id:1,resources:proposal});for(let i=0;i<10&&p.endpointStatus().pending!==null;i++)await flush();assert.equal(p.endpointStatus().pending,null);assert(p.counters().aborts>0);assert.equal(p.counters().refreshes,0);assert.equal(p.counters().commits,0);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert(f.cycleLease.isCurrent());assert(f.planner.cancelNativeIdleStrollProposal(proposal.ticket));
 }finally{handle?.abort();await p?.close();f.close();}
});

test('pthread source uses the same prepared source/control/transport transaction',async()=>{
 let runtime,f,p;try{
  const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);f=controlledNativeIdleStroll({core:runtime.core});p=await strollAdmissionProtocol(f);const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));await p.released;assert.deepEqual(result.nativeIdleStrollBinding,f.planner.nativeIdleStrollBinding(f.actor));assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f?.close();await runtime?.dispose();}
});

test('stroll admission profile cannot borrow another family or a guessed preparation',()=>{
 const profile=nativeResourceAdmissionProfile('idle-stroll');assert.equal(profile.proposalKind,'native-idle-stroll-proposal');assert.equal(profile.releaseField,'nativeStrolls');assert.equal(profile.receiptCompatible({nativeHomeRouteVersion:1},{}),false);assert.equal(profile.receiptCompatible({nativeIdleStrollVersion:1,preparedIdleStrollTemplate:{}},{}),false);assert.equal(profile.compatible({sameRelativeProgram:true,sameRelativeGateProgram:false}),false);
});
