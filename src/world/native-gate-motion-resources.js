import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';

export function copyNativeGateMotionResources(value){
 const worldBoundary=copyNativeWorldBoundary(value?.worldBoundary);
 if(!worldBoundary||value.version!==1||value.kind!==12||!['proposal','committed'].includes(value.phase)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Invalid native gate motion resources');
 const gates=value.gates.map(gate=>{if(!sameNativeWorldBoundary(gate.worldBoundary,worldBoundary))throw TypeError('Native gate proposal world mismatch');return copyNativeGatePresentation(gate,{worldBoundary,startTime:worldBoundary.effectiveTime,endTime:gate.endTime});});
 if(new Set(gates.map(gate=>gate.gateId)).size!==gates.length)throw TypeError('Duplicate native motor resource');
 return Object.freeze({version:1,kind:12,phase:value.phase,worldBoundary,gates:Object.freeze(gates)});
}
