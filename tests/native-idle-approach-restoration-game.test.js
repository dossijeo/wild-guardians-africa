import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './helpers/native-idle-approach-restoration.js';
import {restoredNativeIdleStrollGame} from './helpers/native-idle-stroll-restoration-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

for(const profile of PROFILES)for(const position of ['outside','inside','arrived'])test(`${profile.id} Game ${position==='outside'?'holds its unusable saved fractional start':`restores ${position} approach through fresh22 and original REST`}`,()=>{
 const saved=savedNativeIdleApproach({profile:profile.id,position}),f=restoredNativeIdleStrollGame(saved);try{
  const old=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,q=f.planner.nativeIdleStrollRequestReference(f.actor);assert(q.approach);assert.equal(old.destinationId,old.idleState.anchorId);
  tick(f.state,.2,f.nav);assert.deepEqual(f.worker,old);assert.deepEqual(f.body(1),body);assert.deepEqual(deserialize(serialize(f.state)).workers[0],old);
  if(position==='outside'){
   // The original navigation policy also rejects this start connector in the
   // fresh geometry. The native no-path -> REST policy is a separate pending
   // migration item; never pretend a corridor or move/retarget this request.
   const original=createSpatialNavigationMovement(f.session,f.state);assert.equal(original.path(f.worker,f.worker.idleState.destination,.28,null,true),null);
   assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'unknown');assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.planner.nativeIdleStrollRequestReference(f.actor),q);tick(f.state,.2,f.nav);assert.deepEqual(f.worker,old);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);return;
  }
  const candidate=f.prepare();tick(f.state,.2,f.nav);assert.deepEqual(f.worker,old);assert.equal(f.planner.revalidateNativeIdleStrollProposal(candidate.ticket).status,'revalidated');const binding=f.commit(candidate);
  assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.destinationId,old.destinationId);assert.equal(f.worker.idleState.remaining,old.idleState.remaining);assert.equal(f.worker.idleState.rng,old.idleState.rng);assert.deepEqual(f.body(1),body);
  tick(f.state,.1,f.nav);if(position!=='arrived')assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.x,f.body(1)[1]);assert.equal(f.worker.z,f.body(1)[2]);assert.equal(f.worker.runRemaining,old.runRemaining);
  tick(f.state,Math.max(0,binding.reference.endTime-f.state.elapsed)+.05,f.nav);assert(f.planner.projectNativeIdleStroll(f.state,f.worker));const arrived=f.planner.nativeIdleStrollExecution(f.actor);assert(arrived.arrived);assert.deepEqual(arrived.desiredRest,saved.desiredRest);
  const rest=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(rest.status,'proposed');assert.equal(rest.proposal.nativeIdleCycle.sourceBody.kind,'native-idle-stroll-arrival-source');assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),rest.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();assert(f.planner.projectNativeIdleCycle(f.state,f.worker));assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.worker.idleState.rng,saved.desiredRest.rng);assert.equal(f.state.rng,rng);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id} expired saved approach declares fresh Home instead of resuming WALK or consuming cosmetic RNG`,()=>{
 const saved=savedNativeIdleApproach({profile:profile.id,position:'inside'});saved.state.time=profile.end+1;const old=structuredClone(saved.state.workers[0]),rng=saved.state.rng,f=restoredNativeIdleStrollGame(saved);try{
  assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);const q=f.planner.nativeHomeRequestReference(f.actor);assert(q);assert.equal(q.pose.x,old.x);assert.equal(q.pose.z,old.z);assert.equal(q.pose.walkPhase,old.walkPhase);assert.equal(q.pose.runRemaining,old.runRemaining);assert.equal(f.state.rng,rng);const body=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});
