import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuWallFragmentAssets} from '../src/rendering/webgpu-wall-fragments.js';

test('rigid effects share a graph but retain independent local lights and exclude world VFX slots',()=>{
 const scene=new THREE.Scene(),sun=new THREE.DirectionalLight(),ambient=new THREE.HemisphereLight(),worldPoint=new THREE.PointLight(),camera=new THREE.PerspectiveCamera();scene.add(sun,ambient,worldPoint);
 const assets=createWebGpuWallFragmentAssets({scene,kinds:['wood']}),a=new THREE.Group(),b=new THREE.Group();scene.add(a,b);const lighting=()=>({uEye:{value:new THREE.Vector3(0,1,2)},lightPos:[{value:new THREE.Vector3(1,0,0)},{value:new THREE.Vector3(0,1,0)}],lightCol:[{value:new THREE.Vector3(1,.3,0)},{value:new THREE.Vector3()}]}),la=lighting(),lb=lighting(),one=assets.instantiate(a,la),two=assets.instantiate(b,lb),meshA=a.children[0],meshB=b.children[0];
 const packed={wood:{count:1,data:new Float32Array(23)}};new THREE.Matrix4().toArray(packed.wood.data);packed.wood.data.set([.3,.2,.1],16);one.update(packed);two.update(packed);const transform=new THREE.Matrix4().makeTranslation(2,0,0);one.updateLighting(transform);two.updateLighting(new THREE.Matrix4());
 try{assert.equal(meshA.material,meshB.material);assert.deepEqual(meshA.material.lightsNode.getLights(),[sun,ambient]);assert.notEqual(meshA._wgVfxLightCol0,meshB._wgVfxLightCol0);la.lightCol[0].value.set(0,0,0);assert.equal(meshB._wgVfxLightCol0.x,1);assert.equal(meshA._wgVfxInverse.elements[12],2);assert.equal(meshB._wgVfxInverse.elements[12],0);
  const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;const builder=renderer.backend.createNodeBuilder(meshA,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/2\.2/);assert.match(builder.fragmentShader,/0\.15/);assert.match(builder.fragmentShader,/90\.0/);
 }finally{one.dispose();two.dispose();assets.dispose();}
});
