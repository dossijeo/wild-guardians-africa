import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {nativeTaskSettlementReferenceFromProposal} from '../src/world/native-task-settlement.js';
import {observeGameEvents,emit,tick,projectNativeCrateDeliveryConsequence,prepareCrateDeliveryConsequence} from '../src/simulation/game.js';
import {observeSettlements} from '../src/simulation/settlement-observers.js';
import {commitAgriculturalPower} from '../src/simulation/agricultural-power.js';
import {numberOf,rational} from '../src/simulation/money.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Real source/WASM/common transactor, with retained-packet and GPU-drain
// doubles. This is not proof of a graphical successor or a real GPU consumer.
function admission(f,{prepare=()=>{},drain=()=>{},receipt=x=>x}={}){
 let status={closed:false,session:'source-settlement'},released=null,commits=0;const source={status:()=>({...status}),ownsGpuConsumer:c=>c===source,
  async quiesceGpuForMutation(options){const before={...status};await drain(options);return receipt({authorityEpoch:before.authorityEpoch,session:before.session,sequence:before.sentSequence,effectiveTime:before.sentTime,clockSequence:before.clockSequence,holdId:1,preparedWorldBoundary:options.preparedWorldBoundary,preparedFrameSequence:1,nativeTaskSettlementVersion:1,preparedTaskSettlementTemplate:options.preparedTaskSettlementTemplate});},releaseGpuAfterMutation(_receipt,data){released=data;},dispose(){status.closed=true;}};
 const stop=f.planner.observeNativeIntentControl({gpuConsumer:{publication:source,owner:source},onBaseline:b=>{status={...status,authorityEpoch:b.authorityEpoch,sentSequence:b.sequence,sentTime:b.effectiveTime,clockSequence:b.clock.clockSequence};},onChanges:changes=>{for(const e of changes){status.sentSequence=e.sequence;status.sentTime=e.effectiveTime;}},onClock:c=>{status.clockSequence=c.clockSequence;status.sentSequence=c.intentSequence;status.sentTime=c.committedThrough;}});
 return {run:signal=>f.planner.startNativeTaskSettlementAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,signal,prepareResources:async data=>{await prepare(data);return {preparedWorldBoundary:data.resources.worldBoundary,preparedTaskSettlementTemplate:nativeTaskSettlementReferenceFromProposal(data.resources),valid:()=>!data.signal.aborted,commit(value){commits++;assert.equal(f.worker.status,'idle');assert(value.nativeTaskSettlementBinding);return true;},abort(){}};}}),close:stop,get released(){return released;},get commits(){return commits;}};
}

test('native delivery commits coherent income, power, crate, worker and tutorial before every observer',async()=>{
 const f=nativeTaskSettlementFixture();let a;const stops=[];try{const crate=f.state.crates[0],before=numberOf(f.state.ledger.balance);commitAgriculturalPower(f.state,crate,'multiply',11);f.state.tutorial.step='harvest';f.state.tutorial.basicSkipped=false;const center=f.state.structures.find(c=>c.id===f.worker.centerId),preparedIncome=Math.ceil(numberOf(prepareCrateDeliveryConsequence(f.state,f.worker,crate,center).income));let settlements=0;const events=[],observationErrors=[];
  const coherent=()=>{assert(crate.delivered);assert.equal(crate.carrierId,null);assert.equal(f.worker.crateId,null);assert.equal(f.worker.status,'idle');assert.equal(f.worker.nativeDelivery,undefined);assert.equal(f.worker.nativeRouteAdmission,undefined);assert.equal(f.state.tutorial.step,'done');assert(f.state.tutorial.harvestCompleted);assert(crate.multiplyPowerSettled);assert(f.planner.nativeTaskSettlementBinding(f.actor));assert.equal(numberOf(f.state.ledger.balance),before+preparedIncome);};
  stops.push(observeSettlements(f.state.ledger,()=>{settlements++;try{coherent();}catch(error){observationErrors.push(String(error));}}));stops.push(observeGameEvents(f.state,e=>{if(['CrateDelivered','TutorialCompleted'].includes(e.type)){coherent();events.push(e.type);}}));
  a=admission(f);const result=await a.run();assert.equal(result.status,'committed',JSON.stringify(result));coherent();assert.deepEqual(observationErrors,[]);assert.equal(settlements,1);assert.deepEqual(events,['CrateDelivered','TutorialCompleted']);assert.equal(a.commits,1);assert.equal(a.released.committed,true);assert.equal(a.released.nativeSettlements[0].settlementSequence,result.nativeTaskSettlementBinding.settlementSequence);assert.equal((await a.run()).status,'unsupported');assert.equal(settlements,1);
  const body=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.equal(f.worker.status,'idle');assert.equal(f.planner.projectNativeSettledWorkerExecution(f.state,f.worker).executedThrough,f.state.elapsed);
 }finally{for(const stop of stops)stop();a?.close();f.close();}
});

test('resource preparation and drain can advance B without consuming delivery or moving the arrived body',async()=>{
 const f=nativeTaskSettlementFixture();let a;try{const crate=f.state.crates[0],body=f.body(1),peer=f.body(3),before=structuredClone(f.state.ledger);a=admission(f,{prepare(){f.advance(.25);assert.equal(crate.delivered,false);assert.equal(f.worker.status,'carrying');assert.deepEqual(f.state.ledger,before);},drain(){f.advance(.2);}});const r=await a.run();assert.equal(r.status,'committed',JSON.stringify(r));assert(r.timeTranslation.sameSourceState);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert(r.nativeTaskSettlementBinding.reference.worldBoundary.effectiveTime>r.nativeTaskSettlementBinding.preparedReference.worldBoundary.effectiveTime);
 }finally{a?.close();f.close();}
});

