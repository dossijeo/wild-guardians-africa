import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {tick} from '../src/simulation/game.js';
import {copyNativeTaskRouteStopReference} from '../src/world/native-task-route-stop.js';
import {copyNativeIdleStrollStopReference} from '../src/world/native-idle-stroll-stop.js';
import {copyNativeFarmArrivalStopReference} from '../src/world/native-farm-arrival-stop.js';
import {nativeFarmArrivalStopSourceFixture} from './helpers/native-farm-arrival-stop-source.js';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';

// Native source component only. Direct trusted ABI commits below are not GPU
// receipts, production admission or acceptance of Game's shift-end transition.
const words=n=>[n>>>0,Math.floor(n/4294967296)];
const identity=r=>[...words(r.routeHandle.session),...words(r.actorId),r.routeHandle.slot,r.routeHandle.generation,...words(r.assignmentSequence)];
function stage(f,route,kind=25){
 f.w.spatial_world_proposal_float_ptr(0);
 new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_int_ptr(8),8).set(identity(route));
 return f.w.spatial_world_proposal_stage_resources(kind,0,0,8);
}
function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function effects(f,t){const n=f.w.nav_intent_world_proposal_route_effects(t[0],t[1]);assert(n>0);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_world_proposal_route_effects_ptr(),n*26));}
async function fixture(threaded,run){let runtime,f;try{
 if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory,{wasmBinary:fs.readFileSync(new URL('../public/wild-engine/spatial-threaded.wasm',import.meta.url))});}
 f=createNativeTaskGameFixture({core:runtime?.core});const actor=f.state.workers[0].id,execution=f.planner.nativeTaskExecution(actor);assert(execution&&!execution.arrived);
 await run({...f,actor,execution,route:execution.nativeRoute});
 }finally{f?.close();await runtime?.dispose();}}

