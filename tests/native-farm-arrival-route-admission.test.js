import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {nativeFarmArrivalRouteReferenceFromProposal,copyNativeFarmArrivalRouteResources} from '../src/world/native-farm-arrival-route.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {emit} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Actual native world/shared source transactor, explicit prepared packet and
// drain doubles. No real graphical Farm23 receipt or ordinary Game activation.
function admission(f,{prepare=()=>{},drain=()=>{},receipt=x=>x,handle=x=>x}={}){
 let status={closed:false,session:'source-farm23'},released=null,commits=0,aborts=0;const source={status:()=>({...status}),ownsGpuConsumer:c=>c===source,
  async quiesceGpuForMutation(options){const before={...status};await drain(options);return receipt({authorityEpoch:before.authorityEpoch,session:before.session,sequence:before.sentSequence,effectiveTime:before.sentTime,clockSequence:before.clockSequence,holdId:1,preparedWorldBoundary:options.preparedWorldBoundary,preparedFrameSequence:1,nativeFarmArrivalVersion:1,preparedFarmArrivalTemplate:options.preparedFarmArrivalTemplate});},releaseGpuAfterMutation(_receipt,data){released=data;},dispose(){status.closed=true;}};
 const stop=f.planner.observeNativeIntentControl({gpuConsumer:{publication:source,owner:source},onBaseline:b=>{status={...status,authorityEpoch:b.authorityEpoch,sentSequence:b.sequence,sentTime:b.effectiveTime,clockSequence:b.clock.clockSequence};},onChanges:changes=>{for(const e of changes){status.sentSequence=e.sequence;status.sentTime=e.effectiveTime;}},onClock:c=>{status.clockSequence=c.clockSequence;status.sentSequence=c.intentSequence;status.sentTime=c.committedThrough;}});
 return {run:({signal,urgent=false}={})=>f.planner.startNativeFarmArrivalAfterGpuQuiescence({actorId:f.actor,urgent,getPublication:()=>source,signal,prepareResources:async data=>{await prepare(data);return handle({preparedWorldBoundary:data.resources.worldBoundary,preparedFarmArrivalTemplate:nativeFarmArrivalRouteReferenceFromProposal(data.resources),valid:()=>!data.signal.aborted,commit(value){commits++;assert.equal(f.worker.status,'arriving');assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert(value.nativeFarmArrivalBinding);assert(copyNativeFarmArrivalRouteResources(value.resources));return true;},abort(){aborts++;}});}}),close:stop,get released(){return released;},get commits(){return commits;},get aborts(){return aborts;},get closed(){return status.closed;}};
}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'running':'walking'} acquisition uses the existing source transaction and preserves arriving semantics`,async()=>{
 const f=fixture({profile:profile.id,peer:true});let a;try{const body=f.body(1),tasks=structuredClone(f.state.tasks),rng=f.state.rng,ledger=structuredClone(f.state.ledger);a=admission(f,{prepare:()=>{assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'pending-farm-arrival-resources');}});const r=await a.run({urgent});assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.equal(a.commits,1);assert.equal(a.released.committed,true);assert.deepEqual(a.released.nativeFarmArrivals,[r.nativeFarmArrivalBinding]);assert.equal(r.resources.kind,23);assert.equal(r.resources.phase,'committed');assert.equal(r.authorizedAutonomy,false);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.equal(f.worker.status,'arriving');assert.equal(f.worker.taskId,null);assert.equal(f.worker.crateId,null);assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.state.tasks,tasks);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);assert.equal(f.planner.nativeGameExecutionState(),-1);const at=f.state.elapsed;assert.throws(()=>tick(f.state,.1,f.nav),/intention class/);assert.equal(f.state.elapsed,at);f.move(.1);const e=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert.equal(f.worker.x,f.body(1).x);assert.equal(e.running,urgent);
 }finally{a?.close();f.close();}
});

test('time may advance during preparation/drain but only the revalidated source program is committed',async()=>{
 const f=fixture({peer:true});let a;try{const body=f.body(1),peer=f.body(3);a=admission(f,{prepare:()=>{f.move(.2);f.planner.flushNativeIntentControl();},drain:()=>{f.move(.1);f.planner.flushNativeIntentControl();}});const r=await a.run({urgent:true});assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert(r.timeTranslation.sameFloat32Motion);assert(r.timeTranslation.sameFloat32Gates);assert(r.nativeFarmArrivalBinding.reference.worldBoundary.effectiveTime>r.nativeFarmArrivalBinding.preparedReference.worldBoundary.effectiveTime);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);}finally{a?.close();f.close();}
});

for(const missing of ['version','template','frame'])test(`a missing Farm23 receipt ${missing} cannot consume the pending physical owner`,async()=>{
 const f=fixture();let a;try{const before=structuredClone(f.worker),body=f.body(1),source=f.requestSource;a=admission(f,{receipt:r=>{delete r[missing==='version'?'nativeFarmArrivalVersion':missing==='template'?'preparedFarmArrivalTemplate':'preparedFrameSequence'];return r;}});const r=await a.run();assert.equal(r.status,'invalid-receipt',JSON.stringify(r));assert.equal(a.commits,0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,before);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),source);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(a.released.committed,false);}finally{a?.close();f.close();}
});

test('a prepared packet of another family and an altered retained source are rejected before any native commit',async()=>{
 for(const mode of ['home','source','packet']){const f=fixture();let a;try{const body=f.body(1);a=admission(f,{handle:h=>{if(mode==='packet')delete h.preparedWorldBoundary;else if(mode==='home'){h.preparedHomeRouteTemplate=h.preparedFarmArrivalTemplate;delete h.preparedFarmArrivalTemplate;}else{h.preparedFarmArrivalTemplate=structuredClone(h.preparedFarmArrivalTemplate);h.preparedFarmArrivalTemplate.sourceRequest.pose.yaw+=.1;}return h;}});const r=await a.run();assert.equal(r.status,'control-failed',JSON.stringify(r));assert.deepEqual(f.body(1),body);assert.equal(a.commits,0);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);}finally{a?.close();f.close();}}
});

test('changes to Game/source or cancellation discard preparation without changing the physical owner',async()=>{
 for(const mode of ['center','pose','phase','contract','task','cancel']){const f=fixture(),controller=new AbortController();let a;try{const body=f.body(1);a=admission(f,{prepare:()=>{if(mode==='center')f.state.structures.find(s=>s.id===f.worker.centerId).x+=1;else if(mode==='pose')f.worker.x+=1;else if(mode==='phase')f.worker.walkPhase+=1;else if(mode==='contract')f.worker.contractDay--;else if(mode==='task')f.worker.taskId='task-999999';else controller.abort();}});const r=await a.run({signal:controller.signal});assert.equal(r.status,mode==='cancel'?'control-failed':'stale',JSON.stringify(r));assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(a.commits,0);}finally{a?.close();f.close();}}
});

test('true zero arrival uses the same prepared acquisition without a synthetic route or Idle consequence',async()=>{
 const f=fixture({inside:true});let a;try{const before=structuredClone(f.worker);a=admission(f);const r=await a.run({urgent:true});assert.equal(r.status,'committed',JSON.stringify(r));assert.equal(r.nativeFarmArrivalBinding.reference.distance,0);assert.equal(r.resources.presentation.rows.length,16);for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],before[k]);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);}finally{a?.close();f.close();}
});

test('a genuine Task claim during preparation consumes the pending source and invalidates Farm23 without moving its body',async()=>{
 const f=fixture({peer:true});let a;try{const body=f.body(1);a=admission(f,{prepare:()=>{const p=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');}});const r=await a.run();assert.equal(r.status,'stale',JSON.stringify({status:r.status,error:r.error}));assert.equal(a.commits,0);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert(f.worker.taskId);assert.deepEqual(f.body(1),body);assert(f.planner.pendingTaskRoute(f.actor));}finally{a?.close();f.close();}
});

test('a failed retained commit is reported as physically committed/control failed and closes the source',async()=>{
 const f=fixture();let a;try{a=admission(f,{handle:h=>({...h,commit:()=>false})});const r=await a.run();assert.equal(r.status,'committed-control-failed');assert(a.closed);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');}finally{a?.close();f.close();}
});

test('pthread uses the same native Farm23 receipt profile and physical association',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,a;try{f=fixture({core:runtime.core,peer:true});a=admission(f);const r=await a.run({urgent:true});assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert.deepEqual(a.released.nativeFarmArrivals,[f.planner.nativeFarmArrivalRouteBinding(f.actor)]);}finally{a?.close();f?.close();await runtime.dispose();}
});
