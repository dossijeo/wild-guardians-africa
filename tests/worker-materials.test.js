import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareWorkerMaterials} from '../src/rendering/worker-materials.js';
test('older male matte response leaves tools, oral tissue, maps and other profiles intact',()=>{
 for(const profile of ['olderMale','olderFemale','youngMale','youngFemale']){
  const model=new THREE.Group();
  const materials=['BakedMaterial','Acero mate','Worker oral tissue'].map(name=>{const m=new THREE.MeshStandardMaterial({roughness:.4,metalness:.3});m.name=name;m.normalMap=new THREE.Texture();return m;});
  const maps=materials.map(m=>m.normalMap);model.add(new THREE.Mesh(new THREE.BoxGeometry(),materials));
  prepareWorkerMaterials(model,profile);
  materials.forEach((m,i)=>{assert.equal(m.normalMap,maps[i]);if(profile==='olderMale'&&i===0){assert.equal(m.userData.matteWorkerBody,true);assert.equal(m.roughness,.88);assert.equal(m.metalness,0);}else{assert.equal(m.userData.matteWorkerBody,undefined);assert.equal(m.roughness,.4);assert.equal(m.metalness,.3);}});
 }
});
