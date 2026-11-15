import {copyNativeResumeReference,nativeResumeReferenceCovered} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,nativeSuspendedBodyReferenceCovered} from '../world/native-suspended-body-reference.js';
import {copyNativeRouteReference} from '../world/native-route-reference.js';
import {copyNativeGateReference,nativeGateReferenceCovered} from '../world/native-gate-reference.js';

const clockKey=(route,semantic,epoch)=>JSON.stringify([copyNativeRouteReference(route),semantic,epoch]);
const resumeClockKey=(resume,semantic,epoch)=>JSON.stringify(['resume',copyNativeResumeReference(resume),semantic,epoch]);
const suspendedClockKey=(body,semantic,epoch)=>JSON.stringify(['suspended',copyNativeSuspendedBodyReference(body),semantic,epoch]);
const gateClockKey=(gate,semantic,epoch)=>JSON.stringify(['gate',copyNativeGateReference(gate),semantic,epoch]);

// Input consumes the last submitted image, including each assignment's own
// revocation clamp. Neither a global frame time nor prepared resources prove it.
export function captureNativeRoutePickFrame(consumer){
 const frame=consumer?.nativeRouteFrame;
 if(consumer?.failed||!Number.isSafeInteger(frame?.sequence)||frame.sequence<=0||!Number.isFinite(frame.clockElapsed)||!Array.isArray(frame.bindings))throw Error('Native consumer pick frame unavailable');
 const times=new Map(),origins=new Map();
 for(const binding of frame.bindings){
  const {nativeRoute,nativeGate,nativeSuspended,nativeResume,semantic,epoch,elapsed}=binding??{};
  if(!['relative','absolute'].includes(semantic)||!Number.isFinite(epoch)||epoch<0||!Number.isFinite(elapsed)||elapsed<epoch)throw Error('Invalid native consumer pick clock');
  if(nativeGate&&(nativeRoute||!nativeGateReferenceCovered(copyNativeGateReference(nativeGate),frame.worldBoundary)))throw Error('Native gate pick world mismatch');
  if([nativeRoute,nativeGate,nativeSuspended,nativeResume].filter(Boolean).length!==1)throw Error('Conflicting native consumer pick references');
  if(nativeSuspended&&!nativeSuspendedBodyReferenceCovered(copyNativeSuspendedBodyReference(nativeSuspended),frame.worldBoundary))throw Error('Native suspended pick world mismatch');
  if(nativeResume&&!nativeResumeReferenceCovered(copyNativeResumeReference(nativeResume),frame.worldBoundary))throw Error('Native resume pick world mismatch');
  const key=nativeResume?resumeClockKey(nativeResume,semantic,epoch):nativeSuspended?suspendedClockKey(nativeSuspended,semantic,epoch):nativeGate?gateClockKey(nativeGate,semantic,epoch):clockKey(nativeRoute,semantic,epoch);
  if(nativeResume){const origin=binding.executionEpoch??nativeResume.worldBoundary.effectiveTime;if(!Number.isFinite(origin)||origin<nativeResume.worldBoundary.effectiveTime||origin>frame.clockElapsed||origins.has(key)&&origins.get(key)!==origin)throw Error('Conflicting native resume execution origin');origins.set(key,origin);}
  if(times.has(key)&&times.get(key)!==elapsed)throw Error('Conflicting native consumer pick clocks');
  times.set(key,elapsed);
 }
 return Object.freeze({sequence:frame.sequence,getResumeExecutionTime(nativeResume,epoch,semantic='relative'){
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
