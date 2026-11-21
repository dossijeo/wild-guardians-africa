import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './helpers/native-initial-idle-game.js';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {tick,emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {copyNativeInitialIdleDeclarationReference,copyNativeInitialIdleRequestReference} from '../src/world/native-initial-idle-request-reference.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';

function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function homeArgs(f,source){const village=f.state.villages.find(v=>v.id===f.worker.villageId),home=village.entry??village;return [f.actor,source.nativeSession,source.requestSequence,Number(village.id.split('-').at(-1)),home.x,home.z];}

for(const mode of [null,'rest','watch'])test(`Game advances its genuine TaskStart peer while initial ${mode??'uninitialized'} Idle stays retained`,()=>{
 const f=nativeInitialIdleGameFixture({mode,peer:true});try{
  const before=structuredClone(f.worker),body=f.body(1),peer=f.body(3),rng=f.state.rng,request=f.planner.nativeInitialIdleRequestReference(f.actor),ledger=structuredClone(f.state.ledger),elapsed=f.state.elapsed;
  tick(f.state,.2,f.nav);assert.deepEqual(f.worker,before);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeInitialIdleRequestReference(f.actor),request);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);assert(Math.abs(f.state.elapsed-elapsed-.2)<1e-8);assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(f.planner.nativeGameExecutionState(),1);
  assert.deepEqual(deserialize(serialize(f.state)).workers[0],f.worker);
 }finally{f.close();}
});

