import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmIdleCycle as fixture} from './helpers/native-farm-arrived-idle-cycle-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'inside':'travelled'} Farm permission transfers to Idle only after actual21 installation`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,profile:profile.id,inside});const body=f.body(1),record=f.farm.routeRecord,p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});
  assert(f.farm.isCurrent());assert(lease.isPrepared());assert(!lease.isCurrent());assert.equal(lease.idleCycleRecord,null);f.advance(1.8);assert(lease.isPrepared());assert(f.farm.isCurrent());assert.equal(f.farm.routeRecord,record);assert.deepEqual(f.body(1),body);const revalidated=f.planner.revalidateNativeIdleCycleProposal(p.ticket);assert.equal(revalidated.status,'revalidated');assert(f.planner.cancelNativeIdleCycleProposal(revalidated.proposal.ticket));
  const fresh=f.prepareCycle(),next=f.c.admitIdleCycle(fresh.nativeIdleCycle,{preparingWorldBoundary:fresh.worldBoundary});f.advance(.2);assert.equal(f.planner.revalidateNativeIdleCycleProposal(fresh.ticket).status,'revalidated');const proof=f.commitCycle(fresh);
  assert(!f.farm.isCurrent());assert.equal(f.farm.routeRecord,null);assert.equal(record.safeUntil,f.farmBinding.reference.endTime);assert.equal(record.revokedState,7);assert(!next.isCurrent());assert(next.isPrepared());assert.equal(f.installCycle(proof),1);assert(next.isCurrent());assert.equal(next.executionEpoch,proof.reference.worldBoundary.effectiveTime);assert.equal(next.executionEnd,proof.reference.worldBoundary.effectiveTime+proof.reference.duration);assert.equal(f.w.spatial_body_count()>0,true);assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});

test('the native21 clock watermark is required before Farm Idle installation',()=>{
 const f=fixture();try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});f.pauseClocks(true);const proof=f.commitCycle(p);assert(!f.farm.isCurrent());assert(lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.installCycle(proof));f.acceptClock();f.pauseClocks(false);assert.equal(f.installCycle(proof),1);assert(lease.isCurrent());}finally{f.close();}
});

test('native Farm metadata without parent GPU installation cannot acquire an Idle lease retroactively',()=>{
 const f=fixture({installFarm:false});try{
  const p=f.prepareCycle(),sequence=f.c.status().sequence;assert(!f.farm.isCurrent());assert.throws(()=>f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),/obsolete/);f.pauseEvents(true);f.pauseClocks(true);const proof=f.commitCycle(p),event=f.events.at(-1);assert.throws(()=>f.c.accept(event),/admitted body source/);assert.equal(f.c.status().sequence,sequence);assert.throws(()=>f.c.installFarmArrivals(f.farmBinding.reference.worldBoundary,[f.farmBinding]));assert.throws(()=>f.installCycle(proof));assert(!f.farm.isCurrent());
 }finally{f.close();}
});

test('malformed Farm Idle completion facts do not advance the route control cursor',()=>{
 const f=fixture();try{
  const p=f.prepareCycle();f.pauseEvents(true);f.pauseClocks(true);const proof=f.commitCycle(p),event=f.events.at(-1),sequence=f.c.status().sequence;
  const mutateSource=(e,key,value)=>{for(const r of [e.idleCycle.reference,e.idleCycle.preparedReference]){r.sourceBody[key]=value;if(key==='bodyId')r.bodyId=value;if(key==='profile')r.profile=value;}};
  const edits=[e=>e.revokedRouteHandle.generation++,e=>e.revokedRouteHandle=null,e=>e.type='IntentChanged',e=>e.state=6,e=>e.homeRequest={},e=>e.taskRequest={},e=>e.nativeFarmArrival=f.farmBinding,e=>e.idleCycleNext={},e=>mutateSource(e,'bodyId',3),e=>mutateSource(e,'profile',2),e=>mutateSource(e,'bodyFlags',5),e=>mutateSource(e,'centerId',12345),e=>mutateSource(e,'sourceSequence',f.farmBinding.assignmentSequence-1),e=>mutateSource(e,'sourceAt',f.farmBinding.reference.endTime+.01),e=>{for(const r of [e.idleCycle.reference,e.idleCycle.preparedReference])r.sourceBody.pose.radius+=.01;},e=>{for(const r of [e.idleCycle.reference,e.idleCycle.preparedReference])r.sourceBody.pose.x+=.01;}];
  for(const edit of edits){const bad=structuredClone(event);edit(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,sequence);assert(f.farm.isCurrent());}
  assert(f.c.accept(event));assert(!f.farm.isCurrent());f.acceptClock();assert.equal(f.installCycle(proof),1);
 }finally{f.close();}
});

