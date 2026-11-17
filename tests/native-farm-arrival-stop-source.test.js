import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalStopSourceFixture as fixture} from './helpers/native-farm-arrival-stop-source.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id}: Farm24 prepares and stops the same moving body/slot while the genuine Task peer continues`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const {w}=f,body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),rng=f.state.rng,count=w.spatial_body_count(),sequence=w.nav_intent_transition_sequence();assert.equal(w.nav_farm_arrival_stop_proposal_version(),1);
  const p=f.stop();assert.equal(p.status,1);assert.equal(p.header[4],24);assert.equal(p.header[5],0);assert.equal(p.rows.length,26);assert.equal(p.gates.length,0);assert.deepEqual(p.rows.slice(0,4),[f.actor,f.binding.assignmentSequence,f.handle.slot,f.handle.generation]);assert.equal(p.rows[4],1);assert.equal(p.rows[5],4);assert.equal(p.rows[6],f.state.elapsed);assert.equal(w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeFarmArrivalRouteBinding(f.actor),f.binding);assert.equal(w.nav_idle_stroll_stop_proposal_translation_ptr(...p.tuple.slice(0,2)),0);assert.equal(f.cancel(p),1);assert.deepEqual(f.body(1),body);
  const next=f.stop();assert.equal(next.status,1);assert.equal(f.commitStop(next),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(w.spatial_world_resource_snapshot(),1);assert.deepEqual(Array.from(new Float64Array(w.memory.buffer,w.spatial_world_resource_header_ptr(),9)),next.header);assert.equal(w.spatial_world_proposal_result_count(),0);assert.deepEqual(f.body(1),body);assert.equal(w.nav_gate_suspended_route(f.actor),1);const held=Array.from(new Float64Array(w.memory.buffer,w.nav_gate_suspended_route_ptr(),27));assert.equal(held[3],next.rows[7]);assert.equal(held[1],f.handle.session);assert.equal(held[2],f.handle.slot);assert.deepEqual(held.slice(9),next.rows.slice(8));assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(Array.from(new Float64Array(w.memory.buffer,w.spatial_world_stop_binding_ptr(),5)),[1,next.tuple[1],next.tuple[3],next.tuple[1],next.tuple[3]]);
  f.move(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.deepEqual(f.worker,worker);assert.equal(f.planner.nativeGameExecutionState(),-1);
 }finally{f?.close();await runtime?.dispose();}
});

test('Farm24 revalidation recomputes the final physical pose while retaining exact original resource owners and prepared ticket',()=>{
 const f=fixture();try{const initial=f.stop();assert.equal(initial.status,1);const oldBody=f.body(1);f.move(.2);const finalBody=f.body(1);assert.notDeepEqual(finalBody,oldBody);assert.equal(f.refresh(initial),1);const next=f.capture(),translation=f.translation();assert.deepEqual(translation,[1,initial.tuple[1],next.tuple[1],initial.tuple[3],next.tuple[3],1,1,0]);assert(next.tuple[1]>initial.tuple[1]);assert.equal(next.rows[8],finalBody.x);assert.equal(next.rows[9],finalBody.z);assert.equal(f.w.nav_idle_stroll_stop_proposal_translation_ptr(...next.tuple.slice(0,2)),0);assert.equal(f.w.spatial_world_proposal_resource_snapshot(...initial.tuple.slice(0,2)),-1);assert.equal(f.commitStop(next,initial.tuple[1]),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.deepEqual(f.body(1),finalBody);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_stop_binding_ptr(),5)),[1,initial.tuple[1],initial.tuple[3],next.tuple[1],next.tuple[3]]);const peer=f.body(3);f.move(.2);assert.deepEqual(f.body(1),finalBody);assert.notDeepEqual(f.body(3),peer);}finally{f.close();}
});

