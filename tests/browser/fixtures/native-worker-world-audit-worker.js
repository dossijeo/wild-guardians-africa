import './webgpu-preparation-stall-worker.js';
import {WebGPURenderer} from 'three/webgpu';
// Test-only instrumentation around the same production renderer and Worker.
// Compare factories inside render(), separately from asynchronous admission.
const devices=new WeakMap(),render=WebGPURenderer.prototype.render,send=self.postMessage.bind(self);
let lastRender=null,lastScene=null,countsForLastDevice=null;
function nativeRig(){const attachments=[],pose=[];lastScene?.traverse(node=>{if(node.isBone)pose.push(node.id,...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray());if(node.isMesh&&node._wgWalkAttachmentIndex!==undefined){let visible=true;for(let item=node;item;item=item.parent)visible&&=item.visible;if(visible)attachments.push({id:node.id,geometry:node.geometry.id,index:node._wgWalkAttachmentIndex});}if(node.isMesh&&node._wgWalkDuration!==undefined)pose.push(node.id,...node.matrixWorld.elements);});let hash=2166136261;for(const value of JSON.stringify(pose)){hash^=value.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}return {attachments,poseHash:hash};}
function counts(device){
 let result=devices.get(device);if(result)return result;result={};devices.set(device,result);
 for(const name of ['createBuffer','createTexture','createSampler','createBindGroup','createBindGroupLayout','createPipelineLayout','createShaderModule','createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']){
  const original=device[name];if(typeof original!=='function')continue;result[name]=0;device[name]=function(...args){result[name]++;return original.apply(this,args);};
 }
 return result;
}
WebGPURenderer.prototype.render=function(...args){
 lastScene=args[0];const current=counts(this.backend.device),before={...current};
 countsForLastDevice=current;try{return render.apply(this,args);}finally{lastRender=Object.fromEntries(Object.entries(current).map(([name,count])=>[name,count-before[name]]));}
};
self.postMessage=(message,...args)=>send(message.kind==='inspection'?{...message,qaNativeRig:nativeRig()}:message.kind==='nativeRouteResult'&&message.result&&typeof message.result==='object'?{...message,result:{...message.result,qaLastRenderFactories:lastRender,qaCumulativeFactories:lastScene?{...countsForLastDevice}:null}}:message,...args);
