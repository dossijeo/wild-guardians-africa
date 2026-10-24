import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installOrderedFarTransition,setOrderedFarTransition,prepareOrderedFarTransitions,orderedFarStats} from '../tools/experiments/qa-ordered-far-transition-20261022.js';
test('ordered far QA preserves canonical identities/readiness and caches unchanged packing',()=>{
 const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,0,0]),3));
 g.setAttribute('aTreeBase',new THREE.InstancedBufferAttribute(new Float32Array([0,0,-3,0,0,-1,0,0,-2]),3));
 g.setAttribute('aTreeScale',new THREE.InstancedBufferAttribute(new Float32Array(9).fill(1),3));
 g.setAttribute('aTreeReady',new THREE.InstancedBufferAttribute(new Float32Array([.3,.1,.2]),1));g.instanceCount=3;
 const m=new THREE.ShaderMaterial({uniforms:{uSize:{value:new THREE.Vector2(1,1)}}}),mesh=new THREE.Mesh(g,m),camera=new THREE.PerspectiveCamera();camera.updateMatrixWorld();
 const canonical=Array.from(g.attributes.aTreeBase.array);installOrderedFarTransition(mesh);
 try{
  setOrderedFarTransition(true);prepareOrderedFarTransitions(null,null,camera);
  assert.deepEqual(Array.from(mesh.geometry.attributes.aTreeBase.array),[0,0,-3,0,0,-2,0,0,-1]);
  assert.deepEqual(Array.from(mesh.geometry.attributes.aTreeReady.array),[Math.fround(.3),Math.fround(.2),Math.fround(.1)]);
  assert.deepEqual(Array.from(g.attributes.aTreeBase.array),canonical);
  const packs=orderedFarStats.packs,version=mesh.geometry.attributes.aTreeReady.version;prepareOrderedFarTransitions(null,null,camera);
  assert.equal(orderedFarStats.packs,packs);assert.equal(mesh.geometry.attributes.aTreeReady.version,version);
  g.attributes.aTreeReady.setX(1,.7);g.attributes.aTreeReady.needsUpdate=true;prepareOrderedFarTransitions(null,null,camera);
  assert.equal(mesh.geometry.attributes.aTreeReady.getX(2),Math.fround(.7));
  setOrderedFarTransition(false);assert.equal(mesh.geometry,g);assert.equal(mesh.material,m);assert.equal(mesh.children[0].visible,false);
 }finally{setOrderedFarTransition(false);g.dispose();m.dispose();}
});
