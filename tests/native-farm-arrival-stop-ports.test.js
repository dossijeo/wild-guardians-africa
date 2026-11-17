import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {farmStopAdmission} from './helpers/native-farm-arrival-stop-admission.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createNativeResourcePreparationClient} from '../src/simulation/native-resource-preparation-client.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {createNativeResourcePreparationReceiver,attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
import {terrainStopReservation} from '../src/simulation/terrain-stop-reservation.js';
import {estimateRetainedBytes} from '../src/simulation/retained-size.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<200;i++){if(predicate())return;await flush();}throw Error('Farm24 port test timed out');}
// Original native source/control/publication and actual resource/terrain ports.
// Ordinary uses the shared client/receiver, not an actual draw Worker. The GPU
// handle/drain/frame sequence remain explicit doubles; no rendered24 claim.
async function fixture({mode='direct',incoming=m=>m,outgoing=m=>m,nativeReply=m=>m,prepare=()=>{},handle=h=>h,onDrain=()=>{},...options}={}){
 let producer,receiver,connection,endpoint,nativeClient,resources,nativeSerial=0;const pending=new Map(),nativeMessages=[],nativeResponses=[],terrainMessages=[],errors=[];let prepares=0,commits=0,aborts=0,observed,finalCommit;
 const f=await farmStopAdmission({...options,onDrain,prepareStopResources:request=>nativeClient.prepareNativeGateResources(request.resources,{signal:request.signal})});
 try{
  const {port1,port2}=new MessageChannel(),send=port1.postMessage.bind(port1),reply=port2.postMessage.bind(port2);port1.postMessage=m=>{terrainMessages.push(structuredClone(m));send(outgoing(structuredClone(m)));};port2.postMessage=m=>reply(incoming(structuredClone(m)));
  receiver=createConfirmedTerrainReceiver({port:port2,session:'farm24-terrain',confirmedElapsed:f.state.elapsed,retainRevisions:true,autoBootstrap:true,validateRevision:()=>{},residency:{replace(){},remove(){}},onError:e=>errors.push(e.message),prepareGraphicalBatch:async()=>({valid:()=>true,commit:()=>true,abort(){}}),async prepareGraphicalProposal(messages,opts){
   prepares++;assert.deepEqual(messages,[]);observed=opts;const lease=f.c.admitFarmArrivalStop(opts.nativeFarmArrivalStopTemplate,{preparingWorldBoundary:opts.proposedWorldBoundary});await prepare(f,opts);let active=true;
   return handle({canonicalPropsUnmasked:true,preparedWorldBoundary:opts.proposedWorldBoundary,preparedFarmArrivalStopTemplate:opts.nativeFarmArrivalStopTemplate,valid:()=>active&&lease.isPrepared(),commit(value){commits++;finalCommit=value;active=false;return true;},abort(){if(active){active=false;aborts++;}}});
  }});
  producer=createTerrainPublication({port:port1,session:'farm24-terrain',epoch:'farm24-world',retainRevisions:true});producer.commit(0);await until(()=>receiver.ready(0));await until(()=>producer.status().window?.batches===0);
  resources=new MessageChannel();const nativeSend=resources.port1.postMessage.bind(resources.port1),nativeResult=resources.port2.postMessage.bind(resources.port2);resources.port1.postMessage=m=>{nativeMessages.push(structuredClone(m));nativeSend(m);};resources.port2.postMessage=m=>{nativeResponses.push(structuredClone(m));nativeResult(nativeReply(structuredClone(m)));};
  const nativeOptions={isRunning:()=>true,onError:e=>errors.push(e.message),prepare(kind,r,opts){assert.equal(kind,'prepareNativeGateResources');return producer.prepareNativeWorldResources({proposedWorldBoundary:r.worldBoundary,resources:r,signal:opts.signal});}};
  if(mode==='direct'){endpoint=attachNativeResourcePreparationEndpoint({port:resources.port2,session:'farm24-resources',...nativeOptions});connection=createNativeResourcePreparationConnection({port:resources.port1,session:'farm24-resources',timeoutMs:1000});await connection.ready;nativeClient=connection;}
  else{endpoint=createNativeResourcePreparationReceiver({...nativeOptions,postMessage:m=>resources.port2.postMessage(m)});resources.port2.onmessage=({data})=>{try{Promise.resolve(endpoint.accept(data)).catch(e=>errors.push(e.message));}catch(e){errors.push(e.message);}};resources.port1.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;pending.delete(data.id);if(data.kind==='nativeGateResourcesError')item.reject(Error(data.message));else item.resolve(data.result);};nativeClient=createNativeResourcePreparationClient({allocateId:()=>++nativeSerial,pending,postMessage:m=>resources.port1.postMessage(m),isRunning:()=>true,hasDirectControl:()=>true,timeoutMs:1000});}
  return {...f,get prepared(){return f.prepared;},producer,receiver,nativeClient,nativeMessages,nativeResponses,sendResource:m=>resources.port1.postMessage({...m,...(mode==='direct'?{session:'farm24-resources'}:{})}),endpointStatus:()=>endpoint.status(),terrainMessages,portErrors:errors,counters:()=>({prepares,commits,aborts}),get observed(){return observed;},get finalCommit(){return finalCommit;},async adopt(){await until(()=>receiver.status().nativeProposal?.phase==='armed');producer.commit(1);await until(()=>receiver.ready(1));receiver.confirm(1,f.state.elapsed);},async close(){connection?.dispose();endpoint?.dispose();resources?.port1.close();resources?.port2.close();producer?.dispose();receiver?.dispose();await f.close();}};
 }catch(error){connection?.dispose();endpoint?.dispose();resources?.port1.close();resources?.port2.close();producer?.dispose();receiver?.dispose();await f.close();throw error;}
}

