import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFarTransition} from '../tools/experiments/far-transition-inspection.js';
import {lodMix} from '../tools/experiments/far-impostor-math.js';

test('inspection moves both native paths and sprite coverage together and can restore them',()=>{
 const uniforms={uStart:{value:120},uEnd:{value:160},uReady:{value:1}},oldCache=new WeakMap(),layer={options:{start:120,end:160},fade:{start:120,end:160,cache:oldCache},current:{prototype:{uniforms}}},standby={start:120,end:160};
 for(const [start,end,expected]of [[1e6,1e6+1,0],[0,.01,1],[120,160,.5]]){
  inspectFarTransition(layer,standby,start,end);
  for(const path of [layer.options,layer.fade,standby])assert.deepEqual([path.start,path.end],[start,end]);
  assert.equal(lodMix(140,uniforms.uStart.value,uniforms.uEnd.value,1),expected);
  assert.equal(lodMix(140,uniforms.uStart.value,uniforms.uEnd.value,0),1,'unprepared native resources retain the sprite fallback');
  assert.equal(uniforms.uReady.value,1);
 }
 assert.notEqual(layer.fade.cache,oldCache);
});
test('inspection rejects invalid ranges before changing resources and accepts a not-yet-adopted region',()=>{
 const layer={options:{start:120,end:160},fade:{start:120,end:160,cache:new WeakMap()},current:null},standby={start:120,end:160};
 for(const [start,end]of [[-1,2],[3,3],[4,2],[NaN,3],[1,Infinity]])assert.throws(()=>inspectFarTransition(layer,standby,start,end),/Invalid inspection/);
 assert.equal(layer.options.start,120);assert.equal(standby.end,160);
 inspectFarTransition(layer,standby,0,.01);assert.equal(layer.options.end,.01);
});
