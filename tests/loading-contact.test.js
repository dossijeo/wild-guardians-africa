import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installLoadingContact} from '../src/rendering/loading-contact.js';
test('root contact reuses uniform storage and synchronizes only on explicit planting invalidation',()=>{
 const material=new THREE.MeshStandardMaterial(),onPlant=()=>{},plants=[{x:1,z:2}];
 const d={ground:{material},plants:{capacity:18,plants},onPlant};
 const contact=installLoadingContact(d),roots=contact.uniforms.uLoadingRoots.value;
 assert.equal(contact.uniforms.uLoadingRootCount.value,1);assert.deepEqual(roots[0].toArray(),[1,-2]);
 plants.push({x:-2,z:3});assert.equal(contact.uniforms.uLoadingRootCount.value,1);
 contact.sync();assert.equal(contact.uniforms.uLoadingRootCount.value,2);assert.equal(contact.uniforms.uLoadingRoots.value,roots);assert.deepEqual(roots[1].toArray(),[-2,-3]);assert.equal(d.onPlant,onPlant);
 material.dispose();
});
