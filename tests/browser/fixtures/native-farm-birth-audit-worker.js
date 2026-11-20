import './native-worker-world-audit-worker.js';
import {WebGPURenderer} from 'three/webgpu';

// QA only: observe the production endpoint and retain one genuine newborn
// READY reply. Source and hardware draw keep their ordinary independent ports.
const productionMessage=self.onmessage,send=self.postMessage.bind(self),render=WebGPURenderer.prototype.render;
let diagnostic=null,oldActor=null,held=null,heldOnce=false,scene=null,renderer=null;
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
function footsteps(){const result=[];scene?.traverse(n=>{if(n._wgFootstepSamples)result.push({mesh:n.id,geometry:n.geometry?.id,texture:n._wgFootstepSamples.id});});return result;}
function block(stage,ms){
 const start=performance.timeOrigin+performance.now();diagnostic.postMessage({kind:'birth-block-start',stage,start});
 const until=performance.now()+ms;while(performance.now()<until){}
 diagnostic.postMessage({kind:'birth-block-end',stage,start,end:performance.timeOrigin+performance.now()});
}
self.onmessage=event=>{
 const data=event.data;
 if(data?.kind==='configure-birth-audit'){diagnostic=data.port;oldActor=data.oldActor;diagnostic.start();return;}
 if(data?.kind==='block-birth-preparation'){block('preparation',data.durationMs);return;}
 if(data?.kind==='release-birth-ready'){if(!held)throw Error('No newborn READY reply retained');const forward=held;held=null;forward();block('commit',data.durationMs);return;}
 if(data?.remoteGpuPort)data.remoteGpuPort.addEventListener('message',({data:reply})=>{if(reply.result?.disposed===true)diagnostic?.postMessage({kind:'birth-gpu-drained',receipt:reply.result});});
 if(data?.kind==='attachNativeResourcePreparation'){
  const port=data.port,post=port.postMessage.bind(port);port.postMessage=(message,...args)=>{
   const reference=message?.result?.preparedFarmArrivalTemplate;
   if(message.kind==='nativeGateResourcesResult'&&reference&&reference.actorId!==oldActor)diagnostic.postMessage({kind:'birth-resources-observed',at:performance.timeOrigin+performance.now(),reference});
   if(!heldOnce&&message.kind==='nativeGateResourcesResult'&&reference&&reference.actorId!==oldActor){heldOnce=true;held=()=>post(message,...args);diagnostic.postMessage({kind:'birth-resources-ready',at:performance.timeOrigin+performance.now(),reference});return;}
   return post(message,...args);
  };
 }
 return productionMessage(event);
};
self.postMessage=(message,...args)=>{if(message.kind==='disposed')diagnostic?.postMessage({kind:'birth-disposed'});if(message.kind==='inspection')rememberTextures();return send(message.kind==='inspection'?{...message,qaBirthRigs:rigs(),qaBirthFootsteps:footsteps(),qaBirthTextureOwners:[...textureOwners.values()]}:message,...args);};
