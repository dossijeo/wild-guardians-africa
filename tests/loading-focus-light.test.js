import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LoadingFocusLight} from '../src/rendering/loading-focus-light.js';
import {LoadingMist} from '../src/rendering/loading-mist.js';
import {AfricanToon} from '../src/rendering/african-toon.js';

test('focus preserves the existing toon/alpha shader pipeline and original vertex recipe',()=>{
 const material=new THREE.MeshStandardMaterial(),scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(),material));
 const toon=new AfricanToon();toon.apply(scene);const before=material.customProgramCacheKey();
 const reference={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
 material.onBeforeCompile(reference,{});const focus=new LoadingFocusLight();focus.apply(material);
 const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.vertexShader,reference.vertexShader);
 assert.equal(shader.fragmentShader.split('#include <opaque_fragment>').length,2);
 assert.ok(shader.fragmentShader.indexOf('outgoingLight*=loadingFocusGain();')>shader.fragmentShader.indexOf('outgoingLight=toLinear4'));
 assert.strictEqual(shader.uniforms.uLoadingFocusSize,focus.uniforms.uLoadingFocusSize);
 assert.strictEqual(shader.uniforms.uNightLight,reference.uniforms.uNightLight);
 assert.equal(material.customProgramCacheKey(),before+'|loading-focus-light-v4');
 material.dispose();scene.children[0].geometry.dispose();toon.shadowUniforms.fallback.dispose();
});

test('focus uses current camera and drawing buffer without replacing uniform storage',()=>{
 const light=new LoadingFocusLight(),camera=new THREE.PerspectiveCamera(40,1280/720,.1,80),target=new THREE.Vector3(0,1.15,0);
 camera.position.set(4.8,3.1,6.4);camera.lookAt(target);
 const size=light.uniforms.uLoadingFocusSize.value,centre=light.uniforms.uLoadingFocusCentre.value;
 const renderer={getDrawingBufferSize:vector=>vector.set(1280,720)};
 for(let i=0;i<50;i++){light.update(renderer,camera,target,i/49);assert.strictEqual(light.uniforms.uLoadingFocusSize.value,size);assert.strictEqual(light.uniforms.uLoadingFocusCentre.value,centre);assert.ok(Math.abs(centre.x-.5)<1e-12&&Math.abs(centre.y-.5)<1e-12);}
 assert.deepEqual(size.toArray(),[1280,720]);assert.equal(light.uniforms.uLoadingFocusNight.value,1);
 camera.position.set(-6,4.5,11);camera.lookAt(target);light.update(renderer,camera,target,1);
 assert.ok(Math.abs(centre.x-.5)<1e-12&&Math.abs(centre.y-.5)<1e-12);
 camera.lookAt(camera.position.clone().add(new THREE.Vector3(0,10,0)));light.update(renderer,camera,target,1);
 assert.equal(light.uniforms.uLoadingFocusAmount.value,0);
});

test('disabled comparison and degenerate focus remain finite through sky handoff',()=>{
 const light=new LoadingFocusLight({enabled:false}),camera=new THREE.PerspectiveCamera(),renderer={getDrawingBufferSize:v=>v.set(420,900)};
 light.update(renderer,camera,camera.position,0);
 assert.equal(light.uniforms.uLoadingFocusAmount.value,0);assert.ok(light.uniforms.uLoadingFocusCentre.value.toArray().every(Number.isFinite));
});

test('existing haze draw owns only its material and shares focus uniforms',()=>{
 const geometry=new THREE.BufferGeometry(),sky={geometry,uniforms:{}},focus=new LoadingFocusLight(),mist=new LoadingMist(sky,focus.uniforms);let disposed=false;
 geometry.addEventListener('dispose',()=>disposed=true);
 assert.match(mist.material.fragmentShader,/^precision highp float;/);
 assert.strictEqual(mist.material.uniforms.uLoadingFocusSize,focus.uniforms.uLoadingFocusSize);
 assert.equal(mist.scene.children.length,1);assert.strictEqual(mist.scene.children[0].geometry,geometry);
 mist.dispose();assert.equal(disposed,false);geometry.dispose();
});
