import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';

// Trusted native ABI. Final-pose resource refresh and graphical receipts are
// separate: matching resource owners alone does not certify a ready GPU frame.
function fixture(options={}){
 const f=nativeIdleStrollSourceFixture({rng:1,peer:true,...options});try{
  const stroll=f.stage();assert.equal(stroll.status,1);f.commitStroll(stroll);f.advance(.12);options.beforeStop?.(f);const binding=f.planner.nativeIdleStrollBinding(f.actor),h=binding.reference.expectedRouteHandle,split=n=>[Number(BigInt(n)&0xffffffffn)|0,Math.floor(n/4294967296)];
  const input=[...split(h.session),...split(f.actor),h.slot|0,h.generation|0,...split(binding.assignmentSequence)];new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_int_ptr(input.length),input.length).set(input);assert.equal(f.w.spatial_world_proposal_stage_resources(12,0,0,input.length),1);
  const capture=()=>{const tuple=f.tuple(),resources=f.session.core.captureNativeWorldProposalResources({nativeSession:tuple[0],ticket:tuple[1],effectiveTime:tuple[3]});return {tuple,resources,rows:Array.from(resources.routeEffects.rows),header:Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_proposal_resource_header_ptr(),9))};},initial=capture();
  return {...f,binding,h,initial,capture,refresh:(tuple=f.tuple())=>f.w.spatial_world_proposal_revalidate_stop(...tuple.slice(0,2)),translation(){const t=f.tuple(),pointer=f.w.nav_idle_stroll_stop_proposal_translation_ptr(...t.slice(0,2));assert(pointer);return Array.from(new Float64Array(f.w.memory.buffer,pointer,8));},commit:(p,preparedTicket=initial.tuple[1])=>f.w.spatial_world_proposal_stop_commit_bound(...p.tuple.slice(0,5),preparedTicket)};
 }catch(error){f.close();throw error;}
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} stop refresh retains one original source while both actors move to the final frontier`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const original=f.initial,worker=structuredClone(f.worker),rng=f.state.rng,before=f.body(1),peer=f.body(3),count=f.w.spatial_body_count(),sequence=f.w.nav_intent_transition_sequence();
  f.advance(.12);const firstBody=f.body(1);assert.notDeepEqual(firstBody,before);assert.notDeepEqual(f.body(3),peer);assert.equal(f.refresh(original.tuple),1);const first=f.capture(),translation=f.translation();assert.deepEqual(translation,[1,original.tuple[1],first.tuple[1],original.tuple[3],first.tuple[3],1,1,0]);assert(first.tuple[1]>original.tuple[1]);assert(first.tuple[3]>original.tuple[3]);assert.notDeepEqual(first.rows.slice(8),original.rows.slice(8));assert.deepEqual(f.body(1),firstBody);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),f.binding);
  assert.equal(f.w.spatial_world_proposal_revalidate_stop(...original.tuple.slice(0,2)),-1);assert.deepEqual(f.capture(),first);assert.equal(f.commit(first,original.tuple[1]+100000),-9);assert.deepEqual(f.body(1),firstBody);
  f.advance(.12);const finalBody=f.body(1);assert.equal(f.w.spatial_world_stop_binding_ptr(),0);assert.equal(f.refresh(first.tuple),1);const final=f.capture(),last=f.translation();assert.equal(last[1],original.tuple[1]);assert.equal(last[3],original.tuple[3]);assert.equal(last[2],final.tuple[1]);assert.equal(last[4],f.state.elapsed);assert.equal(last[5],1);assert.deepEqual(final.header.slice(4),original.header.slice(4));assert.deepEqual(final.resources.chunks,[]);assert.deepEqual(final.resources.removed,[]);assert.equal(final.rows[6],f.state.elapsed);assert.equal(final.rows[8],finalBody.x);assert.equal(final.rows[9],finalBody.z);assert.equal(f.w.spatial_world_proposal_resource_snapshot(...original.tuple.slice(0,2)),-1);
  assert.equal(f.commit(final),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.deepEqual(f.body(1),finalBody);const held=f.planner.nativeSuspendedGateRoute(f.actor);assert(held);assert.equal(held.suspendedAt,final.tuple[3]);assert.equal(held.pose.x,final.rows[8]);assert.equal(held.pose.z,final.rows[9]);assert.equal(held.resumeHandle.slot,f.h.slot);assert.equal(held.resumeHandle.generation,final.rows[7]);assert.equal(f.w.spatial_world_resource_snapshot(),1);const published=Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_resource_header_ptr(),9));assert.deepEqual(published,final.header);assert.equal(f.w.spatial_world_proposal_result_count(),0);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_stop_binding_ptr(),5)),[1,original.tuple[1],original.tuple[3],final.tuple[1],final.tuple[3]]);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  const peerAfter=f.body(3);f.advance(.1);assert.deepEqual(f.body(1),finalBody);assert.notDeepEqual(f.body(3),peerAfter);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.deepEqual(f.worker,worker);
 }finally{f?.close();await runtime?.dispose();}
});

test('stop refresh cannot borrow another session, stale token or a new physical frontier after its refresh',()=>{
 const f=fixture();try{const original=f.initial;f.advance(.1);assert.equal(f.w.spatial_world_proposal_revalidate_stop(original.tuple[0]+1,original.tuple[1]),-1);assert.equal(f.refresh(original.tuple),1);const fresh=f.capture();f.advance(.01);const body=f.body(1);assert.equal(f.commit(fresh),-2);assert.deepEqual(f.body(1),body);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}finally{f.close();}
});

test('arrival while preparing a stop invalidates it instead of reviving the completed moving source',()=>{
 const f=fixture();try{const timing=f.planner.nativeRouteTiming(f.h);f.advance(timing.startTime+timing.duration-f.state.elapsed+.01);const body=f.body(1);assert.notEqual(f.refresh(f.initial.tuple),1);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);}finally{f.close();}
});


test('a changed intent during preparation cannot borrow the original body/motor owners',()=>{
 const f=fixture();try{const body=f.body(1);assert.equal(f.w.nav_intent_retire_actor(900012),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.refresh(f.initial.tuple),-2);assert.deepEqual(f.body(1),body);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}finally{f.close();}
});

test('stop refresh cannot reinterpret another prepared world family',()=>{
 const f=fixture();try{const t=f.initial.tuple;assert.equal(f.w.nav_intent_barrier_proposal_cancel(...t.slice(0,2)),1);assert.equal(f.w.spatial_world_proposal_resource_release(...t.slice(0,2)),1);f.w.spatial_world_proposal_float_ptr(0);f.w.spatial_world_proposal_int_ptr(0);assert.equal(f.w.spatial_world_proposal_stage_resources(9,0,0,0),1);const next=f.tuple(),body=f.body(1);assert.equal(f.refresh(next),-1);assert.deepEqual(f.tuple(),next);assert.equal(f.w.spatial_world_proposal_resource_snapshot(...next.slice(0,2)),1);assert.deepEqual(f.body(1),body);}finally{f.close();}
});


test('a moving stop whose held-disc closure gains another route cannot consume the old resource template',()=>{
 const f=fixture({peer:false,configureState(state,{point}){const b=structuredClone(state.workers[0]);Object.assign(b,point(-2,2),{id:'worker-900012',idleState:{anchorId:`farm-${b.centerId}`,mode:'rest',elapsed:0,remaining:3,rng:1,approachRetry:0}});state.workers.push(b);},beforeStop(f){
  const b=f.state.workers[1];assert.equal(f.w.spatial_body_upsert(3,b.x,b.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(900012,3),1);f.planner.requestNativeInitialIdleResources(f.state,b);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const initial=f.planner.nativeInitialIdleRequestReference(900012),goal=f.point(-10,2);assert(initial);assert.equal(f.w.nav_intent_initial_idle_home_request(900012,initial.nativeSession,initial.requestSequence,Number(b.villageId.split('-').at(-1)),goal.x,goal.z),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const home=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(900012));assert.equal(home.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),home.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');
 }});try{
  const original=f.initial;assert.equal(original.rows.length,26);f.advance(1.5);const bodies=[f.body(1),f.body(3)];assert.equal(f.refresh(original.tuple),1);const fresh=f.capture(),translation=f.translation();assert.equal(fresh.rows.length,52);assert.equal(translation[5],0);assert.equal(translation[6],2);assert.equal(f.commit(fresh),-9);assert.equal(f.w.spatial_world_stop_binding_ptr(),0);assert.deepEqual([f.body(1),f.body(3)],bodies);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.commit(fresh,fresh.tuple[1]),1);assert.deepEqual([f.body(1),f.body(3)],bodies);assert(f.planner.nativeSuspendedGateRoute(f.actor));assert(f.planner.nativeSuspendedGateRoute(900012));assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_stop_binding_ptr(),5)),[1,fresh.tuple[1],fresh.tuple[3],fresh.tuple[1],fresh.tuple[3]]);
 }finally{f.close();}
});
