import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick,emit} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {copyNativeFarmArrivalRequestReference,copyNativeFarmArrivalDeclarationReference,sameNativeFarmArrivalRequestReference} from '../src/world/native-farm-arrival-request-reference.js';
import {nativeFarmArrivalState} from '../src/world/native-farm-arrival-state.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {readFileSync} from 'node:fs';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {cropSpec} from '../src/simulation/rules.js';

function fixture(options={}){
 const f=nativeInitialIdleRequestFixture({mode:null,declareRequest:false,...options,configureState(state,{point}){
  state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';for(const p of state.plants)p.water=[];
  Object.assign(state.workers[0],{status:'arriving',destinationId:null,idleState:null});state.villages.find(v=>v.id===state.workers[0].villageId).entry=point(6,0);options.configureState?.(state);
 }});
 try{
  const requested=f.planner.requestNativeFarmArrivalResources(f.state,f.worker);if(options.bound!==false)assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;
  const fail=()=>{throw Error('Pending farm arrival must not use JS movement, route planning or clearance');};nav.path=fail;nav.workerPath=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
  return {...f,nav,requested};
 }catch(error){f.close();throw error;}
}

for(const threaded of [false,true])for(const p of PROFILES)test(`${threaded?'pthread':'standalone'} ${p.id} pending farm arrival holds its source while Game advances its actual Task peer`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,profile:p.id,peer:true});const source=f.planner.nativeFarmArrivalRequestReference(f.actor),body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),rng=f.state.rng;
  assert(source);assert.equal(source.kind,'native-farm-arrival-request-reference');assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),source);assert.equal(f.state.rng,rng);assert.deepEqual(f.planner.nativeFarmArrivalRequestReferences(),[source]);assert.equal(confirmedStateSaveAvailable(f.state),false);
 }finally{f?.close();await runtime?.dispose();}
});

