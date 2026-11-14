import './webgpu-preparation-stall-worker.js';
import {WebGPURenderer} from 'three/webgpu';
// Test-only instrumentation around the same production renderer and Worker.
// Compare factories inside render(), separately from asynchronous admission.
const devices=new WeakMap(),render=WebGPURenderer.prototype.render,send=self.postMessage.bind(self);
let lastRender=null;
function counts(device){
 let result=devices.get(device);if(result)return result;result={};devices.set(device,result);
 for(const name of ['createBuffer','createTexture','createSampler','createBindGroup','createBindGroupLayout','createPipelineLayout','createShaderModule','createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']){
  const original=device[name];if(typeof original!=='function')continue;result[name]=0;device[name]=function(...args){result[name]++;return original.apply(this,args);};
 }
 return result;
}
WebGPURenderer.prototype.render=function(...args){
 const current=counts(this.backend.device),before={...current};
 try{return render.apply(this,args);}finally{lastRender=Object.fromEntries(Object.entries(current).map(([name,count])=>[name,count-before[name]]));}
};
self.postMessage=(message,...args)=>send(message.kind==='nativeRouteResult'&&message.result&&typeof message.result==='object'?{...message,result:{...message.result,qaLastRenderFactories:lastRender}}:message,...args);
