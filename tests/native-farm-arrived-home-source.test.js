import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedHomeFixture as fixture} from './helpers/native-farm-arrived-home.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeFarmMovingTaskFixture} from './helpers/native-farm-moving-task.js';
import {nativeHomeRequestContinuesCompletedFarmArrival,nativeHomeRequestContinuesHeldFarmArrival} from '../src/world/native-home-request-reference.js';
import {tick} from '../src/simulation/game.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'inside':'travelled'} completed Farm23 retains its real body for Home19/18`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,inside,core:runtime?.core});const body=f.body(1),count=f.w.spatial_body_count(),rng=f.state.rng,sequence=f.w.nav_intent_transition_sequence();assert.equal(f.rawHome(),1);assert.equal(f.w.nav_intent_transition_sequence(),sequence+1);const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert.equal(request.bodyId,1);assert.equal(request.pose.x,f.source.x);assert.equal(request.pose.z,f.source.z);assert.equal(request.pose.yaw,f.source.yaw);for(const key of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(request.pose[key],f.source[key]);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  f.planner.flushNativeIntentControl();const event=f.events.at(-1);assert.equal(event.type,'RouteInvalidated');assert.equal(event.state,6);assert.deepEqual(event.revokedRouteHandle,f.farmBinding.reference.expectedRouteHandle);assert.deepEqual(event.homeRequest,request);assert.equal(event.taskRequest,null);assert.equal(f.rawHome(),1);assert.equal(f.rawHome({x:request.home.x+1}),-3);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=f.prepareHome();assert.equal(f.rawHome(),-4);f.advance(1.8);assert.deepEqual(f.body(1),body);const next=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);assert(f.planner.cancelNativeHomeRouteProposal(next.proposal.ticket));assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);const binding=f.commitHome(f.prepareHome());assert.deepEqual(binding.reference.sourceRequest,request);assert.deepEqual(f.body(1),body);f.advance(.2);assert(f.planner.nativeHomeRouteExecution(f.actor));assert.notDeepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});

for(const profile of PROFILES)test(`${profile.id} public completed Farm Home request projects expiry without Idle and Game continues after19`,()=>{
 const f=fixture({profile:profile.id,inside:true});try{
  const body=f.body(1),peer=f.body(3);f.worker.contractDay--;const request=f.planner.requestNativeFarmHome(f.state,f.worker);assert(request);assert(nativeHomeRequestContinuesCompletedFarmArrival(request,f.source));assert(!nativeHomeRequestContinuesHeldFarmArrival(request,f.source));assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);
  const p=f.prepareHome();f.commitHome(p);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));tick(f.state,.2,f.nav);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.notDeepEqual(f.body(1),body);
  assert(!nativeHomeRequestContinuesCompletedFarmArrival({...request,pose:{...request.pose,x:request.pose.x+.1}},f.source));
 }finally{f.close();}
});

test('completed Farm source validates session, sequence, generation, actor and actual body before Home',()=>{
 const f=fixture();try{
  const body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),h=f.farmBinding.reference.expectedRouteHandle;
  for(const change of [{actor:900012},{session:h.session+1},{sequence:f.farmBinding.assignmentSequence+1},{generation:h.generation+1}])assert.notEqual(f.rawHome(change),1);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  assert.throws(()=>f.planner.requestNativeFarmHome(f.state,f.worker),/finished.*contract/i);assert.equal(f.w.spatial_body_remove(1),1);assert.notEqual(f.rawHome(),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('moving Farm cannot request terminal Home',()=>{
 const f=nativeFarmMovingTaskFixture({stop:false});try{
  const r=f.farmBinding.reference,h=r.expectedRouteHandle,body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),goal=f.point(6,0);assert(f.state.elapsed<r.endTime);
  assert.equal(f.w.nav_intent_farm_arrival_home_request(f.actor,h.session,f.farmBinding.assignmentSequence,h.generation,Number(f.worker.villageId.split('-').at(-1)),goal.x,goal.z),-2);f.state.time=600;assert.throws(()=>f.planner.requestNativeFarmHome(f.state,f.worker));assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('pending Home from a completed Farm pins the same body and closes on removal',()=>{
 const f=fixture();try{const request=f.requestHome(),body=f.body(1);for(const change of [{x:body.x+.1},{radius:body.radius+.1},{flags:body.flags|2}]){const b={...body,...change};assert.notEqual(f.w.spatial_body_upsert(1,b.x,b.z,b.radius,b.kind,b.flags),1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);}assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.notEqual(f.rawHome(),1);}finally{f.close();}
});

test('completed Farm Home continuation rejects invalid time, movement, body and handle provenance',()=>{
 const f=fixture();try{
  const request=f.requestHome(),source=f.source;assert(nativeHomeRequestContinuesCompletedFarmArrival(request,source));
  for(const change of [{executedThrough:NaN},{executedThrough:Infinity},{executedThrough:source.binding.reference.endTime-.01},{arrived:false},{running:true},{currentSpeed:.1},{bodyId:source.bodyId+1},{version:2},{nativeRoute:{...source.nativeRoute,routeHandle:null}}])assert(!nativeHomeRequestContinuesCompletedFarmArrival(request,{...source,...change}));
 }finally{f.close();}
});
