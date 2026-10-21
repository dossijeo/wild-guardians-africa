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
 // The visible shafts rise toward screen (.48, 1); cast shadows must run away
 // from that source, including portrait framing and the loading camera orbit.
 for(const aspect of [1280/720,390/844])for(const angle of [-10,0,10]){
  camera.aspect=aspect;camera.position.copy(p).applyAxisAngle(new THREE.Vector3(0,1,0),angle*Math.PI/180);camera.lookAt(0,1.15,0);camera.updateProjectionMatrix();beam.update();
  const light=sun.position.clone().sub(sun.target.position).normalize();
  assert.ok(light.y>0,'source must remain above the ground');
  const tip=new THREE.Vector3(0,2,0),shadow=tip.clone().addScaledVector(light,-(tip.y-.09)/light.y);
  const a=tip.project(camera),b=shadow.project(camera),away=new THREE.Vector2((b.x-a.x)*aspect,b.y-a.y).normalize();
  assert.ok(away.dot(new THREE.Vector2(-.48,-1).normalize())>.99999,`shadow opposes beam at aspect ${aspect}, orbit ${angle}`);
 }
 beam.dispose();beam.dispose();assert.equal(renderer.shadowMap.render,original);assert.equal(map,1);assert.equal(fallback,1);assert.equal(uniforms.uNativeShadowFiltered.value,null);
 ground.geometry.dispose();ground.material.dispose();
});
