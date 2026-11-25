import {copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,sameNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteReference} from './native-farm-arrival-route.js';
import {copyNativeIdleStrollAttestation,copyNativeIdleStrollResources,sameNativeIdleStrollAttestation,sameNativeIdleStrollReference} from './native-idle-stroll.js';

const profiles=new Map([
 [22,Object.freeze({
  kind:22,admission:'native-idle-stroll',executionKind:'native-idle-stroll-execution',
  bindingField:'nativeIdleStrollBinding',clockField:'nativeStroll',issuedField:'issuedStroll',
  proofField:'strollProof',admittedField:'strollAdmitted',
  copyResources:copyNativeIdleStrollResources,copyAttestation:copyNativeIdleStrollAttestation,
  sameAttestation:sameNativeIdleStrollAttestation,sameReference:sameNativeIdleStrollReference
 })],
 [23,Object.freeze({
  kind:23,admission:'native-farm-arrival',executionKind:'native-farm-arrival-route-execution',
  bindingField:'nativeFarmArrivalBinding',clockField:'nativeFarmArrival',issuedField:'issuedFarmArrival',
  proofField:'farmArrivalProof',admittedField:'farmArrivalAdmitted',
  copyResources:copyNativeFarmArrivalRouteResources,copyAttestation:copyNativeFarmArrivalRouteAttestation,
  sameAttestation:sameNativeFarmArrivalRouteAttestation,sameReference:sameNativeFarmArrivalRouteReference
 })]
]);

export function nativeWorkerRouteRecoveryProfile(kind){
 const profile=profiles.get(kind);
 if(!profile)throw TypeError('Unsupported worker route recovery kind');
 return profile;
}
