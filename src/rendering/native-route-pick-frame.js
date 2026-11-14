import {copyNativeRouteReference} from '../world/native-route-reference.js';
import {copyNativeGateReference,nativeGateReferenceCovered} from '../world/native-gate-reference.js';

const clockKey=(route,semantic,epoch)=>JSON.stringify([copyNativeRouteReference(route),semantic,epoch]);
const gateClockKey=(gate,semantic,epoch)=>JSON.stringify(['gate',copyNativeGateReference(gate),semantic,epoch]);

// Input consumes the last submitted image, including each assignment's own
// revocation clamp. Neither a global frame time nor prepared resources prove it.
export function captureNativeRoutePickFrame(consumer){
 const frame=consumer?.nativeRouteFrame;
 if(consumer?.failed||!Number.isSafeInteger(frame?.sequence)||frame.sequence<=0||!Number.isFinite(frame.clockElapsed)||!Array.isArray(frame.bindings))throw Error('Native consumer pick frame unavailable');
 const times=new Map();
 for(const binding of frame.bindings){
  const {nativeRoute,nativeGate,semantic,epoch,elapsed}=binding??{};
  if(!['relative','absolute'].includes(semantic)||!Number.isFinite(epoch)||epoch<0||!Number.isFinite(elapsed)||elapsed<epoch)throw Error('Invalid native consumer pick clock');
  if(nativeGate&&(nativeRoute||!nativeGateReferenceCovered(copyNativeGateReference(nativeGate),frame.worldBoundary)))throw Error('Native gate pick world mismatch');
  const key=nativeGate?gateClockKey(nativeGate,semantic,epoch):clockKey(nativeRoute,semantic,epoch);
  if(times.has(key)&&times.get(key)!==elapsed)throw Error('Conflicting native consumer pick clocks');
  times.set(key,elapsed);
 }
 return Object.freeze({sequence:frame.sequence,getGateTime(nativeGate,epoch,semantic='relative'){
  const key=gateClockKey(nativeGate,semantic,epoch);if(!times.has(key))throw Error('Native gate has no submitted pick clock');return times.get(key);
 },getTime(nativeRoute,epoch,semantic='relative'){
  const key=clockKey(nativeRoute,semantic,epoch);
  if(!times.has(key))throw Error('Native assignment has no submitted pick clock');
  return times.get(key);
 }});
}
