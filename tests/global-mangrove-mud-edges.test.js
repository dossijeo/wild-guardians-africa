import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {bindMangroveMudEdges} from '../src/rendering/global-mangrove-mud-edges.js';
test('mud edge preparation preserves positions and owns replacement material across quality paths',()=>{
 for(const quality of ['media','muy_baja']){
  const group=new THREE.Group();group.userData.nativeChunkOrigin=[0,0];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,0,1,1,0,1],3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(Array(4).fill([0,1,0]).flat(),3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(Array(12).fill(.5),3));
  const ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());ground.userData.ground=true;let retained=0;
  Object.assign(ground.material.userData,{toonGround:true,groundBiome:'mangrove',mangroveSubstrate:true,biomeGround:{uGroundLayered:{value:0}},retainBiomeGround:()=>retained++});group.add(ground);
  const mudGeometry=new THREE.BufferGeometry();mudGeometry.setAttribute('position',new THREE.Float32BufferAttribute([.2,.024,.2,.6,.024,.2,.2,.024,.6],3));mudGeometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));mudGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));mudGeometry.userData.mudOutlines=[[[0,0],[1,0],[0,1]]];
  const texture=new THREE.Texture(),old=new THREE.MeshStandardMaterial({map:texture,normalMap:texture,roughnessMap:texture}),mud=new THREE.Mesh(mudGeometry,old);mud.name='mangrove-mud-patches';group.add(mud);
  let disposed=0,textureDisposed=0;old.addEventListener('dispose',()=>disposed++);texture.addEventListener('dispose',()=>textureDisposed++);
  const positions=[...mudGeometry.attributes.position.array],toon=new AfricanToon();toon.globalVisualLighting=true;bindMangroveMudEdges({quality,toon},group);
  assert.deepEqual([...mudGeometry.attributes.position.array],positions);assert.equal(retained,1);assert.equal(disposed,1);assert.equal(textureDisposed,0);assert.equal(mudGeometry.attributes.qaMudEdge.count,3);
  const shader={...(quality==='muy_baja'?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};mud.material.onBeforeCompile(shader,{});
  assert.ok(shader.fragmentShader.includes(quality==='muy_baja'?'vec3 mudUp=normalize(vToonLowNormal);':'vec3 mudUp=normalize(inverseTransformDirection(normalize(vNormal),viewMatrix));'));
  mud.material.dispose();ground.material.dispose();geometry.dispose();mudGeometry.dispose();texture.dispose();toon.shadowUniforms.fallback.dispose();
 }
});
