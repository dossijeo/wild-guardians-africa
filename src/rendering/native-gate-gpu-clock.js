import {nativeClockResourceEnd} from './native-clock-resource-end.js';
import {Vector4} from 'three';
import {clamp,float,uniform} from 'three/tsl';
import {copyNativeGatePresentation} from '../world/native-gate-presentation.js';
import {copyNativeGateReference} from '../world/native-gate-reference.js';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {floorFloat32} from './float32-time.js';

// Same finite consumer time and float32 margin as native locomotion. The
// world's prepared boundary protects this motor even when no actor owns it.
export function createNativeGateGpuClock(presentation){
 let nativeGate=copyNativeGateReference({gateId:presentation.gateId,worldBoundary:presentation.worldBoundary}),start=Object.freeze({at:presentation.startTime}),end=Object.freeze({at:presentation.endTime});let sealed=false;const parameters=uniform(new Vector4(0,0,floorFloat32(end.at-start.at),0)),clockNode=markRemoteClockNode(uniform(0),'relative',start.at,null,nativeGate,null,null,null,nativeClockResourceEnd(start.at,end.at)),timeNode=clamp(clockNode.sub(clockNode.abs().max(1).mul(.000000476837158203125)),float(0),parameters.z);
 return Object.freeze({get nativeGate(){return nativeGate;},clockNode,timeNode,status:()=>({sealed,installed:{nativeGate,start,end}}),seal(){sealed=true;},retarget(value,{retagClock}={}){
  if(sealed||typeof retagClock!=='function')throw Error('Native gate clock is already published');
  const packet=copyNativeGatePresentation(value,value),next=copyNativeGateReference({gateId:packet.gateId,worldBoundary:packet.worldBoundary}),duration=floorFloat32(packet.endTime-packet.startTime);
  if(retagClock(clockNode,nativeGate,next,nativeClockResourceEnd(packet.startTime,packet.endTime))!==true)throw Error('Native gate clock was not retagged');
  nativeGate=next;start=Object.freeze({at:packet.startTime});end=Object.freeze({at:packet.endTime});parameters.value.z=duration;return true;
 }});
}
