import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {GuardianVortexWebGPU} from './guardian-vortex-webgpu.js';

self.onmessage=async({data})=>{
 try{
  let webglRequests=0;const getContext=OffscreenCanvas.prototype.getContext;
  OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind)){webglRequests++;throw Error('WebGL context forbidden in pure WebGPU test');}return getContext.call(this,kind,...args);};
  const renderer=new WebGPURenderer({canvas:data.canvas,alpha:true,antialias:true});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');renderer.setSize(400,400,false);
  const device=renderer.backend.device,calls=[],errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const shaderHashes=new WeakMap(),createShader=device.createShaderModule.bind(device);device.createShaderModule=descriptor=>{const module=createShader(descriptor);let hash=2166136261;for(let i=0;i<descriptor.code.length;i++)hash=Math.imul(hash^descriptor.code.charCodeAt(i),16777619);shaderHashes.set(module,{hash:(hash>>>0).toString(16),...(data.captureShaders?{code:descriptor.code}:{})});return module;};
  for(const name of ['createRenderPipeline','createRenderPipelineAsync']){const original=device[name].bind(device);device[name]=(...args)=>{const descriptor=args[0],vertex=shaderHashes.get(descriptor.vertex?.module),fragment=shaderHashes.get(descriptor.fragment?.module);calls.push({name,at:performance.now(),label:descriptor.label??'',vertex:vertex?.hash??null,fragment:fragment?.hash??null,...(data.captureShaders?{vertexCode:vertex?.code??null}:{}),topology:descriptor.primitive?.topology??null,format:descriptor.fragment?.targets?.map(target=>target?.format),depth:descriptor.depthStencil?.format??null,samples:descriptor.multisample?.count??1});return original(...args);};}
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.8,.8,.8,-.8,.01,10);camera.position.set(0,0,2);camera.lookAt(0,0,0);
  const baseline=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),new THREE.MeshBasicMaterial({color:0xffffff}));scene.add(baseline);
  const vortex=new GuardianVortexWebGPU();vortex.scale.setScalar(.32);vortex.update(.7,0xb8edce,3,-1.5,true);
  const intervals=[],start=performance.now();let frame=0,previous=0,ready=false,failed=null,requestedAt=null,resolvedAt=null,appliedAt=null;
  function tick(now){
   if(failed||errors.length)return self.postMessage({error:failed??errors.join('; ')});
   if(previous)intervals.push(now-previous);previous=now;
   if(frame===30){requestedAt=performance.now()-start;let pending;const previousTarget=renderer.getRenderTarget();try{if(data.matchTarget){const target=renderer._getFrameBufferTarget();if(!target)throw Error('Missing framebuffer target');renderer.setRenderTarget(target);}pending=renderer.compileAsync(vortex,camera,scene);}finally{renderer.setRenderTarget(previousTarget);}pending.then(()=>{ready=true;resolvedAt=performance.now()-start;},e=>{failed=String(e?.stack??e);});}
   if(ready&&appliedAt===null){scene.add(vortex);appliedAt=performance.now()-start;}
   baseline.rotation.y=frame*.01;renderer.render(scene,camera);frame++;
   if(frame<180||appliedAt===null&&frame<900)requestAnimationFrame(tick);else{if(appliedAt===null)return self.postMessage({error:'Compilation timed out'});self.postMessage({backend:'WebGPU',webglRequests,requestedAt,resolvedAt,appliedAt,calls:calls.map(call=>({...call,at:call.at-start})),intervals,errors});vortex.dispose();renderer.dispose();}
  }
  requestAnimationFrame(tick);
 }catch(error){self.postMessage({error:String(error?.stack??error)});}
};
