import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {NativeSky} from '../../src/rendering/sky.js';
import {createWebGpuNativeSky} from '../../src/rendering/webgpu-native-sky.js';
self.onmessage=async({data})=>{let renderer,sky,target;try{
 if(data.mode==='webgpu'){const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};renderer=new WebGPURenderer({canvas:data.canvas,antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend required');}else renderer=new THREE.WebGLRenderer({canvas:data.canvas,antialias:false});
 renderer.setSize(256,256,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;const camera=new THREE.PerspectiveCamera(42,1,.1,500);camera.position.set(40,35,50);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);const scene=new THREE.Scene();
 if(data.mode==='webgpu'){sky=createWebGpuNativeSky({scene,onError:error=>{throw error;}});if(!await sky.ready)throw Error('Sky failed');}else{sky=new NativeSky();await sky.load();}
 target=data.mode==='webgpu'?new THREE.RenderTarget(256,256,{depthBuffer:true}):new THREE.WebGLRenderTarget(256,256,{depthBuffer:true});renderer.setRenderTarget(target);const frames=[];for(const state of [{day:1,time:30},{day:1,time:300.3},{day:1,time:400}]){if(data.mode==='webgpu'){sky.update(camera,state);renderer.render(scene,camera);}else sky.render(renderer,camera,state);const pixels=data.mode==='webgpu'?await renderer.readRenderTargetPixelsAsync(target,0,0,256,256):(()=>{const a=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,a);return a;})();frames.push(pixels);}
 self.postMessage({mode:data.mode,frames});
 }catch(error){self.postMessage({error:String(error?.stack??error)});}finally{target?.dispose();sky?.dispose();renderer?.dispose();close();}};
