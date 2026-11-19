import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeFarmMovingTask as fixture} from './helpers/native-farm-moving-task-control.js';
import {PROFILES} from '../src/simulation/workforce.js';

// Actual C++ log, clock and stopped projection. Trusted raw commits and direct
// installation below are source/control tests, not graphical GPU receipts.
for(const profile of PROFILES)test(`${profile.id} Farm continuation retains the installed24 lease until real23 then requires exact installation`,()=>{
 const f=fixture({profile:profile.id});try{
  const body=f.body(1),source=f.planner.nativeFarmArrivalHeldExecution(f.actor),p=f.planner.prepareNativeFarmArrivalContinuationProposal(source).proposal;
  assert(f.held.isCurrent());const lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert(f.held.isCurrent());
  f.advance(.1);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert.deepEqual(f.body(1),body);assert(f.held.isCurrent());const fresh=f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket);assert.equal(fresh.status,'revalidated');
  assert.equal(f.w.nav_farm_arrival_route_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const binding=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert.equal(f.held.isCurrent(),false);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.deepEqual(f.body(1),body);
  assert.throws(()=>f.c.installFarmArrivals(binding.reference.worldBoundary,[{...binding,assignmentSequence:binding.assignmentSequence+1}]));assert.equal(lease.isCurrent(),false);
  assert.equal(f.c.installFarmArrivals(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert.equal(f.c.pendingFarmArrivalRequest(f.actor),null);assert.equal(lease.routeRecord.sourceFarmArrivalHeld.sourceSequence,source.assignmentSequence);
  assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));f.advance(.1);assert.notDeepEqual(f.body(1),body);assert(lease.isCurrent());
 }finally{f.close();}
});

for(const cause of ['uninstalled-stop','missing-pose','sequence','generation','yaw','phase','budget','original-goal'])test(`Farm continuation rejects ${cause} before changing its direct control cursor`,()=>{
 const f=fixture(cause==='uninstalled-stop'?{installStop:false}:cause==='missing-pose'?{projection:false}:{});try{
  const p=f.planner.prepareNativeFarmArrivalContinuationProposal(f.planner.nativeFarmArrivalHeldExecution(f.actor)).proposal,r=structuredClone(p.nativeFarmArrival),before=f.c.status(),body=f.body(1);
  if(cause==='sequence')r.sourceHeld.sourceSequence++;else if(cause==='generation'){r.sourceHeld.resumeHandle.generation++;r.expectedRouteHandle.generation++;}else if(cause==='yaw')r.sourceHeld.pose.yaw+=.125;else if(cause==='phase')r.sourceHeld.pose.walkPhase+=.125;else if(cause==='budget')r.sourceHeld.pose.runRemaining+=.125;else if(cause==='original-goal')r.sourceRequest.goal.centerX+=1;
  assert.throws(()=>f.c.admitFarmArrival(r,{preparingWorldBoundary:p.worldBoundary}));assert.equal(f.c.status().sequence,before.sequence);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});
