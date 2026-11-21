import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';import {tick} from '../src/simulation/game.js';
import * as homeReferences from '../src/world/native-home-request-reference.js';

async function core(threaded){if(!threaded)return null;const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');return createThreadedSpatialWorld(factory);}
function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}

// Actual C++/Game, trusted raw Home18 commit. No graphical receipt is minted.
for(const threaded of [false,true])for(const profile of PROFILES)for(const expiry of ['day','hour'])for(const preparing of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${expiry} expiry redirects actual pending13 to Home while Farm preparation=${preparing}`,async()=>{
 let runtime,f;try{
  runtime=await core(threaded);f=fixture({core:runtime?.core,profile:profile.id,peer:expiry!=='hour'});const q=f.planner.nativeFarmArrivalRequestReference(f.actor),body=f.body(1),peer=expiry==='day'?f.body(3):null,count=f.w.spatial_body_count(),rng=f.state.rng,ledger=structuredClone(f.state.ledger);let proposal;
  if(preparing){proposal=f.planner.prepareNativeFarmArrivalRouteProposal(q,{urgent:true});assert.equal(proposal.status,'proposed');}
  if(expiry==='day')f.worker.contractDay--;else f.state.time=profile.end-.05;
  tick(f.state,.1,f.nav);const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert(homeReferences.nativeHomeRequestContinuesFarmRequest(home,q));assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.taskId,null);assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);if(peer)assert.notDeepEqual(f.body(3),peer);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);
  if(proposal)assert.notEqual(f.planner.revalidateNativeFarmArrivalRouteProposal(proposal.proposal.ticket).status,'revalidated');
  tick(f.state,.1,f.nav);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),home);assert.deepEqual(f.body(1),body);const p=f.planner.prepareNativeHomeRouteProposal(home);assert.equal(p.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...tuple(f).slice(0,5),p.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert(f.planner.projectNativeHomeExecution(f.state,f.worker));tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.notDeepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);
 }finally{f?.close();await runtime?.dispose();}
});

for(const profile of PROFILES)for(const expiry of ['day','hour'])test(`${profile.id} ${expiry} expiration before first body retains the declaration and binds only the new Home owner`,()=>{
 const f=fixture({profile:profile.id,bound:false});try{
  const source=f.planner.nativeFarmArrivalDeclarationReference(f.actor),pose=structuredClone(f.worker);assert.equal(f.w.spatial_body_count(),0);if(expiry==='day'){f.worker.contractDay--;f.planner.requestNativeFarmHome(f.state,f.worker);}else{f.state.time=profile.end-.05;tick(f.state,.1,f.nav);}assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.status,'returning');assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeFarmArrivalDeclarationReference(f.actor),null);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  f.bind();assert.equal(f.planner.commitNativeCausalClock().status,'committed');const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert(home.requestSequence>source.requestSequence);for(const k of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(home.pose[k],pose[k]);assert.equal(home.pose.yaw,pose.heading);assert.equal(home.bodyId,1);assert.equal(f.w.spatial_body_count(),1);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);
 }finally{f.close();}
});

for(const cause of ['session','sequence','village','coordinate','retired'])test(`a ${cause} mismatch cannot retarget or cancel another pending13 candidate`,()=>{
 const f=fixture();try{const q=f.planner.nativeFarmArrivalRequestReference(f.actor),body=f.body(1),p=f.planner.prepareNativeFarmArrivalRouteProposal(q);assert.equal(p.status,'proposed');const args=[f.actor,q.nativeSession,q.requestSequence,999,body.x+6,body.z];if(cause==='session')args[1]++;else if(cause==='sequence')args[2]++;else if(cause==='village')args[3]=0;else if(cause==='coordinate')args[4]=NaN;else {assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');}
  const sequence=f.w.nav_intent_transition_sequence();assert.notEqual(f.w.nav_intent_pending_farm_home_request(...args),1);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);if(cause!=='retired')assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(p.proposal.ticket).status,'revalidated');
 }finally{f.close();}
});
