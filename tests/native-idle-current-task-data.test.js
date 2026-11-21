import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {acquireNativeIdleCurrentTask} from './helpers/native-idle-current-task.js';
import {idleCycleAdmissionProtocol} from './helpers/native-idle-cycle-admission.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';

for(const profile of PROFILES)test(`${profile.id} current-cycle TaskStart crosses both existing ports with one retained preparation`,async()=>{
 let f=controlledNativeIdleStroll({profile:profile.id}),p,lease;try{
  let body,worker,prepared;
  p=await idleCycleAdmissionProtocol(f,{kind:'task-start',admit:r=>lease=f.c.admitStart(nativeTaskStartReferenceFromProposal(r),{preparingWorldBoundary:r.worldBoundary}),onPrepare(r){prepared=r;assert.deepEqual(f.worker,worker);assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(.2);},onDrain(){assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());f.advance(.1);},onCommit(value){assert.equal(value.resources.kind,14);assert.deepEqual(f.worker,worker);},onRelease(m){if(m.committed)f.c.installStartedRoutes(m.worldBoundary,m.nativeStartedRoutes);}});
  f=acquireNativeIdleCurrentTask(f);const request=f.requestTask();body=f.body(1);worker=structuredClone(f.worker);const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));await p.released;const binding=f.planner.nativeTaskStartBinding(f.actor);assert(binding);assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert(result.timeTranslation.sameFloat32Motion);assert.deepEqual(binding.preparedReference,nativeTaskStartReferenceFromProposal(prepared));assert.equal(binding.reference.requestSequence,request.requestSequence);assert(binding.reference.worldBoundary.effectiveTime>prepared.worldBoundary.effectiveTime);assert.deepEqual(p.requests.at(-1).nativeStartedRoutes,[binding]);assert.equal(result.receipt.preparedFrameSequence,1);assert(lease.isCurrent());assert(!f.idleLease.isCurrent());assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});assert.equal(f.worker.nativeRouteAdmission,'native-task');assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});
for(const failure of ['abort','receipt'])test(`current-cycle TaskStart ${failure} retains the actual body and previous graphical phase`,async()=>{
 let f=controlledNativeIdleStroll(),p;const abort=new AbortController();try{
  p=await idleCycleAdmissionProtocol(f,{kind:'task-start',admit:r=>f.c.admitStart(nativeTaskStartReferenceFromProposal(r),{preparingWorldBoundary:r.worldBoundary}),onPrepare(){if(failure==='abort')abort.abort();},receipt:m=>failure==='receipt'?{...m,preparedFrameSequence:0}:m});
  f=acquireNativeIdleCurrentTask(f);const request=f.requestTask(),body=f.body(1),rng=f.state.rng;const result=await p.run(abort.signal);assert.equal(result.status,'control-failed',JSON.stringify(result));assert.equal(p.counters().commits,0);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.deepEqual(f.planner.pendingTaskRoute(f.actor),request);assert(f.idleLease.isCurrent());assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{await p?.close();f.close();}
});
