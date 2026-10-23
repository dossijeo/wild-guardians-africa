import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {observeMangroveChunks} from '../tools/experiments/qa-mangrove-chunk-events-20261023.js';
function chunk(biome='mangrove'){
 const group=new THREE.Group(),material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(),material);
 material.userData.groundBiome=biome;material.userData.retainBiomeGround=()=>{};mesh.userData.ground=true;group.add(mesh);return group;
}
test('existing and streamed chunks notify once; removal precedes material disposal',()=>{
 const world={scene:new THREE.Scene(),chunks:new Map()},a=chunk(),events=[];world.chunks.set('0,0',a);world.scene.add(a);
 const observer=observeMangroveChunks(world,{add:r=>events.push(['add',r.key]),remove:r=>events.push(['remove',r.key])});
 const b=chunk();world.chunks.set('1,0',b);world.scene.add(b);world.scene.remove(a);world.chunks.delete('0,0');
 assert.deepEqual(events,[['add','0,0'],['add','1,0'],['remove','0,0']]);assert.equal(observer.records.size,1);
 observer.dispose();observer.dispose();assert.deepEqual(events.at(-1),['remove','1,0']);assert.equal(observer.records.size,0);
 world.scene.add(chunk());assert.equal(events.length,4);
});
test('quality clones register through existing retain callback; unrelated biome is ignored',()=>{
 const world={scene:new THREE.Scene(),chunks:new Map()},a=chunk(),other=chunk('savanna'),clones=[];world.chunks.set('0,0',a);world.chunks.set('1,0',other);world.scene.add(a,other);
 const source=a.children[0].material,original=source.userData.retainBiomeGround;
 const observer=observeMangroveChunks(world,{add(){},remove(){},material:(r,m)=>clones.push(m)});
 const clone=new THREE.MeshBasicMaterial();Object.assign(clone.userData,source.userData);clone.userData.retainBiomeGround(clone);
 assert.equal(observer.records.size,1);assert.deepEqual(clones,[clone]);assert.equal(observer.records.get('0,0').materials.size,2);
 clone.dispose();assert.equal(observer.records.get('0,0').materials.size,1);
 observer.dispose();assert.equal(source.userData.retainBiomeGround,original);
 clone.userData.retainBiomeGround(new THREE.MeshBasicMaterial());assert.equal(clones.length,1);
});
