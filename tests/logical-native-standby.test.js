import test from 'node:test';import assert from 'node:assert/strict';import {Object3D} from 'three';
import {logicalNativeStandbyEntries} from '../tools/experiments/logical-native-standby.js';
import {standbyTreeKey} from '../tools/experiments/native-tree-standby.js';
const metadata={sourceBounds:{min:[-3,0,-4],max:[3,12,4]}};
const tree=(id,x)=>({id,x:x+1,y:2,z:0,origin:{x,y:1,z:0},yaw:.62,sx:1.2,sy:.9,sz:1.3});
function options(extra={}){return {metadata,camera:{x:0,y:10,z:0},quality:'media',range:180,physicalIds:new Set(),suppressed:new Set(),...extra};}
test('logical prewarm uses exact native origin, yaw and anisotropic scale instead of billboard pivot',()=>{
 const t=tree('a',140),row=logicalNativeStandbyEntries([t],options())[0],native={...t,...t.origin},d=new Object3D();d.position.set(native.x,native.y,native.z);d.rotation.y=native.yaw;d.scale.set(native.sx,native.sy,native.sz);d.updateMatrix();
 assert.equal(row.key,standbyTreeKey(t));assert.deepEqual(row.matrix,d.matrix.toArray());assert.equal(row.matrix[12],140);assert.equal(row.level,2);
});
test('logical prewarm is deterministic, bounded, and omits suppressed, resident and out of range trees',()=>{
 const trees=[tree('d',180),tree('c',80),tree('b',70),tree('a',60)];
 const args=options({maxTrees:1,physicalIds:new Set(['a']),suppressed:new Set(['b'])});const a=logicalNativeStandbyEntries(trees,args),b=logicalNativeStandbyEntries([...trees].reverse(),args);
 assert.deepEqual(a,b);assert.deepEqual(a.map(r=>r.id),['c']);assert.throws(()=>logicalNativeStandbyEntries(trees,options({range:Infinity})),/budget/);
});
test('logical prewarm follows actual quality LOD bins without changing source geometry',()=>{
 const t=tree('a',100);assert.equal(logicalNativeStandbyEntries([t],options())[0].level,2);assert.equal(logicalNativeStandbyEntries([t],options({quality:'alta'}))[0].level,1);
});
