import {copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,sameNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteReference} from './native-farm-arrival-route.js';
import {copyNativeIdleStrollAttestation,copyNativeIdleStrollResources,sameNativeIdleStrollAttestation,sameNativeIdleStrollReference} from './native-idle-stroll.js';
import {copyNativeHomeRouteAttestation,copyNativeHomeRouteResources,sameNativeHomeRouteAttestation,sameNativeHomeRouteReference} from './native-home-route.js';

const profiles=new Map([
 [18,Object.freeze({
  kind:18,admission:'native-home',executionKind:'native-home-route-execution',
  bindingField:'nativeHomeRouteBinding',clockField:'nativeHome',proofField:'homeProof',
  obsoleteCode:'native-home-admission-obsolete',
  copyResources:copyNativeHomeRouteResources,copyAttestation:copyNativeHomeRouteAttestation,
  sameAttestation:sameNativeHomeRouteAttestation,sameReference:sameNativeHomeRouteReference
 })],
 [22,Object.freeze({
  kind:22,admission:'native-idle-stroll',executionKind:'native-idle-stroll-execution',
  bindingField:'nativeIdleStrollBinding',clockField:'nativeStroll',issuedField:'issuedStroll',
  proofField:'strollProof',admittedField:'strollAdmitted',
  obsoleteCode:'native-idle-stroll-admission-obsolete',
  copyResources:copyNativeIdleStrollResources,copyAttestation:copyNativeIdleStrollAttestation,
  sameAttestation:sameNativeIdleStrollAttestation,sameReference:sameNativeIdleStrollReference
 })],
 [23,Object.freeze({
  kind:23,admission:'native-farm-arrival',executionKind:'native-farm-arrival-route-execution',
  bindingField:'nativeFarmArrivalBinding',clockField:'nativeFarmArrival',issuedField:'issuedFarmArrival',
  proofField:'farmArrivalProof',admittedField:'farmArrivalAdmitted',
  obsoleteCode:'native-farm-arrival-admission-obsolete',
  copyResources:copyNativeFarmArrivalRouteResources,copyAttestation:copyNativeFarmArrivalRouteAttestation,
  sameAttestation:sameNativeFarmArrivalRouteAttestation,sameReference:sameNativeFarmArrivalRouteReference
 })]
]);

export function nativeWorkerRouteRecoveryProfile(kind){
 const profile=profiles.get(kind);
 if(!profile)throw TypeError('Unsupported worker route recovery kind');
 return profile;
}