for(const mode of ['ordinary','direct'])for(const profile of PROFILES)test(`${mode} ${profile.id}: Farm24 retains identity and final projection through original resource and terrain ports`,async()=>{
 const f=await fixture({mode,profile:profile.id,prepare(f){f.advance(.15);},onDrain(f){f.advance(.15);}});try{const body=f.body(1),peer=f.body(3),rng=f.state.rng,count=f.w.spatial_body_count(),result=await f.run();assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await f.waitRelease();await until(()=>f.receiver.status().nativeProposal?.phase==='armed');assert.equal(f.counters().prepares,1);assert.equal(f.counters().commits,0);assert.equal(f.counters().aborts,0);assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.equal(f.w.spatial_body_count(),count);assert.deepEqual(f.observed.nativeFarmArrivalStopTemplate,f.prepared.nativeStop);assert.equal(f.observed.nativeIdleStrollStopTemplate,undefined);assert.notEqual(f.observed.stopEffects.routeEffects.rows,f.prepared.routeEffects.rows);assert.deepEqual(f.observed.stopEffects.routeEffects.rows,f.prepared.routeEffects.rows);assert.equal(f.receiver.status().nativeProposal.phase,'armed');const reservation=terrainStopReservation(f.prepared.nativeStop,f.observed.stopEffects);assert(f.receiver.status().retainedBytes>=reservation.bytes);assert(reservation.bindingBytes>=estimateRetainedBytes(result.nativeFarmArrivalStopBinding));assert(f.nativeMessages.some(m=>m.kind==='prepareNativeGateResources'));const sent=f.terrainMessages.find(m=>m.kind==='terrainProposal');assert.deepEqual(sent.nativeFarmArrivalStopTemplate,f.prepared.nativeStop);assert.equal(sent.nativeIdleStrollStopTemplate,undefined);assert.deepEqual(sent.messages,[]);assert.equal(sent.bytes,reservation.bytes);assert.equal(f.c.admitFarmArrivalStop(f.prepared.nativeStop).isCurrent(),true);
  await f.adopt();assert.equal(f.counters().commits,1);assert.deepEqual(f.finalCommit.nativeFarmArrivalStopBinding,result.nativeFarmArrivalStopBinding);assert.deepEqual(f.finalCommit.worldBoundary,result.worldBoundary);assert.equal(f.receiver.status().nativeProposal,null);assert.deepEqual(f.portErrors,[]);const held=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker),stopped=f.body(1),other=f.body(3);assert.equal(held.pose.x,stopped.x);f.advance(.1);assert.deepEqual(f.body(1),stopped);assert.notDeepEqual(f.body(3),other);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeGameExecutionState(),-1);
 }finally{await f.close();}
});

