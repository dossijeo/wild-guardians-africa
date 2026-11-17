import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollStopGameFixture} from './helpers/native-idle-stroll-stop-game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick,emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';

async function fixture(threaded,options={}){
 let runtime;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  const f=nativeIdleStrollStopGameFixture({...options,core:runtime?.core});
  return {...f,async close(){f.close();await runtime?.dispose();}};
 }catch(error){await runtime?.dispose();throw error;}
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Game holds prepared stopped22 while its Task peer advances`,async()=>{
 const f=await fixture(threaded,{profile:profile.id});try{
  const body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),rng=f.state.rng;
  assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.2,f.nav);
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);
  const held=f.planner.nativeIdleStrollHeldExecution(f.actor);assert.equal(held.executedThrough,f.state.elapsed);assert.equal(f.planner.nativeIdleStrollExecution(f.actor),null);assert.equal(f.w.spatial_body_count(),2);
 }finally{await f.close();}
});

for(const threaded of [false,true])for(const expiry of ['day','time'])test(`${threaded?'pthread':'standalone'} stopped22 ${expiry} expiry consumes genuine Home`,async()=>{
 const f=await fixture(threaded,{peer:expiry==='day'});try{
  const worker=structuredClone(f.worker),body=f.body(1),peer=expiry==='day'?f.body(3):null;if(expiry==='day')f.worker.contractDay--;else f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end-.05;tick(f.state,.1,f.nav);
  assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);
  for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],worker[k]);
  assert.deepEqual(f.body(1),body);if(peer)assert.notDeepEqual(f.body(3),peer);const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);
  const nextPeer=peer&&f.body(3);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);if(peer)assert.notDeepEqual(f.body(3),nextPeer);
  const prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.proposal.ticket.ticket),1);
  f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();f.planner.projectNativeHomeExecution(f.state,f.worker);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);
 }finally{await f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} real task consumes stopped22 without moving during resource wait`,async()=>{
 const f=await fixture(threaded);try{
  const worker=structuredClone(f.worker),body=f.body(1),target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.stroll.reference.anchor.x+1,f.stroll.reference.anchor.z,f.worker.centerId);
  target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);
  f.planner.flushWorldEvents();f.planner.flushTaskEvents();const rows=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),1);f.planner.commitNativeCausalClock();
  assert.equal(f.state.tasks.find(t=>t.id===f.worker.taskId).targetId,target.id);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);
  const peer=f.body(3);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);
  for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],worker[k]);
  const request=f.planner.pendingTaskRoute(f.actor),policy={bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase};
  const prepared=f.planner.prepareNativeTaskStartProposal(request,policy);assert.equal(prepared.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),prepared.proposal.ticket.ticket),1);
  f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);
 }finally{await f.close();}
});

test('losing a held body rejects Game before advancing the world',async()=>{
 const f=await fixture(false);try{
  assert.equal(f.w.spatial_body_remove(1),1);const at=f.state.elapsed,peer=f.body(3),worker=structuredClone(f.worker);
  assert.equal(f.planner.nativeIdleStrollHeldExecution(f.actor),null);assert.throws(()=>tick(f.state,.1,f.nav));assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(3),peer);assert.deepEqual(f.worker,worker);
 }finally{await f.close();}
});

test('a suspended Task peer still blocks Game before either body advances',async()=>{
 const f=await fixture(false);try{
  const h=f.peerBinding.reference.expectedRouteHandle;assert.equal(f.planner.suspendNativeGateRoute(h).status,'suspended');f.planner.commitNativeCausalClock();
  const at=f.state.elapsed,bodies=[f.body(1),f.body(3)];assert.equal(f.planner.nativeGameExecutionState(),-1);assert.throws(()=>tick(f.state,.1,f.nav),/intention class/);assert.equal(f.state.elapsed,at);assert.deepEqual([f.body(1),f.body(3)],bodies);
 }finally{await f.close();}
});