test('Idle installation rejects changed native associations and historical bootstrap atomically',()=>{
 const f=fixture();try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),proof=f.commitCycle(p);
  for(const edit of [b=>b.cycleSequence++,b=>b.preparedReference.worldBoundary.ticket--,b=>{for(const r of [b.reference,b.preparedReference]){r.bodyId=3;r.sourceBody.bodyId=3;}}]){const bad=structuredClone(proof);edit(bad);assert.throws(()=>f.c.installIdleCycles(proof.reference.worldBoundary,[proof,bad]));assert(!lease.isCurrent());assert.equal(lease.idleCycleRecord,null);}
  assert.throws(()=>f.c.installIdleCycles(proof.reference.worldBoundary,[proof],{bootstrap:true}));assert.equal(f.installCycle(proof),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('native phase metadata cannot replace the actual21 association at installation',()=>{
 const f=fixture();try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});f.pauseEvents(true);f.pauseClocks(true);const proof=f.commitCycle(p),event=structuredClone(f.events.at(-1));for(const r of [event.idleCycle.reference,event.idleCycle.preparedReference])r.sourceBody.pose.yaw+=.1;
  assert(f.c.accept(event));f.acceptClock();assert(!f.farm.isCurrent());assert(!lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.installCycle(proof));assert.throws(()=>f.c.installIdleCycles(proof.reference.worldBoundary,[proof],{bootstrap:true}));
 }finally{f.close();}
});

test('late acquired Farm uses its real finite endpoint when Idle revokes the original prepared lease',()=>{
 const f=fixture({farmDelay:.3});try{
  assert(f.farmBinding.reference.endTime>f.farmPrepared.nativeFarmArrival.endTime);const record=f.farm.routeRecord,p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});assert.equal(f.farm.executionEnd,f.farmBinding.reference.endTime);f.advance(.4);assert(lease.isPrepared());assert.equal(f.planner.revalidateNativeIdleCycleProposal(p.ticket).status,'revalidated');const proof=f.commitCycle(p);assert.equal(record.safeUntil,f.farmBinding.reference.endTime);assert(!f.farm.isCurrent());assert.equal(f.installCycle(proof),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('removal, retirement and disposal close a provisional Farm Idle lease',()=>{
 for(const action of ['remove','retire','dispose']){const f=fixture();try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());if(action==='dispose')f.c.dispose();else{assert(f.planner.cancelNativeIdleCycleProposal(p.ticket));assert.equal(action==='remove'?f.w.spatial_body_remove(1):f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();}assert(!lease.isPrepared());assert(!lease.isCurrent());assert(!f.farm.isCurrent());}finally{f.close();}}
});

test('moving Farm cancellation closes its permission immediately without granting an Idle owner',()=>{
 for(const action of ['remove','retire']){const f=fixture({complete:false});try{const record=f.farm.routeRecord;assert(f.farm.isCurrent());assert(f.state.elapsed<f.farmBinding.reference.endTime);assert.equal(action==='remove'?f.w.spatial_body_remove(1):f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert(!f.farm.isCurrent());assert.equal(record.safeUntil,f.state.elapsed);assert.equal(f.c.status().sequence,f.events.at(-1).sequence);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);}finally{f.close();}}
});

test('a Farm cancellation accepts only its exact revocation and no mixed owner declaration',()=>{
 const f=fixture({complete:false});try{
  f.pauseEvents(true);f.pauseClocks(true);assert.equal(f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();const event=f.events.at(-1),sequence=f.c.status().sequence;
  for(const edit of [e=>e.revokedRouteHandle.generation++,e=>e.taskId=99,e=>e.taskRequest={},e=>e.homeRequest={},e=>e.idleCycle={},e=>e.type='IntentChanged']){const bad=structuredClone(event);edit(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,sequence);assert(f.farm.isCurrent());}
  assert(f.c.accept(event));f.acceptClock();assert(!f.farm.isCurrent());assert.equal(f.c.pendingIdleCycleRequest(f.actor),null);
 }finally{f.close();}
});
