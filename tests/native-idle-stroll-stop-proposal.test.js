import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';

const split=n=>[Number(BigInt(n)&0xffffffffn)|0,Math.floor(n/4294967296)];
// Existing prepared world transaction, explicit stop instruction12. The native
// source preview and actual commit are real; no graphical receipt is forged.
function fixture(options={}){
 const f=nativeIdleStrollSourceFixture({rng:1,peer:true,...options});try{
  const p=f.stage();assert.equal(p.status,1);f.commitStroll(p);f.advance(.12);const binding=f.planner.nativeIdleStrollBinding(f.actor),handle=binding.reference.expectedRouteHandle;
  function stop(overrides={}){
   const v={session:handle.session,actor:f.actor,slot:handle.slot,generation:handle.generation,assignment:binding.assignmentSequence,...overrides},input=[...split(v.session),...split(v.actor),v.slot|0,v.generation|0,...split(v.assignment)];
   f.w.spatial_world_proposal_float_ptr(0);const pointer=f.w.spatial_world_proposal_int_ptr(input.length);new Int32Array(f.w.memory.buffer,pointer,input.length).set(input);const status=f.w.spatial_world_proposal_stage_resources(12,0,0,input.length);if(status!==1)return {status};
   const tuple=f.tuple(),count=f.w.nav_intent_world_proposal_route_effects(...tuple.slice(0,2)),gates=f.w.nav_intent_world_proposal_gate_effects(...tuple.slice(0,2));assert(count>=0&&gates>=0);
   return {status,tuple,rows:Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_world_proposal_route_effects_ptr(),count*26)),gates:Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_world_proposal_gate_effects_ptr(),gates*3)),header:Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_proposal_resource_header_ptr(),9))};
  }
  return {...f,binding,handle,stop,cancel:p=>f.w.nav_intent_barrier_proposal_cancel(...p.tuple.slice(0,2)),commitStop:p=>f.w.spatial_world_proposal_commit(...p.tuple.slice(0,5))};
 }catch(error){f.close();throw error;}
}
for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} prepared explicit stroll stop preserves world geometry and supplies the actual Home source`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const body=f.body(1),peer=f.body(3),count=f.w.spatial_body_count(),sequence=f.w.nav_intent_transition_sequence(),rng=f.state.rng,worker=structuredClone(f.worker),p=f.stop();assert.equal(p.status,1);assert.equal(p.header[4],12);assert.equal(p.header[5],0);assert.equal(p.rows.length,26);assert.equal(p.gates.length,0);assert.deepEqual(p.rows.slice(0,4),[f.actor,f.binding.assignmentSequence,f.handle.slot,f.handle.generation]);assert.equal(p.rows[4],1);assert.equal(p.rows[5],4);assert.equal(p.rows[6],f.state.elapsed);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),f.binding);assert.equal(f.cancel(p),1);assert.deepEqual(f.body(1),body);
  const next=f.stop();assert.equal(next.status,1);assert.equal(f.commitStop(next),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.w.spatial_world_resource_snapshot(),1);const publication=Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_resource_header_ptr(),9));assert.equal(publication[4],12);assert.equal(publication[5],0);assert.deepEqual(publication.slice(6),next.header.slice(6));assert.equal(f.w.spatial_world_proposal_result_count(),0);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_gate_suspended_route(f.actor),1);const held=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_suspended_route_ptr(),27));assert.equal(held[3],next.rows[7]);assert.deepEqual(held.slice(9),next.rows.slice(8));assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);
  f.advance(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.deepEqual(f.worker,worker);
  const goal=f.point(6,-4),village=Number(f.worker.villageId.split('-').at(-1));assert.equal(f.w.nav_intent_idle_stroll_home_request(f.actor,f.handle.session,f.binding.assignmentSequence,held[3],village,goal.x,goal.z),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const request=f.planner.nativeHomeRequestReference(f.actor);assert.equal(request.pose.x,body.x);assert.equal(request.pose.z,body.z);const home=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(home.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),home.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert(f.planner.nativeHomeRouteBinding(f.actor));assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});
test('a changed native boundary rejects the old stop instead of applying its old physical pose',()=>{
 const f=fixture();try{const p=f.stop();assert.equal(p.status,1);f.advance(.1);const body=f.body(1);assert.equal(f.commitStop(p),-2);assert.deepEqual(f.body(1),body);assert(f.planner.nativeIdleStrollBinding(f.actor));const next=f.stop();assert.equal(next.status,1);assert.equal(f.commitStop(next),1);assert.deepEqual(f.body(1),body);}finally{f.close();}
});
test('explicit stop rejects another session, assignment, slot, generation or task-route owner',()=>{
 const f=fixture();try{const body=f.body(1),binding=f.binding;for(const change of [{session:f.handle.session+1},{assignment:binding.assignmentSequence+1},{slot:f.handle.slot+1},{generation:f.handle.generation+1},{actor:900012},{session:f.handle.session+4294967296},{actor:f.actor+4294967296},{assignment:binding.assignmentSequence+4294967296},{slot:f.handle.slot+0x80000000},{generation:f.handle.generation+0x80000000}]){assert.notEqual(f.stop(change).status,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),binding);}}finally{f.close();}
});
