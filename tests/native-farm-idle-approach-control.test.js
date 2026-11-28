import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmIdleApproach as fixture} from './helpers/native-farm-idle-approach-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Farm approach permission transfers only after exact actual22 installation`,async()=>{
 let runtime,f;try{if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}f=fixture({core:runtime?.core,profile:profile.id});const body=f.body(1),record=f.farm.routeRecord,p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(f.farm.isCurrent());assert(lease.isPrepared());assert(!lease.isCurrent());assert.equal(lease.routeRecord,null);f.advance(1.8);assert(lease.isPrepared());assert(f.farm.isCurrent());assert.equal(f.farm.routeRecord,record);assert.deepEqual(f.body(1),body);const refreshed=f.planner.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(refreshed.status,'revalidated');assert(f.planner.cancelNativeIdleStrollProposal(refreshed.proposal.ticket));
  const fresh=f.prepareApproach(),next=f.c.admitStroll(fresh.nativeIdleStroll,{preparingWorldBoundary:fresh.worldBoundary});f.advance(.2);assert.equal(f.planner.revalidateNativeIdleStrollProposal(fresh.ticket).status,'revalidated');const b=f.commitApproach(fresh);assert(!f.farm.isCurrent());assert.equal(f.farm.routeRecord,null);assert.equal(record.safeUntil,f.farmBinding.reference.endTime);assert.equal(record.revokedState,1);assert(!next.isCurrent());assert(next.isPrepared());assert.equal(f.installApproach(b),1);assert(next.isCurrent());assert.equal(next.executionEpoch,b.reference.worldBoundary.effectiveTime);assert.equal(next.executionEnd,b.reference.endTime);assert.equal(f.events.length,1);assert.equal(f.events[0].type,'RouteReplaced');assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});

test('Farm approach installation requires the native22 causal clock watermark',()=>{
 const f=fixture();try{const p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});f.pauseClocks(true);const b=f.commitApproach(p);assert(!f.farm.isCurrent());assert(lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.installApproach(b));f.acceptClock();f.pauseClocks(false);assert.equal(f.installApproach(b),1);assert(lease.isCurrent());}finally{f.close();}
});

test('Farm approach cannot borrow an uninstalled parent GPU proof retroactively',()=>{
 const f=fixture({installFarm:false});try{const p=f.prepareApproach(),sequence=f.c.status().sequence;assert.throws(()=>f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),/obsolete/);f.pauseEvents(true);f.pauseClocks(true);const b=f.commitApproach(p),event=f.events.at(-1);assert.throws(()=>f.c.accept(event));assert.equal(f.c.status().sequence,sequence);assert.throws(()=>f.c.installFarmArrivals(f.farmBinding.reference.worldBoundary,[f.farmBinding]));assert.throws(()=>f.installApproach(b));assert(!f.farm.isCurrent());}finally{f.close();}
});

test('malformed Farm approach facts cannot revoke the parent or advance the control cursor',()=>{
 const f=fixture();try{const p=f.prepareApproach();f.pauseEvents(true);f.pauseClocks(true);const b=f.commitApproach(p),event=f.events.at(-1),sequence=f.c.status().sequence;
  const edits=[e=>e.revokedRouteHandle.generation++,e=>e.revokedRouteHandle=null,e=>e.type='RouteAssigned',e=>e.state=7,e=>e.homeRequest={},e=>e.taskRequest={},e=>e.idleCycle={},e=>e.nativeFarmArrival=f.farmBinding,e=>{delete e.nativeIdleStroll;},...['bodyId','profile','bodyFlags','centerId','sourceSequence','sourceAt'].map(key=>e=>{for(const r of [e.nativeIdleStroll.reference,e.nativeIdleStroll.preparedReference]){r.sourceFarm[key]+=key==='sourceAt'?.01:1;if(['bodyId','profile','bodyFlags','centerId'].includes(key))r[key]=r.sourceFarm[key];if(key==='sourceSequence')r.sourceDecisionSequence=r.sourceFarm[key];if(key==='sourceAt')r.requestedAt=r.sourceFarm[key];}}),e=>{for(const r of [e.nativeIdleStroll.reference,e.nativeIdleStroll.preparedReference]){r.pose.radius+=.01;r.sourceFarm.pose.radius=r.pose.radius;}}];
  for(const [index,edit] of edits.entries()){const bad=structuredClone(event);edit(bad);assert.throws(()=>f.c.accept(bad),'malformed case '+index);assert.equal(f.c.status().sequence,sequence);assert(f.farm.isCurrent());}assert(f.c.accept(event));f.acceptClock();assert.equal(f.installApproach(b),1);
 }finally{f.close();}
});

test('Farm approach installation rejects changed associations and historical bootstrap atomically',()=>{
 const f=fixture();try{const p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commitApproach(p);for(const edit of [v=>v.assignmentSequence++,v=>v.preparedReference.worldBoundary.ticket--,v=>{for(const r of [v.reference,v.preparedReference]){r.bodyId=3;r.sourceFarm.bodyId=3;}}]){const bad=structuredClone(b);edit(bad);assert.throws(()=>f.c.installStrolls(b.reference.worldBoundary,[b,bad]));assert(!lease.isCurrent());}assert.throws(()=>f.c.installStrolls(b.reference.worldBoundary,[b],{bootstrap:true}));assert.equal(f.installApproach(b),1);assert(lease.isCurrent());}finally{f.close();}
});

test('altered native phase metadata cannot replace the exact actual22 association',()=>{
 const f=fixture();try{const p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});f.pauseEvents(true);f.pauseClocks(true);const b=f.commitApproach(p),event=structuredClone(f.events.at(-1));for(const r of [event.nativeIdleStroll.reference,event.nativeIdleStroll.preparedReference]){r.pose.yaw+=.1;r.sourceFarm.pose.yaw=r.pose.yaw;}assert(f.c.accept(event));f.acceptClock();assert(!f.farm.isCurrent());assert(!lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.installApproach(b));}finally{f.close();}
});