for(const missing of ['version','template'])test(`a consumer lacking the exact settlement ${missing} cannot authorize income or retire Carry`,async()=>{
 const f=nativeTaskSettlementFixture();let a;try{const before=JSON.stringify(f.state),body=f.body(1);a=admission(f,{receipt:r=>{delete r[missing==='version'?'nativeTaskSettlementVersion':'preparedTaskSettlementTemplate'];return r;}});const result=await a.run();assert.equal(result.status,'invalid-receipt',JSON.stringify(result));assert.equal(JSON.stringify(f.state),before);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskConsequenceBinding(f.actor));assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(a.commits,0);
 }finally{a?.close();f.close();}
});

test('changed settlement data or an expired contract cannot use an earlier prepared Idle result',async()=>{
 for(const change of [f=>{f.state.crates[0].value=rational(999);},f=>{f.state.time=1000;}]){const f=nativeTaskSettlementFixture();let a;try{a=admission(f,{prepare:()=>change(f)});const result=await a.run();assert.equal(result.status,'stale',JSON.stringify(result));assert.equal(f.state.crates[0].delivered,false);assert.equal(f.worker.status,'carrying');assert(f.planner.nativeTaskConsequenceBinding(f.actor));assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);}finally{a?.close();f.close();}}
});

test('delivery data alone cannot credit a crate without the current native stationary fact',()=>{
 const f=nativeTaskSettlementFixture();try{const crate=f.state.crates[0],center=f.state.structures.find(c=>c.id===f.worker.centerId),preview=prepareCrateDeliveryConsequence(f.state,f.worker,crate,center),before=JSON.stringify(f.state);assert.throws(()=>projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner),/committed game boundary/);assert.equal(JSON.stringify(f.state),before);}finally{f.close();}
});

test('a subsequent genuine task inherits stationary ownership until its prepared native route commits',async()=>{
 const f=nativeTaskSettlementFixture();let a;try{a=admission(f);assert.equal((await a.run()).status,'committed');const held=f.planner.nativeTaskSettlementBinding(f.actor),body=f.body(1),target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.target.x,f.target.z,f.worker.centerId);target.growth=cropSpec('mijo').growth_seconds;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});const task=enqueue(f.state,f.worker.centerId,'harvest',target.id);assert(task);f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1}),/requires prepared task resources/);assert.equal(task.workerId,null);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),held);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),1,JSON.stringify(plan));assert.equal(task.workerId,f.actor);assert.equal(f.worker.status,'waiting-task');assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),held);assert.deepEqual(f.body(1),body);f.advance(.2);assert.deepEqual(f.body(1),body);assert(f.planner.projectNativeSettledWorkerExecution(f.state,f.worker));
  const request=f.planner.pendingTaskRoute(f.actor),pose=held.reference.pose,policy={bodyId:1,radius:pose.radius,runRemaining:pose.runRemaining,runPhase:pose.runPhase,walkPhase:pose.walkPhase,carryPhase:pose.carryPhase};assert(request);assert.equal(f.planner.prepareNativeTaskStartProposal(request,{...policy,walkPhase:pose.walkPhase+1}).status,'body-mismatch');const proposed=f.planner.prepareNativeTaskStartProposal(request,policy);assert.equal(proposed.status,'proposed',JSON.stringify(proposed));assert(f.planner.nativeTaskSettlementBinding(f.actor));assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),proposed.proposal.ticket.ticket),1);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert(f.planner.nativeTaskStartBinding(f.actor));assert.deepEqual(f.body(1),body);f.advance(.2);assert.notDeepEqual(f.body(1),body);
 }finally{a?.close();f.close();}
});

test('a newly attached source observer gets the exact current stationary association',async()=>{
 const f=nativeTaskSettlementFixture();let a,stop;try{a=admission(f);assert.equal((await a.run()).status,'committed');let baseline;stop=f.planner.observeNativeIntentControl({onBaseline:b=>{baseline=b;},onChanges(){},onClosed:error=>{throw error;}});assert.deepEqual(baseline.nativeSettlements,[f.planner.nativeTaskSettlementBinding(f.actor)]);assert.deepEqual(f.planner.nativeTaskSettlementBindings(),baseline.nativeSettlements);
 }finally{stop?.();a?.close();f.close();}
});

test('discarding an unpublished task batch does not reset the live native cohort when its commit is rejected',async()=>{
 const f=nativeTaskSettlementFixture();let a;try{a=admission(f);assert.equal((await a.run()).status,'committed');const target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.target.x,f.target.z,f.worker.centerId);target.growth=cropSpec('mijo').growth_seconds;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});const task=enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed),session=f.w.nav_intent_session(),body=f.body(1),peer=f.body(3),proof=f.planner.nativeTaskSettlementBinding(f.actor);assert.equal(plan.length,1);f.planner.discard();assert.throws(()=>f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),/became stale/);assert.equal(f.w.nav_intent_session(),session);assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),proof);assert.equal(task.workerId,null);const retry=f.planner.planIfNeeded(f.state.elapsed);assert.equal(retry.length,1);assert.equal(f.planner.commitTaskBatchToState(f.state,retry,{navVersion:1,pendingResources:true}),1);assert(f.planner.nativeTaskSettlementBinding(f.actor));
 }finally{a?.close();f.close();}
});

test('pthread uses the same conditioned settlement, coherent Game projection and stationary execution',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,a;
 try{f=nativeTaskSettlementFixture({core:runtime.core});a=admission(f);const result=await a.run();assert.equal(result.status,'committed',JSON.stringify(result));const body=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.equal(f.worker.status,'idle');assert.equal(f.state.crates[0].delivered,true);assert(f.planner.nativeTaskSettlementBinding(f.actor));}finally{a?.close();f?.close();await runtime.dispose();}
});
