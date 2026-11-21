import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeFarmArrival as fixture} from './helpers/native-farm-arrival-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeHomeRequestContinuesFarmRequest} from '../src/world/native-home-request-reference.js';
function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}

// Trusted source/control installation, not an actual prepared graphical frame.
for(const profile of PROFILES)test(`${profile.id} direct control replaces pending13 with exact Home19 and requires prepared18 installation`,()=>{
 const f=fixture({profile:profile.id});try{
  const q=f.requestSource,body=f.body(1),p=f.prepare(true),farmLease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});assert(farmLease.isPrepared());f.worker.contractDay--;const home=f.planner.requestNativeFarmHome(f.state,f.worker);assert(nativeHomeRequestContinuesFarmRequest(home,q));assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.c.pendingFarmArrivalRequest(f.actor),null);assert.equal(farmLease.isPrepared(),false);assert.deepEqual(f.body(1),body);
  const prepared=f.planner.prepareNativeHomeRouteProposal(home);assert.equal(prepared.status,'proposed');const lease=f.c.admitHome(prepared.proposal.nativeHome,{preparingWorldBoundary:prepared.proposal.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(f.w.nav_home_route_proposal_commit_bound(...tuple(f).slice(0,5),prepared.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeHomeRouteBinding(f.actor);assert.equal(lease.isCurrent(),false);assert.equal(f.c.installHomes(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert.deepEqual(f.body(1),body);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));f.advance(.1);assert.notDeepEqual(f.body(1),body);
 }finally{f.close();}
});

for(const cause of ['body','flags','profile','yaw','phase','budget','sequence','time'])test(`a ${cause} forged Home event cannot replace the actual pending13 source`,()=>{
 const f=fixture();try{
  f.pauseEvents(true);f.pauseClocks(true);const p=f.prepare(),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});f.worker.contractDay--;f.planner.requestNativeFarmHome(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const event=f.events.findLast(e=>e.homeRequest),before=f.c.status().sequence;assert(event);const bad=structuredClone(event),q=bad.homeRequest;
  if(cause==='body')q.bodyId++;else if(cause==='flags')q.bodyFlags|=4;else if(cause==='profile')q.profile++;else if(cause==='yaw')q.pose.yaw+=.125;else if(cause==='phase')q.pose.walkPhase+=.125;else if(cause==='budget')q.pose.runRemaining+=.125;else if(cause==='sequence')q.requestSequence=f.requestSource.requestSequence;else q.requestedAt=f.requestSource.requestedAt-.01;
  assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);assert(lease.isPrepared());assert(f.c.accept(event));assert.throws(()=>f.c.accept(event),/order or time/);assert.equal(f.c.pendingFarmArrivalRequest(f.actor),null);assert.equal(lease.isPrepared(),false);
 }finally{f.close();}
});
