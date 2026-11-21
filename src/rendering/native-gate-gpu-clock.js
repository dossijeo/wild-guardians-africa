import {nativeClockResourceEnd} from './native-clock-resource-end.js';
import {Vector4} from 'three';
import {clamp,float,uniform} from 'three/tsl';
import {copyNativeGatePresentation} from '../world/native-gate-presentation.js';
import {copyNativeGateReference} from '../world/native-gate-reference.js';
import {nativeFarmArrivalStopCodec} from '../world/native-worker-route-stop-codec.js';
import {copyNativeStoppedGateSelector} from './native-stopped-clock.js';
import {sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {markRemoteStoppedNode,markRemoteClockNode} from './remote-clock-bindings.js';
import {floorFloat32} from './float32-time.js';

// Same finite consumer time and float32 margin as native locomotion. The
// world's prepared boundary protects this motor even when no actor owns it.
export function createNativeGateGpuClock(presentation,{stopTemplate=null,getStoppedProjection=null}={}){
 if(stopTemplate){
  const packet=copyNativeGatePresentation(presentation,presentation),selector=copyNativeStoppedGateSelector({kind:'native-farm-arrival-stopped-gate',version:1,stop:stopTemplate,gateId:packet.gateId,mechanism:packet.mechanism}),nativeGate=copyNativeGateReference({gateId:packet.gateId,worldBoundary:packet.worldBoundary});
  if(!sameNativeWorldBoundary(selector.stop.worldBoundary,packet.worldBoundary)||packet.startTime!==packet.endTime||typeof getStoppedProjection!=='function')throw Error('Native stopped gate requires its projected owner');
  const openingNode=markRemoteStoppedNode(uniform(0),selector,packet.startTime,'opening'),start=Object.freeze({at:packet.startTime}),end=Object.freeze({at:packet.endTime});let proof=null,sealed=false;
  return Object.freeze({nativeGate,stoppedSelector:selector,openingNode,timeNode:float(0),status:()=>({sealed,installed:{nativeGate,start,end}}),
   acceptStopProof(value){if(sealed)throw Error('Native stopped gate is already sealed');const next=nativeFarmArrivalStopCodec.copyAttestation(value);if(!next.projection||!nativeFarmArrivalStopCodec.sameReference(next.preparedReference,selector.stop))throw Error('Native stopped gate lacks its exact final projection');proof=next;return true;},
   readyToCommit(){return !!proof;},seal(){if(!proof)throw Error('Native stopped gate lacks its final receipt');sealed=true;},
   sampleOpening(){const value=getStoppedProjection(selector,packet.startTime);if(!sealed||!value||value.opening<0||value.opening>1||Math.fround(value.opening)!==value.opening||!sameNativeWorldBoundary(value.worldBoundary,proof.reference.worldBoundary))throw Error('Native stopped gate lacks its submitted opening');return value.opening;}
  });
 }

 let nativeGate=copyNativeGateReference({gateId:presentation.gateId,worldBoundary:presentation.worldBoundary}),start=Object.freeze({at:presentation.startTime}),end=Object.freeze({at:presentation.endTime});let sealed=false;const parameters=uniform(new Vector4(0,0,floorFloat32(end.at-start.at),0)),clockNode=markRemoteClockNode(uniform(0),'relative',start.at,null,nativeGate,null,null,null,nativeClockResourceEnd(start.at,end.at)),timeNode=clamp(clockNode.sub(clockNode.abs().max(1).mul(.000000476837158203125)),float(0),parameters.z);
 return Object.freeze({get nativeGate(){return nativeGate;},clockNode,timeNode,status:()=>({sealed,installed:{nativeGate,start,end}}),seal(){sealed=true;},retarget(value,{retagClock}={}){
  if(sealed||typeof retagClock!=='function')throw Error('Native gate clock is already published');
  const packet=copyNativeGatePresentation(value,value),next=copyNativeGateReference({gateId:packet.gateId,worldBoundary:packet.worldBoundary}),duration=floorFloat32(packet.endTime-packet.startTime);
  if(retagClock(clockNode,nativeGate,next,nativeClockResourceEnd(packet.startTime,packet.endTime))!==true)throw Error('Native gate clock was not retagged');
  nativeGate=next;start=Object.freeze({at:packet.startTime});end=Object.freeze({at:packet.endTime});parameters.value.z=duration;return true;
 }});
}
