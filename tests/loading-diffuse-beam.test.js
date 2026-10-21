import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadingDiffuseEnabled,installLoadingDiffuseBeam} from '../src/rendering/loading-diffuse-beam.js';
import {createNativeShadowUniforms} from '../src/rendering/native-shadow.js';

test('diffuse option is explicit and does not replace the original oblique option',()=>{
 assert.equal(loadingDiffuseEnabled(''),false);assert.equal(loadingDiffuseEnabled('?loadingBeam=oblique'),false);assert.equal(loadingDiffuseEnabled('?loadingBeam=diffuse'),true);
});
test('diffuse owner releases its shadow map and fallback once and restores the world hook',()=>{
 const original=()=>{},renderer={shadowMap:{render:original,enabled:true,autoUpdate:true}},scene=new THREE.Scene(),ground=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial()),camera=new THREE.PerspectiveCamera(40,1,.1,80),sun=new THREE.DirectionalLight();scene.add(ground,sun);camera.position.set(4.8,3.1,6.4);camera.lookAt(0,1.15,0);
 const uniforms=createNativeShadowUniforms(),d={world:{renderer},scene,ground,camera,sun,toon:{shadowUniforms:uniforms},plants:{plants:[{x:0,z:0}]},mist:{day:new THREE.Color(),night:new THREE.Color(),material:{fragmentShader:'float shaft=0.;vec3 light=vec3(.5,.66,.92);float edge=loadingFocusEdge();'}}};
 let fallback=0,map=0;uniforms.fallback.addEventListener('dispose',()=>fallback++);
 const beam=installLoadingDiffuseBeam(d);sun.shadow.map=new THREE.WebGLRenderTarget(512,512);sun.shadow.map.addEventListener('dispose',()=>map++);
 assert.notEqual(renderer.shadowMap.render,original);const p=camera.position.clone();beam.update();assert.deepEqual(camera.position,p);
 beam.dispose();beam.dispose();assert.equal(renderer.shadowMap.render,original);assert.equal(map,1);assert.equal(fallback,1);assert.equal(uniforms.uNativeShadowFiltered.value,null);
 ground.geometry.dispose();ground.material.dispose();
});
