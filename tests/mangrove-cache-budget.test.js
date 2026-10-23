import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMangroveMaterialCache} from '../src/rendering/mangrove-material-cache.js';

test('full fixed512 cache reserves replacement space and deferred chunks cannot starve edits',()=>{
 const world={scene:new THREE.Scene(),chunks:new Map(),toon:{material(){}},renderer:{autoClear:true,getRenderTarget(){return null;},setRenderTarget(){},render(){}}};
 for(let i=0;i<32;i++){
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial(),mask=new THREE.Texture();
  material.userData={groundBiome:'mangrove',biomeGround:{uGroundRect:{value:new THREE.Vector4(i*48,0,1.5,35)},uGroundMask:{value:mask}}};
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),material);mesh.userData.ground=true;group.add(mesh);world.chunks.set(String(i),group);world.scene.add(group);
 }
 const c=createMangroveMaterialCache(world);
 try{
  for(let i=0;i<64;i++)c.update();
  const initialPublications=c.queue.stats.published;
  const old=c.states.get('0').texture.value;
  assert.equal(c.states.get('31').texture.value,null,'overflow uses original unpatched material');
  assert.equal(c.states.get('31').hooks.size,0);
  c.states.get('0').mask.dispatchEvent({type:'groundmaskchanged'});
  for(let i=0;i<5;i++)c.update();
  assert.equal(c.queue.stats.published,initialPublications+1,'deferred chunks must not starve resident edit');
  assert.equal(c.queue.entries.size,28);assert.equal(initialPublications,28);
  assert.notEqual(c.states.get('0').texture.value,old);
  assert.ok(c.queue.stats.peakBytes<=40*1024*1024);
  const group=world.chunks.get('1');world.scene.remove(group);world.chunks.delete('1');
  for(let i=0;i<4;i++)c.update();
  assert.equal(c.queue.entries.size,28);assert.equal(c.queue.stats.published,30,'deferred chunk admitted when memory is freed');
 }finally{c.dispose();for(const group of world.chunks.values())for(const mesh of group.children){mesh.material.userData.biomeGround.uGroundMask.value.dispose();mesh.material.dispose();mesh.geometry.dispose();}}
 assert.equal(c.queue.stats.bytes,0);
});
