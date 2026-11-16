import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Trusted source ABI and existing Home draft. No Game intent, graphical
// admission or ordinary producer is manufactured by this component fixture.
function fixture({origin='arrived',core=null,moving=false}={}){
 const f=origin==='initial'?nativeIdleCycleFixture({mode:'rest',core,peer:true}):nativeIdleStrollSourceFixture({rng:1,core,peer:true});
 try{
  if(origin==='arrived'){const walk=f.stage();assert.equal(walk.status,1);f.commitStroll(walk);if(moving)return f;f.advance(walk.header[11]-f.state.elapsed+.01);assert.equal(f.stroll()[18],1);const rest=f.propose(f.strollBinding()[1]);assert.equal(rest.status,1);f.commit(rest);}else{const rest=f.propose();assert.equal(rest.status,1);f.commit(rest);}
  const cycle=f.binding(),source=()=>{if(f.w.nav_idle_cycle_source_snapshot(f.actor,0)!==1)return null;return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_source_ptr(),26));},q=source(),point=f.point(6,-4),goal={villageId:Number(f.worker.villageId.split('-').at(-1)),x:point.x,z:point.z};
  return {...f,cycle,q,source,goal,request(sequence=cycle[1],session=f.w.nav_intent_session(),home=goal,actor=f.actor){return f.w.nav_intent_idle_cycle_home_request(actor,session,sequence,home.villageId,home.x,home.z);}};
 }catch(error){f.close();throw error;}
}
async function coreFor(threaded){if(!threaded)return null;const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');return createThreadedSpatialWorld(factory);}
for(const threaded of [false,true])for(const origin of ['initial','arrived'])test(`${threaded?'pthread':'standalone'} Home request from ${origin} cycle retains the actual stationary body through prepared acquisition`,async()=>{
 const runtime=await coreFor(threaded);let f;try{
  f=fixture({origin,core:runtime?.core});const body=f.body(1),count=f.w.spatial_body_count(),game=structuredClone(f.worker),rng=f.state.rng;
  assert.equal(f.q[1],origin==='initial'?20:22);assert.equal(f.request(),1);const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert(request.requestSequence>f.cycle[1]);assert.deepEqual(Object.values(request.pose),f.q.slice(11,19));assert.equal(request.bodyId,f.q[3]);assert.equal(f.w.nav_home_request_snapshot(f.actor,0),1);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);assert.deepEqual(f.worker,game);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_idle_cycle_resolve_next(f.actor,f.w.nav_intent_session(),f.cycle[1]),-2);assert.equal(f.next(),null);
  assert.equal(f.request(),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert.equal(f.request(f.cycle[1],f.w.nav_intent_session(),{...f.goal,x:f.goal.x+.5}),-3);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);
  assert.equal(f.planner.prepareNativeHomeRouteProposal(request).status,'unsupported','new semantic event has not acquired its causal clock yet');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');assert.equal(f.request(),-4);f.advance(.2);assert.deepEqual(f.body(1),body);const renewed=f.planner.revalidateNativeHomeRouteProposal(p.proposal.ticket);assert.equal(renewed.status,'revalidated');assert(renewed.timeTranslation.sameFloat32Motion);assert.equal(f.planner.cancelNativeHomeRouteProposal(renewed.proposal.ticket),true);assert.equal(f.request(),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);
  const ready=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(ready.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),ready.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeHomeRouteBinding(f.actor);assert(binding);assert.equal(binding.reference.bodyId,1);assert.deepEqual(binding.reference.sourceRequest,request);assert.equal(f.w.nav_idle_cycle_binding_snapshot(f.actor),0);if(origin==='arrived')assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  const start=f.planner.nativeHomeRouteExecution(f.actor);assert.equal(start.x,request.pose.x);assert.equal(start.z,request.pose.z);for(const key of ['runPhase','walkPhase','carryPhase','runRemaining'])assert(Math.abs(start[key]-request.pose[key])<1e-8,key);f.advance(binding.reference.endTime-f.state.elapsed+.01);const end=f.planner.nativeHomeRouteExecution(f.actor);assert(end.arrived);assert.equal(end.x,Math.fround(f.goal.x));assert.equal(end.z,Math.fround(f.goal.z));assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.deepEqual(f.worker,game);
 }finally{f?.close();await runtime?.dispose();}
});
for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} current-cycle Home rejects root history, foreign identity and malformed goals without consuming the body`,async()=>{
 const runtime=await coreFor(threaded);let f;try{
  f=fixture({core:runtime?.core});const body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),game=structuredClone(f.worker);
  for(const args of [[f.q[5]],[f.cycle[1]+100],[f.cycle[1],f.w.nav_intent_session()+1],[f.cycle[1],f.w.nav_intent_session(),{...f.goal,villageId:0}],[f.cycle[1],f.w.nav_intent_session(),{...f.goal,x:NaN}],[f.cycle[1],f.w.nav_intent_session(),f.goal,0]])assert.notEqual(f.request(...args),1);
  assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,f.w.nav_intent_session(),f.cycle[1],f.goal.villageId,f.goal.x,f.goal.z),-2);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,game);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  assert.equal(f.w.spatial_body_upsert(1,body.x+.2,body.z,body.radius,0,1),0);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.request(),0);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f?.close();await runtime?.dispose();}
});
for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} a moving or arrived WALK cannot impersonate an acquired stationary cycle for Home`,async()=>{
 const runtime=await coreFor(threaded);let f;try{
  f=fixture({core:runtime?.core,moving:true});const b=f.strollBinding(),actor=f.actor,session=f.w.nav_intent_session(),point=f.point(6,-4),body=f.body(1),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.w.nav_intent_idle_cycle_home_request(actor,session,b[1],1,point.x,point.z),-2);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);f.advance(b[28+11]-f.state.elapsed+.01);assert.equal(f.stroll()[18],1);assert.equal(f.w.nav_intent_idle_cycle_home_request(actor,session,b[1],1,point.x,point.z),-2);assert.equal(f.planner.nativeHomeRequestReference(actor),null);
 }finally{f?.close();await runtime?.dispose();}
});
