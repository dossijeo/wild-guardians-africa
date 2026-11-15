import test from 'node:test';
import {pair,fixture as gpuFixture,flush} from './helpers/remote-webgpu-fixture.js';
import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import assert from 'node:assert/strict';
import {nativeHomeArrivalFixture} from './helpers/native-home-arrival.js';
import {nativeHomeArrivalReferenceFromProposal,copyNativeHomeArrivalAttestation,nativeHomeArrivalPresentationMatches} from '../src/world/native-home-arrival.js';
import {tick} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Actual native authority and shared source admission, with explicit prepared
// frame/drain doubles. This does not establish the graphical arrival consumer.
function admission(f,{prepare=()=>{},drain=()=>{},receipt=r=>r}={}){
 let status={closed:false,session:'source-home-arrival'},released=null,commits=0;
 const source={status:()=>({...status}),ownsGpuConsumer:c=>c===source,async quiesceGpuForMutation(options){const before={...status};await drain(options);return receipt({authorityEpoch:before.authorityEpoch,session:before.session,sequence:before.sentSequence,effectiveTime:before.sentTime,clockSequence:before.clockSequence,holdId:1,preparedWorldBoundary:options.preparedWorldBoundary,preparedFrameSequence:1,nativeHomeArrivalVersion:1,preparedHomeArrivalTemplate:options.preparedHomeArrivalTemplate});},releaseGpuAfterMutation(_r,data){released=data;},dispose(){status.closed=true;}};
 const stop=f.planner.observeNativeIntentControl({gpuConsumer:{publication:source,owner:source},onBaseline:b=>{status={...status,authorityEpoch:b.authorityEpoch,sentSequence:b.sequence,sentTime:b.effectiveTime,clockSequence:b.clock.clockSequence};},onChanges:changes=>{for(const e of changes){status.sentSequence=e.sequence;status.sentTime=e.effectiveTime;}},onClock:c=>{status.clockSequence=c.clockSequence;status.sentSequence=c.intentSequence;status.sentTime=c.committedThrough;}});
 return {run:signal=>f.planner.startNativeHomeArrivalAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,signal,prepareResources:async data=>{await prepare(data);return {preparedWorldBoundary:data.resources.worldBoundary,preparedHomeArrivalTemplate:nativeHomeArrivalReferenceFromProposal(data.resources),valid:()=>!data.signal.aborted,commit(value){commits++;assert.equal(f.worker.status,'home');assert.equal(f.worker.nativeRouteAdmission,undefined);assert(value.nativeHomeArrivalBinding);assert(nativeHomeArrivalPresentationMatches(data.resources,value.resources,value.nativeHomeArrivalBinding));return true;},abort(){}};}}),close:stop,get released(){return released;},get commits(){return commits;}};
}

