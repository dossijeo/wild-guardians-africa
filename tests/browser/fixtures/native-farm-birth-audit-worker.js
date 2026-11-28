import './native-worker-world-audit-worker.js';
import {WebGPURenderer} from 'three/webgpu';
import {nativeTaskActionActor} from '../../../src/world/native-task-action-presentation.js';

// QA only: observe the production endpoint and retain one genuine newborn
// READY reply. Source and hardware draw keep their ordinary independent ports.
const productionMessage=self.onmessage,send=self.postMessage.bind(self),render=WebGPURenderer.prototype.render;
let diagnostic=null,oldActor=null,held=null,heldOnce=false,scene=null,renderer=null,holdBirthHome=false,heldHome=null,heldHomeOnce=false,heldId=null,holdBirthTask=false,heldTask=null,heldTaskOnce=false,holdBirthAction=false,heldAction=null,heldActionOnce=false,holdBirthConsequence=false,pauseCarry=false,heldConsequence=null,consequenceCount=0,cancelledConsequenceId=null,holdBirthSettlement=false,heldSettlement=null,heldSettlementOnce=false,holdBirthHomeArrival=false,heldHomeArrival=null,heldHomeArrivalOnce=false,holdBirthNextTask=false,heldNextTask=null,heldNextTaskOnce=false;
globalThis.__auditBirthTextureRefs=[];const textureOwners=new Map();
// Observe actual Texture -> backend GPUTexture associations. Weak references
// do not extend resource lifetimes; the history retains only plain metadata.
function rememberTextures(){
 if(!renderer)return;for(const weak of globalThis.__auditBirthTextureRefs){const texture=weak.deref();if(!texture||!renderer.backend.has(texture))continue;const reference=renderer.backend.get(texture).texture?.__remoteGpuId,origin=globalThis.__auditTextureOrigins.get(texture);if(reference&&origin)textureOwners.set(reference,{reference,texture:texture.id,origin});}
}
WebGPURenderer.prototype.render=function(...args){scene=args[0];renderer=this;try{return render.apply(this,args);}finally{rememberTextures();}};
function rigs(){
 const result=[];for(const root of scene?.children??[]){const bones=[];root.traverse(n=>{if(n.isBone)bones.push({id:n.id,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray()});});if(bones.length)result.push({root:root.id,bones});}return result;
}
function skinnedSources(){const result=[];for(const root of scene?.children??[]){const meshes=[];root.traverse(n=>{if(n.isSkinnedMesh)meshes.push({id:n.id,geometry:n.geometry.id,name:n.name});});if(meshes.length)result.push({root:root.id,meshes});}return result;}
function footsteps(){const result=[];scene?.traverse(n=>{if(n._wgFootstepSamples)result.push({mesh:n.id,geometry:n.geometry?.id,texture:n._wgFootstepSamples.id});});return result;}
function block(stage,ms){
 const start=performance.timeOrigin+performance.now();diagnostic.postMessage({kind:'birth-block-start',stage,start});
 const until=performance.now()+ms;while(performance.now()<until){}
 diagnostic.postMessage({kind:'birth-block-end',stage,start,end:performance.timeOrigin+performance.now()});
}
self.onmessage=event=>{
 const data=event.data;
 if(data?.kind==='configure-birth-audit'){diagnostic=data.port;oldActor=data.oldActor;holdBirthHome=data.holdBirthHome===true;holdBirthHomeArrival=data.holdBirthHomeArrival===true;holdBirthTask=data.holdBirthTask===true;holdBirthAction=data.holdBirthAction===true;holdBirthConsequence=data.holdBirthConsequence===true;pauseCarry=data.pauseCarry===true;holdBirthSettlement=data.holdBirthSettlement===true;holdBirthNextTask=data.holdBirthNextTask===true;diagnostic.start();return;}
 if(data?.kind==='block-birth-preparation'){block('preparation',data.durationMs);return;}
 if(data?.kind==='release-birth-ready'){if(!held)throw Error('No newborn READY reply retained');const forward=held;held=null;diagnostic.postMessage({kind:'birth-late-ready-forwarded',id:heldId,at:performance.timeOrigin+performance.now()});forward();block(data.stage??'commit',data.durationMs);return;}
 if(data?.kind==='block-post-settlement-task'){block(data.stage,data.durationMs);return;}
 if(data?.kind==='release-birth-next-task-ready'){if(!heldNextTask)throw Error('No genuine next Task READY retained');const forward=heldNextTask;heldNextTask=null;forward();block('next-task-commit',data.durationMs);return;}
 if(data?.kind==='block-post-settlement-home'){block(data.stage,data.durationMs);return;}
 if(data?.kind==='release-birth-home-arrival-ready'){if(!heldHomeArrival)throw Error('No genuine Home absence READY retained');const forward=heldHomeArrival;heldHomeArrival=null;forward();block('home-arrival-commit',data.durationMs);return;}
 if(data?.kind==='release-birth-home-ready'){if(!heldHome)throw Error('No newborn Home READY retained');const forward=heldHome;heldHome=null;forward();block('home-commit',data.durationMs);return;}
 if(data?.kind==='release-birth-task-ready'){if(!heldTask)throw Error('No newborn Task READY retained');const forward=heldTask;heldTask=null;forward();block('task-commit',data.durationMs);return;}
 if(data?.kind==='block-birth-action'){block(data.stage,data.durationMs);return;}
 if(data?.kind==='release-birth-action-ready'){if(!heldAction)throw Error('No newborn Action READY retained');const forward=heldAction;heldAction=null;forward();block('action-commit',data.durationMs);return;}
 if(data?.kind==='block-birth-consequence'){block(data.stage,data.durationMs);return;}
 if(data?.kind==='release-birth-consequence-ready'){if(!heldConsequence)throw Error('No genuine Carry READY retained');const retained=heldConsequence;heldConsequence=null;retained.forward();if(data.cancelled===true)diagnostic.postMessage({kind:'birth-late-ready-forwarded',id:retained.id,at:performance.timeOrigin+performance.now()});else block('consequence-commit',data.durationMs);return;}
 if(data?.kind==='block-birth-settlement'){block(data.stage,data.durationMs);return;}
 if(data?.kind==='release-birth-settlement-ready'){if(!heldSettlement)throw Error('No genuine settlement READY retained');const forward=heldSettlement;heldSettlement=null;forward();block('settlement-commit',data.durationMs);return;}
 if(data?.remoteGpuPort)data.remoteGpuPort.addEventListener('message',({data:reply})=>{if(reply.result?.disposed===true)diagnostic?.postMessage({kind:'birth-gpu-drained',receipt:reply.result});});
 if(data?.kind==='attachNativeResourcePreparation'){
  const port=data.port,post=port.postMessage.bind(port);port.addEventListener('message',({data:request})=>{if(request.kind==='abortNativeGateResources'&&(request.id===heldId||request.id===cancelledConsequenceId))queueMicrotask(()=>diagnostic.postMessage({kind:'birth-resource-aborted',id:request.id,at:performance.timeOrigin+performance.now()}));if(request.kind==='commitNativeGateResources'){for(const [key,family]of [['nativeIdleStrollStopBinding','idle-stroll-stop'],['nativeFarmArrivalStopBinding','farm-arrival-stop'],['nativeFarmArrivalBinding','farm-arrival'],['nativeHomeRouteBinding','home-route'],['nativeHomeArrivalBinding','home-arrival'],['nativeTaskStartBinding','task-start'],['nativeTaskActionBinding','task-action'],['nativeTaskConsequenceBinding','task-consequence'],['nativeTaskSettlementBinding','task-settlement']])if(request.commit?.[key])diagnostic.postMessage({kind:'birth-resource-committed',id:request.id,at:performance.timeOrigin+performance.now(),family,binding:request.commit[key]});}});port.postMessage=(message,...args)=>{
   const reference=message?.result?.preparedFarmArrivalTemplate;
   if(message.kind==='nativeGateResourcesResult'&&reference&&reference.actorId!==oldActor)diagnostic.postMessage({kind:'birth-resources-observed',at:performance.timeOrigin+performance.now(),reference});
   if(!heldOnce&&message.kind==='nativeGateResourcesResult'&&reference&&reference.actorId!==oldActor){heldOnce=true;heldId=message.id;held=()=>post(message,...args);diagnostic.postMessage({kind:'birth-resources-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference});return;}
   const home=message?.result?.preparedHomeRouteTemplate;if(holdBirthHome&&!heldHomeOnce&&message.kind==='nativeGateResourcesResult'&&home&&home.actorId!==oldActor){heldHomeOnce=true;heldHome=()=>post(message,...args);diagnostic.postMessage({kind:'birth-home-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:home});return;}
   const arrival=message?.result?.preparedHomeArrivalTemplate;if(holdBirthHomeArrival&&!heldHomeArrivalOnce&&message.kind==='nativeGateResourcesResult'&&arrival&&arrival.actorId!==oldActor){heldHomeArrivalOnce=true;heldHomeArrival=()=>post(message,...args);diagnostic.postMessage({kind:'birth-home-arrival-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:arrival});return;}
   const task=message?.result?.preparedTaskStartTemplate;if(holdBirthTask&&!heldTaskOnce&&message.kind==='nativeGateResourcesResult'&&task&&task.actorId!==oldActor){heldTaskOnce=true;heldTask=()=>post(message,...args);diagnostic.postMessage({kind:'birth-task-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:task});return;}
   if(holdBirthNextTask&&!heldNextTaskOnce&&message.kind==='nativeGateResourcesResult'&&task&&task.actorId!==oldActor&&task.targetId===900100){heldNextTaskOnce=true;heldNextTask=()=>post(message,...args);diagnostic.postMessage({kind:'birth-next-task-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:task});return;}
   const action=message?.result?.preparedTaskActionTemplate;if(holdBirthAction&&!heldActionOnce&&message.kind==='nativeGateResourcesResult'&&action&&nativeTaskActionActor(action.request)!==oldActor){heldActionOnce=true;heldAction=()=>post(message,...args);diagnostic.postMessage({kind:'birth-action-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:action});return;}
   const consequence=message?.result?.preparedTaskConsequenceTemplate;if(holdBirthConsequence&&consequenceCount<(pauseCarry?2:1)&&message.kind==='nativeGateResourcesResult'&&consequence&&consequence.actorId!==oldActor){consequenceCount++;if(pauseCarry&&consequenceCount===1)cancelledConsequenceId=message.id;heldConsequence={id:message.id,forward:()=>post(message,...args)};diagnostic.postMessage({kind:'birth-consequence-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:consequence});return;}
   const settlement=message?.result?.preparedTaskSettlementTemplate;if(holdBirthSettlement&&!heldSettlementOnce&&message.kind==='nativeGateResourcesResult'&&settlement&&settlement.actorId!==oldActor){heldSettlementOnce=true;heldSettlement=()=>post(message,...args);diagnostic.postMessage({kind:'birth-settlement-ready',id:message.id,at:performance.timeOrigin+performance.now(),reference:settlement});return;}
   return post(message,...args);
  };
 }
 return productionMessage(event);
};
self.postMessage=(message,...args)=>{if(message.kind==='disposed')diagnostic?.postMessage({kind:'birth-disposed'});if(message.kind==='inspection')rememberTextures();return send(message.kind==='inspection'?{...message,qaBirthRigs:rigs(),qaBirthSkinnedSources:skinnedSources(),qaBirthFootsteps:footsteps(),qaBirthTextureOwners:[...textureOwners.values()]}:message,...args);};
