import test from 'node:test';
import assert from 'node:assert/strict';
import {NativePreparedTreeCoverage} from '../tools/experiments/native-prepared-tree-coverage.js';

test('GPU completion never authorizes replaced packing or trees added while preparing',()=>{
 const batch={},other={},old={ids:new Set(['a'])},native={revision:1,batches:new Map([[batch,old]])},coverage=new NativePreparedTreeCoverage(native);
 const snapshot=coverage.capture();native.batches.set(batch,{ids:new Set(['a','b'])});native.batches.set(other,{ids:new Set(['c'])});native.revision++;
 assert.equal(coverage.complete(snapshot),0);for(const id of ['a','b','c'])assert.equal(coverage.has(id),false);
 assert.equal(coverage.complete(coverage.capture()),2);for(const id of ['a','b','c'])assert.equal(coverage.has(id),true);
 const revision=coverage.revision;for(let i=0;i<180;i++){assert.equal(coverage.update(),false);assert.equal(coverage.revision,revision);}
 assert.equal(coverage.has('a',new Set(['a'])),false);
 native.batches.delete(batch);native.revision++;coverage.update();assert.equal(coverage.has('a'),false);assert.equal(coverage.has('c'),true);
});
test('replacement of merged renderable resources invalidates old fences even with identical CPU packing',()=>{
 const batch={},native={revision:1,batches:new Map([[batch,{ids:new Set(['a'])}]])};let signature='mesh-1';const coverage=new NativePreparedTreeCoverage(native,()=>signature),snapshot=coverage.capture();
 signature='mesh-2';assert.equal(coverage.complete(snapshot),0);assert.equal(coverage.has('a'),false);
 assert.equal(coverage.complete(coverage.capture()),1);assert.equal(coverage.has('a'),true);
 signature='mesh-3';coverage.update();assert.equal(coverage.has('a'),false);coverage.clear();assert.equal(coverage.prepared.size,0);assert.equal(coverage.counts.size,0);
});
test('per-tree queries do not rescan renderables or recompute signatures',()=>{
 const native={revision:1,batches:new Map([[{}, {ids:new Set(['a'])}]])};let signatures=0;const coverage=new NativePreparedTreeCoverage(native,()=>{signatures++;return 'stable';});
 coverage.complete(coverage.capture());const before=signatures;
 for(let i=0;i<1000;i++){assert.equal(coverage.has('a'),true);assert.ok(coverage.revision>0);}assert.equal(signatures,before);
});
