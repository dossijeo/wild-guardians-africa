import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDepthComparisons} from './browser/depth-comparison-summary.js';
const pair=(name,pixels=0,delta=0)=>({pair:name,depth:{differentPixels:pixels,maxDepthDelta:delta,nonUniformPixels:100}});

test('all native, guarded, candidate and repeated controls must agree for the summary to pass',()=>{
 const report=summarizeDepthComparisons(['N1/N2','N2/G','G/B1','N2/B1','B1/B2','B2/N3','N2/N3'].map(name=>pair(name)));
 assert.equal(report.depthIdentical,true);assert.equal(report.differentPixels,0);assert.deepEqual(report.affectedPairs,[]);
});
test('volcano counterexample cannot be hidden behind the matching N2/B1 pair',()=>{
 const report=summarizeDepthComparisons([pair('N1/N2'),pair('N2/G'),pair('G/B1'),pair('N2/B1'),pair('B1/B2',3,.0000024437904357910156),pair('B2/N3',3,.0000024437904357910156),pair('N2/N3')]);
 assert.equal(report.depthIdentical,false);assert.equal(report.differentPixels,3);assert.equal(report.maxDepthDelta,.0000024437904357910156);assert.deepEqual(report.affectedPairs,['B1/B2','B2/N3']);
});
test('a differing baseline repetition also prevents an equivalence claim',()=>{
 const report=summarizeDepthComparisons([pair('N1/N2',7,.01),pair('N2/B1',0),pair('B1/B2',2,.02)]);
 assert.equal(report.depthIdentical,false);assert.equal(report.differentPixels,7);assert.equal(report.maxDepthDelta,.02);assert.deepEqual(report.affectedPairs,['N1/N2','B1/B2']);
});
test('empty and constant readbacks cannot produce a passing summary',()=>{
 assert.throws(()=>summarizeDepthComparisons([]),/Nonconstant/);
 assert.throws(()=>summarizeDepthComparisons([{...pair('A/B'),depth:{differentPixels:0,maxDepthDelta:0,nonUniformPixels:0}}]),/Nonconstant/);
});