test('cold arrival waits in Game and physical binding replaces only its declaration sequence',()=>{
 const f=fixture({bound:false});try{
  const declaration=f.planner.nativeFarmArrivalDeclarationReference(f.actor),worker=structuredClone(f.worker);assert.equal(f.requested.request,null);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);assert.equal('radius' in declaration.pose,false);assert.equal('bodyId' in declaration,false);assert.throws(()=>copyNativeFarmArrivalRequestReference(declaration));
  tick(f.state,.2,f.nav);assert.deepEqual(f.worker,worker);assert.equal(f.w.spatial_body_count(),0);f.bind();assert.equal(f.planner.commitNativeCausalClock().status,'committed');const bound=f.planner.nativeFarmArrivalRequestReference(f.actor);assert(bound.requestSequence>declaration.requestSequence);assert.equal(bound.requestedAt,f.state.elapsed);assert.deepEqual(bound.goal,declaration.goal);const body=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('typed arrival copies own their values and reject fabricated history, permissions and changed fields',()=>{
 const f=fixture();try{
  const source=f.planner.nativeFarmArrivalRequestReference(f.actor),plain=structuredClone(source),copied=copyNativeFarmArrivalRequestReference(plain);plain.pose.x++;plain.goal.x++;assert.equal(sameNativeFarmArrivalRequestReference(source,copied),true);assert.notEqual(plain.pose.x,copied.pose.x);assert(Object.isFrozen(copied)&&Object.isFrozen(copied.pose)&&Object.isFrozen(copied.goal));
  for(const edit of [s=>s.kind='native-home-request-reference',s=>s.version=2,s=>s.requestSequence=0,s=>s.bodyId=0,s=>s.bodyFlags=3,s=>s.profile=32,s=>s.workerProfile='missing',s=>s.pose.radius=0,s=>s.pose.walkPhase=-1,s=>s.goal.arrivalRadius=1,s=>s.goal.x=NaN,s=>s.authorizedAutonomy=true,s=>s.idleState=null,s=>s.worldBoundary={}]){const bad=structuredClone(source);edit(bad);assert.throws(()=>copyNativeFarmArrivalRequestReference(bad));assert.equal(sameNativeFarmArrivalRequestReference(source,bad),false);}
  const declaration=f.planner.nativeFarmArrivalDeclarationReference(f.actor);assert.throws(()=>copyNativeFarmArrivalDeclarationReference({...declaration,bodyId:1}));
 }finally{f.close();}
});

test('arrival declaration rejects guessed headings, stale Game poses and non-arrival semantic states',()=>{
 const f=fixture();try{
  for(const [key,value] of [['x',f.worker.x+.1],['heading',f.worker.heading+.1],['walkPhase',f.worker.walkPhase+.1],['runRemaining',f.worker.runRemaining+.1]]){const old=f.worker[key];f.worker[key]=value;assert.throws(()=>f.planner.projectNativeFarmArrivalRequest(f.state,f.worker),/retained Game source/);f.worker[key]=old;}
  for(const [key,value] of [['status','idle'],['raidReturn',true],['running',true],['path',[]],['idleState',{}],['taskId','task-999'],['destinationId','arrival-2']]){const old=f.worker[key];f.worker[key]=value;assert.throws(()=>nativeFarmArrivalState(f.state,f.worker));f.worker[key]=old;}
  const old=f.worker.heading;delete f.worker.heading;assert.throws(()=>nativeFarmArrivalState(f.state,f.worker));assert.equal(nativeFarmArrivalState(f.state,f.worker,{yaw:old}).pose.yaw,old);f.worker.heading=old;
 }finally{f.close();}
});

test('a semantic save/load recreates a fresh cold arrival and body without carrying old native handles',()=>{
 const f=fixture();let restored;try{
  const source=f.planner.nativeFarmArrivalRequestReference(f.actor),saved=deserialize(serialize(f.state));assert.equal(saved.workers[0].nativeRouteAdmission,'pending-farm-arrival-resources');
  restored=restoreNativeActionGame(saved,{bindBodies:false,admitPeer:false});const cold=restored.planner.nativeFarmArrivalDeclarationReference(f.actor);assert.notEqual(cold.authorityEpoch,source.authorityEpoch);assert.deepEqual(cold.pose,(({radius,...pose})=>pose)(source.pose));assert.deepEqual(cold.goal,source.goal);assert.equal(restored.planner.nativeFarmArrivalRequestReference(f.actor),null);restored.bind();const bound=restored.planner.nativeFarmArrivalRequestReference(f.actor);assert.equal(bound.bodyId,1);assert.notEqual(bound.authorityEpoch,source.authorityEpoch);assert.deepEqual(bound.pose,source.pose);
 }finally{restored?.close();f.close();}
});

test('losing a pending Farm body rejects before time and preserves its Task peer',()=>{
 const f=fixture({peer:true});try{
  assert.equal(f.w.spatial_body_remove(1),1);
  const elapsed=f.state.elapsed,peer=f.body(3);
  assert.throws(()=>tick(f.state,.1,f.nav));
  assert.equal(f.state.elapsed,elapsed);
  assert.deepEqual(f.body(3),peer);
 }finally{f.close();}
});

test('contract expiry retargets the pending Farm body to Home and requests a prepared Task peer stop',()=>{
 const f=fixture({peer:true});try{
  f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end-.05;
  const elapsed=f.state.elapsed,body=f.body(1),peer=f.state.workers[1],peerBody=f.body(3);
  const source=f.planner.nativeFarmArrivalRequestReference(f.actor);
  tick(f.state,.1,f.nav);
  assert(f.state.elapsed>elapsed);
  assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');
  assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);
  const home=f.planner.nativeHomeRequestReference(f.worker.id);
  assert.equal(home.bodyId,1);
  assert.deepEqual(home.pose,source.pose);
  assert.deepEqual(f.body(1),body);
  assert.equal(peer.nativeRouteAdmission,'native-task');
  assert.notDeepEqual(f.body(3),peerBody);
  const stop=f.planner.nativeTaskRouteStopRequest(peer.id);
  assert.equal(stop.reason,'home');
  assert.equal(stop.bodyId,3);
 }finally{f.close();}
});

test('a cold arrival with a retired native source cannot borrow the supported Home return edge',()=>{
 const f=fixture({bound:false});try{
  assert.equal(f.w.nav_intent_retire_actor(f.actor),1);f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end-.05;const at=f.state.elapsed,time=f.state.time;assert.throws(()=>tick(f.state,.1,f.nav),/native|Native|source/);assert.equal(f.state.elapsed,at);assert.equal(f.state.time,time);assert.equal(f.w.spatial_body_count(),0);
 }finally{f.close();}
});

test('an ordinary harvest task claims pending resources without moving the retained arrival body',()=>{
 const f=fixture({peer:true});try{
  const target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.point(6,0).x,f.point(6,0).z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);const bodies=[f.body(1),f.body(3)];tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.state.tasks.find(t=>t.id===f.worker.taskId).targetId,target.id);assert.deepEqual(f.body(1),bodies[0]);assert.notDeepEqual(f.body(3),bodies[1]);assert(f.planner.pendingTaskRoute(f.actor));assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);
 }finally{f.close();}
});