for(const threaded of [false,true])test(`prepared Home arrival projects home only after native retirement (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f,a;try{if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}f=nativeHomeArrivalFixture(runtime?{core:runtime.core}:{});const body=f.body(1),peer=f.body(3),ledger=JSON.stringify(f.state.ledger),home=f.homeSource.reference.sourceSettlement.reference.home;a=admission(f,{prepare:()=>{assert.deepEqual(f.body(1),body);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),f.homeSource);}});const r=await a.run();assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(a.commits,1);assert.equal(a.released.committed,true);assert.deepEqual(a.released.nativeHomeArrivals,[r.nativeHomeArrivalBinding]);assert.deepEqual(copyNativeHomeArrivalAttestation(r.nativeHomeArrivalBinding),r.nativeHomeArrivalBinding);assert.equal(f.body(1),null);assert.deepEqual(f.body(3),peer);assert.equal(f.worker.status,'home');assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);assert.equal(f.worker.x,home.x);assert.equal(f.worker.z,home.z);assert.equal(f.worker.nativeRouteAdmission,undefined);assert.equal(f.worker.taskId,null);assert.equal(f.worker.crateId,null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(JSON.stringify(f.state.ledger),ledger);tick(f.state,.1,f.nav);assert.equal(f.body(1),null);assert.equal(f.worker.status,'home');assert.equal(JSON.stringify(f.state.ledger),ledger);assert.equal((await a.run()).status,'unsupported');const json=serialize(f.state),saved=deserialize(json);assert.equal(saved.workers[0].status,'home');assert(!json.includes('native-home-arrival-attestation'));assert(!json.includes('native-home-route-attestation'));
 }finally{a?.close();f?.close();await runtime?.dispose();}
});

test('an arrival revalidated after preparation and real-time drain keeps the exact held endpoint',async()=>{
 const f=nativeHomeArrivalFixture();let a;try{const body=f.body(1);a=admission(f,{prepare:()=>{f.advance(.4);f.planner.projectNativeHomeExecution(f.state,f.worker);assert.deepEqual(f.body(1),body);},drain:()=>{f.advance(.2);f.planner.projectNativeHomeExecution(f.state,f.worker);assert.deepEqual(f.body(1),body);}});const r=await a.run();assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert(r.timeTranslation.sameSourceState);assert(r.nativeHomeArrivalBinding.reference.worldBoundary.effectiveTime>r.nativeHomeArrivalBinding.preparedReference.worldBoundary.effectiveTime);assert.deepEqual(r.nativeHomeArrivalBinding.reference.pose,r.nativeHomeArrivalBinding.preparedReference.pose);assert.equal(f.body(1),null);
 }finally{a?.close();f.close();}
});

for(const missing of ['version','template'])test(`a consumer without exact arrival ${missing} cannot hide or release the Home worker`,async()=>{
 const f=nativeHomeArrivalFixture();let a;try{const body=f.body(1),before=JSON.stringify(f.state);a=admission(f,{receipt:r=>{delete r[missing==='version'?'nativeHomeArrivalVersion':'preparedHomeArrivalTemplate'];return r;}});const r=await a.run();assert.equal(r.status,'invalid-receipt',JSON.stringify(r));assert.equal(a.commits,0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),f.homeSource);assert.equal(JSON.stringify(f.state),before);
 }finally{a?.close();f.close();}
});

test('changed Home semantics, phase or cancellation discard preparation before physical retirement',async()=>{
 for(const mode of ['entry','pose','phase','incapacitated','cancel']){const f=nativeHomeArrivalFixture(),controller=new AbortController();let a;try{const body=f.body(1),ledger=JSON.stringify(f.state.ledger);a=admission(f,{prepare:()=>{if(mode==='entry'){const v=f.state.villages.find(v=>v.id===f.worker.villageId);(v.entry??v).x++;}else if(mode==='pose')f.worker.x++;else if(mode==='phase')f.worker.walkPhase++;else if(mode==='incapacitated')f.worker.incapacitated=true;else controller.abort();}});const r=await a.run(controller.signal);assert.equal(r.status,mode==='cancel'?'control-failed':'stale',JSON.stringify({status:r.status,error:r.error}));assert.equal(a.commits,0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),f.homeSource);assert.equal(f.worker.status,'returning');assert.equal(JSON.stringify(f.state.ledger),ledger);
  }finally{a?.close();f.close();}}
});


test('a semantic home flag cannot authorize an inactive cohort while its body is still bound',()=>{
 const f=nativeHomeArrivalFixture();try{const body=f.body(1);f.worker.status='home';delete f.worker.nativeRouteAdmission;assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);assert.throws(()=>tick(f.state,.1,f.nav),/Native intent delta was rejected/);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);}finally{f.close();}
});

test('the actual publication cannot mint arrival admission without the consumer version and exact template',async()=>{
 const f=nativeHomeArrivalFixture(),{port1,port2}=new MessageChannel();let publication,quiesce=0;try{
  port2.onmessage=({data:m})=>{if(m.type==='IntentControlClosed')return;if(m.type==='IntentMutationQuiesce'){quiesce++;port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1});return;}if(m.type==='IntentClock')port2.postMessage({...m,type:'intent-clock-applied',accepted:true});else port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,...(m.clock?{clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough}:{})});};
  publication=createNativeIntentControlPublication({port:port1,session:'home-arrival-not-yet-graphical',observe:callbacks=>f.planner.observeNativeIntentControl(callbacks)});await publication.ready;const p=f.prepareArrival().proposal,body=f.body(1);await assert.rejects(publication.quiesceGpuForMutation({preparedWorldBoundary:p.worldBoundary,preparedHomeArrivalTemplate:p.nativeHomeArrival}),/Invalid native mutation fence acknowledgement/);assert.equal(quiesce,1);assert.deepEqual(f.body(1),body);assert.equal(publication.status().closed,true);
 }finally{publication?.dispose();port2.close();f.close();}
});


test('the host rejects a historical Home arrival fact as a new graphical bootstrap permission',async()=>{
 const f=nativeHomeArrivalFixture();let a,gpu;try{a=admission(f);const r=await a.run();assert.equal(r.status,'committed');let baseline;const stop=f.planner.observeNativeIntentControl({onBaseline:b=>{baseline=b;},onChanges(){}});stop();const [authorityPort,drawPort]=pair();gpu=await gpuFixture({}, {intentControl:{port:drawPort,session:'home-arrival-baseline'}});authorityPort.postMessage({...baseline,session:'home-arrival-baseline',nativeHomeArrivals:[r.nativeHomeArrivalBinding]});await flush();await gpu.host.idle();assert(gpu.host.inspect().failed);assert.match(gpu.errors[0]?.message??'',/Home arrival requires prepared graphical admission/);}finally{gpu?.client.dispose();await gpu?.host.dispose();a?.close();f.close();}
});


test('a new physical binding clears the native inactive state after a prepared Home arrival',async()=>{
 const f=nativeHomeArrivalFixture();let a;try{a=admission(f);assert.equal((await a.run()).status,'committed');assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);assert.equal(f.w.spatial_body_upsert(77,f.worker.x,f.worker.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.homeSource.reference.actorId,77),1);assert.equal(f.w.nav_intent_worker_inactive(f.homeSource.reference.actorId),0);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);assert.equal(f.w.spatial_body_remove(77),1);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);}finally{a?.close();f.close();}
});
