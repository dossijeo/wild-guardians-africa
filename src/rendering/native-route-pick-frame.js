import {copyNativeAnimalCropReference} from '../world/native-animal-crop-resource.js';
import {nativeClockResourceEnd as cropEnd} from './native-clock-resource-end.js';
import {copyRestoredWallRepairDeclaration,restoredWallRepairKey} from '../world/restored-wall-repair-reference.js';
import {WALL_REPAIR_DURATION} from '../simulation/structure-presentation.js';
import {copyNativeBarrierAdditionReference,copyNativeBarrierAdditionAttestation,sameNativeBarrierAdditionReference} from '../world/native-barrier-addition.js';
import {floorFloat32} from './float32-time.js';
import {sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {nativeFarmIdlePhaseOffset,nativeIdleCyclePhaseOffset} from './native-farm-idle-phase.js';
import {NATIVE_STOP_POSE_FIELDS} from '../world/native-worker-route-stop-codec.js';
import {nativeStoppedClockKey,copyNativeStoppedBodySelector,copyNativeStoppedClock} from './native-stopped-clock.js';
import {sameNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {copyNativeIdleStrollReference,nativeIdleStrollReferenceCovered} from '../world/native-idle-stroll.js';
import {copyNativeIdleCycleReference,sameNativeIdleCycleReference,nativeIdleCycleReferenceCovered,copyNativeIdleCycleAttestation} from '../world/native-idle-cycle.js';
import {copyNativeFarmArrivalRouteReference,nativeFarmArrivalRouteReferenceCovered} from '../world/native-farm-arrival-route.js';
import {copyNativeHomeRouteReference,nativeHomeRouteReferenceCovered} from '../world/native-home-route.js';
import {copyNativeTaskSettlementReference,nativeTaskSettlementReferenceCovered} from '../world/native-task-settlement.js';
import {copyNativeInitialIdleBodyReference,nativeInitialIdleBodyReferenceCovered} from '../world/native-initial-idle-body.js';
import {copyNativeTaskConsequenceReference,nativeTaskConsequenceReferenceCovered} from '../world/native-task-consequence.js';
import {copyNativeTaskStartReference,nativeTaskStartReferenceCovered} from '../world/native-task-start-reference.js';
import {nativeTaskActionRemainingDuration,copyNativeTaskActionReference,nativeTaskActionReferenceCovered} from '../world/native-task-action-presentation.js';
import {copyNativeResumeReference,nativeResumeReferenceCovered} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,nativeSuspendedBodyReferenceCovered} from '../world/native-suspended-body-reference.js';
import {copyNativeRouteReference} from '../world/native-route-reference.js';
import {copyNativeGateReference,nativeGateReferenceCovered} from '../world/native-gate-reference.js';

const clockKey=(route,semantic,epoch)=>JSON.stringify([copyNativeRouteReference(route),semantic,epoch]);
const consequenceClockKey=(value,semantic,epoch)=>JSON.stringify(['consequence',copyNativeTaskConsequenceReference(value),semantic,epoch]);
const settlementClockKey=(value,epoch)=>JSON.stringify(['settlement',copyNativeTaskSettlementReference(value),'relative',epoch]);
const initialBodyClockKey=(value,epoch)=>JSON.stringify(['initial-idle-body',copyNativeInitialIdleBodyReference(value),'relative',epoch]);
const cycleClockKey=(value,epoch)=>JSON.stringify(['idle-cycle',copyNativeIdleCycleReference(value),'relative',epoch]);
const strollClockKey=(stroll,semantic,epoch)=>JSON.stringify(['idle-stroll',copyNativeIdleStrollReference(stroll),semantic,epoch]);
const farmArrivalClockKey=(value,semantic,epoch)=>JSON.stringify(['farm-arrival',copyNativeFarmArrivalRouteReference(value),semantic,epoch]);
const homeClockKey=(home,semantic,epoch)=>JSON.stringify(['home',copyNativeHomeRouteReference(home),semantic,epoch]);
const startClockKey=(start,semantic,epoch)=>JSON.stringify(['start',copyNativeTaskStartReference(start),semantic,epoch]);
const actionClockKey=(action,epoch)=>JSON.stringify(['action',copyNativeTaskActionReference(action),'relative',epoch]);
const resumeClockKey=(resume,semantic,epoch)=>JSON.stringify(['resume',copyNativeResumeReference(resume),semantic,epoch]);
const suspendedClockKey=(body,semantic,epoch)=>JSON.stringify(['suspended',copyNativeSuspendedBodyReference(body),semantic,epoch]);
const gateClockKey=(gate,semantic,epoch)=>JSON.stringify(['gate',copyNativeGateReference(gate),semantic,epoch]);

// Inspection crosses a Worker boundary; the scene may adopt another owner
// before its reply arrives. Recapture only on an observed ownership change.
// The caller runs its synchronous raycast in this same continuation, never
// leaving a captured clock installed while another input is awaiting a reply.
export async function withNativeRoutePickFrame({inspect,readOwner,isClosed},operation){
 if(typeof operation!=='function')throw TypeError('Native pick requires an operation');
 const open=()=>{if(isClosed())throw Error('Native consumer pick frame unavailable');};
 for(;;){
  open();const owner=readOwner();
  if(owner.presented){await owner.presented;open();if(!owner.current())continue;}
  let frame=null;
  if(owner.native){
   const value=await inspect();open();if(!owner.current())continue;
   if(!sameNativeWorldBoundary(value.consumer?.nativeRouteFrame?.worldBoundary??null,owner.worldBoundary))throw Error('Native pick owner does not match the submitted world');
   frame=captureNativeRoutePickFrame(value.consumer);
  }
  const result=operation(frame);
  if(result&&typeof result.then==='function')throw Error('Native pick operation must be synchronous');
  return result;
 }
}

// Input consumes the last submitted image, including each assignment's own
// revocation clamp. Neither a global frame time nor prepared resources prove it.
export function captureNativeRoutePickFrame(consumer){
 const frame=consumer?.nativeRouteFrame;
 if(consumer?.failed||!Number.isSafeInteger(frame?.sequence)||frame.sequence<=0||!Number.isFinite(frame.clockElapsed)||!Array.isArray(frame.bindings))throw Error('Native consumer pick frame unavailable');
 const presentationElapsed=frame.presentationElapsed;
 if(presentationElapsed!==undefined&&(!Number.isFinite(presentationElapsed)||presentationElapsed<0||presentationElapsed>frame.clockElapsed||Math.fround(presentationElapsed)!==presentationElapsed))throw Error('Invalid submitted presentation clock');
 const restoredRepairs=new Map(),barrierRepairs=new Map(),times=new Map(),origins=new Map(),phaseAges=new Map(),stoppedBodies=new Map(),idleOffsets=new Map();
 for(const binding of frame.bindings){
  if(binding?.nativeRestoredWallRepair){
   const declaration=copyRestoredWallRepairDeclaration(binding.declaration),key=restoredWallRepairKey(binding.nativeRestoredWallRepair),ref=declaration.reference,age=binding.relativeTime;
   if(key!==restoredWallRepairKey(ref)||declaration.authorityEpoch!==frame.authorityEpoch||frame.worldBoundary&&frame.worldBoundary.authorityEpoch!==declaration.authorityEpoch||frame.clockElapsed<declaration.restoredAt||binding.semantic!=='relative'||binding.epoch!==ref.at||age!==floorFloat32(Math.min(WALL_REPAIR_DURATION,frame.clockElapsed-ref.at))||binding.elapsed!==ref.at+age||Object.keys(binding).some(k=>k.startsWith('native')&&k!=='nativeRestoredWallRepair'))throw Error('Invalid submitted restored wall Repair age');
   if(restoredRepairs.has(key))throw Error('Duplicate restored wall Repair age');restoredRepairs.set(key,age);continue;
  }
  if(binding?.nativeBarrierAddition){
   const reference=copyNativeBarrierAdditionReference(binding.nativeBarrierAddition),proof=copyNativeBarrierAdditionAttestation(binding.nativeBarrierAdditionBinding),origin=proof.reference.worldBoundary.effectiveTime,world=proof.reference.worldBoundary,shown=frame.worldBoundary,age=binding.relativeTime;
   if(reference.gate||reference.removal||reference.additions.length!==1||Object.keys(binding).some(key=>key.startsWith('native')&&!['nativeBarrierAddition','nativeBarrierAdditionBinding'].includes(key))||!sameNativeBarrierAdditionReference(reference,proof.preparedReference)||!shown||shown.authorityEpoch!==world.authorityEpoch||shown.nativeSession!==world.nativeSession||shown.ticket<world.ticket||shown.effectiveTime<world.effectiveTime||origin>frame.clockElapsed||binding.semantic!=='relative'||binding.epoch!==reference.worldBoundary.effectiveTime||binding.executionEpoch!==origin||!Number.isFinite(age)||age!==floorFloat32(Math.min(WALL_REPAIR_DURATION,frame.clockElapsed-origin))||binding.elapsed!==origin+age)throw Error('Invalid submitted solid Repair age');
   const key=JSON.stringify(reference);if(barrierRepairs.has(key))throw Error('Duplicate submitted solid Repair age');barrierRepairs.set(key,Object.freeze({age,elapsed:binding.elapsed}));continue;
  }

  if(binding?.nativeStopped?.kind==='native-farm-arrival-stopped-gate'){
   const selector=copyNativeStoppedClock(binding).nativeStopped,world=binding.worldBoundary,value=binding.opening;
   if(!world||!nativeGateReferenceCovered({gateId:selector.gateId,worldBoundary:selector.stop.worldBoundary},world)||!nativeGateReferenceCovered({gateId:selector.gateId,worldBoundary:world},frame.worldBoundary)||world.effectiveTime>frame.clockElapsed||!Number.isFinite(value)||value<0||value>1||Math.fround(value)!==value)throw Error('Invalid submitted stopped motor projection');
   const key=nativeStoppedClockKey(binding);if(stoppedBodies.has(key))throw Error('Duplicate stopped motor projection');stoppedBodies.set(key,Object.freeze({worldBoundary:world,opening:value}));continue;
  }
  if(binding?.nativeStopped){
   const selector=copyNativeStoppedClock(binding).nativeStopped,owner=selector.stop.routes.find(r=>r.nativeRoute.actorId===selector.actorId),body=copyNativeSuspendedBodyReference(binding.bodyReference),world=frame.worldBoundary,values=binding.projection;
   const expected={kind:'native-suspended-body',version:1,nativeRoute:owner.nativeRoute,worldBoundary:body.worldBoundary,bodyId:owner.bodyId,resumeGeneration:owner.resumeGeneration,suspendedAt:body.suspendedAt};
   if(binding.semantic!=='relative'||!Number.isFinite(binding.epoch)||binding.epoch<0||binding.epoch>selector.stop.worldBoundary.effectiveTime||!sameNativeSuspendedBodyReference(body,expected)||!nativeSuspendedBodyReferenceCovered(body,world)||body.suspendedAt<selector.stop.worldBoundary.effectiveTime||body.suspendedAt>frame.clockElapsed||!values||typeof values!=='object'||!Number.isFinite(values.age)||values.age<0||values.age>floorFloat32(body.suspendedAt-binding.epoch)||Object.entries(values).some(([field,value])=>(field!=='age'&&!Object.hasOwn(NATIVE_STOP_POSE_FIELDS,field))||!Number.isFinite(value)||Math.fround(value)!==value)||['x','z','yaw'].some(field=>!Object.hasOwn(values,field)))throw Error('Invalid native stopped projection frame');
   if((binding.elapsed===undefined)!==(binding.relativeTime===undefined)||binding.elapsed!==undefined&&(!Number.isFinite(binding.elapsed)||binding.elapsed<binding.epoch||binding.elapsed>frame.clockElapsed||!Number.isFinite(binding.relativeTime)||binding.relativeTime<0||binding.relativeTime<floorFloat32(body.suspendedAt-binding.epoch)||Math.fround(binding.relativeTime)!==binding.relativeTime||binding.elapsed!==binding.epoch+binding.relativeTime))throw Error('Invalid native stopped Idle clock');
   const key=nativeStoppedClockKey({nativeStopped:selector,semantic:'relative',epoch:binding.epoch});if(stoppedBodies.has(key))throw Error('Duplicate native stopped projection frame');
   stoppedBodies.set(key,Object.freeze({...values,...(binding.relativeTime===undefined?{}:{relativeTime:binding.relativeTime}),at:binding.elapsed??frame.clockElapsed,bodyReference:body}));continue;
  }

  if(binding?.nativeAnimalCrop){
   const r=copyNativeAnimalCropReference(binding.nativeAnimalCrop,binding.nativeAnimalCrop.kind);
   const key=JSON.stringify(r),origin=binding.executionEpoch,age=binding.relativeTime,epoch=r.worldBoundary.effectiveTime,w=frame.worldBoundary;
   const end=r.kind===26?cropEnd(epoch,r.endTime):r.endTime;
   if(Object.keys(binding).some(k=>k.startsWith('native')&&k!=='nativeAnimalCrop')||binding.semantic!=='relative'||binding.epoch!==epoch||
      w?.authorityEpoch!==r.worldBoundary.authorityEpoch||w.nativeSession!==r.worldBoundary.nativeSession||w.ticket<r.worldBoundary.ticket||
      w.effectiveTime<origin||!Number.isFinite(origin)||origin<epoch||Math.fround(age)!==age||age<0||age>end-epoch||
      binding.elapsed!==epoch+age||origin+age>frame.clockElapsed||phaseAges.has(key)&&(phaseAges.get(key)!==age||origins.get(key)!==origin))
     throw Error('Invalid submitted animal crop age');
   phaseAges.set(key,age);origins.set(key,origin);continue;
  }
  const {nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeFarmArrival,nativeStroll,nativeInitialIdleBody,nativeIdleCycle,semantic,epoch,elapsed}=binding??{};
  if(semantic==='idle-offset'){
   const farm=!!nativeFarmArrival,cycle=!!nativeIdleCycle,r=(cycle?copyNativeIdleCycleReference:farm?copyNativeFarmArrivalRouteReference:copyNativeIdleStrollReference)(nativeIdleCycle??nativeFarmArrival??nativeStroll),{period,relativeTime,executionEpoch,phaseOffset,phaseDelay=0,phaseTime=frame.clockElapsed}=binding;
   if([nativeFarmArrival,nativeStroll,nativeIdleCycle].filter(Boolean).length!==1||[nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeInitialIdleBody].some(Boolean)||epoch!==r.worldBoundary.effectiveTime||!(cycle?nativeIdleCycleReferenceCovered:farm?nativeFarmArrivalRouteReferenceCovered:nativeIdleStrollReferenceCovered)(r,frame.worldBoundary)||executionEpoch<epoch||executionEpoch>frame.clockElapsed||elapsed!==epoch+relativeTime||executionEpoch+relativeTime>frame.clockElapsed||!Number.isFinite(phaseTime)||phaseTime<executionEpoch+relativeTime||phaseTime>frame.clockElapsed||!cycle&&(phaseDelay!==0||phaseTime!==frame.clockElapsed)||phaseOffset!==(cycle?nativeIdleCyclePhaseOffset:nativeFarmIdlePhaseOffset)({elapsed:phaseTime,executionEpoch,relativeTime,duration:cycle?r.duration:floorFloat32(r.endTime-epoch),period,...(cycle?{phaseDelay}:{})}))throw Error('Invalid native Farm Idle phase frame');
   const key=JSON.stringify([cycle?cycleClockKey(r,epoch):(farm?farmArrivalClockKey:strollClockKey)(r,'relative',epoch),period]),fact={reference:r,farm,cycle,epoch,period,relativeTime,executionEpoch,phaseOffset,...(cycle?{phaseDelay,phaseTime}:{})};
   if(idleOffsets.has(key)&&JSON.stringify(idleOffsets.get(key))!==JSON.stringify(fact))throw Error('Conflicting native Farm Idle phase frame');idleOffsets.set(key,fact);continue;
  }
  if(!['relative','absolute'].includes(semantic)||!Number.isFinite(epoch)||epoch<0||!Number.isFinite(elapsed)||elapsed<epoch)throw Error('Invalid native consumer pick clock');
  if(nativeGate&&(nativeRoute||!nativeGateReferenceCovered(copyNativeGateReference(nativeGate),frame.worldBoundary)))throw Error('Native gate pick world mismatch');
  if([nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeFarmArrival,nativeStroll,nativeInitialIdleBody,nativeIdleCycle].filter(Boolean).length!==1)throw Error('Conflicting native consumer pick references');
  if(nativeSuspended&&!nativeSuspendedBodyReferenceCovered(copyNativeSuspendedBodyReference(nativeSuspended),frame.worldBoundary))throw Error('Native suspended pick world mismatch');
  if(nativeResume&&!nativeResumeReferenceCovered(copyNativeResumeReference(nativeResume),frame.worldBoundary))throw Error('Native resume pick world mismatch');
  if(nativeStart&&!nativeTaskStartReferenceCovered(copyNativeTaskStartReference(nativeStart),frame.worldBoundary))throw Error('Native first-task pick world mismatch');
  if(nativeConsequence&&!nativeTaskConsequenceReferenceCovered(copyNativeTaskConsequenceReference(nativeConsequence),frame.worldBoundary))throw Error('Native consequence pick world mismatch');
  if(nativeFarmArrival){const r=copyNativeFarmArrivalRouteReference(nativeFarmArrival),age=binding.relativeTime,origin=binding.executionEpoch,key=farmArrivalClockKey(r,semantic,epoch);
   if(semantic!=='relative'||epoch!==r.worldBoundary.effectiveTime||!nativeFarmArrivalRouteReferenceCovered(r,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native farm arrival pick clock');phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeHome){const r=copyNativeHomeRouteReference(nativeHome),age=binding.relativeTime,origin=binding.executionEpoch,key=homeClockKey(r,semantic,epoch);
   if(semantic!=='relative'||epoch!==r.worldBoundary.effectiveTime||!nativeHomeRouteReferenceCovered(r,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native Home pick clock');phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeStroll){const r=copyNativeIdleStrollReference(nativeStroll),age=binding.relativeTime,origin=binding.executionEpoch,key=strollClockKey(r,semantic,epoch);
   if(semantic!=='relative'||epoch!==r.worldBoundary.effectiveTime||!nativeIdleStrollReferenceCovered(r,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native Idle stroll pick clock');phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeInitialIdleBody){
   const reference=copyNativeInitialIdleBodyReference(nativeInitialIdleBody),age=binding.relativeTime,origin=binding.executionEpoch,key=initialBodyClockKey(reference,epoch);
   if(semantic!=='relative'||epoch!==reference.worldBoundary.effectiveTime||!nativeInitialIdleBodyReferenceCovered(reference,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native initial Idle body pick phase');
   phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeIdleCycle){
   const reference=copyNativeIdleCycleReference(nativeIdleCycle),age=binding.relativeTime,origin=binding.executionEpoch,key=cycleClockKey(reference,epoch);
   if(semantic!=='relative'||epoch!==reference.worldBoundary.effectiveTime||!nativeIdleCycleReferenceCovered(reference,frame.worldBoundary)||!Number.isFinite(age)||age<0||age>reference.duration||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native Idle cycle pick phase');
   phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeSettlement){
   const reference=copyNativeTaskSettlementReference(nativeSettlement),age=binding.relativeTime,origin=binding.executionEpoch,key=settlementClockKey(reference,epoch);
   if(semantic!=='relative'||epoch!==reference.worldBoundary.effectiveTime||!nativeTaskSettlementReferenceCovered(reference,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native settlement pick phase');
   phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeAction){
   const reference=copyNativeTaskActionReference(nativeAction),age=binding.relativeTime,origin=binding.executionEpoch,key=actionClockKey(reference,epoch);
   if(semantic!=='relative'||epoch!==reference.startTime||!nativeTaskActionReferenceCovered(reference,frame.worldBoundary)||!Number.isFinite(age)||age<0||age>nativeTaskActionRemainingDuration(reference.request)||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native action pick phase');
   phaseAges.set(key,age);origins.set(key,origin);
  }
  const key=nativeFarmArrival?farmArrivalClockKey(nativeFarmArrival,semantic,epoch):nativeStroll?strollClockKey(nativeStroll,semantic,epoch):nativeHome?homeClockKey(nativeHome,semantic,epoch):nativeInitialIdleBody?initialBodyClockKey(nativeInitialIdleBody,epoch):nativeIdleCycle?cycleClockKey(nativeIdleCycle,epoch):nativeSettlement?settlementClockKey(nativeSettlement,epoch):nativeAction?actionClockKey(nativeAction,epoch):nativeStart?startClockKey(nativeStart,semantic,epoch):nativeConsequence?consequenceClockKey(nativeConsequence,semantic,epoch):nativeResume?resumeClockKey(nativeResume,semantic,epoch):nativeSuspended?suspendedClockKey(nativeSuspended,semantic,epoch):nativeGate?gateClockKey(nativeGate,semantic,epoch):clockKey(nativeRoute,semantic,epoch);
  if(nativeResume||nativeStart||nativeConsequence){const reference=nativeStart??nativeResume??nativeConsequence,origin=binding.executionEpoch??reference.worldBoundary.effectiveTime;if(!Number.isFinite(origin)||origin<reference.worldBoundary.effectiveTime||origin>frame.clockElapsed||origins.has(key)&&origins.get(key)!==origin)throw Error('Conflicting native resume execution origin');origins.set(key,origin);}
  if(times.has(key)&&times.get(key)!==elapsed)throw Error('Conflicting native consumer pick clocks');
  times.set(key,elapsed);
 }
 for(const fact of idleOffsets.values()){const key=fact.cycle?cycleClockKey(fact.reference,fact.epoch):(fact.farm?farmArrivalClockKey:strollClockKey)(fact.reference,'relative',fact.epoch);if(phaseAges.get(key)!==fact.relativeTime||origins.get(key)!==fact.executionEpoch)throw Error('Native Farm Idle phase lacks its submitted physical clock');}
 return Object.freeze({getRestoredWallRepairElapsed(reference){const key=restoredWallRepairKey(reference);if(!restoredRepairs.has(key))throw Error('Restored wall Repair has no submitted age');return restoredRepairs.get(key);},getBarrierRepairElapsed(reference){const value=barrierRepairs.get(JSON.stringify(copyNativeBarrierAdditionReference(reference)));if(!value)throw Error('Native solid Repair has no submitted age');return value.age;},getBarrierRepairExecutionTime(reference){const value=barrierRepairs.get(JSON.stringify(copyNativeBarrierAdditionReference(reference)));if(!value)throw Error('Native solid Repair has no submitted age');return value.elapsed;},getPresentationTime(){if(presentationElapsed===undefined)throw Error('No submitted presentation clock');return presentationElapsed;},getIdleCyclePhaseOffset(value,period){const key=JSON.stringify([cycleClockKey(value,value.worldBoundary.effectiveTime),period]);if(!idleOffsets.has(key))throw Error('Native Idle cycle has no submitted phase offset');return idleOffsets.get(key).phaseOffset;},getStrollIdleOffset(value,epoch=value.worldBoundary.effectiveTime,period){const key=JSON.stringify([strollClockKey(value,'relative',epoch),period]);if(!idleOffsets.has(key))throw Error('Native Stroll Idle has no submitted phase offset');return idleOffsets.get(key).phaseOffset;},getFarmArrivalIdleOffset(value,epoch=value.worldBoundary.effectiveTime,period){const key=JSON.stringify([farmArrivalClockKey(value,'relative',epoch),period]);if(!idleOffsets.has(key))throw Error('Native Farm Idle has no submitted phase offset');return idleOffsets.get(key).phaseOffset;},getStoppedGate(value,epoch){const key=nativeStoppedClockKey(copyNativeStoppedClock({nativeStopped:value,epoch,semantic:'stop-value',stopField:'opening'}));if(!stoppedBodies.has(key))throw Error('Native stopped gate has no submitted projection');return stoppedBodies.get(key);},getStoppedBody(value,epoch){const key=nativeStoppedClockKey({nativeStopped:copyNativeStoppedBodySelector(value),semantic:'relative',epoch});if(!stoppedBodies.has(key))throw Error('Native stopped body has no submitted projection');return stoppedBodies.get(key);},sequence:frame.sequence,getStrollElapsed(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=strollClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native Idle stroll has no submitted pick clock');return phaseAges.get(key);},getStrollExecutionTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=strollClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native Idle stroll has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getStrollTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=strollClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native Idle stroll has no submitted pick clock');return times.get(key);},getAnimalCropAge(reference){const key=JSON.stringify(copyNativeAnimalCropReference(reference,reference?.kind));if(!phaseAges.has(key))throw Error('Animal crop has no submitted pick age');return phaseAges.get(key);},getFarmArrivalElapsed(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=farmArrivalClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native farm arrival has no submitted pick clock');return phaseAges.get(key);},getFarmArrivalExecutionTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=farmArrivalClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native farm arrival has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getFarmArrivalTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=farmArrivalClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native farm arrival has no submitted pick clock');return times.get(key);},getHomeElapsed(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=homeClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native Home has no submitted pick clock');return phaseAges.get(key);},getHomeExecutionTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=homeClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native Home has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getHomeTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=homeClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native Home has no submitted pick clock');return times.get(key);},getInitialIdleBodyElapsed(value){const key=initialBodyClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native initial Idle body has no submitted pick clock');return phaseAges.get(key);},getInitialIdleBodyExecutionTime(value){const key=initialBodyClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native initial Idle body has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getIdleCycleElapsed(value){const key=cycleClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native Idle cycle has no submitted pick clock');return phaseAges.get(key);},getIdleCycleExecutionTime(value){const key=cycleClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native Idle cycle has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getSettlementElapsed(value){const key=settlementClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native settlement has no submitted pick clock');return phaseAges.get(key);},getSettlementExecutionTime(value){const key=settlementClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native settlement has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getActionElapsed(nativeAction){const key=actionClockKey(nativeAction,nativeAction.startTime);if(!phaseAges.has(key))throw Error('Native action has no submitted pick clock');return phaseAges.get(key);},getActionExecutionTime(nativeAction){const key=actionClockKey(nativeAction,nativeAction.startTime);if(!phaseAges.has(key))throw Error('Native action has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getConsequenceExecutionTime(value,epoch,semantic='relative'){const key=consequenceClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native consequence has no submitted pick clock');return origins.get(key)+(times.get(key)-epoch);},getConsequenceTime(value,epoch,semantic='relative'){const key=consequenceClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native consequence has no submitted pick clock');return times.get(key);},getStartExecutionTime(nativeStart,epoch,semantic='relative'){const key=startClockKey(nativeStart,semantic,epoch);if(!times.has(key))throw Error('Native first task has no submitted pick clock');return origins.get(key)+(times.get(key)-epoch);},getStartTime(nativeStart,epoch,semantic='relative'){const key=startClockKey(nativeStart,semantic,epoch);if(!times.has(key))throw Error('Native first task has no submitted pick clock');return times.get(key);},getResumeExecutionTime(nativeResume,epoch,semantic='relative'){
  const key=resumeClockKey(nativeResume,semantic,epoch);if(!times.has(key))throw Error('Native resume has no submitted pick clock');return origins.get(key)+(times.get(key)-epoch);
 },getResumeTime(nativeResume,epoch,semantic='relative'){
  const key=resumeClockKey(nativeResume,semantic,epoch);if(!times.has(key))throw Error('Native resume has no submitted pick clock');return times.get(key);
 },getSuspendedTime(nativeSuspended,epoch,semantic='relative'){
  const key=suspendedClockKey(nativeSuspended,semantic,epoch);if(!times.has(key))throw Error('Native suspended body has no submitted pick clock');return times.get(key);
 },getGateTime(nativeGate,epoch,semantic='relative'){
  const key=gateClockKey(nativeGate,semantic,epoch);if(!times.has(key))throw Error('Native gate has no submitted pick clock');return times.get(key);
 },getTime(nativeRoute,epoch,semantic='relative'){
  const key=clockKey(nativeRoute,semantic,epoch);
  if(!times.has(key))throw Error('Native assignment has no submitted pick clock');
  return times.get(key);
 }});
}
