import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmMovingTaskFixture as heldFarm} from './helpers/native-farm-moving-task.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeHomeRequestContinuesHeldFarmArrival,nativeHomeRequestContinuesHeldIdleStroll} from '../src/world/native-home-request-reference.js';

// Actual23/24 and Game Home request/18 source ABI. No controller/GPU permission.
function fixture(options={}){
 const f=heldFarm(options);return {...f,
  requestHome(){f.state.time=600;return f.planner.requestNativeFarmHome(f.state,f.worker);},
  prepareHome(){const result=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(result.status,'proposed',JSON.stringify(result));return result.proposal;},
  rawHome({actor=f.actor,session=f.source.resumeHandle.session,sequence=f.source.assignmentSequence,generation=f.source.resumeHandle.generation,x=f.point(6,0).x,z=f.point(6,0).z}={}){return f.w.nav_intent_farm_arrival_home_request(actor,session,sequence,generation,Number(f.worker.villageId.split('-').at(-1)),x,z);},
  commitHome(p){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert(f.planner.projectNativeHomeExecution(f.state,f.worker));return f.planner.nativeHomeRouteBinding(f.actor);}
 };
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} actual held Farm supplies Home18 without Idle history or another body`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const body=f.body(1),peer=f.body(3),count=f.w.spatial_body_count(),rng=f.state.rng,source=f.source,request=f.requestHome();assert.equal(request.kind,'native-home-request-reference');assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.equal(f.worker.taskId,null);assert.deepEqual(request.pose,source.pose);assert(request.requestSequence>source.assignmentSequence);assert.equal(request.bodyId,1);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  assert.equal(f.rawHome(),1);assert.equal(f.rawHome({x:request.home.x+1}),-3);assert.equal(f.w.nav_intent_idle_stroll_home_request(f.actor,source.resumeHandle.session,source.assignmentSequence,source.resumeHandle.generation,request.home.villageId,request.home.x,request.home.z),-2);
  const p=f.prepareHome();assert.equal(f.rawHome(),-4);f.advance(source.sourceReference.endTime-f.state.elapsed+.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
  const next=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);assert(f.planner.cancelNativeHomeRouteProposal(next.proposal.ticket));assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);
  const fresh=f.prepareHome(),binding=f.commitHome(fresh);assert.deepEqual(binding.reference.sourceRequest,request);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);f.advance(.2);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.x,f.body(1).x);assert.equal(f.worker.z,f.body(1).z);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});

test('Farm Home request validates its actual stopped family, sequence, generation and current actor before mutation',()=>{
 const f=fixture();try{
  const body=f.body(1),sequence=f.w.nav_intent_transition_sequence();
  for(const args of [{sequence:f.source.assignmentSequence+1},{generation:f.source.resumeHandle.generation+1},{actor:900012},{session:f.source.resumeHandle.session+1}])assert.notEqual(f.rawHome(args),1);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker));assert.throws(()=>f.planner.requestNativeFarmHome(f.state,f.worker),/finished.*contract/i);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.equal(f.worker.status,'arriving');
  assert.equal(f.w.spatial_body_remove(1),1);assert.notEqual(f.rawHome(),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('Game expires only the held Farm contract and keeps its native Task peer moving while Home waits',()=>{
 const f=fixture();try{
  const body=f.body(1),peer=f.body(3);f.worker.contractDay--;tick(f.state,.1,f.nav);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);const request=f.planner.nativeHomeRequestReference(f.actor);assert.deepEqual(request.pose,f.source.pose);assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);const p=f.prepareHome();f.commitHome(p);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-home');
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id} Game crosses its actual Farm end time into pending Home without JS movement`,()=>{
 const f=fixture({profile:profile.id,peer:false});try{
  f.state.time=profile.end-.05;const body=f.body(1),elapsed=f.state.elapsed;tick(f.state,.1,f.nav);assert(f.state.elapsed>elapsed);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor).pose,f.source.pose);assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('moving Farm cannot request Home before its actual prepared stop',()=>{
 const f=heldFarm({stop:false});try{
  const body=f.body(1),binding=f.farmBinding,r=binding.reference,h=r.expectedRouteHandle,goal=f.point(6,0),sequence=f.w.nav_intent_transition_sequence();assert.equal(f.w.nav_intent_farm_arrival_home_request(f.actor,h.session,binding.assignmentSequence,h.generation,Number(f.worker.villageId.split('-').at(-1)),goal.x,goal.z),-2);f.state.time=600;assert.throws(()=>f.planner.requestNativeFarmHome(f.state,f.worker));assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');
 }finally{f.close();}
});

test('pending Farm Home pins its native body and is revoked by body removal',()=>{
 const f=fixture();try{
  const request=f.requestHome(),body=f.body(1);f.planner.commitNativeCausalClock();for(const change of [{x:body.x+.1},{radius:body.radius+.1},{flags:body.flags|2}]){const b={...body,...change};assert.notEqual(f.w.spatial_body_upsert(1,b.x,b.z,b.radius,b.kind,b.flags),1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);}assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.notEqual(f.rawHome(),1);
 }finally{f.close();}
});

test('Farm Home cannot replace a genuinely acquired ordinary Task request',()=>{
 const f=fixture();try{
  f.requestTask();const body=f.body(1),request=f.planner.pendingTaskRoute(f.actor),sequence=f.w.nav_intent_transition_sequence();assert.notEqual(f.rawHome(),1);assert.throws(()=>f.requestHome());assert.deepEqual(f.planner.pendingTaskRoute(f.actor),request);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('Farm Home continuation names its typed physical ancestry, never an Idle pose',()=>{
 const f=fixture();try{
  const request=f.requestHome();assert(nativeHomeRequestContinuesHeldFarmArrival(request,f.source));assert(!nativeHomeRequestContinuesHeldIdleStroll(request,f.source));for(const change of [{bodyId:request.bodyId+1},{profile:request.profile+1},{requestSequence:f.source.assignmentSequence},{pose:{...request.pose,x:request.pose.x+.1}},{authorityEpoch:'foreign'}])assert(!nativeHomeRequestContinuesHeldFarmArrival({...request,...change},f.source));assert(!nativeHomeRequestContinuesHeldFarmArrival(request,{...f.source,kind:'native-idle-stroll-held-execution'}));
 }finally{f.close();}
});

test('only an acquired held Farm pose can survive contract expiry; a fresh declaration remains closed',()=>{
 const f=fixture();try{
  f.state.time=600;const body=f.body(1),sequence=f.w.nav_intent_transition_sequence();assert.throws(()=>f.planner.requestNativeFarmArrivalResources(f.state,f.worker));assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));assert.deepEqual(f.body(1),body);const request=f.planner.requestNativeFarmHome(f.state,f.worker);assert.deepEqual(request.pose,f.source.pose);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');
 }finally{f.close();}
});
