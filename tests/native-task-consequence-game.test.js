import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskConsequenceFixture} from './helpers/native-task-consequence.js';
import {tick,projectNativeHarvestConsequence,observeGameEvents} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nativeTaskConsequenceReferenceFromProposal} from '../src/world/native-task-consequence.js';
import {microState} from '../src/microevents/economy.js';
import {rational} from '../src/simulation/money.js';
import {prepareHarvestConsequence} from '../src/simulation/game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Source component contract only: a deterministic drain/retained-packet double.
// It does not exercise a GPU queue, graphical resources or a consumer channel.
function sourceAdmission(f,{prepare=()=>{},drain=()=>{},receipt=record=>record}={}){
 let status={closed:false,session:'source-consequence'},released=null,commits=0,aborts=0;
 const source={status:()=>({...status}),ownsGpuConsumer:consumer=>consumer===source,
  async quiesceGpuForMutation(options){const before={...status};await drain(options);return receipt({authorityEpoch:before.authorityEpoch,session:before.session,sequence:before.sentSequence,effectiveTime:before.sentTime,clockSequence:before.clockSequence,holdId:1,preparedWorldBoundary:options.preparedWorldBoundary,preparedFrameSequence:1,nativeTaskConsequenceVersion:1,preparedTaskConsequenceTemplate:options.preparedTaskConsequenceTemplate});},
  releaseGpuAfterMutation(receipt,data){released=data;},dispose(){status.closed=true;}};
 const stop=f.planner.observeNativeIntentControl({gpuConsumer:{publication:source,owner:source},
  onBaseline:b=>{status={...status,authorityEpoch:b.authorityEpoch,sentSequence:b.sequence,sentTime:b.effectiveTime,clockSequence:b.clock.clockSequence};},
  onChanges:changes=>{for(const e of changes){status.sentSequence=e.sequence;status.sentTime=e.effectiveTime;}},
  onClock:c=>{status.clockSequence=c.clockSequence;status.sentSequence=c.intentSequence;status.sentTime=c.committedThrough;}});
 return {async run(signal=null){return f.planner.startNativeTaskConsequenceAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,signal,prepareResources:async data=>{await prepare(data);return {preparedWorldBoundary:data.resources.worldBoundary,preparedTaskConsequenceTemplate:nativeTaskConsequenceReferenceFromProposal(data.resources),valid:()=>!data.signal.aborted,commit(value){commits++;assert.equal(f.worker.status,'carrying');assert.equal(f.state.crates.length,1);assert.equal(f.target.alive,false);assert(value.nativeTaskConsequenceBinding);return true;},abort(){aborts++;}};}});},close:stop,get released(){return released;},counters:()=>({commits,aborts})};
}

test('the shared source admission projects Harvest exactly once before retaining its consequence resources',async()=>{
 const f=nativeTaskConsequenceFixture();let admission,stop;
 try{const oldPower=f.target.multiplyPower,ledger=structuredClone(f.state.ledger),seen=[],next=f.state.nextId;
  stop=observeGameEvents(f.state,event=>{if(event.type==='CropPicked'||event.type==='MicroeventHarvestLossApplied'){seen.push(event.type);assert.equal(f.worker.status,'carrying');assert.equal(f.worker.taskId,null);assert.equal(f.target.alive,false);assert.equal(f.state.nextId,next+1);assert.equal(f.state.crates.length,1);const pose=f.planner.nativeDeliveryExecution(f.actor);assert.equal(f.worker.heading,pose.yaw);for(const key of ['runPhase','walkPhase','carryPhase','runRemaining','running'])assert.equal(f.worker[key],pose[key]);}});
  admission=sourceAdmission(f);const result=await admission.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(admission.counters().commits,1);assert.equal(admission.released.committed,true);assert.equal(admission.released.nativeConsequences.length,1);assert(seen.includes('CropPicked'));assert.deepEqual(f.state.ledger,ledger);assert.equal(f.state.crates[0].multiplyPower,oldPower??null);assert.equal(f.worker.nativeRouteAdmission,'native-delivery');assert.deepEqual(f.worker.nativeDelivery,{version:1,crateId:f.worker.crateId,centerId:f.center.id});
  const body=f.body(1),peer=f.body(3);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.worker.x,f.state.crates[0].x);assert.equal(f.worker.z,f.state.crates[0].z);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.state.crates[0].delivered,false);
  const saved=deserialize(serialize(f.state));assert.deepEqual(saved.workers[0].nativeDelivery,f.worker.nativeDelivery);assert.equal(saved.workers[0].nativeDelivery.nativeRoute,undefined);
  assert.throws(()=>projectNativeHarvestConsequence(f.state,f.worker,f.preview,f.planner),/committed game boundary/);assert.equal(f.state.crates.length,1);assert.equal(f.state.nextId,next+1);
 }finally{stop?.();admission?.close();f.close();}
});

test('the source rechecks semantic input after preparation and after the drain before committing a native effect',async()=>{
 for(const when of ['prepare','drain']){const f=nativeTaskConsequenceFixture();let admission;try{const body=f.body(1),next=f.state.nextId;admission=sourceAdmission(f,{[when]:()=>{f.target.harvestBonus=25;}});const result=await admission.run();assert.equal(result.status,'stale',JSON.stringify(result));assert.equal(admission.counters().commits,0);assert.equal(f.target.alive,true);assert.equal(f.state.crates.length,0);assert.equal(f.state.nextId,next);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskActionBinding(f.actor));}finally{admission?.close();f.close();}}
});

