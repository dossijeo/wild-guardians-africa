import {copyNativeWorldBoundary} from './native-world-boundary.js';

// Identity of prepared gate resources in the existing native world transaction.
// It grants no clock, motor change or authority to release a draw hold.
export function copyNativeGateReference(value){
 if(!Number.isSafeInteger(value?.gateId)||value.gateId<1)throw TypeError('Invalid native gate reference');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary);if(!worldBoundary)throw TypeError('Missing native gate world boundary');
 return Object.freeze({gateId:value.gateId,worldBoundary});
}
export function nativeGateReferenceCovered(reference,boundary){
 const expected=reference.worldBoundary;return !!boundary&&expected.authorityEpoch===boundary.authorityEpoch&&expected.nativeSession===boundary.nativeSession&&boundary.ticket>=expected.ticket&&boundary.effectiveTime>=expected.effectiveTime;
}
