import test from 'node:test';
import assert from 'node:assert/strict';
import {AssetGroupAllocations,assetGroupDrawSnapshot} from './browser/asset-group-allocations.js';

test('group probe preserves receiver/results and attributes capacity replacement, reuse and retirement',()=>{
 const cache=new Map(),mesh=()=>({count:3,instanceMatrix:{array:new Float32Array(64)},geometry:{attributes:{nativeVisibility:{array:new Float32Array(4)}}}});
 const groups={prepare(map,key,entries,pass){assert.equal(this,groups);assert.equal(entries,list);if(!map.has(key))map.set(key,{mesh:mesh(),capacity:4,pass});return 'result';},retire(map,key){assert.equal(this,groups);map.delete(key);return 7;}},list=[{mesh:{count:3}}];
 const original=groups.prepare,probe=new AssetGroupAllocations(groups);
 groups.prepare(cache,'a',list,'color');probe.begin();assert.equal(groups.prepare(cache,'a',list,'color'),'result');groups.retire(cache,'a');groups.prepare(cache,'a',list,'color');
 const report=probe.end();assert.deepEqual(report.prepares.map(x=>[x.previousCapacity,x.capacity,x.newMesh,x.instanceArrayBytes,x.failed]),[[4,4,false,272,false],[null,4,true,272,false]]);
 assert.deepEqual(report.retired,[{key:'a',pass:'color',capacity:4,instances:3}]);assert.throws(()=>{probe.begin();probe.begin();},/Nested/);probe.dispose();assert.equal(groups.prepare,original);
});

test('failed prepare reports failure without replacing errors or restoring over newer hooks',()=>{
 const failure=Error('fixture'),groups={prepare(){throw failure;},retire(){}};
 const probe=new AssetGroupAllocations(groups);probe.begin();assert.throws(()=>groups.prepare(new Map(),'x',[],'shadow'),e=>e===failure);assert.equal(probe.end().prepares[0].failed,true);
 const newer=()=>{};groups.prepare=newer;probe.dispose();assert.equal(groups.prepare,newer);
});

test('partial installation failure restores inherited prepare ownership',()=>{
 const original=()=>{},groups=Object.create({prepare:original});Object.defineProperty(groups,'retire',{value:()=>{},writable:false});
 assert.throws(()=>new AssetGroupAllocations(groups),TypeError);assert.equal(Object.hasOwn(groups,'prepare'),false);assert.equal(groups.prepare,original);
});

test('draw snapshot retains exact submitted prefixes and ignores unused instance backing storage',()=>{
 const matrix=new Float32Array(32),visibility=new Float32Array([.4,.7]);matrix.fill(9,16);
 const geometry={index:{count:3},attributes:{position:{array:new Float32Array(9),count:3,itemSize:3,normalized:false},nativeVisibility:{array:visibility}}};
 const mesh={count:1,instanceMatrix:{array:matrix},castShadow:false,receiveShadow:true,geometry};
 const groups={colors:new Map([['x',{capacity:2,mesh}]]),shadows:new Map()};
 const snapshot=assetGroupDrawSnapshot(groups);assert.equal(snapshot[0].matrices.length,16);assert.deepEqual(snapshot[0].coverage,[Math.fround(.4)]);matrix.fill(11,16);visibility[1]=0;assert.deepEqual(assetGroupDrawSnapshot(groups),snapshot);visibility[0]=0;assert.notDeepEqual(assetGroupDrawSnapshot(groups),snapshot);
});
