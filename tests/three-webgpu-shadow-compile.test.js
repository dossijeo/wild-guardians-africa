import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';

test('shadow compilation uses the actual shadow context and restores renderer state before awaiting',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight(),object=new THREE.Group();
 const originalTarget={},shadowTarget={depth:1,setSize(w,h,d){assert.deepEqual([w,h,d],[512,512,1]);}};
 light.shadow.map=shadowTarget;camera.layers.enable(3);const originalMask=light.shadow.camera.layers.mask;
 const background=new THREE.Color(0x123456),override=new THREE.MeshBasicMaterial();scene.background=background;scene.overrideMaterial=override;
 let target=originalTarget,mrt={has:()=>false},finish;
 const renderer={_initialized:true,_isDeviceLost:false,shadowMap:{type:THREE.PCFShadowMap},toneMapping:0,toneMappingExposure:1,outputColorSpace:'srgb',autoClear:false,
  getRenderTarget:()=>target,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>3,getRenderObjectFunction:()=>null,getPixelRatio:()=>1,getMRT:()=>mrt,getClearColor:color=>color.set(0xabcdef),getClearAlpha:()=>.4,getScissorTest:()=>false,
  setMRT(value){mrt=value;},setRenderObjectFunction(){},setClearColor(){},setRenderTarget(value){target=value;},setPixelRatio(){},setScissorTest(){},
  compileAsync(root,shadowCamera,targetScene){assert.equal(root,object);assert.equal(shadowCamera,light.shadow.camera);assert.equal(targetScene,scene);assert.equal(target,shadowTarget);assert.equal(this._wgCompileSceneReference,scene);assert.equal(typeof this._wgCompileRenderObjectFunction,'function');assert.equal(scene.overrideMaterial.isShadowPassMaterial,true);assert.equal(scene.background,null);assert.equal(shadowCamera.layers.mask,camera.layers.mask);return new Promise(resolve=>{finish=resolve;});}
 };
 const pending=WebGPURenderer.prototype.compileShadowAsync.call(renderer,object,scene,camera,light);
 assert.equal(target,originalTarget);assert.equal(scene.background,background);assert.equal(scene.overrideMaterial,override);assert.equal(light.shadow.camera.layers.mask,originalMask);assert.equal(renderer._wgCompileSceneReference,undefined);finish();await pending;override.dispose();
});

test('shadow compilation fails closed before a shadow target exists',()=>{
 const light=new THREE.DirectionalLight(),renderer={_initialized:true,_isDeviceLost:false};
 assert.throws(()=>WebGPURenderer.prototype.compileShadowAsync.call(renderer,new THREE.Group(),new THREE.Scene(),new THREE.PerspectiveCamera(),light),/unavailable/);
});
