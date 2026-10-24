import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {bindMangroveMudEdges,bindMangroveMudEdgesSteps,configureMangroveMudMaterial} from '../src/rendering/global-mangrove-mud-edges.js';
import {updateGroundQuality} from '../src/rendering/render-quality.js';
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
  const replacementQuality=quality==='muy_baja'?'media':'muy_baja';const before=mud.material;let released=0;before.addEventListener('dispose',()=>released++);
  assert.equal(updateGroundQuality([mud],replacementQuality,m=>configureMangroveMudMaterial({toon},m.material)),1);
  assert.equal(released,1);assert.equal(retained,2);assert.equal(mud.material.userData.mangroveMudTextures.base,texture);
  const changed={...(replacementQuality==='muy_baja'?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};mud.material.onBeforeCompile(changed,{});assert.ok(changed.fragmentShader.includes('qaMudToon'));assert.equal(textureDisposed,0);
  mud.material.dispose();ground.material.dispose();geometry.dispose();mudGeometry.dispose();texture.dispose();toon.shadowUniforms.fallback.dispose();
 }
});


function steppedFixture(){
 const group=new THREE.Group();group.userData.nativeChunkOrigin=[0,0];
 const groundGeometry=new THREE.BufferGeometry();
 groundGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,0,1,1,0,1],3));
 groundGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(Array(4).fill([0,1,0]).flat(),3));
 groundGeometry.setAttribute('color',new THREE.Float32BufferAttribute(Array(4).fill([.2,.4,.8]).flat(),3));
 const ground=new THREE.Mesh(groundGeometry,new THREE.MeshStandardMaterial());ground.userData.ground=true;group.add(ground);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Array(300).fill([.2,.024,.2,.6,.024,.2,.2,.024,.6]).flat(),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Array(900).fill([0,1,0]).flat(),3));g.userData.mudOutlines=[[[0,0],[1,0],[0,1]]];
 const mud=new THREE.Mesh(g,new THREE.MeshStandardMaterial());mud.name='mangrove-mud-patches';group.add(mud);
 return {group,mud,world:{quality:'media',toon:{material(){}}},dispose(){group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
test('incremental mud edges publish byte-identical attributes only at completion',()=>{
 const a=steppedFixture(),b=steppedFixture();bindMangroveMudEdges(a.world,a.group);
 const old=b.mud.material,normal=[...b.mud.geometry.attributes.normal.array],steps=bindMangroveMudEdgesSteps(b.world,b.group);let count=0;
 for(let step=steps.next();!step.done;step=steps.next()){
  count++;assert.equal(b.mud.material,old);assert.equal(b.mud.geometry.attributes.qaMudEdge,undefined);assert.deepEqual([...b.mud.geometry.attributes.normal.array],normal);
 }
 assert.ok(count>=6);
 for(const name of ['position','normal','color','qaMudEdge'])assert.deepEqual(b.mud.geometry.attributes[name].array,a.mud.geometry.attributes[name].array);
 assert.equal(b.mud.material.customProgramCacheKey(),a.mud.material.customProgramCacheKey());a.dispose();b.dispose();
});
test('cancelling staged mud edges leaves original material and attributes owned by the chunk',()=>{
 const f=steppedFixture(),old=f.mud.material;let disposed=0;old.addEventListener('dispose',()=>disposed++);
 const steps=bindMangroveMudEdgesSteps(f.world,f.group);steps.next();steps.next();steps.return();
 assert.equal(f.mud.material,old);assert.equal(disposed,0);assert.equal(f.mud.geometry.attributes.qaMudEdge,undefined);f.dispose();
});
