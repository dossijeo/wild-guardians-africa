import assert from 'node:assert/strict';
import * as THREE from 'three';
import {syncSelectedGrassMask as sync,disposeSelectedGrassMask as release} from '../../src/rendering/grass-underlay-mask.js';
const fallback=new THREE.DataTexture(new Uint8Array([0]),1,1,THREE.RedFormat),uniform=()=>({value:fallback});
const group=u=>({children:[{userData:{ground:true},material:{userData:{biomeGround:{uCoverageUnderlayMask:u}}}}]});
const u=uniform(),world={chunks:new Map([['0,0',group(u)]]),biomeGround:{coverageUnderlay:{value:new THREE.Vector2(1,48)}}},q={tiles:new Map([['0,0',{chunk:'0,0',items:[[0,0,0,1]]}]]),stats:{overflow:0},group:{visible:true},variant:"C",quality:"media"};
sync(world,q);assert.equal(q.selectedMaskStats.rebuilds,1);assert.ok(u.value.image.data[48*97+48]>0);
for(let i=0;i<50;i++)sync(world,q);assert.equal(q.selectedMaskStats.rebuilds,1);assert.equal(q.selectedMaskStats.checks,51);
q.stats.overflow=1;sync(world,q);assert.equal(world.biomeGround.coverageUnderlay.value.x,0);
q.stats.overflow=0;sync(world,q);assert.equal(world.biomeGround.coverageUnderlay.value.x,1);
q.tiles.clear();sync(world,q);assert.equal(q.selectedMaskStats.rebuilds,2);assert.ok(u.value.image.data.every(x=>x===0));
q.tiles.set('0,0',{chunk:'0,0',items:[[1,0,1,1]]});sync(world,q);assert.equal(q.selectedMaskStats.rebuilds,3);
const next=uniform();world.chunks.set('0,0',group(next));sync(world,q);assert.equal(u.value,fallback);assert.notEqual(next.value,fallback);assert.ok(next.value.image.data.some(x=>x>0));
// Streaming removal releases sampler ownership even if the old group is retained.
const removedTexture=next.value;let disposed=0;removedTexture.addEventListener('dispose',()=>disposed++);
world.chunks.delete('0,0');sync(world,q);assert.equal(next.value,fallback);assert.equal(disposed,1);assert.equal(q.selectedMaskStats.residentBytes,0);
// Re-entry must allocate a fresh texture from still-valid accepted tiles.
world.chunks.set('0,0',group(next));sync(world,q);assert.notEqual(next.value,removedTexture);assert.ok(next.value.image.data.some(x=>x>0));
release(q);assert.equal(next.value,fallback);assert.equal(q.persistentMask,null);fallback.dispose();console.log('Persistent eligibility: unchanged-camera checks skip rebuild, invalidation clears, overflow disables, replacement/disposal pass');
