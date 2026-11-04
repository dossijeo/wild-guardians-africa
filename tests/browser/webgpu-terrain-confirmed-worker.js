import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainReceiver} from '../../src/rendering/confirmed-terrain-receiver.js';

let renderer,scene,camera,residency,receiver,material,session;
self.onmessage=async({data})=>{try{
 if(data.kind==='init'){
  const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};
  session=data.session;renderer=new WebGPURenderer({canvas:data.canvas,antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU unavailable');renderer.setSize(512,512,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color('#9eb3b0');material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});residency=createWebGpuTerrainResidency({scene,material});receiver=createConfirmedTerrainReceiver({port:data.port,session,residency,onError:error=>self.postMessage({kind:'error',message:error.message})});
  camera=new THREE.PerspectiveCamera(45,1,.1,500);camera.coordinateSystem=renderer.coordinateSystem;camera.position.set(data.cx*48+45,55,data.cz*48+55);camera.lookAt(data.cx*48,0,data.cz*48);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);self.postMessage({kind:'ready',backend:'WebGPU'});
 }else if(data.kind==='confirm')receiver.confirm(data.sequence);
 else if(data.kind==='status')self.postMessage({kind:'status',id:data.id,resident:residency.size,receiver:receiver.status(),keys:data.keys.map(key=>{const [x,z]=key.split(',').map(Number),mesh=residency.get(x,z);return {key,present:!!mesh,revision:mesh?.userData.spatialTerrainRevision??null};})});
 else if(data.kind==='capture'){
  scene.updateMatrixWorld(true);const target=new THREE.RenderTarget(512,512,{depthBuffer:true});renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);const draws=renderer.info.render.drawCalls,pixels=await renderer.readRenderTargetPixelsAsync(target,0,0,512,512);let nonBackground=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>6)nonBackground++;renderer.setRenderTarget(null);target.dispose();self.postMessage({kind:'capture',id:data.id,draws,nonBackground});
 }else if(data.kind==='dispose'){receiver.dispose();residency.dispose();material.dispose();renderer.dispose();close();}
 }catch(error){self.postMessage({kind:'error',message:String(error?.stack??error)});}};
