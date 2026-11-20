import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeSettledIdleFixture} from './helpers/native-settled-idle.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';

// Trusted native source setup, not a graphical receipt. Each pthread case owns
// its runtime; a closed authority cannot be replaced by another test world.
async function fixture(threaded,options,run){
 let runtime,f;try{
  if(threaded){const{default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeSettledIdleFixture({...options,core:runtime?.core});await run(f);
 }finally{f?.close();await runtime?.dispose();}
}
function acquire(f){const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');f.commitIdle(p.proposal);}
function foreignProposal(f){assert.equal(f.w.spatial_barrier_proposal_stage(f.worker.x+25,f.worker.z+25,.1,.1,0,0),1);return f.tuple();}

for(const threaded of [false,true]){
 const engine=threaded?'pthread':'standalone';
 for(const ordinary of [false,true])test(`${engine} contract expiry ${ordinary?'in ordinary tick':'by direct request'} retargets current Idle without consuming a foreign proposal`,async()=>fixture(threaded,{},f=>{
  acquire(f);const ticket=foreignProposal(f),source=f.planner.nativeIdleCycleBinding(f.actor),own=f.body(1),peer=f.body(3),at=f.state.elapsed;f.worker.contractDay--;
  if(ordinary){assert.doesNotThrow(()=>tick(f.state,.1,f.nav));assert(f.state.elapsed>at);assert.notDeepEqual(f.body(3),peer);}else assert(f.planner.requestNativeIdleHome(f.state,f.worker));
  const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.equal(home.bodyId,source.reference.bodyId);assert.equal(home.requestedAt,at);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),own);assert.deepEqual(f.tuple(),ticket);
  assert.equal(f.w.nav_intent_barrier_proposal_cancel(...ticket.slice(0,2)),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),home);assert.deepEqual(f.body(1),own);
 }));
 test(`${engine} Home makes its own prepared Idle successor stale on the retained body`,async()=>fixture(threaded,{},f=>{
  acquire(f);const source=f.planner.nativeIdleCycleBinding(f.actor);f.advance(source.reference.worldBoundary.effectiveTime+source.reference.duration-f.state.elapsed+.01);
  const next=f.planner.nativeIdleCycleNextRequest(f.actor),rest=next.idleState.mode==='rest',p=rest?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const ticket=f.tuple(),own=f.body(1),peer=f.body(3);f.worker.contractDay--;
  const home=f.planner.requestNativeIdleHome(f.state,f.worker);assert(home);assert.equal(home.bodyId,1);assert.deepEqual(f.tuple(),ticket);assert.deepEqual(f.body(1),own);assert.deepEqual(f.body(3),peer);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');
  assert.notEqual((rest?f.w.nav_idle_cycle_proposal_commit_bound:f.w.nav_idle_stroll_proposal_commit_bound)(...ticket.slice(0,5),p.proposal.ticket.ticket),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),home);assert.deepEqual(f.body(1),own);
 }));
 for(const inside of [true,false])test(`${engine} settlement Home supersedes its prepared ${inside?21:22} without replacing either body`,async()=>fixture(threaded,{inside},f=>{
  const p=inside?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const own=f.body(1),peer=f.body(3);f.worker.contractDay--;
  const home=f.planner.requestNativeIdleHome(f.state,f.worker);assert(home);assert.equal(home.bodyId,1);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.deepEqual(f.body(1),own);assert.deepEqual(f.body(3),peer);
  assert.equal((inside?f.planner.revalidateNativeIdleCycleProposal(p.proposal.ticket):f.planner.revalidateNativeIdleStrollProposal(p.proposal.ticket)).status,'stale');
 }));
 test(`${engine} a removed physical source still cannot declare Home through a pending proposal`,async()=>fixture(threaded,{},f=>{
  acquire(f);const ticket=foreignProposal(f);f.worker.contractDay--;assert.equal(f.w.spatial_body_remove(1),1);const worker=structuredClone(f.worker);
  assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker));assert.deepEqual(f.worker,worker);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(f.tuple(),ticket);
 }));
 for(const profile of PROFILES)test(`${engine} ${profile.id} shift end requests Home through ordinary tick while a proposal is pending`,async()=>fixture(threaded,{
  profile:profile.id,admitPeer:false,
  // Isolate shift expiry from the independent Task peer's unsupported return
  // boundary. Remove it from the cold save before creating the native owner.
  configureSave(saved){const actor=saved.workers[0].id;saved.workers=saved.workers.slice(0,1);saved.tasks=saved.tasks.filter(t=>!t.workerId||t.workerId===actor);}
 },f=>{
  acquire(f);const ticket=foreignProposal(f),own=f.body(1),count=f.w.spatial_body_count(),rng=f.state.rng,ledger=structuredClone(f.state.ledger),at=f.state.elapsed;
  f.state.time=profile.end;assert.doesNotThrow(()=>tick(f.state,.1,f.nav));const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.equal(home.bodyId,1);assert.equal(home.requestedAt,at);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert(f.state.elapsed>at);assert.deepEqual(f.body(1),own);assert.equal(f.w.spatial_body_count(),count);assert.deepEqual(f.tuple(),ticket);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);
 }));
 test(`${engine} identical and changed Home goals preserve the already prepared Home ticket`,async()=>fixture(threaded,{},f=>{
  acquire(f);const cycle=f.planner.nativeIdleCycleBinding(f.actor);f.worker.contractDay--;const home=f.planner.requestNativeIdleHome(f.state,f.worker);assert(home);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=f.planner.prepareNativeHomeRouteProposal(home);assert.equal(p.status,'proposed');const ticket=f.tuple(),body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),goal=home.home,args=[Number(f.actor.split('-').at(-1)),home.nativeSession,cycle.cycleSequence,goal.villageId,goal.x,goal.z];
  assert.equal(f.w.nav_intent_idle_cycle_home_request(...args),1);assert.deepEqual(f.tuple(),ticket);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),home);
  args[4]+=.5;assert.equal(f.w.nav_intent_idle_cycle_home_request(...args),-3);assert.deepEqual(f.tuple(),ticket);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),home);assert.deepEqual(f.body(1),body);assert(f.planner.cancelNativeHomeRouteProposal(p.proposal.ticket));
 }));
}
