import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameSave,restoredNativeIdleStrollGame} from './helpers/native-idle-stroll-restoration-game.js';
import {copyNativeIdleStrollRequestReference,copyNativeIdleStrollDeclarationReference} from '../src/world/native-idle-stroll-request-reference.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {tick,emit} from '../src/simulation/game.js';
import {notifyWorkerPlanningChange,enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Game saves and loads actual WALK values then holds and executes a fresh22 without a JS mover`,async()=>{
 let runtime,f;try{
  const saved=nativeIdleStrollGameSave({profile:profile.id}),json=serialize(saved.state),old=saved.state.workers[0];assert(!json.includes('native-idle-stroll-reference'));assert(!json.includes('expectedRouteHandle'));assert.equal(confirmedStateSaveAvailable(saved.state),false);if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}f=restoredNativeIdleStrollGame(saved,{core:runtime?.core});const q=f.planner.nativeIdleStrollRequestReference(f.actor),body=f.body(1),worker=structuredClone(f.worker),rng=f.state.rng;
  assert.equal(f.worker.nativeRouteAdmission,'pending-stroll-resources');assert.deepEqual(f.worker.idleState,old.idleState);for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],old[k]);assert(q);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);notifyWorkerPlanningChange(f.state,f.worker);assert.equal(f.worker.nativeRouteAdmission,'pending-stroll-resources');f.planner.flushTaskEvents();tick(f.state,.2,f.nav);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);const resaved=deserialize(serialize(f.state));assert.equal(resaved.workers[0].nativeRouteAdmission,'pending-stroll-resources');
  const p=f.prepare();tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);const refreshed=f.planner.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(refreshed.status,'revalidated');const binding=f.commit(p);assert.deepEqual(binding.preparedReference,p.nativeIdleStroll);assert.deepEqual(binding.reference.sourceRequest,q);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.x,f.body(1)[1]);assert.equal(f.worker.z,f.body(1)[2]);assert(f.worker.walkPhase>old.walkPhase);assert.equal(f.worker.runRemaining,old.runRemaining);assert.equal(f.state.rng,rng);assert.equal(f.w.spatial_body_count(),1);
 }finally{f?.close();await runtime?.dispose();}
});

test('Game holds a restored declaration before body binding and rejects a forged body reference',()=>{
 const f=restoredNativeIdleStrollGame(undefined,{bindBodies:false});try{
  const decl=f.planner.nativeIdleStrollDeclarationReference(f.actor),worker=structuredClone(f.worker);assert(decl);assert.equal(decl.bodyId,undefined);assert.equal(decl.pose.radius,undefined);assert.throws(()=>copyNativeIdleStrollRequestReference(decl));assert.deepEqual(copyNativeIdleStrollDeclarationReference(decl),decl);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);assert.equal(f.w.spatial_body_count(),0);tick(f.state,.2,f.nav);assert.deepEqual(f.worker,worker);assert.equal(f.w.spatial_body_count(),0);f.bind();const q=f.planner.nativeIdleStrollRequestReference(f.actor);assert(q.requestSequence>decl.requestSequence);assert.equal(q.bodyId,1);tick(f.state,.1,f.nav);assert.deepEqual(f.worker,worker);
 }finally{f.close();}
});

for(const bound of [false,true])test(`a real task during restored WALK resource wait keeps its target and saved phases (${bound?'bound':'unbound'})`,()=>{
 const f=restoredNativeIdleStrollGame(undefined,{bindBodies:bound});try{
  const w=f.worker,old=structuredClone(w),target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.saved.reference.anchor.x+1,f.saved.reference.anchor.z,w.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,w.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const rows=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),1);f.planner.commitNativeCausalClock();assert.equal(f.state.tasks.find(t=>t.id===w.taskId).targetId,target.id);assert.equal(w.nativeRouteAdmission,'pending-resources');assert.equal(w.idleState,null);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);if(!bound){assert.equal(f.w.spatial_body_upsert(77,w.x+2,w.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(Number(f.actor.split('-').at(-1)),77),0);assert.equal(f.w.spatial_body_remove(77),1);f.bind();}assert.equal(f.w.spatial_body_upsert(77,w.x+2,w.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(Number(f.actor.split('-').at(-1)),77),0);assert.equal(f.w.spatial_body_remove(77),1);const body=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);const request=f.planner.pendingTaskRoute(f.actor),policy={bodyId:1,radius:.28,urgent:false,runRemaining:w.runRemaining,runPhase:w.runPhase,walkPhase:w.walkPhase,carryPhase:w.carryPhase};assert.notEqual(f.planner.prepareNativeTaskStartProposal(request,{...policy,walkPhase:w.walkPhase+1}).status,'proposed');const p=f.planner.prepareNativeTaskStartProposal(request,policy);assert.equal(p.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(w.runRemaining,old.runRemaining);
 }finally{f.close();}
});

for(const bound of [false,true])test(`contract expiry consumes the pending restored declaration into genuine Home (${bound?'bound':'unbound'})`,()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0],end=PROFILES.find(p=>p.id===worker.profile).end;saved.state.time=end-.05;const f=restoredNativeIdleStrollGame(saved,{bindBodies:bound});try{
  const old=structuredClone(f.worker),body=f.body(1);tick(f.state,.1,f.nav);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],old[k]);assert.equal(f.planner.nativeIdleStrollDeclarationReference(f.actor),null);if(bound){assert.deepEqual(f.body(1),body);assert(f.planner.nativeHomeRequestReference(f.actor));}else{assert.equal(f.w.spatial_body_count(),0);f.bind();assert(f.planner.nativeHomeRequestReference(f.actor));}
 }finally{f.close();}
});

test('a saved ended contract restores as Home without recreating the old WALK request',()=>{
 const saved=nativeIdleStrollGameSave(),w=saved.state.workers[0];w.contractDay--;const f=restoredNativeIdleStrollGame(saved);try{assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.status,'returning');assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);assert(f.planner.nativeHomeRequestReference(f.actor));}finally{f.close();}
});

test('an arrived WALK save acquires zero22 before its actual prepared REST source',()=>{
 const f=restoredNativeIdleStrollGame(nativeIdleStrollGameSave({advance:'arrival'}));try{const body=f.body(1),p=f.prepare();assert.equal(p.distance,0);f.commit(p);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);const rest=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(rest.status,'proposed');assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),rest.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();assert(f.planner.projectNativeIdleCycle(f.state,f.worker));assert.equal(f.worker.idleState.mode,'rest');tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);}finally{f.close();}
});

test('loading keeps the saved farm anchor even when a different crop is now nearer',()=>{
 const saved=nativeIdleStrollGameSave(),w=saved.state.workers[0],near=createPlant(`plant-${saved.state.nextId++}`,'mijo',w.x,w.z,w.centerId);saved.state.plants.push(near);const f=restoredNativeIdleStrollGame(saved);try{
  const q=f.planner.nativeIdleStrollRequestReference(f.actor);assert.equal(q.anchor.id,saved.reference.anchor.id);assert.deepEqual(q.destination,saved.reference.destination);assert.equal(f.prepare().nativeIdleStroll.sourceRequest.anchor.id,saved.reference.anchor.id);
 }finally{f.close();}
});

test('restoration rejects invalid semantics, anchors and a reused physical world before resetting consumers',()=>{
 for(const bound of [false,true]){
  const f=restoredNativeIdleStrollGame(undefined,{bindBodies:bound});let detach;try{
   const session=f.w.nav_intent_session(),sequence=f.w.nav_intent_transition_sequence(),closed=[];detach=f.planner.observeNativeIntentControl({onBaseline(){},onChanges(){},onClosed:reason=>closed.push(reason)});
   for(const change of [w=>w.walkPhase=NaN,w=>w.idleState.rng=-1,w=>w.idleState.anchorId='farm-plant-999999',w=>w.idleState.destination.x+=100]){const invalid=structuredClone(f.state);change(invalid.workers[0]);const before=structuredClone(invalid);assert.throws(()=>f.planner.resetFromState(invalid));assert.deepEqual(invalid,before);}
   if(bound)assert.throws(()=>f.planner.resetFromState(structuredClone(f.state)),/fresh physical world/);assert.equal(f.w.nav_intent_session(),session);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(closed,[]);assert(f.planner.projectNativeIdleStrollDeclaration(f.state,f.worker));
  }finally{detach?.();f.close();}
 }
});

test('malformed WALK snapshots and changed live anchors cannot silently become another intent or a JS mover',()=>{
 const saved=nativeIdleStrollGameSave(),json=serialize(saved.state);for(const change of [w=>w.running=true,w=>w.path=[],w=>w.idleState.mode='rest',w=>w.idleState.binding={},w=>w.destinationId=null,w=>w.walkPhase=NaN]){const state=JSON.parse(json);change(state.workers[0]);assert.throws(()=>serialize(state));}
 const f=restoredNativeIdleStrollGame(saved);try{const body=f.body(1),at=f.state.elapsed;f.state.plants.find(p=>p.id===f.worker.idleState.anchorId.slice(5)).x+=.1;assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'unsupported');assert.throws(()=>tick(f.state,.1,f.nav),/retained Game state/);assert.deepEqual(f.body(1),body);assert.equal(f.state.elapsed,at);}finally{f.close();}
});

test('Game holds restored WALK while an independently restored Home advances in the same native cohort',()=>{
 const saved=nativeIdleStrollGameSave(),root=saved.state.workers[0],p=saved.reference.pose,peer={...structuredClone(root),id:'worker-900012',x:p.x,z:p.z+6,status:'returning',idleState:null,destinationId:null,nativeRouteAdmission:'pending-home-resources'};saved.state.workers.push(peer);saved.state.villages.find(v=>v.id===root.villageId).entry={x:p.x+12,z:p.z+6};const f=restoredNativeIdleStrollGame(saved);try{
  const request=f.planner.nativeHomeRequestReference(peer.id),prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.proposal.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();f.planner.projectNativeHomeExecution(f.state,f.state.workers[1]);const body=f.body(1),other=f.body(3),worker=structuredClone(f.worker);tick(f.state,.2,f.nav);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),other);assert.equal(f.state.workers[1].x,f.body(3)[1]);assert.equal(f.w.spatial_body_count(),2);
 }finally{f.close();}
});
