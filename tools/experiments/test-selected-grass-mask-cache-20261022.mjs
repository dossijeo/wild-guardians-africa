import assert from 'node:assert/strict';
import * as THREE from 'three';
import {syncSelectedGrassMask as reference,disposeSelectedGrassMask as releaseA} from './qa-selected-grass-mask-20261022.js';
import {syncSelectedGrassMask as cached,disposeSelectedGrassMask as releaseB} from './qa-selected-grass-mask-cached-20261022.js';
const make=()=>{const fallback=new THREE.DataTexture(new Uint8Array([0]),1,1,THREE.RedFormat),chunks=new Map();for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)chunks.set(x+','+z,{children:[{userData:{ground:true},material:{userData:{biomeGround:{uQaCoverageMask:{value:fallback}}}}}]});return {world:{chunks},q:{meshes:[{capacity:240},{capacity:300}]},fallback};};
const a=make(),b=make();let seed=41;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const anchors=Array.from({length:900},()=>[(random()-.5)*144,0,(random()-.5)*144,random()]);anchors.push([24,0,24,1],[-24,0,-24,1]);
for(let frame=0;frame<30;frame++){
 const list=frame===12?[]:anchors.filter((_,i)=>(i+frame)%7!==0),bins=[list.slice(0,350),list.slice(350)];
 if(frame===18){a.world.chunks.delete('1,1');b.world.chunks.delete('1,1');}
 if(frame===22)anchors[0]=[2,0,2,1]; // invalidation creates a fresh immutable anchor
 reference(a.world,a.q,bins);cached(b.world,b.q,bins);
 assert.equal(a.q.selectedMasks.size,b.q.selectedMasks.size);
 for(const [key,e]of a.q.selectedMasks)assert.deepEqual(e.data,b.q.selectedMasks.get(key).data);
 assert.equal(a.q.selectedMaskStats.uploadBytes,b.q.selectedMaskStats.uploadBytes);
}
releaseA(a.q);releaseB(b.q);a.fallback.dispose();b.fallback.dispose();console.log('30 selections: cached mask bytes/upload totals exact, including capacity, empty list, boundaries, invalidation and eviction');
