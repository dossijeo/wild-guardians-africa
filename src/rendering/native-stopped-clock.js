import {nativeIdleStrollStopCodec,nativeFarmArrivalStopCodec,NATIVE_STOP_POSE_FIELDS} from '../world/native-worker-route-stop-codec.js';

// A selector preserves the explicit stop family, including affected dependants.
// Copying either family grants no execution or submitted-frame permission.
export function copyNativeStoppedBodySelector(value){return (value?.kind===nativeFarmArrivalStopCodec.stoppedBodyKind?nativeFarmArrivalStopCodec:nativeIdleStrollStopCodec).copyStoppedBody(value);}

// Scalar projection bindings share the existing physical uniform transport.
// This describes resources; only the direct stop release grants their values.
export function copyNativeStoppedClock(value){
 const nativeStopped=copyNativeStoppedBodySelector(value?.nativeStopped),semantic=value.semantic,epoch=value.epoch;
 if(!['relative','stop-value'].includes(semantic)||!Number.isFinite(epoch)||epoch<0||epoch>nativeStopped.stop.worldBoundary.effectiveTime||
    [value.nativeRoute,value.nativeGate,value.nativeSuspended,value.nativeResume,value.nativeStart,value.nativeAction,value.nativeConsequence,value.nativeSettlement,value.nativeHome,value.nativeFarmArrival,value.nativeStroll,value.nativeInitialIdleBody,value.nativeIdleCycle].some(Boolean)||
    value.period!==undefined&&value.period!==null||value.resourceEnd!==undefined&&value.resourceEnd!==Number.MAX_SAFE_INTEGER||
    (semantic==='stop-value'?value.stopField!=='age'&&!Object.hasOwn(NATIVE_STOP_POSE_FIELDS,value.stopField):value.stopField!==undefined))throw TypeError('Invalid native stopped projection binding');
 return Object.freeze({nativeStopped,semantic,epoch,...(semantic==='stop-value'?{stopField:value.stopField}:{}),resourceEnd:Number.MAX_SAFE_INTEGER});
}
export const nativeStoppedClockKey=binding=>JSON.stringify(['stopped',binding.nativeStopped,binding.semantic,binding.epoch,binding.stopField??null]);
