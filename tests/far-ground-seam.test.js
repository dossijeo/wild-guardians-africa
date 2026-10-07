import test from 'node:test';import assert from 'node:assert/strict';
import {farGroundData,farGroundHeight} from '../tools/experiments/far-ground-data.js';
import {fitFarGroundContacts} from '../tools/experiments/far-ground-contacts.js';
import {farGroundSeam} from '../tools/experiments/far-ground-seam.js';
const bounds={minX:-32,maxX:32,minZ:-32,maxZ:32},field={surface:(x,z)=>Math.sin(x*.1)+Math.cos(z*.17)};
test('seam keeps the native and coarse sides exact without changing horizontal geometry',()=>{
 const ground=farGroundData(field,bounds,{step:16}),before=ground.positions.slice(),near=[-13,-9,17,21],seam=farGroundSeam(ground,near,{nativeHeightAt:field.surface});
 assert.deepEqual(ground.positions,before);assert.deepEqual(seam,farGroundSeam(ground,near,{nativeHeightAt:field.surface}));
 assert.ok(seam.columns.some(c=>Math.abs(c.nativeY-c.farY)>.1));
 for(const c of seam.columns){assert.equal(c.nativeY,field.surface(c.x,c.z));assert.equal(c.farY,farGroundHeight(ground,c.x,c.z));assert.ok(c.x===near[0]||c.x===near[2]||c.z===near[1]||c.z===near[3]);}
 assert.equal(seam.indices.length,(seam.columns.length-4)*6);assert.ok([...seam.indices].every(i=>i<seam.positions.length/3));
});
test('triangle crossings keep every proxy edge segment linear, including authored contacts',()=>{
 const ground=fitFarGroundContacts(farGroundData(field,bounds,{step:16}),[{id:'tree',x:5,y:4,z:3}]),seam=farGroundSeam(ground,[-13,-9,5,21],{nativeHeightAt:field.surface});
 for(const edge of seam.segments)for(let i=edge.first;i<edge.first+edge.count-1;i++){
  const a=seam.columns[i],b=seam.columns[i+1];for(const t of [.25,.5,.75])assert.ok(Math.abs(farGroundHeight(ground,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)-(a.farY+(b.farY-a.farY)*t))<2e-6);
 }
 assert.ok(seam.columns.some(c=>c.x===5&&c.z===3&&c.farY===4));
});
test('seam rejects invalid heights, rectangles and over-budget work',()=>{
 const ground=farGroundData(field,bounds,{step:16});
 assert.throws(()=>farGroundSeam(ground,[-40,-9,17,21],{nativeHeightAt:field.surface}),/outside/);
 assert.throws(()=>farGroundSeam(ground,[-13,-9,17,21],{nativeHeightAt:()=>NaN}),/height/);
 assert.throws(()=>farGroundSeam(ground,[-13,-9,17,21],{nativeHeightAt:field.surface,maxColumns:8}),/budget/);
 assert.throws(()=>farGroundSeam(ground,[-13,-9,17,21],{nativeHeightAt:field.surface,step:1e-9}),/budget/);
 assert.throws(()=>farGroundSeam(ground,[-13,-9,17,21],{nativeHeightAt:field.surface,step:0}),/inputs/);
});
