import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {firstCameraVolumeHit} from '../src/rendering/camera-volume-sweep.js';
const box={min:[-2,0,-2],max:[2,5,2]};
test('indexed sweeps match direct sweeps through negative cells, corners and roofs',()=>{
 const index=new CameraVolumeIndex({cellSize:3}),boxes=[];
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
  const b={id:x+','+z,min:[x*10-2,0,z*10-2],max:[x*10+2,5,z*10+2]};boxes.push(b);index.set(b.id,b);
 }
 for(let i=0;i<200;i++){
  const start=[Math.sin(i)*40,i%9,Math.cos(i)*40],end=[start[0]+12,start[1]-2,start[2]-10],radius=(i%3)*.5;
  assert.deepEqual(index.sweep(start,end,radius),firstCameraVolumeHit(start,end,boxes,radius));
 }
});
test('descriptor changes remove old buckets and caller mutation cannot corrupt ownership',()=>{
 const index=new CameraVolumeIndex({cellSize:3}),owned=structuredClone(box);index.set('a',owned);owned.min[0]=500;
 assert.equal(index.sweep([-10,2,0],[10,2,0],.5).id,'a');
 index.set('a',{min:[100,0,100],max:[104,5,104]});assert.equal(index.sweep([-10,2,0],[10,2,0],.5),null);
 index.delete('a');assert.equal(index.records.size,0);assert.equal(index.cells.size,0);
});
test('large volumes and long queries use bounded fallback without losing collisions',()=>{
 const index=new CameraVolumeIndex({cellSize:1,maxCells:4});index.set('big',box);assert.equal(index.large.size,1);
 assert.equal(index.sweep([-100,2,0],[100,2,0],.5).id,'big');index.delete('big');assert.equal(index.large.size,0);
});
test('local queries exclude distant buildings and cleanup releases all owned descriptors',()=>{
 const index=new CameraVolumeIndex();for(let i=0;i<2000;i++)index.set(i,{min:[i*20,0,0],max:[i*20+4,5,4]});
 assert.equal(index.sweep([-5,2,2],[6,2,2],.5).id,0);assert.ok(index.lastCandidates<5);
 index.clear();assert.equal(index.cells.size,0);assert.equal(index.records.size,0);assert.equal(index.large.size,0);assert.equal(index.lastCandidates,0);
});
test('invalid updates preserve the previous valid descriptor',()=>{
 const index=new CameraVolumeIndex();index.set('a',box);assert.throws(()=>index.set('a',{min:[Infinity,0,0],max:[1,1,1]}));assert.equal(index.sweep([-10,2,0],[10,2,0],.5).id,'a');
 assert.throws(()=>index.sweep([0,0,0],[1,1,1],NaN));
});
test('coordinates beyond safe integer grid addressing use bounded fallback',()=>{
 const index=new CameraVolumeIndex(),large=1e20,volume={id:'far',min:[large-1e7,0,0],max:[large+1e7,5,4]};index.set(volume.id,volume);assert.equal(index.large.size,1);
 const start=[large-2e7,2,2],end=[large+2e7,2,2];assert.deepEqual(index.sweep(start,end,.5),firstCameraVolumeHit(start,end,[volume],.5));
});
