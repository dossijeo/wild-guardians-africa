import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createSharedCharacterFallback} from '../../src/labs/shared-character-material.js';

const result={errors:[]};window.sharedMaterialGpuResult=result;
try{
 const renderer=new WebGPURenderer({canvas:document.querySelector('#view'),antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU fallback rejected');
 renderer.setSize(128,64,false);renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,1,-1,.1,10);camera.position.z=5;scene.add(new THREE.AmbientLight(0xffffff,2));
 const target=new THREE.RenderTarget(128,64,{depthBuffer:true,stencilBuffer:false});renderer.setRenderTarget(target);
 const pixel=(bytes,x)=>Array.from(bytes.slice((32*128+x)*4,(32*128+x)*4+4));
 async function draw(){renderer.render(scene,camera);const bytes=await renderer.readRenderTargetPixelsAsync(target,0,0,128,64);return {left:pixel(bytes,32),right:pixel(bytes,96)};}
 function image(r,g,b){const value=new THREE.DataTexture(new Uint8Array([r,g,b,255]),1,1,THREE.RGBAFormat);value.colorSpace=THREE.SRGBColorSpace;value.needsUpdate=true;return value;}
 async function trial(withMap){
  const red=image(255,0,0),green=image(0,255,0),sourceA=new THREE.MeshStandardMaterial({color:withMap?0xffffff:0xff0000,map:withMap?red:null,roughness:1}),sourceB=new THREE.MeshStandardMaterial({color:withMap?0xffffff:0x00ff00,map:withMap?green:null,roughness:1});
  const geometry=new THREE.PlaneGeometry(1.5,1.5),a=new THREE.Mesh(geometry,sourceA),b=new THREE.Mesh(geometry,sourceB),shared=createSharedCharacterFallback(sourceA);a.position.x=-1;b.position.x=1;
  if(!shared.bind(a,sourceA)||!shared.bind(b,sourceB))throw Error('Test material not eligible');a.material=b.material=shared.material;scene.add(a,b);
  const before=await draw(),pipelineBefore=window.__pipelineCount??0;
  if(withMap){shared.parameters(a).map=green;shared.parameters(b).map=red;}else{shared.parameters(a).color.setRGB(0,1,0);shared.parameters(b).color.setRGB(1,0,0);}
  const after=await draw(),pipelineAfter=window.__pipelineCount??0;
  scene.remove(a,b);shared.release(a);shared.release(b);shared.dispose();geometry.dispose();sourceA.dispose();sourceB.dispose();red.dispose();green.dispose();
  return {before,after,pipelineBefore,pipelineAfter};
 }
 result.backend='WebGPU real';result.uniform=await trial(false);result.texture=await trial(true);renderer.setRenderTarget(null);target.dispose();renderer.dispose();result.done=true;
}catch(error){result.errors.push(String(error?.stack??error));result.done=true;}
