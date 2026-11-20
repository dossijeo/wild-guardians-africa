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
