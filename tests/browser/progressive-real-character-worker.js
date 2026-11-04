import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {deserializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {createWebGpuConfirmedAnimal} from '../../src/rendering/webgpu-confirmed-animal.js';
let renderer,scene,camera,actor,frame,afterPreviewPipelines=0,draws=0,pipelines=0,configured=0;
self.onmessage=async({data})=>{try{
 if(data.kind==='init'){
  const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};
  renderer=new WebGPURenderer({canvas:data.canvas,antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');renderer.setSize(512,512,false);if(data.forceWebp){const hasFeature=renderer.hasFeature.bind(renderer);renderer.hasFeature=name=>name==='texture-compression-bc'?false:hasFeature(name);}
  const device=renderer.backend.device;for(const name of ['createRenderPipeline','createRenderPipelineAsync']){const original=device[name].bind(device);device[name]=(...args)=>{pipelines++;return original(...args);};}
  scene=new THREE.Scene();scene.background=new THREE.Color('#71868a');scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-6,12,9);scene.add(sun);
  const state=deserializeConfirmedState(data.snapshot),entity=state.raid.animals.find(a=>a.id===data.actorId);camera=new THREE.PerspectiveCamera(45,1,.1,500);camera.coordinateSystem=renderer.coordinateSystem;camera.position.set(entity.x+6,5,entity.z+8);camera.lookAt(entity.x,1,entity.z);
  function render(now){try{actor?.tick(now);renderer.render(scene,camera);draws++;frame=requestAnimationFrame(render);}catch(e){self.postMessage({kind:'error',message:String(e.stack??e)});}}frame=requestAnimationFrame(render);
  actor=await createWebGpuConfirmedAnimal({renderer,scene,residency:{get:()=>null},state,actorId:data.actorId,packageUrl:data.packageUrl,configureMaterial:material=>{if(!material.isNodeMaterial||material.positionNode)throw Error('Incompatible material hook');configured++;},onTextureError:error=>self.postMessage({kind:'textureError',draws,message:String(error.stack??error)}),onTextured:()=>self.postMessage({kind:'textured',draws,pipelines,afterPreviewPipelines})});
  if(!configured)throw Error('No configurable character material');self.postMessage({kind:'preview',draws,configured});
 }else if(data.kind==='previewCompiled'){afterPreviewPipelines=pipelines;self.postMessage({kind:'previewCompiled',draws,pipelines});}
 else if(data.kind==='dispose'){cancelAnimationFrame(frame);actor?.dispose();renderer?.dispose();close();}
 }catch(error){self.postMessage({kind:'error',message:String(error.stack??error)});}};