for(const bound of [false,true])test(`semantic initial Idle references never claim physical binding (${bound?'bound':'unbound'})`,()=>{
 const f=nativeInitialIdleGameFixture({bound});try{
  const source=f.planner.nativeInitialIdleDeclarationReference(f.actor);assert(source);assert.equal(source.bodyId,undefined);assert.equal(source.bodyFlags,undefined);assert.equal(source.pose.radius,undefined);assert.deepEqual(copyNativeInitialIdleDeclarationReference(source),source);assert.throws(()=>copyNativeInitialIdleRequestReference(source),/Idle request/);assert.throws(()=>copyNativeInitialIdleDeclarationReference({...source,bodyId:1}),/Idle request/);
  assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor)===null,!bound);const body=bound?f.body(1):null,elapsed=f.state.elapsed;tick(f.state,.2,f.nav);assert(Math.abs(f.state.elapsed-elapsed-.2)<1e-8);assert.deepEqual(f.planner.nativeInitialIdleDeclarationReference(f.actor),source);if(bound)assert.deepEqual(f.body(1),body);else assert.equal(f.w.spatial_body_count(),0);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`pending initial ${profile.id} crosses its exact contract boundary into a fresh Home request`,()=>{
 const f=nativeInitialIdleGameFixture({profile:profile.id});try{
  f.state.time=profile.end-.05;const request=f.planner.nativeInitialIdleRequestReference(f.actor),body=f.body(1),rng=f.state.rng;tick(f.state,.15,f.nav);
  const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert(home.requestSequence>request.requestSequence);assert.deepEqual(home.pose,request.pose);assert.equal(home.bodyId,request.bodyId);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleDeclarationReference(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert(Math.abs(f.state.time-profile.end-.1)<1e-8);assert(Math.abs(home.requestedAt-(f.state.elapsed-.1))<1e-8);assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(deserialize(serialize(f.state)).workers[0].status,'returning');
 }finally{f.close();}
});

for(const threaded of [false,true])test(`day expiry retargets the actual initial source without stalling its admitted peer (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeInitialIdleGameFixture({peer:true,...(runtime?{core:runtime.core}:{})});const request=f.planner.nativeInitialIdleRequestReference(f.actor),body=f.body(1),peer=f.body(3),ledger=structuredClone(f.state.ledger);assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker),/finished idle contract/);f.worker.contractDay=f.state.day-1;tick(f.state,.2,f.nav);
  const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.deepEqual(home.pose,request.pose);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);assert.equal(f.planner.nativeGameExecutionState(),1);
 }finally{f?.close();await runtime?.dispose();}
});

for(const daily of [false,true])test(`an unbound initial source can expire before the first clock (${daily?'day expiry':'profile boundary'})`,()=>{
 const f=nativeInitialIdleGameFixture({bound:false});try{
  const source=f.planner.nativeInitialIdleDeclarationReference(f.actor),before=structuredClone(f.worker),args=homeArgs(f,source);assert.equal(f.planner.nativeCausalClock(),null);
  if(daily)f.worker.contractDay=f.state.day-1;else f.state.time=249.95;tick(f.state,.15,f.nav);
  assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],before[k]);assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleDeclarationReference(f.actor),null);assert.equal(f.w.nav_intent_initial_idle_home_request(...args),1);assert.equal(f.w.nav_intent_initial_idle_home_request(...args.slice(0,4),args[4]+1,args[5]),-3);
  f.bind();const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.equal(home.bodyId,1);assert.equal(home.requestedAt,f.state.elapsed);assert(home.requestSequence>source.requestSequence);assert.equal(f.planner.commitNativeCausalClock().status,'committed');tick(f.state,.1,f.nav);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));
 }finally{f.close();}
});

test('the initial Home retarget rejects foreign identities and is idempotent only on its genuine source',()=>{
 const f=nativeInitialIdleGameFixture();try{
  const source=f.planner.nativeInitialIdleDeclarationReference(f.actor),args=homeArgs(f,source),body=f.body(1);assert.equal(f.w.nav_intent_initial_idle_home_request(args[0],args[1]+1,...args.slice(2)),-1);assert.equal(f.w.nav_intent_initial_idle_home_request(args[0],args[1],args[2]+1,...args.slice(3)),-2);assert(f.planner.nativeInitialIdleRequestReference(f.actor));f.worker.contractDay=f.state.day-1;f.planner.requestNativeIdleHome(f.state,f.worker);const home=f.planner.nativeHomeRequestReference(f.actor);assert.equal(f.w.nav_intent_initial_idle_home_request(...args),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),home);assert.equal(f.w.nav_intent_initial_idle_home_request(...args.slice(0,4),args[4]+1,args[5]),-3);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_idle_home_request(...args),-2);
 }finally{f.close();}
});

test('a live causal clock rejects an unbound birth before creating a request or changing Game',()=>{
 const f=nativeInitialIdleRequestFixture({bound:false});try{
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');const clock=f.planner.nativeCausalClock(),sequence=f.w.nav_intent_transition_sequence(),worker=structuredClone(f.worker);
  assert.throws(()=>f.planner.requestNativeInitialIdleResources(f.state,f.worker),/declaration rejected/);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.planner.nativeInitialIdleDeclarationReference(f.actor),null);assert.deepEqual(f.worker,worker);assert.deepEqual(f.planner.nativeCausalClock(),clock);assert.equal(f.planner.nativeGameExecutionState(),1);
 }finally{f.close();}
});

test('a task can preempt unbound initial Idle only through the existing pending-resource TaskStart',()=>{
 const f=nativeInitialIdleGameFixture({bound:false});try{
  const p=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);
  tick(f.state,.1,f.nav);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeInitialIdleDeclarationReference(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.w.spatial_body_count(),0);assert(f.planner.pendingTaskRoute(f.actor));
  f.bind();f.planner.commitNativeCausalClock();const body=f.body(1),proposal=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase});assert.equal(proposal.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple(f).slice(0,5),proposal.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.planner.commitNativeCausalClock();tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-task');assert(f.planner.nativeTaskStartBinding(f.actor));
 }finally{f.close();}
});

test('a new Home from initial Idle uses the real shared ports and same body, with no fabricated settlement',async()=>{
 const f=nativeInitialIdleGameFixture({peer:true});let vertical;try{
  const body=f.body(1);f.worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);const request=f.planner.nativeHomeRequestReference(f.actor),peer=f.body(3);
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'home-route',onPrepare(){tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);},onDrain(){tick(f.state,.1,f.nav);}});
  const result=await vertical.run(options=>f.planner.startNativeHomeRouteAfterGpuQuiescence({actorId:f.actor,...options}));assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await vertical.present();assert.deepEqual(result.nativeHomeRouteBinding.reference.sourceRequest,request);assert.equal(result.nativeHomeRouteBinding.reference.sourceSettlement,undefined);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.deepEqual(vertical.errors,[]);
 }finally{await vertical?.close();f.close();}
});

test('forged or mutated pending markers, and an undeclared Game projection of a raw source, reject before advancing',()=>{
 for(const mutate of [f=>delete f.worker.nativeRouteAdmission,f=>f.worker.taskId='task-999999',f=>f.worker.heading+=1,f=>f.worker.idleState.rng^=1,f=>f.worker.incapacitated=true]){
  const f=nativeInitialIdleGameFixture();try{mutate(f);const elapsed=f.state.elapsed,body=f.body(1);assert.throws(()=>tick(f.state,.1,f.nav));assert.equal(f.state.elapsed,elapsed);assert.deepEqual(f.body(1),body);}finally{f.close();}
 }
 const f=nativeInitialIdleRequestFixture();try{f.worker.nativeRouteAdmission='pending-idle-resources';const elapsed=f.state.elapsed;assert.throws(()=>tick(f.state,.1,{intentTaskPlanner:f.planner}),/no current native declaration/);assert.equal(f.state.elapsed,elapsed);}finally{f.close();}
});