test('late Farm acquisition caps the old trajectory at its real end through approach transfer',()=>{
 const f=fixture({farmDelay:.3});try{assert(f.farmBinding.reference.endTime>f.farmPrepared.nativeFarmArrival.endTime);const record=f.farm.routeRecord,p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});f.advance(.4);assert.equal(f.planner.revalidateNativeIdleStrollProposal(p.ticket).status,'revalidated');const b=f.commitApproach(p);assert.equal(record.safeUntil,f.farmBinding.reference.endTime);assert.equal(f.installApproach(b),1);assert(lease.isCurrent());}finally{f.close();}
});

test('removal retirement and disposal close a provisional Farm approach without another owner',()=>{
 for(const action of ['remove','retire','dispose']){const f=fixture();try{const p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());if(action==='dispose')f.c.dispose();else{assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));assert.equal(action==='remove'?f.w.spatial_body_remove(1):f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();}assert(!lease.isPrepared());assert(!lease.isCurrent());assert(!f.farm.isCurrent());}finally{f.close();}}
});

test('a provisional Farm approach rejects valid-shaped foreign body metadata before preparation',()=>{
 const f=fixture();try{const p=f.prepareApproach(),r=p.nativeIdleStroll;for(const edit of [q=>{q.bodyId=3;q.sourceFarm.bodyId=3;},q=>{q.sourceFarm.sourceSequence--;q.sourceDecisionSequence--;},q=>{q.sourceFarm.sourceAt+=.01;q.requestedAt+=.01;},q=>{q.pose.radius+=.01;q.sourceFarm.pose.radius=q.pose.radius;}]){const bad=structuredClone(r);edit(bad);assert.throws(()=>f.c.admitStroll(bad,{preparingWorldBoundary:p.worldBoundary}));assert(f.farm.isCurrent());}assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);}finally{f.close();}
});

test('a newer journal cursor cannot replace the missing preparation clock intent watermark',()=>{
 const f=fixture();try{f.pauseClocks(true);assert.equal(f.w.nav_intent_retire_actor(900012),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=f.prepareApproach();assert(f.c.status().sequence>f.c.status().clock.intentSequence);assert.throws(()=>f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}));f.acceptClock();f.pauseClocks(false);const lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());}finally{f.close();}
});

test('actual admitted Farm approach can transfer to REST21 without reviving its Farm permission',()=>{
 const f=fixture();try{const p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commitApproach(p);assert.equal(f.installApproach(b),1);f.advance(b.reference.endTime-f.state.elapsed+.01);f.planner.projectNativeIdleStroll(f.state,f.worker);const rest=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(rest.status,'proposed');const r=rest.proposal,next=f.c.admitIdleCycle(r.nativeIdleCycle,{preparingWorldBoundary:r.worldBoundary});assert(next.isPrepared());assert(lease.isCurrent());assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),r.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=f.planner.nativeIdleCycleBinding(f.actor);assert(!lease.isCurrent());assert(!f.farm.isCurrent());assert.equal(f.c.installIdleCycles(proof.reference.worldBoundary,[proof]),1);assert(next.isCurrent());}finally{f.close();}
});

test('actual admitted Farm approach uses existing stop installation and holds its body for Home',()=>{
 const f=fixture();try{const p=f.prepareApproach(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commitApproach(p);assert.equal(f.installApproach(b),1);f.advance(.12);const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');const s=stop.proposal,hold=f.c.admitStrollStop(s.nativeStop,{preparingWorldBoundary:s.worldBoundary});f.advance(.1);const fresh=f.planner.revalidateNativeIdleStrollStopProposal(stop.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=f.planner.nativeIdleStrollStopBinding(fresh.proposal.nativeStop,s.nativeStop);assert.equal(f.c.installStrollStops(fresh.proposal.worldBoundary,[proof]),1);assert(hold.isCurrent());assert(!lease.isCurrent());assert(!f.farm.isCurrent());const held=f.planner.projectNativeIdleStroll(f.state,f.worker),body=f.body(1);f.state.time=600;const request=f.planner.requestNativeIdleHome(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(request.bodyId,held.bodyId);assert(hold.isCurrent());assert(!f.farm.isCurrent());assert.deepEqual(f.body(1),body);}finally{f.close();}
});

test('interleaved peer journal and clock preserve the approach causal boundary',()=>{
 const f=fixture();try{
  const clockIndex=f.clocks.length;f.pauseEvents(true);f.pauseClocks(true);
  assert.equal(f.w.nav_intent_retire_actor(900012),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const p=f.prepareApproach(),b=f.commitApproach(p);assert.equal(f.events.length,2);assert.equal(f.clocks.length-clockIndex,2);
  const acceptClock=r=>{const previous=f.c.status().clock;f.c.acceptClock({...r,anchorAbsoluteMs:r.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:r.reanchor?r.committedThrough:previous.anchorLogicalTime});};
  assert(f.c.accept(f.events[0]));acceptClock(f.clocks[clockIndex]);assert(f.farm.isCurrent());
  assert(f.c.accept(f.events[1]));assert(f.c.status().sequence>f.c.status().clock.intentSequence);assert(!f.farm.isCurrent());assert.throws(()=>f.installApproach(b));
  acceptClock(f.clocks[clockIndex+1]);f.pauseClocks(false);assert.equal(f.installApproach(b),1);assert(f.c.admitStroll(b.reference).isCurrent());
 }finally{f.close();}
});