test('a long consequence preparation preserves the held body while the peer advances on the same native clock',async()=>{
 const f=nativeTaskConsequenceFixture();let admission;try{const body=f.body(1),peer=f.body(3);admission=sourceAdmission(f,{prepare:()=>{tick(f.state,.7,f.nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.crates.length,0);}});const result=await admission.run();assert.equal(result.status,'committed',JSON.stringify(result));assert(result.nativeTaskConsequenceBinding.reference.worldBoundary.effectiveTime>result.nativeTaskConsequenceBinding.preparedReference.worldBoundary.effectiveTime);assert.equal(f.state.crates.length,1);}finally{admission?.close();f.close();}
});

test('source cancellation retains the original action and cannot consume its semantic inputs',async()=>{
 const f=nativeTaskConsequenceFixture();let admission;try{const controller=new AbortController(),body=f.body(1);admission=sourceAdmission(f,{prepare:()=>controller.abort()});const result=await admission.run(controller.signal);assert.equal(result.status,'control-failed');assert.equal(f.state.crates.length,0);assert(f.target.alive);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskActionBinding(f.actor));assert.equal(admission.counters().commits,0);}finally{admission?.close();f.close();}
});

test('semantic markers and preview JSON cannot project an uncommitted native consequence',()=>{
 const f=nativeTaskConsequenceFixture();try{const before=serialize(f.state);assert.throws(()=>projectNativeHarvestConsequence(f.state,f.worker,f.preview,{nativeDeliveryExecution:()=>null}),/committed game boundary/);assert.equal(serialize(f.state),before);assert.equal(f.planner.nativeDeliveryExecution(f.actor),null);}finally{f.close();}
});

test('native Harvest consumes the existing loss allowance once and transfers the original committed power',async()=>{
 const f=nativeTaskConsequenceFixture();let admission,stop;try{const m=microState(f.state),power={day:f.state.day,amount:rational(132,13)},seen=[];m.previousIncome=10000;m.pendingLosses[f.target.id]=1;f.target.multiplyPower=power;f.target.harvestBonus=30;
  const expected=prepareHarvestConsequence(f.state,f.worker,f.task,f.target);assert.equal(expected.microLoss.applied,1);
  stop=observeGameEvents(f.state,e=>{if(['MicroeventHarvestLossApplied','CropPicked'].includes(e.type)){seen.push(e.type);assert.equal(f.state.crates.length,1);assert.equal(f.worker.taskId,null);}});
  admission=sourceAdmission(f);const result=await admission.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.deepEqual(f.state.crates[0].value,expected.crate.value);assert.equal(f.state.crates[0].multiplyPower,power);assert.equal(f.target.multiplyPower,undefined);assert.equal(m.pendingLosses[f.target.id],undefined);assert.equal(m.settledLoss,1);assert.deepEqual(seen,['MicroeventHarvestLossApplied','CropPicked']);assert.equal(f.state.nextId,expected.nextId+1);
 }finally{stop?.();admission?.close();f.close();}
});

test('native Carry arrival holds the body and cargo without paying an unprepared delivery consequence',async()=>{
 const f=nativeTaskConsequenceFixture();let admission;try{admission=sourceAdmission(f);const result=await admission.run();assert.equal(result.status,'committed');const ledger=structuredClone(f.state.ledger);tick(f.state,result.resources.presentation.endTime-f.state.elapsed+.2,f.nav);assert(f.planner.nativeDeliveryExecution(f.actor).arrived);const body=f.body(1);tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);assert.equal(f.worker.status,'carrying');assert.equal(f.state.crates[0].delivered,false);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.planner.finishAction(f.actor),false);}finally{admission?.close();f.close();}
});

test('an unsupported saved delivery rejects restoration before replacing its live native session',async()=>{
 const f=nativeTaskConsequenceFixture();let admission;try{admission=sourceAdmission(f);assert.equal((await admission.run()).status,'committed');const saved=deserialize(serialize(f.state)),session=f.w.nav_intent_session(),body=f.body(1),binding=f.planner.nativeTaskConsequenceBinding(f.actor);assert.throws(()=>f.planner.resetFromState(saved),/delivery restoration requires fresh/);assert.equal(f.w.nav_intent_session(),session);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskConsequenceBinding(f.actor),binding);const forged=deserialize(serialize(f.state));forged.workers[0].nativeDelivery.routeHandle={slot:1};assert.throws(()=>serialize(forged),/Transporte nativo/);}finally{admission?.close();f.close();}
});

test('pthread uses the same source consequence admission, Game projection and Carry execution',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,admission;
 try{f=nativeTaskConsequenceFixture({core:runtime.core});admission=sourceAdmission(f);const result=await admission.run();assert.equal(result.status,'committed',JSON.stringify(result));const body=f.body(1);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.x,f.state.crates[0].x);assert.equal(f.state.crates[0].delivered,false);}finally{admission?.close();f?.close();await runtime.dispose();}
});


test('a consumer must explicitly acknowledge the exact versioned consequence template before its native commit',async()=>{
 for(const alter of [r=>{delete r.nativeTaskConsequenceVersion;return r;},r=>({...r,nativeTaskConsequenceVersion:0}),r=>({...r,preparedTaskConsequenceTemplate:null}),r=>({...r,preparedTaskConsequenceTemplate:{...r.preparedTaskConsequenceTemplate,crateId:r.preparedTaskConsequenceTemplate.crateId+1}})]){
  const f=nativeTaskConsequenceFixture();let admission;try{const body=f.body(1),next=f.state.nextId;admission=sourceAdmission(f,{receipt:alter});const result=await admission.run();assert.equal(result.status,'invalid-receipt',JSON.stringify(result));assert.equal(admission.counters().commits,0);assert.equal(admission.released.committed,false);assert.equal(f.state.crates.length,0);assert.equal(f.state.nextId,next);assert(f.target.alive);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskActionBinding(f.actor));assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);}finally{admission?.close();f.close();}
 }
});
