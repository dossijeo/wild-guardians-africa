import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';

test('replacing a resident native chunk releases the old mesh before adopting the new one',()=>{
  const scene=new THREE.Scene(),oldGroup=new THREE.Group(),nextGroup=new THREE.Group();
  const oldMesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());
  const nextMesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());
  oldGroup.add(oldMesh);nextGroup.add(nextMesh);scene.add(oldGroup);
  let releasedGeometry=0,releasedMaterial=0;
  oldMesh.geometry.addEventListener('dispose',()=>releasedGeometry++);
  oldMesh.material.addEventListener('dispose',()=>releasedMaterial++);
  const world={scene,chunks:new Map([['0,0',oldGroup]]),terrainMeshes:[oldMesh],
    chunkRevision:1,fluidMaterial:new THREE.MeshBasicMaterial(),
    chunkStream:{desired:new Map([['0,0',{}]]),summary:()=>({})},
    removeInstalledChunk:WorldScene.prototype.removeInstalledChunk,
    terrain(){this.terrainMeshes.push(nextMesh);return nextGroup;}};
  WorldScene.prototype.installChunk.call(world,{cx:0,cz:0});
  assert.equal(scene.children.includes(oldGroup),false);
  assert.equal(scene.children.includes(nextGroup),true);
  assert.equal(world.chunks.get('0,0'),nextGroup);
  assert.deepEqual(world.terrainMeshes,[nextMesh]);
  assert.equal(releasedGeometry,1);assert.equal(releasedMaterial,1);
  nextMesh.geometry.dispose();nextMesh.material.dispose();world.fluidMaterial.dispose();
});
