import {nativeIdleArrivalFixture} from './helpers/native-idle-arrival.js';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {idleCycleAdmissionProtocol} from './helpers/native-idle-cycle-admission.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCurrentHomeFixture,acquireNativeIdleCurrentHome} from './helpers/native-idle-current-home.js';
import {nativeHomeRequestContinuesIdleCycle,nativeHomeRequestContinuesInitialIdle} from '../src/world/native-home-request-reference.js';
import {nativeIdleCycleBodyState} from '../src/world/native-idle-cycle-body-source.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';

async function coreFor(threaded){if(!threaded)return null;const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');return createThreadedSpatialWorld(factory);}
for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Home from post-stroll REST preserves its actual body, phases and direct source`,async()=>{
 const runtime=await coreFor(threaded);let f;try{
  f=nativeIdleCurrentHomeFixture({profile:profile.id,core:runtime?.core});const body=f.body(1),rng=f.state.rng,held=f.idleBinding,q=nativeIdleCycleBodyState(held.reference.sourceBody);assert.equal(q.kind,'native-idle-stroll-arrival-source');assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker),/finished idle contract/);
  const request=f.requestHome();assert(nativeHomeRequestContinuesIdleCycle(request,held));assert.equal(nativeHomeRequestContinuesInitialIdle(request,q),false);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.equal(f.worker.path,null);assert.deepEqual(request.pose,q.pose);assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  const p=f.prepareHome(),lease=f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(.2);f.planner.projectNativeHomeExecution(f.state,f.worker);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);const refreshed=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(refreshed.status,'revalidated');assert(refreshed.timeTranslation.sameFloat32Motion);assert.equal(f.planner.cancelNativeHomeRouteProposal(refreshed.proposal.ticket),true);assert(f.idleLease.isCurrent());
  const next=f.prepareHome(),nextLease=f.c.admitHome(next.nativeHome,{preparingWorldBoundary:next.worldBoundary}),binding=f.commitHome(next);assert(nextLease.isCurrent());assert(!f.idleLease.isCurrent());assert.deepEqual(binding.reference.sourceRequest,request);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.deepEqual(f.body(1),body);f.advance(binding.reference.endTime-f.state.elapsed+.01);const actual=f.planner.projectNativeHomeExecution(f.state,f.worker);assert(actual.arrived);assert.equal(f.worker.x,Math.fround(request.home.x));assert.equal(f.worker.z,Math.fround(request.home.z));assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});

test('current-cycle Home rejects substituted source metadata and cannot prepare on an unacknowledged clock',()=>{
 const f=nativeIdleCurrentHomeFixture();try{
  f.pauseClock(true);const request=f.requestHome(),p=f.prepareHome();assert.throws(()=>f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary}));f.acceptLastClock();f.pauseClock(false);
  for(const change of [v=>v.sourceRequest.pose.x+=.01,v=>v.sourceRequest.pose.yaw+=.1,v=>v.sourceRequest.pose.walkPhase+=1,v=>v.sourceRequest.requestSequence=f.idleBinding.cycleSequence,v=>v.sourceRequest.requestedAt=f.idleBinding.reference.worldBoundary.effectiveTime-.1,v=>v.sourceRequest.bodyFlags|=2]){const bad=structuredClone(p.nativeHome);change(bad);assert.throws(()=>f.c.admitHome(bad,{preparingWorldBoundary:p.worldBoundary}));}
  const lease=f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());assert(nativeHomeRequestContinuesIdleCycle(request,f.idleBinding));
 }finally{f.close();}
});

test('a pending barrier rejects the Game Home request without cancelling the actual Idle phase',()=>{
 const f=nativeIdleCurrentHomeFixture();try{
  const view=f.planner.nativeIdleCycleExecution(f.actor);f.advance(view.binding.reference.worldBoundary.effectiveTime+view.binding.reference.duration-f.state.elapsed+.01);f.planner.projectNativeIdleCycle(f.state,f.worker);const next=f.planner.nativeIdleCycleNextRequest(f.actor),proposal=next.idleState.mode==='rest'?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(proposal.status,'proposed');f.worker.contractDay=f.state.day-1;
  const worker=structuredClone(f.worker),body=f.body(1);assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker),/request rejected/);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert(f.idleLease.isCurrent());
 }finally{f.close();}
});

for(const threaded of [false,true])test(`post-stroll pending Home restores a new semantic body/request without old cycle permissions (${threaded?'pthread':'standalone'})`,async()=>{
 const source=nativeIdleCurrentHomeFixture();let saved,old,runtime,f;try{old=source.requestHome();saved=deserialize(serialize(source.state));assert(!serialize(source.state).includes('native-idle-cycle-attestation'));assert(!serialize(source.state).includes('native-home-request-reference'));}finally{source.close();}
 try{runtime=await coreFor(threaded);f=restoreNativeActionGame(saved,{admitPeer:false,...(runtime?{core:runtime.core}:{})});const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert.notEqual(request.authorityEpoch,old.authorityEpoch);assert.deepEqual(request.pose,old.pose);assert.deepEqual(request.home,old.home);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.planner.prepareNativeHomeRouteProposal(request).status,'proposed');}finally{f?.close();await runtime?.dispose();}
});


test('current-cycle Home crosses the existing source and resource ports with one retained preparation and the actual clock/binding',async()=>{
 let f=controlledNativeIdleStroll({configureState(state,{point}){state.villages.find(v=>v.id===state.workers[0].villageId).entry=point(6,-4);}}),p,lease;try{
  let body,worker,prepared;
  p=await idleCycleAdmissionProtocol(f,{kind:'home-route',admit(resources){lease=f.c.admitHome(resources.nativeHome,{preparingWorldBoundary:resources.worldBoundary});return lease;},onPrepare(resources){prepared=resources;assert.deepEqual(f.worker,worker);assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(.2);},onDrain(){assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());f.advance(.1);},onCommit(value){assert.deepEqual(f.worker,worker);assert.equal(value.resources.kind,18);},onRelease(m){if(m.committed)f.c.installHomes(m.worldBoundary,m.nativeHomes);}});
  f=acquireNativeIdleCurrentHome(f);const request=f.requestHome();worker=structuredClone(f.worker);body=f.body(1);const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));await p.released;assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert(result.timeTranslation.sameFloat32Motion);assert.deepEqual(result.nativeHomeRouteBinding.preparedReference,prepared.nativeHome);assert(result.nativeHomeRouteBinding.reference.worldBoundary.effectiveTime>prepared.worldBoundary.effectiveTime);assert.deepEqual(p.requests.at(-1).nativeHomes,[result.nativeHomeRouteBinding]);assert.equal(result.receipt.nativeHomeRouteVersion,1);assert(lease.isCurrent());assert(!f.idleLease.isCurrent());assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.deepEqual(result.nativeHomeRouteBinding.reference.sourceRequest,request);assert.deepEqual(f.body(1),body);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});
for(const failure of ['abort','semantic','receipt'])test(`a ${failure} during current-cycle Home preparation keeps the native body and previous graphical phase`,async()=>{
 let f=controlledNativeIdleStroll({configureState(state,{point}){state.villages.find(v=>v.id===state.workers[0].villageId).entry=point(6,-4);}}),p;const controller=new AbortController();try{
  p=await idleCycleAdmissionProtocol(f,{kind:'home-route',admit:r=>f.c.admitHome(r.nativeHome,{preparingWorldBoundary:r.worldBoundary}),onPrepare(){if(failure==='abort')controller.abort();if(failure==='semantic')f.worker.heading+=.1;},receipt:m=>failure==='receipt'?{...m,nativeHomeRouteVersion:0}:m});
  f=acquireNativeIdleCurrentHome(f);const request=f.requestHome(),body=f.body(1),rng=f.state.rng;const result=await p.run(controller.signal);assert.equal(result.status,{abort:'control-failed',semantic:'stale',receipt:'control-failed'}[failure],JSON.stringify(result));assert.equal(p.counters().commits,0);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert(f.idleLease.isCurrent());assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{await p?.close();f.close();}
});

for(const threaded of [false,true])test(`Home may follow the actual REST commit before Game has projected its old WALK marker (${threaded?'pthread':'standalone'})`,async()=>{
 const runtime=await coreFor(threaded);let f;try{
  // Completed WALK now supports Home directly; its expiry is covered in native-idle-stroll-contract-home.
  f=nativeIdleArrivalFixture({core:runtime?.core});f.arrive();const body=f.body(1);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');
  const p=f.prepareRest(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});const proof=f.commitRest(p,{project:false,install:false});assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');f.worker.contractDay=f.state.day-1;const request=f.planner.requestNativeIdleHome(f.state,f.worker);f.planner.commitNativeCausalClock();assert(!lease.isCurrent());f.c.installIdleCycles(proof.reference.worldBoundary,[proof]);assert(lease.isCurrent());assert(nativeHomeRequestContinuesIdleCycle(request,proof));assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(request.pose,nativeIdleCycleBodyState(proof.reference.sourceBody).pose);assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});
