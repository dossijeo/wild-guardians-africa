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
const homeClockKey=(home,semantic,epoch)=>JSON.stringify(['home',copyNativeHomeRouteReference(home),semantic,epoch]);
const startClockKey=(start,semantic,epoch)=>JSON.stringify(['start',copyNativeTaskStartReference(start),semantic,epoch]);
const actionClockKey=(action,epoch)=>JSON.stringify(['action',copyNativeTaskActionReference(action),'relative',epoch]);
const resumeClockKey=(resume,semantic,epoch)=>JSON.stringify(['resume',copyNativeResumeReference(resume),semantic,epoch]);
const suspendedClockKey=(body,semantic,epoch)=>JSON.stringify(['suspended',copyNativeSuspendedBodyReference(body),semantic,epoch]);
const gateClockKey=(gate,semantic,epoch)=>JSON.stringify(['gate',copyNativeGateReference(gate),semantic,epoch]);

// Input consumes the last submitted image, including each assignment's own
// revocation clamp. Neither a global frame time nor prepared resources prove it.
export function captureNativeRoutePickFrame(consumer){
 const frame=consumer?.nativeRouteFrame;
 if(consumer?.failed||!Number.isSafeInteger(frame?.sequence)||frame.sequence<=0||!Number.isFinite(frame.clockElapsed)||!Array.isArray(frame.bindings))throw Error('Native consumer pick frame unavailable');
 const times=new Map(),origins=new Map(),phaseAges=new Map();
 for(const binding of frame.bindings){
  const {nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeInitialIdleBody,semantic,epoch,elapsed}=binding??{};
  if(!['relative','absolute'].includes(semantic)||!Number.isFinite(epoch)||epoch<0||!Number.isFinite(elapsed)||elapsed<epoch)throw Error('Invalid native consumer pick clock');
  if(nativeGate&&(nativeRoute||!nativeGateReferenceCovered(copyNativeGateReference(nativeGate),frame.worldBoundary)))throw Error('Native gate pick world mismatch');
  if([nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeInitialIdleBody].filter(Boolean).length!==1)throw Error('Conflicting native consumer pick references');
  if(nativeSuspended&&!nativeSuspendedBodyReferenceCovered(copyNativeSuspendedBodyReference(nativeSuspended),frame.worldBoundary))throw Error('Native suspended pick world mismatch');
  if(nativeResume&&!nativeResumeReferenceCovered(copyNativeResumeReference(nativeResume),frame.worldBoundary))throw Error('Native resume pick world mismatch');
  if(nativeStart&&!nativeTaskStartReferenceCovered(copyNativeTaskStartReference(nativeStart),frame.worldBoundary))throw Error('Native first-task pick world mismatch');
  if(nativeConsequence&&!nativeTaskConsequenceReferenceCovered(copyNativeTaskConsequenceReference(nativeConsequence),frame.worldBoundary))throw Error('Native consequence pick world mismatch');
  if(nativeHome){const r=copyNativeHomeRouteReference(nativeHome),age=binding.relativeTime,origin=binding.executionEpoch,key=homeClockKey(r,semantic,epoch);
   if(semantic!=='relative'||epoch!==r.worldBoundary.effectiveTime||!nativeHomeRouteReferenceCovered(r,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native Home pick clock');phaseAges.set(key,age);origins.set(key,origin);
  }
  if(nativeInitialIdleBody){
   const reference=copyNativeInitialIdleBodyReference(nativeInitialIdleBody),age=binding.relativeTime,origin=binding.executionEpoch,key=initialBodyClockKey(reference,epoch);
   if(semantic!=='relative'||epoch!==reference.worldBoundary.effectiveTime||!nativeInitialIdleBodyReferenceCovered(reference,frame.worldBoundary)||!Number.isFinite(age)||age<0||Math.fround(age)!==age||elapsed!==epoch+age||!Number.isFinite(origin)||origin<epoch||origin>frame.clockElapsed||origin+age>frame.clockElapsed||phaseAges.has(key)&&phaseAges.get(key)!==age||origins.has(key)&&origins.get(key)!==origin)throw Error('Invalid native initial Idle body pick phase');
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
  const key=nativeHome?homeClockKey(nativeHome,semantic,epoch):nativeInitialIdleBody?initialBodyClockKey(nativeInitialIdleBody,epoch):nativeSettlement?settlementClockKey(nativeSettlement,epoch):nativeAction?actionClockKey(nativeAction,epoch):nativeStart?startClockKey(nativeStart,semantic,epoch):nativeConsequence?consequenceClockKey(nativeConsequence,semantic,epoch):nativeResume?resumeClockKey(nativeResume,semantic,epoch):nativeSuspended?suspendedClockKey(nativeSuspended,semantic,epoch):nativeGate?gateClockKey(nativeGate,semantic,epoch):clockKey(nativeRoute,semantic,epoch);
  if(nativeResume||nativeStart||nativeConsequence){const reference=nativeStart??nativeResume??nativeConsequence,origin=binding.executionEpoch??reference.worldBoundary.effectiveTime;if(!Number.isFinite(origin)||origin<reference.worldBoundary.effectiveTime||origin>frame.clockElapsed||origins.has(key)&&origins.get(key)!==origin)throw Error('Conflicting native resume execution origin');origins.set(key,origin);}
  if(times.has(key)&&times.get(key)!==elapsed)throw Error('Conflicting native consumer pick clocks');
  times.set(key,elapsed);
 }
 return Object.freeze({sequence:frame.sequence,getHomeElapsed(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=homeClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native Home has no submitted pick clock');return phaseAges.get(key);},getHomeExecutionTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=homeClockKey(value,semantic,epoch);if(!phaseAges.has(key))throw Error('Native Home has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getHomeTime(value,epoch=value.worldBoundary.effectiveTime,semantic='relative'){const key=homeClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native Home has no submitted pick clock');return times.get(key);},getInitialIdleBodyElapsed(value){const key=initialBodyClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native initial Idle body has no submitted pick clock');return phaseAges.get(key);},getInitialIdleBodyExecutionTime(value){const key=initialBodyClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native initial Idle body has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getSettlementElapsed(value){const key=settlementClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native settlement has no submitted pick clock');return phaseAges.get(key);},getSettlementExecutionTime(value){const key=settlementClockKey(value,value.worldBoundary.effectiveTime);if(!phaseAges.has(key))throw Error('Native settlement has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getActionElapsed(nativeAction){const key=actionClockKey(nativeAction,nativeAction.startTime);if(!phaseAges.has(key))throw Error('Native action has no submitted pick clock');return phaseAges.get(key);},getActionExecutionTime(nativeAction){const key=actionClockKey(nativeAction,nativeAction.startTime);if(!phaseAges.has(key))throw Error('Native action has no submitted pick clock');return origins.get(key)+phaseAges.get(key);},getConsequenceExecutionTime(value,epoch,semantic='relative'){const key=consequenceClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native consequence has no submitted pick clock');return origins.get(key)+(times.get(key)-epoch);},getConsequenceTime(value,epoch,semantic='relative'){const key=consequenceClockKey(value,semantic,epoch);if(!times.has(key))throw Error('Native consequence has no submitted pick clock');return times.get(key);},getStartExecutionTime(nativeStart,epoch,semantic='relative'){const key=startClockKey(nativeStart,semantic,epoch);if(!times.has(key))throw Error('Native first task has no submitted pick clock');return origins.get(key)+(times.get(key)-epoch);},getStartTime(nativeStart,epoch,semantic='relative'){const key=startClockKey(nativeStart,semantic,epoch);if(!times.has(key))throw Error('Native first task has no submitted pick clock');return times.get(key);},getResumeExecutionTime(nativeResume,epoch,semantic='relative'){
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
