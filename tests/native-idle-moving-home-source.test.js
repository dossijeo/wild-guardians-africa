import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';

// Trusted native ABI after the existing prepared suspension, without inventing
// a stationary cycle. Graphical suspension/Home and Game APIs are not simulated.
function fixture(options={}){
 const f=nativeIdleStrollSourceFixture({rng:1,peer:true,...options});try{
  const p=f.stage();assert.equal(p.status,1);f.commitStroll(p);f.advance(.12);const binding=f.planner.nativeIdleStrollBinding(f.actor),h=binding.reference.expectedRouteHandle,point=f.point(6,-4),village=Number(f.worker.villageId.split('-').at(-1));
  return {...f,binding,handle:h,goal:{village,x:point.x,z:point.z},
   hold(){assert.equal(f.w.nav_gate_suspend_route(h.session,h.slot,h.generation),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.w.nav_gate_suspended_route(f.actor),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_suspended_route_ptr(),27));},
   request(generation,sequence=binding.assignmentSequence,goal={village,x:point.x,z:point.z},session=h.session,actor=f.actor){return f.w.nav_intent_idle_stroll_home_request(actor,session,sequence,generation,goal.village,goal.x,goal.z);},
   prepareHome(){const r=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(r.status,'proposed',JSON.stringify(r));return r.proposal;}
  };
 }catch(error){f.close();throw error;}
}
for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} a genuinely suspended moving22 supplies Home from its held executed pose`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const body=f.body(1),peer=f.body(3),count=f.w.spatial_body_count(),worker=structuredClone(f.worker),rng=f.state.rng;assert.equal(f.request(f.handle.generation),-2);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  const held=f.hold(),generation=held[3];assert.equal(held[15],0);assert.equal(f.request(generation,f.binding.assignmentSequence+1),-2);assert.equal(f.request(generation+1),-2);assert.equal(f.request(generation,f.binding.assignmentSequence,f.goal,f.handle.session+1),-1);
  assert.equal(f.request(generation),1);const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert.equal(request.bodyId,1);assert(request.requestSequence>f.binding.assignmentSequence);assert.deepEqual(request.pose,{x:held[9],z:held[10],yaw:held[13],radius:held[8],runPhase:held[18],walkPhase:held[19],carryPhase:held[20],runRemaining:held[23]});assert.equal(f.request(generation),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert.equal(f.request(generation,f.binding.assignmentSequence,{...f.goal,x:f.goal.x+1}),-3);
  assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=f.prepareHome();f.advance(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);assert.equal(f.w.spatial_body_count(),count);const renewed=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(renewed.status,'revalidated');assert(renewed.timeTranslation.sameFloat32Motion);assert.equal(f.planner.cancelNativeHomeRouteProposal(renewed.proposal.ticket),true);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert.deepEqual(f.body(1),body);
  const next=f.prepareHome();assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),next.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const home=f.planner.nativeHomeRouteBinding(f.actor);assert(home);assert.deepEqual(home.reference.sourceRequest,request);assert.equal(f.w.nav_gate_suspended_route(f.actor),0);assert.deepEqual(f.body(1),body);f.advance(home.reference.endTime-f.state.elapsed+.01);const actual=f.planner.nativeHomeRouteExecution(f.actor);assert(actual.arrived);assert.equal(f.body(1).x,Math.fround(f.goal.x));assert.equal(f.body(1).z,Math.fround(f.goal.z));assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});
test('held22 Home refuses a different actor or a retired owner',()=>{
 const f=fixture();try{
  const held=f.hold(),body=f.body(1);assert.equal(f.request(held[3],f.binding.assignmentSequence,f.goal,f.handle.session,900012),-2);
  assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.notEqual(f.request(held[3]),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('held22 Home cannot retarget across a pending resource barrier',()=>{
 const f=fixture();try{
  const held=f.hold();assert.equal(f.request(held[3]),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const request=f.planner.nativeHomeRequestReference(f.actor),body=f.body(1),p=f.prepareHome();assert.equal(f.request(held[3]),-4);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert.deepEqual(f.body(1),body);assert.equal(f.planner.cancelNativeHomeRouteProposal(p.ticket),true);assert.equal(f.request(held[3]),1);
 }finally{f.close();}
});
