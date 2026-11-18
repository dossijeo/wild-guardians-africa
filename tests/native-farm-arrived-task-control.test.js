import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmArrivedTask as fixture} from './helpers/native-farm-arrived-task-control.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'inside':'travelled'}: completed Farm keeps only its finite body through Task6 until exact14`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,inside,core:runtime?.core});const record=f.farm.routeRecord,end=f.farm.executionEnd,epoch=f.farm.executionEpoch,body=f.body(1);assert(f.farm.isCurrent());const request=f.requestTask();assert(request);
  assert(f.farm.isCurrent());assert.equal(f.farm.routeRecord,record);assert.equal(record.safeUntil,end);assert.equal(f.farm.executionEnd,end);assert.equal(f.farm.executionEpoch,epoch);assert.throws(()=>f.c.admit(f.source.nativeRoute),/obsolete or unauthorized/);
  const p=f.prepareTask(),reference=nativeTaskStartReferenceFromProposal(p),lease=f.c.admitStart(reference,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.c.admitStart({...reference,bodyId:3},{preparingWorldBoundary:p.worldBoundary}),/obsolete/);
  f.advance(.4);assert.deepEqual(f.body(1),body);assert(f.farm.isCurrent());assert.equal(f.farm.executionEnd,end);
  const fresh=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(fresh.status,'revalidated');assert(f.planner.cancelNativeTaskStartProposal(fresh.proposal.ticket));assert(f.farm.isCurrent());
  const next=f.prepareTask(),prepared=f.c.admitStart(nativeTaskStartReferenceFromProposal(next),{preparingWorldBoundary:next.worldBoundary}),binding=f.commitTask(next);assert(!f.farm.isCurrent());assert(!prepared.isCurrent());
  const bad=structuredClone(binding);bad.preparedReference.bodyId=bad.reference.bodyId=3;assert.throws(()=>f.c.installStartedRoutes(binding.reference.worldBoundary,[bad]),/completed Farm body/);assert(!prepared.isCurrent());
  assert.equal(f.c.installStartedRoutes(binding.reference.worldBoundary,[binding]),1);assert(prepared.isCurrent());assert(!lease.isCurrent());assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});

test('a completed Farm body waits for the actual Task request clock watermark',()=>{
 const f=fixture();try{const end=f.farm.executionEnd;f.pauseClocks(true);f.requestTask();assert(!f.farm.isCurrent());assert.equal(f.farm.routeRecord,null);f.acceptClock();assert(f.farm.isCurrent());assert.equal(f.farm.executionEnd,end);}finally{f.close();}
});

test('malformed terminal Farm child transitions leave the installed parent and controller sequence intact',()=>{
 const f=fixture();try{
  f.pauseEvents(true);f.pauseClocks(true);const sequence=f.c.status().sequence;f.requestTask();const event=f.events.findLast(e=>e.actorId===f.actor&&e.taskRequest),body=f.body(1);assert(event);
  for(const mutate of [e=>e.revokedRouteHandle.generation++,e=>e.taskRequest.actorId++,e=>e.taskRequest.requestHandle.session++,e=>e.type='IntentChanged',e=>{e.effectiveTime=f.farmBinding.reference.endTime-.01;e.taskRequest.requestedAt=e.effectiveTime;},e=>{delete e.taskRequest;}]){
   const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,sequence);assert(f.farm.isCurrent());assert.deepEqual(f.body(1),body);
  }
  assert(f.c.accept(event));assert(!f.farm.isCurrent());f.acceptClock();assert(f.farm.isCurrent());assert.equal(f.farm.routeRecord.safeUntil,f.farmBinding.reference.endTime);
 }finally{f.close();}
});

test('a native23 without graphical installation cannot gain old body permission from its Task request',()=>{
 const f=fixture({installFarm:false});try{
  assert(!f.farm.isCurrent());f.requestTask();assert(!f.farm.isCurrent());assert(!f.farm.isPrepared());
  assert.throws(()=>f.c.installFarmArrivals(f.farmBinding.reference.worldBoundary,[f.farmBinding]));assert.throws(()=>f.c.admitFarmArrival(f.farmBinding.reference),/obsolete/);
  const p=f.prepareTask(),r=nativeTaskStartReferenceFromProposal(p),lease=f.c.admitStart(r,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.c.admitStart({...r,bodyId:3},{preparingWorldBoundary:p.worldBoundary}),/obsolete/);
  const binding=f.commitTask(p);assert.equal(f.c.installStartedRoutes(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert(!f.farm.isCurrent());
 }finally{f.close();}
});

test('terminal Farm body permission closes on retirement, removal or controller disposal',()=>{
 for(const action of ['retire','remove','dispose']){const f=fixture();try{
  f.requestTask();assert(f.farm.isCurrent());
  if(action==='dispose')f.c.dispose();else{assert.equal(action==='remove'?f.w.spatial_body_remove(1):f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();}
  assert(!f.farm.isCurrent());assert.equal(f.farm.routeRecord,null);assert.equal(f.farm.executionEnd,null);
 }finally{f.close();}}
});