test('Game goal/pose changes missing from the native owner cannot leave a half-declared arrival',()=>{
 for(const change of ['goal','pose']){const f=nativeInitialIdleRequestFixture({mode:null,declareRequest:false,configureState(state){Object.assign(state.workers[0],{status:'arriving',destinationId:null,idleState:null});}});try{
  if(change==='goal')f.state.structures.find(c=>c.id===f.worker.centerId).x+=.5;else f.worker.x+=.5;
  const sequence=f.w.nav_intent_transition_sequence(),worker=structuredClone(f.worker),body=f.body(1);assert.throws(()=>f.planner.requestNativeFarmArrivalResources(f.state,f.worker));assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalDeclarationReference(f.actor),null);
 }finally{f.close();}}
});

test('an unmarked arrival cannot enter Game merely because its native pending class is recognized',()=>{
 const f=nativeInitialIdleRequestFixture({mode:null,declareRequest:false,peer:true,configureState(state){state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null});state.tutorial.step='done';state.workers[0].status='arriving';}});try{
  assert.equal(f.w.nav_intent_request_farm_arrival(f.actor,2,f.worker.heading,f.worker.runPhase,f.worker.walkPhase,f.worker.carryPhase,f.worker.runRemaining),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;const at=f.state.elapsed,peer=f.body(3);assert.throws(()=>tick(f.state,.1,nav),/unsupported mover/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(3),peer);
 }finally{f.close();}
});

test('ordinary authority binds restored Farm and waits for its graphical producer',()=>{
 const f=fixture();let authority;try{
  const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));authority=createSimulationAuthority(module,serialize(f.state),['-1,-1','0,-1','1,-1','-1,0','0,0','1,0','-1,1','0,1','1,1']);assert.equal(authority.nativeIntentProductionStatus().phase,'idle');assert.equal(authority.nativeIntentProductionStatus().active,null);assert.equal(authority.nativeIntentProductionStatus().last,null);const snapshot=JSON.parse(authority.execute({kind:'snapshot',sequence:1}).snapshot);assert.equal(snapshot.workers[0].nativeRouteAdmission,'pending-farm-arrival-resources');assert.equal(snapshot.workers[0].x,f.worker.x);assert.equal(snapshot.workers[0].z,f.worker.z);assert.equal(confirmedStateSaveAvailable(snapshot),false);
 }finally{authority?.dispose();f.close();}
});

test('a crop maturing inside tick claims pending Task resources on the same arrival body and advances only after prepared Task14',()=>{
 let target;const f=fixture({peer:true,configureState(state){const a=state.workers[0];target=createPlant(`plant-${state.nextId++}`,'mijo',a.x+1,a.z,a.centerId);target.growth=cropSpec('mijo').growth_seconds-.05;for(const water of target.water)water.status='manual';state.plants.push(target);}});try{
  const source=f.planner.nativeFarmArrivalRequestReference(f.actor),body=f.body(1),peer=f.body(3);assert.equal(f.worker.taskId,null);tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.state.tasks.find(t=>t.id===f.worker.taskId).targetId,target.id);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);
  tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);const request=f.planner.pendingTaskRoute(f.actor),policy={bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase};assert.equal(request.origin.x,source.pose.x);assert.equal(request.origin.z,source.pose.z);
  assert.notEqual(f.planner.prepareNativeTaskStartProposal(request,{...policy,walkPhase:policy.walkPhase+.1}).status,'proposed');const proposed=f.planner.prepareNativeTaskStartProposal(request,policy);assert.equal(proposed.status,'proposed');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),proposed.proposal.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);
 }finally{f.close();}
});