test('a stale Farm24 frontier cannot freeze an old pose or issue a stop receipt',()=>{
 const f=fixture();try{const p=f.stop();f.move(.1);const body=f.body(1);assert.equal(f.commitStop(p),-2);assert.deepEqual(f.body(1),body);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.w.spatial_world_stop_binding_ptr(),0);const next=f.stop();assert.equal(next.status,1);assert.equal(f.commitStop(next),1);}finally{f.close();}
});

test('Farm24 rejects foreign route/session/assignment identities and cannot masquerade as stroll12 or stop Task14',()=>{
 const f=fixture();try{const body=f.body(1);for(const change of [{kind:12},{actor:900012},{session:f.handle.session+1},{assignment:f.binding.assignmentSequence+1},{slot:f.handle.slot+1},{generation:f.handle.generation+1},{session:f.handle.session+4294967296},{actor:f.actor+4294967296},{assignment:f.binding.assignmentSequence+4294967296},{slot:f.handle.slot+0x80000000},{generation:f.handle.generation+0x80000000},{mode:1}]){assert.notEqual(f.stop(change).status,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeFarmArrivalRouteBinding(f.actor),f.binding);}for(let kind=13;kind<=23;kind++)assert.notEqual(f.stop({kind}).status,1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}finally{f.close();}
});

test('an unrelated prepared ticket cannot authorize Farm24 and leaves the honest candidate available',()=>{
 const f=fixture();try{const p=f.stop(),body=f.body(1);assert.equal(f.commitStop(p,p.tuple[1]+100),-9);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_world_stop_binding_ptr(),0);assert.deepEqual(f.tuple(),p.tuple);assert.equal(f.commitStop(p),1);}finally{f.close();}
});

test('Farm24 cancellation preserves moving native authority and does not consume the Game source or RNG',()=>{
 const f=fixture();try{const p=f.stop(),body=f.body(1),worker=structuredClone(f.worker),rng=f.state.rng;assert.equal(f.cancel(p),1);assert.deepEqual(f.planner.nativeFarmArrivalRouteBinding(f.actor),f.binding);f.move(.2);assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);assert.equal(f.w.spatial_world_stop_binding_ptr(),0);}finally{f.close();}
});

test('arrival during Farm24 preparation invalidates the moving stop without reviving the completed source',()=>{
 const f=fixture();try{const p=f.stop();assert.equal(p.status,1);f.move(f.arrival.header[11]-f.state.elapsed+.01);const body=f.body(1);assert.notEqual(f.refresh(p),1);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.w.nav_gate_suspended_route(f.actor),0);assert.notEqual(f.stop().status,1);}finally{f.close();}
});

test('zero Farm23 arrival is already complete and cannot acquire a moving stop24',()=>{
 const f=fixture({inside:true});try{const body=f.body(1);assert.equal(f.arrival.header[12],0);assert.notEqual(f.stop().status,1);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_gate_suspended_route(f.actor),0);}finally{f.close();}
});

test('an intent change during Farm24 preparation rejects the old owner set without moving the Farm body',()=>{
 const f=fixture();try{const p=f.stop(),body=f.body(1);assert.equal(f.w.nav_intent_retire_actor(900012),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.refresh(p),-2);assert.deepEqual(f.body(1),body);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}finally{f.close();}
});

test('Farm stop translation cannot reinterpret another prepared world family',()=>{
 const f=fixture();try{const p=f.stop();assert.equal(f.cancel(p),1);assert.equal(f.w.spatial_world_proposal_resource_release(...p.tuple.slice(0,2)),1);f.w.spatial_world_proposal_float_ptr(0);f.w.spatial_world_proposal_int_ptr(0);assert.equal(f.w.spatial_world_proposal_stage_resources(9,0,0,0),1);const tuple=f.tuple(),body=f.body(1);assert.equal(f.w.nav_farm_arrival_stop_proposal_translation_ptr(...tuple.slice(0,2)),0);assert.equal(f.refresh({tuple}),-1);assert.deepEqual(f.tuple(),tuple);assert.deepEqual(f.body(1),body);}finally{f.close();}
});
