import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLoadingSky} from '../src/rendering/loading-sky.js';
import {SKY_FRAGMENT} from '../src/rendering/sky-source.js';
test('loading sky borrows textures and geometry without altering or disposing world materials',()=>{
 const geometry=new THREE.BufferGeometry(),texture=new THREE.Texture(),material=new THREE.RawShaderMaterial({fragmentShader:SKY_FRAGMENT,uniforms:{uPanorama:{value:texture}}}),scene=new THREE.Scene();scene.add(new THREE.Mesh(geometry,material));
 const sky={scene,materials:[material],uniforms:{},render(){return this.scene;}},loading=createLoadingSky(sky);
 let worldDisposals=0,localDisposals=0;material.addEventListener('dispose',()=>worldDisposals++);texture.addEventListener('dispose',()=>worldDisposals++);geometry.addEventListener('dispose',()=>worldDisposals++);loading.materials[0].addEventListener('dispose',()=>localDisposals++);
 assert.equal(material.fragmentShader,SKY_FRAGMENT);assert.notEqual(loading.materials[0].fragmentShader,SKY_FRAGMENT);assert.equal(loading.materials[0].uniforms.uPanorama.value,texture);assert.equal(loading.scene.children[0].geometry,geometry);assert.equal(loading.render(),loading.scene);
 loading.dispose();loading.dispose();assert.equal(worldDisposals,0);assert.equal(localDisposals,1);assert.equal(scene.children.length,1);
});