test('pthread uses the same retained Farm24 resource/terrain protocol',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{f=await fixture({core:runtime.core});const result=await f.run();assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await f.waitRelease();await f.adopt();assert.equal(f.counters().commits,1);assert.deepEqual(f.portErrors,[]);}finally{await f?.close();await runtime.dispose();}
});

for(const change of ['missing','foreign'])test(`terrain preparation rejects ${change} Farm24 template from its graphical handle`,async()=>{
 const f=await fixture({handle:h=>{if(change==='missing')delete h.preparedFarmArrivalStopTemplate;else h.preparedFarmArrivalStopTemplate={...h.preparedFarmArrivalStopTemplate,worldBoundary:{...h.preparedWorldBoundary,ticket:h.preparedWorldBoundary.ticket+1}};return h;}});try{const body=f.body(1),r=await f.run();assert.equal(r.status,'control-failed',JSON.stringify({status:r.status,error:r.error}));assert.match(r.error,/retained stop template/);assert.deepEqual(f.body(1),body);assert.equal(f.counters().commits,0);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);await until(()=>f.counters().aborts===1);assert.deepEqual(f.portErrors,[]);}finally{await f.close();}
});

for(const change of ['missing','foreign'])test(`terrain READY ACK rejects ${change} Farm24 template without acquiring its body`,async()=>{
 const f=await fixture({incoming:m=>{if(m.kind==='terrainProposalReady'){if(change==='missing')delete m.preparedFarmArrivalStopTemplate;else m.preparedFarmArrivalStopTemplate={...m.preparedFarmArrivalStopTemplate,worldBoundary:{...m.worldBoundary,ticket:m.worldBoundary.ticket+1}};}return m;}});try{const body=f.body(1),r=await f.run();assert.equal(r.status,'control-failed',JSON.stringify({status:r.status,error:r.error}));assert.match(r.error,/retained stop template/);assert.deepEqual(f.body(1),body);assert.equal(f.counters().commits,0);await until(()=>f.counters().aborts===1);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.deepEqual(f.portErrors,[]);}finally{await f.close();}
});

for(const mode of ['ordinary','direct'])test(`${mode} native resource ACK cannot omit or substitute a prepared Farm24 template`,async()=>{
 for(const change of ['missing','foreign']){const f=await fixture({mode,nativeReply:m=>{if(m.kind==='nativeGateResourcesResult'){if(change==='missing')delete m.result.preparedFarmArrivalStopTemplate;else m.result.preparedFarmArrivalStopTemplate={...m.result.preparedFarmArrivalStopTemplate,worldBoundary:{...m.result.preparedWorldBoundary,ticket:m.result.preparedWorldBoundary.ticket+1}};}return m;}});try{const body=f.body(1),r=await f.run();assert.equal(r.status,'control-failed',JSON.stringify({status:r.status,error:r.error}));assert.match(r.error,/prepared template receipt/);assert.deepEqual(f.body(1),body);assert.equal(f.counters().commits,0);await until(()=>f.counters().aborts===1);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.deepEqual(f.portErrors,[]);}finally{await f.close();}}
});

test('mixed Farm/Idle templates are rejected at graphical, terrain and native receipt boundaries',async()=>{
 for(const at of ['graphical','terrain','native','wire']){const f=await fixture({handle:h=>{if(at==='graphical')h.preparedIdleStrollStopTemplate=h.preparedFarmArrivalStopTemplate;return h;},incoming:m=>{if(at==='terrain'&&m.kind==='terrainProposalReady')m.preparedIdleStrollStopTemplate=m.preparedFarmArrivalStopTemplate;return m;},nativeReply:m=>{if(at==='native'&&m.kind==='nativeGateResourcesResult')m.result.preparedIdleStrollStopTemplate=m.result.preparedFarmArrivalStopTemplate;return m;},outgoing:m=>{if(at==='wire'&&m.kind==='terrainProposal')m.nativeIdleStrollStopTemplate=m.nativeFarmArrivalStopTemplate;return m;}});try{const body=f.body(1),r=await f.run();assert.equal(r.status,'control-failed',JSON.stringify({at,status:r.status,error:r.error}));assert.deepEqual(f.body(1),body);assert.equal(f.counters().commits,0);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);if(at==='wire')assert.match(f.portErrors[0],/Conflicting/);}finally{await f.close();}}
});

