import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import wasmUrl from '../../src/world/wild-engine/spatial-savanna.wasm?url';

self.onmessage=async({data})=>{
 let core,renderer,residency,material;
 try{
  const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden in terrain WebGPU test');return original.call(this,kind,...args);};
  const response=await fetch(wasmUrl);if(!response.ok)throw Error('Wild Engine WASM unavailable');const module=await WebAssembly.compile(await response.arrayBuffer());core=createSpatialWorld(module);
  const start=performance.now();core.generate(712,0,0,data.biome,data.biome==='manglares'?{mangroveNetwork:true}:{});const payload=core.chunkPayload(),generatedMs=performance.now()-start;
  renderer=new WebGPURenderer({canvas:data.canvas,antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');renderer.setSize(512,512,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const errors=[];renderer.backend.device.addEventListener('uncapturederror',e=>errors.push(e.error.message));const scene=new THREE.Scene();scene.background=new THREE.Color('#9eb3b0');material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});residency=createWebGpuTerrainResidency({scene,material});
  const installStart=performance.now();if(!residency.replace(payload,1))throw Error('Native terrain rejected');const installMs=performance.now()-installStart,mesh=residency.get(0,0);
  const camera=new THREE.PerspectiveCamera(45,1,.1,300);camera.coordinateSystem=renderer.coordinateSystem;camera.position.set(45,55,55);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);const target=new THREE.RenderTarget(512,512,{depthBuffer:true});renderer.setRenderTarget(target);
  const compileStart=performance.now();await renderer.compileAsync(scene,camera);const compileMs=performance.now()-compileStart;
  const submitStart=performance.now();renderer.render(scene,camera);const submitMs=performance.now()-submitStart,drawCalls=renderer.info.render.drawCalls;await renderer.backend.device.queue.onSubmittedWorkDone();if(errors.length)throw Error(errors.join('; '));
  const pixels=await renderer.readRenderTargetPixelsAsync(target,0,0,512,512);let nonBackground=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>6)nonBackground++;const pixelHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))).map(v=>v.toString(16).padStart(2,'0')).join('');renderer.setRenderTarget(null);target.dispose();
  self.postMessage({backend:'WebGPU',biome:data.biome,mangroveNetwork:data.biome==='manglares',generatedMs,installMs,compileMs,submitMs,vertexCount:mesh.geometry.attributes.position.count,indexCount:mesh.geometry.index.count,resident:residency.size,centerHeight:mesh.geometry.attributes.position.getY(24*49+24),drawCalls,nonBackground,pixelHash,errors});
 }catch(error){self.postMessage({error:String(error?.stack??error)});}
 finally{residency?.dispose();material?.dispose();renderer?.dispose();core?.dispose();}
};
