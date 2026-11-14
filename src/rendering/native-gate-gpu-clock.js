import {Vector4} from 'three';
import {clamp,float,uniform} from 'three/tsl';
import {copyNativeGateReference} from '../world/native-gate-reference.js';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {floorFloat32} from './float32-time.js';

// Same finite consumer time and float32 margin as native locomotion. The
// world's prepared boundary protects this motor even when no actor owns it.
export function createNativeGateGpuClock(presentation){
 const nativeGate=copyNativeGateReference({gateId:presentation.gateId,worldBoundary:presentation.worldBoundary}),start=Object.freeze({at:presentation.startTime}),end=Object.freeze({at:presentation.endTime}),parameters=uniform(new Vector4(0,0,floorFloat32(end.at-start.at),0)),clockNode=markRemoteClockNode(uniform(0),'relative',start.at,null,nativeGate),timeNode=clamp(clockNode.sub(clockNode.abs().max(1).mul(.000000476837158203125)),float(0),parameters.z);
 return Object.freeze({nativeGate,clockNode,timeNode,status:()=>({installed:{nativeGate,start,end}})});
}