test('native receiver cannot reinterpret Farm24 as another preparation or refresh class',async()=>{
 const f=await fixture({mode:'ordinary'});let h;try{const staged=f.planner.prepareNativeFarmArrivalStopProposal(f.actor);assert.equal(staged.status,'proposed');const p=staged.proposal;f.sendResource({kind:'prepareNativeHomeRouteResources',id:1,resources:p,deferredStart:true});await until(()=>f.nativeResponses.some(m=>m.kind==='nativeGateResourcesError'));assert.equal(f.counters().prepares,0);assert.equal(f.endpointStatus().pending,null);
  // The rejected id was never allocated by the ordinary client. Allocate id2.
  await assert.rejects(f.nativeClient.prepareNativeGateResources(p),/unavailable|class mismatch/);h=await f.nativeClient.prepareNativeGateResources(p);assert(h.valid());assert.equal(h.refresh,undefined);f.sendResource({kind:'refreshNativeResumeResources',id:2,resources:p});await until(()=>f.nativeResponses.some(m=>m.kind==='nativeGateResourcesError'&&m.id===2));assert.equal(f.endpointStatus().pending,null);assert.equal(f.counters().commits,0);h.abort();h=null;assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));
 }finally{h?.abort();await f.close();}
});

test('native client cannot send a Farm24 commit without its exact acquired association',async()=>{
 const f=await fixture();let h;try{const p=f.planner.prepareNativeFarmArrivalStopProposal(f.actor).proposal,body=f.body(1);h=await f.nativeClient.prepareNativeGateResources(p);assert(h.valid());for(const value of [{worldBoundary:p.worldBoundary},{worldBoundary:p.worldBoundary,nativeIdleStrollStopBinding:{}}])assert.throws(()=>h.commit(value));assert(h.valid());assert.equal(f.nativeMessages.some(m=>m.kind==='commitNativeGateResources'),false);assert.deepEqual(f.body(1),body);assert.equal(f.counters().commits,0);}finally{h?.abort();await f.close();}
});

test('typed Farm stop cannot annotate motion13-23, retain terrain chunks or omit its owner reference',async()=>{
 const f=await fixture();try{const p=f.planner.prepareNativeFarmArrivalStopProposal(f.actor).proposal,body=f.body(1);for(const kind of [13,14,22,23,25])await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:p.worldBoundary,resources:{...p,kind}}),/stop proposal family/);await assert.rejects(f.nativeClient.prepareNativeGateResources({...p,nativeStop:undefined}));await assert.rejects(f.nativeClient.prepareNativeGateResources({...p,chunks:[{cx:0,cz:0}]}));const alias=structuredClone(p);alias.nativeStop.kind='native-idle-stroll-stop-reference';await assert.rejects(f.nativeClient.prepareNativeGateResources(alias));assert.equal(f.counters().prepares,0);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);}finally{await f.close();}
});

test('terrain rejects an understated Farm24 reservation before returning a prepared receipt',async()=>{
 const f=await fixture({outgoing:m=>{if(m.kind==='terrainProposal')m.bytes--;return m;}});try{const body=f.body(1),r=await f.run();assert.equal(r.status,'control-failed',JSON.stringify({status:r.status,error:r.error}));assert.equal(f.counters().prepares,0);assert.equal(f.counters().commits,0);assert.deepEqual(f.body(1),body);assert.match(f.portErrors[0],/byte reservation mismatch/);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);}finally{await f.close();}
});

test('abort crosses both preparation channels and releases the retained candidate without physical mutation',async()=>{
 const controller=new AbortController(),f=await fixture({prepare(){controller.abort();}});try{const body=f.body(1),r=await f.run({signal:controller.signal});assert.equal(r.status,'control-failed');assert.deepEqual(f.body(1),body);assert.equal(f.counters().commits,0);await until(()=>f.receiver.status().nativeProposal===null&&f.endpointStatus().pending===null);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);}finally{await f.close();}
});
