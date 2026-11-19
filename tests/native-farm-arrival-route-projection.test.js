import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {nativeFarmArrivalGameFixture} from './helpers/native-farm-arrival-game.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {projectNativeFarmArrivalRouteExecution,tick} from '../src/simulation/game.js';
import {nativeFarmArrivalState,nativeFarmArrivalExecutionState} from '../src/world/native-farm-arrival-state.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {notifyWorkerPlanningChange,enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {readFileSync} from 'node:fs';

// Raw trusted native source setup. This is not an ordinary Game cohort or a
// graphical receipt: tick remains closed until the prepared lifecycle exists.
function admit(f,{urgent=false}={}){const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource,{urgent});assert.equal(p.status,'proposed');assert.equal(f.commit({ticket:p.proposal.ticket.ticket}),1);return p.proposal;}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'running':'walking'} projection mirrors the actual native cache and keeps arriving semantics`,()=>{
 const f=fixture({profile:profile.id,peer:true});try{
  const stateBefore={rng:f.state.rng,ledger:structuredClone(f.state.ledger),tasks:structuredClone(f.state.tasks)},body=f.body(1),p=admit(f,{urgent});f.move(.2);const physical=f.body(1),peer=f.body(3),time=f.state.elapsed,e=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(e);assert.equal(e.executedThrough,time);assert.notDeepEqual(physical,body);assert.equal(f.worker.x,physical.x);assert.equal(f.worker.z,physical.z);assert.equal(f.worker.heading,e.yaw);for(const k of ['runPhase','walkPhase','carryPhase','runRemaining','running'])assert.equal(f.worker[k],e[k]);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.equal(f.worker.path,null);assert.equal(f.worker.destinationId,null);assert.equal(f.worker.idleState,null);assert.equal(f.worker.taskId,null);assert.equal(f.worker.crateId,null);assert.equal(f.state.rng,stateBefore.rng);assert.deepEqual(f.state.ledger,stateBefore.ledger);assert.deepEqual(f.state.tasks,stateBefore.tasks);assert.deepEqual(f.body(1),physical);assert.deepEqual(f.body(3),peer);assert.equal(f.state.elapsed,time);assert.equal(confirmedStateSaveAvailable(f.state),false);assert.throws(()=>nativeFarmArrivalState(f.state,f.worker),/declaration/);assert(nativeFarmArrivalExecutionState(f.state,f.worker));
  const again=structuredClone(f.worker);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));assert.deepEqual(f.worker,again);notifyWorkerPlanningChange(f.state,f.worker);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');f.move(p.endTime+.1-f.state.elapsed);const atEnd=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(atEnd.arrived);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.equal(f.worker.idleState,null);assert.equal(f.worker.x,p.nativeFarmArrival.destination.x);assert.equal(f.worker.z,p.nativeFarmArrival.destination.z);assert.deepEqual(f.state.ledger,stateBefore.ledger);
 }finally{f.close();}
});

test('bound and unbound pending projections return actual metadata without changing the worker or world',()=>{
 for(const bound of [false,true]){const f=nativeFarmArrivalGameFixture({bound});try{const worker=structuredClone(f.worker),count=f.w.spatial_body_count(),e=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert.equal(e.kind,'native-farm-arrival-awaiting-resources');assert.equal(e.authorizedAutonomy,false);assert.equal(!!e.sourceRequest,bound);assert.equal(!!e.declaration,!bound);assert.deepEqual(f.worker,worker);assert.equal(f.w.spatial_body_count(),count);}finally{f.close();}}
});

test('zero-length projection holds the exact double pose/yaw and never fabricates an Idle arrival',()=>{
 const f=fixture({inside:true});try{const worker=structuredClone(f.worker),p=admit(f,{urgent:true}),e=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(e.arrived);assert.equal(p.distance,0);assert.equal(f.worker.x,worker.x);assert.equal(f.worker.z,worker.z);for(const k of ['heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],worker[k]);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.running,false);assert.equal(f.worker.gateWaiting,false);assert.equal(f.worker.idleState,null);}finally{f.close();}
});

test('wrong Game identity, semantics, source pose or executed time reject before adopting any values',()=>{
 const f=fixture();try{
  admit(f,{urgent:true});assert.throws(()=>f.planner.projectNativeFarmArrivalExecution({...f.state},f.worker),/another game/);const original=structuredClone(f.worker),center=f.state.structures.find(c=>c.id===f.worker.centerId);
  for(const mutate of [w=>w.status='idle',w=>w.profile='youngFemale',w=>w.centerId='structure-999999',w=>w.taskId='task-999999',w=>w.crateId='crate-999999',w=>w.x+=.1,w=>w.heading+=.1,w=>w.walkPhase+=.1,w=>w.radius+=.01,w=>w.path=[],w=>w.destinationId='arrival-x',w=>w.idleState={},w=>w.raidReturn=true,w=>w.incapacitated=true,w=>w.recovery={},w=>w.fallRemaining=1,w=>w.contractDay--]){Object.assign(f.worker,structuredClone(original));mutate(f.worker);const bad=structuredClone(f.worker),body=f.body(1);assert.throws(()=>f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));assert.deepEqual(f.worker,bad);assert.deepEqual(f.body(1),body);}Object.assign(f.worker,original);
  const x=center.x;center.x+=.1;const before=structuredClone(f.worker);assert.throws(()=>f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));assert.deepEqual(f.worker,before);center.x=x;
  const time=f.state.elapsed;f.state.elapsed+=.1;assert.throws(()=>f.planner.projectNativeFarmArrivalExecution(f.state,f.worker),/executed game boundary/);assert.deepEqual(f.worker,before);f.state.elapsed=time;assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));
 }finally{f.close();}
});

test('projection rejects malformed execution/header data instead of overwriting the Game worker',()=>{
 const f=fixture();try{
  admit(f);const e=f.planner.nativeFarmArrivalRouteExecution(f.actor),original=structuredClone(f.worker);
  for(const mutate of [e=>e.actorId++,e=>{e.nativeRoute.actorId++;for(const r of [e.binding.reference,e.binding.preparedReference]){r.actorId++;r.sourceRequest.actorId++;}},e=>e.bodyId++,e=>e.centerId++,e=>e.executedThrough+=.1,e=>e.nativeRoute.assignmentSequence++,e=>e.nativeRoute.routeHandle.generation++,e=>e.destination.x+=.01,e=>e.goal.x+=.01,e=>e.yaw=NaN,e=>e.runPhase=-1,e=>e.running=1,e=>e.arrived=1]){const bad=structuredClone(e);mutate(bad);assert.throws(()=>projectNativeFarmArrivalRouteExecution(f.state,f.worker,{nativeFarmArrivalRouteExecution:()=>bad}));assert.deepEqual(f.worker,original);}
 }finally{f.close();}
});

test('active route projection advances Game while queued work waits for the actual prepared stop',()=>{
 const f=fixture({peer:true});try{admit(f);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);const p=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);const bodies=[f.body(1),f.body(3)],at=f.state.elapsed;assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.1,f.nav);assert.equal(f.state.elapsed,at+.1);assert.notDeepEqual(f.body(1),bodies[0]);assert.notDeepEqual(f.body(3),bodies[1]);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.equal(f.worker.status,'arriving');assert.equal(f.worker.taskId,null);assert.equal(f.worker.idleState,null);assert.equal(f.state.tasks.find(t=>t.targetId===plant.id).workerId,null);assert.equal(f.planner.nativeFarmArrivalStopRequest(f.actor).reason,'task');assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.throws(()=>f.planner.nativeIntentControlBaseline(),/farm arrival routes require prepared graphical admission/);}finally{f.close();}
});

for(const arrived of [false,true])test(`semantic save and fresh restoration retain ${arrived?'arrived':'moving'} pose/phases without the old native route permission`,()=>{
 const f=fixture();let restored;try{
  const p=admit(f,{urgent:true});f.move(arrived?p.endTime+.1-f.state.elapsed:.2);const execution=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker),saved=deserialize(serialize(f.state)),worker=structuredClone(f.worker),json=serialize(f.state);assert.equal(saved.workers[0].nativeRouteAdmission,'native-farm-arrival');assert.equal(json.includes('native-farm-arrival-route-reference'),false);assert.equal(json.includes('native-farm-arrival-route-attestation'),false);assert.equal(json.includes('expectedRouteHandle'),false);
  restored=restoreNativeActionGame(saved,{bindBodies:false,admitPeer:false});assert.equal(restored.worker.nativeRouteAdmission,'pending-farm-arrival-resources');assert.equal(restored.worker.running,false);assert.equal(restored.worker.gateWaiting,false);for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(restored.worker[k],worker[k]);const q=restored.planner.nativeFarmArrivalDeclarationReference(f.actor);assert.notEqual(q.authorityEpoch,execution.binding.reference.worldBoundary.authorityEpoch);assert.deepEqual(q.goal,execution.goal);assert.equal(q.bodyId,undefined);assert.equal(restored.planner.nativeFarmArrivalRouteBinding(f.actor),null);restored.bind();const bound=restored.planner.nativeFarmArrivalRequestReference(f.actor);assert.equal(bound.pose.x,worker.x);assert.equal(bound.pose.z,worker.z);assert.equal(bound.pose.runRemaining,worker.runRemaining);assert.equal(restored.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(confirmedStateSaveAvailable(restored.state),false);
 }finally{restored?.close();f.close();}
});

test('a saved route cannot reset the live physical world and a new authority waits for prepared admission',()=>{
 const f=fixture();let authority;try{
  admit(f);f.move(.2);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);const saved=deserialize(serialize(f.state)),input=structuredClone(saved),session=f.w.nav_intent_session(),body=f.body(1),binding=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert.throws(()=>f.planner.resetFromState(saved),/fresh supported world/);assert.deepEqual(saved,input);assert.equal(f.w.nav_intent_session(),session);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeFarmArrivalRouteBinding(f.actor),binding);
  authority=createSimulationAuthority(new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),serialize(input),['-1,-1','0,-1','1,-1','-1,0','0,0','1,0','-1,1','0,1','1,1']);assert.equal(authority.nativeIntentProductionStatus().phase,'idle');assert.equal(authority.nativeIntentProductionStatus().last,null);const restored=JSON.parse(authority.execute({kind:'snapshot',sequence:1}).snapshot);assert.equal(restored.workers[0].nativeRouteAdmission,'pending-farm-arrival-resources');assert.equal(restored.workers[0].x,f.worker.x);assert.equal(restored.workers[0].z,f.worker.z);assert.equal(confirmedStateSaveAvailable(restored),false);
 }finally{authority?.dispose();f.close();}
});

test('lost physical owner is rejected and an expired contract retains only its bound Farm pose until stop24',()=>{
 for(const cause of ['body','contract']){const f=fixture();try{admit(f);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);const before=structuredClone(f.worker);if(cause==='body'){assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker),null);}else{f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end;const e=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert.equal(e.arrived,false);assert.equal(f.planner.nativeFarmArrivalStopRequest(f.actor).reason,'home');assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);}assert.deepEqual(f.worker,before);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);assert.equal(f.worker.taskId,null);}finally{f.close();}}
});

test('pthread projects the actual source cache and recreates its semantic request in a fresh standalone world',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,restored;try{f=fixture({core:runtime.core,peer:true});admit(f,{urgent:true});f.move(.2);const body=f.body(1),peer=f.body(3),e=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert.equal(f.worker.x,body.x);assert.equal(f.worker.z,body.z);assert.deepEqual(f.body(3),peer);assert.equal(e.running,true);const saved=deserialize(serialize(f.state));saved.workers=saved.workers.slice(0,1);saved.tasks=[];restored=restoreNativeActionGame(saved,{bindBodies:false,admitPeer:false});assert.equal(restored.worker.nativeRouteAdmission,'pending-farm-arrival-resources');assert.equal(restored.worker.x,body.x);assert.equal(restored.worker.runPhase,e.runPhase);assert.equal(restored.worker.runRemaining,e.runRemaining);}finally{restored?.close();f?.close();await runtime.dispose();}
});