for(const threaded of [false,true]){
 const engine=threaded?'pthread':'standalone';
 test(`${engine} typed Task stop refreshes the exact issued ticket and verifies its final held pose`,async()=>fixture(threaded,f=>{
  tick(f.state,.1,f.nav);
  const p=f.planner.prepareNativeTaskRouteStopProposal(f.actor);
  assert.equal(p.status,'proposed');
  const initial=p.proposal.nativeStop,body=f.body(1),peer=f.body(3),claim=f.state.workers[0].taskId;
  assert.deepEqual(initial.sourceRoute,f.route);
  assert.equal(initial.routes[0].bodyId,f.execution.bodyId);
  assert.deepEqual(p.proposal.chunks,[]);
  assert.deepEqual(p.proposal.removed,[]);
  assert.equal(f.planner.nativeTaskRouteStopBinding(initial),null);
  const read=f.planner.captureNativeTaskRouteStopProposal(structuredClone(p.ticket));
  assert.deepEqual(read,p.proposal);
  read.routeEffects.rows[8]++;
  assert.deepEqual(f.planner.captureNativeTaskRouteStopProposal(p.ticket),p.proposal);
  tick(f.state,.2,f.nav);
  const fresh=f.planner.revalidateNativeTaskRouteStopProposal(structuredClone(p.ticket));
  assert.equal(fresh.status,'revalidated');
  assert.equal(fresh.timeTranslation.kind,'native-task-route-stop-translation');
  assert.equal(fresh.timeTranslation.preparedTicket,p.ticket.ticket);
  assert.equal(fresh.timeTranslation.actualTicket,fresh.ticket.ticket);
  assert.equal(fresh.timeTranslation.sameResourceOwners,true);
  assert.equal(f.planner.captureNativeTaskRouteStopProposal(p.ticket),null);
  assert.equal(f.planner.cancelNativeTaskRouteStopProposal(p.ticket),false);
  assert.notDeepEqual(f.body(1),body);
  assert.notDeepEqual(f.body(3),peer);
  const current=fresh.proposal.nativeStop,finalBody=f.body(1);
  const resources=f.session.core.captureNativeWorldProposalResources(current.worldBoundary);
  assert.equal(resources.kind,25);
  assert.deepEqual(resources.chunks,[]);
  assert.deepEqual(resources.removed,[]);
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...tuple(f).slice(0,5),p.ticket.ticket),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  assert.equal(f.session.core.captureNativeWorldResources(current.worldBoundary).kind,25);
  const projection={version:1,routeEffects:fresh.proposal.routeEffects,gateEffects:fresh.proposal.gateEffects};
  const h=f.route.routeHandle,b=current.worldBoundary;
  assert.equal(f.w.nav_intent_stopped_route_matches(f.route.actorId,h.session,h.slot,h.generation,f.route.assignmentSequence,f.execution.bodyId,4,b.effectiveTime),1);
  const selector=f.w.spatial_world_stop_source_ptr();
  assert(selector);
  assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,selector,6)),[1,h.session,f.route.actorId,h.slot,h.generation,f.route.assignmentSequence]);
  const held=f.planner.nativeSuspendedGateRoute(f.route.actorId);
  assert(held);
  assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_suspended_route_ptr(),27)).slice(9),Array.from(projection.routeEffects.rows).slice(8));
  const proof=f.planner.nativeTaskRouteStopBinding(current,initial,{projection});
  assert.equal(proof.kind,'native-task-route-stop-attestation');
  assert(Object.isFrozen(proof.projection.routeEffects.rows));
  assert.deepEqual(f.body(1),finalBody);
  assert.equal(f.state.workers[0].taskId,claim);
  assert.equal(f.planner.nativeTaskRouteStopBinding(initial),null);
  const bad=structuredClone(projection);bad.routeEffects.rows[8]+=.01;
  assert.equal(f.planner.nativeTaskRouteStopBinding(current,initial,{projection:bad}),null);
  const alias=v=>({...v,kind:'native-farm-arrival-stop-reference'});
  assert.equal(f.planner.nativeFarmArrivalStopBinding(alias(current),alias(initial)),null);
 }));

 test(`${engine} typed Task stop declines substituted actors and cross-family tickets before native mutation`,async()=>fixture(threaded,f=>{
  tick(f.state,.1,f.nav);
  const p=f.planner.prepareNativeTaskRouteStopProposal(f.actor);
  assert.equal(p.status,'proposed');
  const peer=f.planner.nativeTaskExecution(f.state.workers[1].id);
  assert(peer&&!peer.arrived);
  const initial=tuple(f),body=f.body(1);
  const aliases=[{...p.ticket,sourceRoute:peer.nativeRoute},{...p.ticket,kind:'native-farm-arrival-stop-proposal-ticket'}];
  assert.equal(f.planner.captureNativeTaskRouteStopProposal(aliases[0]),null);
  assert.equal(f.planner.cancelNativeTaskRouteStopProposal(aliases[0]),false);
  assert.equal(f.planner.revalidateNativeTaskRouteStopProposal(aliases[0]).status,'stale');
  assert.equal(f.planner.cancelNativeFarmArrivalStopProposal(aliases[1]),false);
  assert.equal(f.planner.revalidateNativeFarmArrivalStopProposal(aliases[1]).status,'stale');
  assert.deepEqual(tuple(f),initial);
  assert.deepEqual(f.body(1),body);
  const r=p.ticket.sourceRoute,h=r.routeHandle;
  const matches=(session=p.ticket.session,ticket=p.ticket.ticket,actor=r.actorId,slot=h.slot,generation=h.generation,assignment=r.assignmentSequence)=>
   f.w.nav_task_route_stop_proposal_source_matches(session,ticket,actor,slot,generation,assignment);
  assert.equal(matches(),1);
  assert.equal(matches(p.ticket.session+2**32),0);
  assert.equal(matches(p.ticket.session,p.ticket.ticket,r.actorId,h.slot,h.generation,r.assignmentSequence+2**32),0);
  assert.equal(f.planner.prepareNativeTaskRouteStopProposal(f.actor).status,'busy');
  assert.equal(f.planner.cancelNativeTaskRouteStopProposal(structuredClone(p.ticket)),true);
  assert.equal(matches(),0);
  assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  assert.equal(f.planner.nativeTaskRouteStopBinding(p.proposal.nativeStop),null);
  tick(f.state,.1,f.nav);
  assert.notDeepEqual(f.body(1),body);
 }));

 test(`${engine} a stopped Task hands its exact body and pose to Home and releases its claim`,async()=>fixture(threaded,f=>{
  tick(f.state,.1,f.nav);
  const goal=f.point(-8,0),actor=f.route.actorId,handle=f.route.routeHandle;
  const request=(generation=handle.generation+1,x=goal.x)=>f.w.nav_intent_stopped_task_home_request(actor,handle.session,f.route.assignmentSequence,generation,1,x,goal.z);
  assert.equal(typeof f.w.nav_intent_stopped_task_home_request,'function');
  assert.equal(request(),-2);
  assert.equal(stage(f,f.route),1);
  const t=tuple(f),body=f.body(1),peer=f.body(3),count=f.w.spatial_body_count();
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...t.slice(0,5),t[1]),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const held=f.planner.nativeSuspendedGateRoute(actor);
  assert(held);
  const heldRow=()=>f.w.nav_gate_suspended_route(actor)===1?
   Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_suspended_route_ptr(),27)):null;
  const beforeHome=heldRow();
  assert.equal(request(handle.generation),-2);
  const taskCount=f.w.nav_intent_task_count();
  assert.equal(request(),1);
  const requestSequence=f.w.nav_intent_transition_sequence();
  assert.equal(request(),1);
  assert.equal(request(handle.generation+2),-2);
  assert.equal(request(handle.generation+1,goal.x+1),-3);
  assert.equal(f.w.nav_intent_transition_sequence(),requestSequence);
  assert.equal(f.w.nav_intent_task_count(),taskCount);
  assert.equal(f.w.nav_intent_actor(actor),1);
  assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),4)),[actor,6,0,0]);
  assert.deepEqual(f.body(1),body);
  assert.deepEqual(f.body(3),peer);
  assert.equal(f.w.spatial_body_count(),count);
  const home=f.planner.nativeHomeRequestReference(actor);
  assert(home);
  assert.equal(home.bodyId,f.execution.bodyId);
  assert.deepEqual(home.home,{villageId:1,...goal});
  for(const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(home.pose[key],held.pose[key]);
  // Home owns the suspended body, so the native pose remains readable but
  // the old gate-resume path may no longer claim that route's points.
  assert.deepEqual(heldRow(),beforeHome);
  assert.equal(f.planner.nativeSuspendedGateRoute(actor),null);
  assert.equal(f.planner.nativeTaskExecution(actor),null);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  assert.equal(f.planner.nativeGameExecutionState(),1);
  f.state.elapsed+=.1;
  assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');
  assert.deepEqual(f.body(1),body);
  assert.notDeepEqual(f.body(3),peer);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const prepared=f.planner.prepareNativeHomeRouteProposal(home);
  assert.equal(prepared.status,'proposed');
  const p=tuple(f);
  assert.equal(f.w.nav_home_route_proposal_commit_bound(...p.slice(0,5),p[1]),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  assert.equal(f.planner.nativeHomeRouteExecution(actor).bodyId,f.execution.bodyId);
  assert.equal(heldRow(),null);
  f.state.elapsed+=.2;
  assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');
  assert.notDeepEqual(f.body(1),body);
  assert.notDeepEqual(f.body(3),peer);
  assert.equal(f.w.spatial_body_count(),count);
 }));
 for(const family of ['farm','stroll'])test(`${engine} a genuine ${family} route cannot be acquired by the Task stop family`,async()=>{
  let runtime,f;try{
   if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory,{wasmBinary:fs.readFileSync(new URL('../public/wild-engine/spatial-threaded.wasm',import.meta.url))});}
   if(family==='farm')f=nativeFarmArrivalStopSourceFixture({core:runtime?.core});else{f=nativeIdleStrollSourceFixture({core:runtime?.core});const p=f.stage();assert.equal(p.status,1);f.commitStroll(p);}
   const binding=family==='farm'?f.binding:f.planner.nativeIdleStrollBinding(f.actor),route={actorId:binding.reference.actorId,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence},body=f.body(1);
   assert.equal(stage(f,route),0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.body(1),body);
   assert.equal(stage(f,route,family==='farm'?24:12),1);const t=tuple(f);assert.equal(f.w.nav_intent_barrier_proposal_cancel(t[0],t[1]),1);assert.deepEqual(f.body(1),body);
  }finally{f?.close();await runtime?.dispose();}
 });

 test(`${engine} the Task stop reference uses its own immutable family and the actual native owners`,async()=>fixture(threaded,f=>{
  assert.equal(stage(f,f.route),1);const t=tuple(f),rows=effects(f,t),worldBoundary={version:1,authorityEpoch:f.route.routeHandle.authorityEpoch,nativeSession:t[0],ticket:t[1],effectiveTime:t[3]};
  const input={kind:'native-task-route-stop-reference',version:1,worldBoundary,sourceRoute:structuredClone(f.route),routes:[{nativeRoute:structuredClone(f.route),bodyId:rows[4],state:rows[5],resumeGeneration:rows[7]}],gates:[]};
  const reference=copyNativeTaskRouteStopReference(input);assert(Object.isFrozen(reference));assert(Object.isFrozen(reference.routes[0].nativeRoute.routeHandle));assert.equal(reference.routes[0].bodyId,f.execution.bodyId);
  assert.throws(()=>copyNativeIdleStrollStopReference(reference),/stop reference/);assert.throws(()=>copyNativeFarmArrivalStopReference(reference),/stop reference/);
  for(const changed of [{...input,version:2},{...input,kind:'native-idle-stroll-stop-reference'},{...input,worldBoundary:{...worldBoundary,nativeSession:t[0]+1}},{...input,routes:[...input.routes,...input.routes]},{...input,authorizedPassage:true}])assert.throws(()=>copyNativeTaskRouteStopReference(changed),/stop|authority/i);
  input.routes[0].nativeRoute.routeHandle.generation++;assert.equal(reference.routes[0].nativeRoute.routeHandle.generation,f.route.routeHandle.generation);assert.throws(()=>copyNativeTaskRouteStopReference(input),/suspension|source route/);
 }));

 test(`${engine} prepares an authentic Task stop without changing its body, claim or peer`,async()=>fixture(threaded,f=>{
  const body=f.body(1),peer=f.body(3),tasks=structuredClone(f.state.tasks),rng=f.state.rng,count=f.w.spatial_body_count();
  assert.equal(f.w.nav_task_route_stop_proposal_version(),1);assert.equal(stage(f,f.route),1);const t=tuple(f);assert.equal(t[5],25);const rows=effects(f,t);
  assert.deepEqual(rows.slice(0,6),[f.route.actorId,f.route.assignmentSequence,f.route.routeHandle.slot,f.route.routeHandle.generation,f.execution.bodyId,4]);
  assert.equal(rows[7],f.route.routeHandle.generation+1);assert.equal(rows.length,26);
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);assert.deepEqual(f.state.tasks,tasks);assert.equal(f.state.rng,rng);assert.equal(f.w.spatial_body_count(),count);assert.deepEqual(f.planner.nativeTaskExecution(f.actor),f.execution);
  assert.equal(f.w.nav_intent_barrier_proposal_cancel(t[0],t[1]),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskExecution(f.actor),f.execution);
 }));
 test(`${engine} revalidates a moving Task stop and retains its same body while the peer advances`,async()=>fixture(threaded,f=>{
  tick(f.state,.1,f.nav);const body=f.body(1);assert.equal(stage(f,f.route),1);const prepared=tuple(f);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);const atCommit=f.body(1),peer=f.body(3);
  assert.equal(f.w.spatial_world_proposal_revalidate_stop(prepared[0],prepared[1]),1);const current=tuple(f);assert(current[1]>prepared[1]);assert(current[3]>prepared[3]);
  const ptr=f.w.nav_task_route_stop_proposal_translation_ptr(current[0],current[1]);assert(ptr);const translation=Array.from(new Float64Array(f.w.memory.buffer,ptr,8));assert.deepEqual(translation.slice(0,3),[1,prepared[1],current[1]]);assert.equal(translation[5],1);
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...current.slice(0,5),prepared[1]),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const held=f.planner.nativeSuspendedGateRoute(f.route.actorId);assert(held);assert.equal(held.bodyId,f.execution.bodyId);assert.equal(held.resumeHandle.slot,f.route.routeHandle.slot);assert.equal(held.resumeHandle.generation,f.route.routeHandle.generation+1);
  assert.deepEqual(f.body(1),atCommit);f.state.elapsed+=.2;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');assert.deepEqual(f.body(1),atCommit);assert.notDeepEqual(f.body(3),peer);
 }));

 test(`${engine} initial Game reconciliation invalidates a staged snapshot without acquiring its stop`,async()=>fixture(threaded,f=>{
  assert.equal(stage(f,f.route),1);const t=tuple(f);tick(f.state,.1,f.nav);const body=f.body(1);
  assert.notEqual(f.w.spatial_world_proposal_revalidate_stop(t[0],t[1]),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.planner.nativeSuspendedGateRoute(f.route.actorId),null);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskExecution(f.actor));
 }));
 test(`${engine} rejects mismatched Task identities and cannot use a Stroll or Farm source tag`,async()=>fixture(threaded,f=>{
  const body=f.body(1),peer=f.body(3);
  for(const route of [{...f.route,assignmentSequence:f.route.assignmentSequence+1},{...f.route,actorId:f.route.actorId+1},{...f.route,routeHandle:{...f.route.routeHandle,session:f.route.routeHandle.session+1}},{...f.route,routeHandle:{...f.route.routeHandle,generation:f.route.routeHandle.generation+1}}]){assert.equal(stage(f,route),0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}
  for(const kind of [12,24])assert.equal(stage(f,f.route,kind),0);
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeTaskExecution(f.actor),f.execution);
 }));
 test(`${engine} rejects an unprepared stop receipt and cannot commit the same Task stop twice`,async()=>fixture(threaded,f=>{
  const body=f.body(1);assert.equal(stage(f,f.route),1);const t=tuple(f);
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...t.slice(0,5),t[1]+1),-9);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskExecution(f.actor));
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...t.slice(0,5),t[1]),1);assert.notEqual(f.w.spatial_world_proposal_stop_commit_bound(...t.slice(0,5),t[1]),1);assert.deepEqual(f.body(1),body);
 }));
 test(`${engine} arrival while preparation is pending invalidates the moving stop without inventing a suspension`,async()=>fixture(threaded,f=>{
  assert.equal(stage(f,f.route),1);const t=tuple(f);f.state.elapsed+=100;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert(f.planner.nativeTaskExecution(f.actor).arrived);const body=f.body(1);
  assert.notEqual(f.w.spatial_world_proposal_revalidate_stop(t[0],t[1]),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.planner.nativeSuspendedGateRoute(f.route.actorId),null);assert.deepEqual(f.body(1),body);assert.equal(stage(f,f.route),0);
 }));
}
