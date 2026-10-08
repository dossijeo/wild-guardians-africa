import test from 'node:test';
import assert from 'node:assert/strict';
import {withExcludedDepthObject} from './browser/depth-draw-exclusion.js';

function fixture(){
 const depth={},color={},shadow={},calls=[];let target=depth;
 const renderer={getRenderTarget:()=>target,renderBufferDirect(...args){assert.equal(this,renderer);calls.push(args);return 17;}};
 return {world:{renderer,destructionPass:{smokeDepth:depth}},renderer,calls,depth,color,shadow,setTarget:t=>target=t};
}
test('exclusion withholds all groups for selected mesh only in the real depth target',()=>{
 const f=fixture(),original=f.renderer.renderBufferDirect,a={uuid:'a'},b={uuid:'b'};
 const report=withExcludedDepthObject(f.world,'a',()=>{
  assert.equal(f.renderer.renderBufferDirect(1,2,3,4,a,{start:0}),undefined);
  assert.equal(f.renderer.renderBufferDirect(1,2,3,4,a,{start:9}),undefined);
  assert.equal(f.renderer.renderBufferDirect(1,2,3,4,b,null),17);
  for(const target of [f.color,f.shadow,null]){f.setTarget(target);assert.equal(f.renderer.renderBufferDirect(1,2,3,4,a,null),17);}
  return 'readback';
 });
 assert.deepEqual(report,{value:'readback',skipped:2});assert.equal(f.calls.length,4);assert.equal(f.renderer.renderBufferDirect,original);
});
test('observer restores original method and preserves errors from render or draw',()=>{
 const f=fixture(),original=f.renderer.renderBufferDirect;
 assert.throws(()=>withExcludedDepthObject(f.world,'a',()=>{throw Error('readback failure');}),/readback failure/);assert.equal(f.renderer.renderBufferDirect,original);
 const throwing=()=>{throw Error('driver failure');};f.renderer.renderBufferDirect=throwing;
 assert.throws(()=>withExcludedDepthObject(f.world,'a',()=>f.renderer.renderBufferDirect(1,2,3,4,{uuid:'b'})),/driver failure/);assert.equal(f.renderer.renderBufferDirect,throwing);
});
test('missing selector is reported with zero skips; invalid selectors cannot install a hook',()=>{
 const f=fixture(),original=f.renderer.renderBufferDirect;
 assert.deepEqual(withExcludedDepthObject(f.world,'missing',()=>f.renderer.renderBufferDirect(1,2,3,4,{uuid:'a'})),{value:17,skipped:0});
 for(const id of ['',null,{},'a'.repeat(201)])assert.throws(()=>withExcludedDepthObject(f.world,id,()=>{}),/selector/);
 assert.equal(f.renderer.renderBufferDirect,original);
});
