import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferGeometry,Float32BufferAttribute,Uint16BufferAttribute} from 'three';
import {withZeroVertexUpload} from '../tools/experiments/zero-vertex-upload.js';

function geometry(indexed=false){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(new Float32Array(36),3));if(indexed)g.setIndex(new Uint16BufferAttribute([0,1,2,3,4,5,6,7,8],1));g.setDrawRange(2,7);g.addGroup(0,3,0);g.addGroup(6,3,1);return g;}
// Exact range/intersection ordering from the installed Three r180 source.
function nativeCount(g,material,group){const factor=material.wireframe?2:1;let start=g.drawRange.start*factor,end=(g.drawRange.start+g.drawRange.count)*factor;if(group!=null){start=Math.max(start,group.start*factor);end=Math.min(end,(group.start+group.count)*factor);}start=Math.max(start,0);end=Math.min(end,(g.index??g.attributes.position).count*(material.wireframe?2:1));return end-start;}
test('zero upload reaches each group binding for indexed/non-indexed and wireframe recipes, restoring positive draws',()=>{
 for(const indexed of [false,true])for(const wireframe of [false,true]){
  const g=geometry(indexed),groups=structuredClone(g.groups),range=g.drawRange,material={wireframe},object={},scene={},camera={},seen=[];
  const renderer={renderBufferDirect(c,s,geo,m,o,group){assert.equal(this,renderer);assert.equal(c,camera);assert.equal(s,scene);assert.equal(m,material);assert.equal(o,object);seen.push(nativeCount(geo,m,group));return 'native';}},original=renderer.renderBufferDirect;
  const result=withZeroVertexUpload(renderer,()=>{for(const group of g.groups)assert.equal(renderer.renderBufferDirect(camera,scene,g,material,object,group),'native');renderer.renderBufferDirect(camera,scene,g,material,object,null);return 41;});
  assert.deepEqual(seen,[0,0,0]);assert.deepEqual(result,{value:41,draws:3});assert.equal(renderer.renderBufferDirect,original);assert.equal(g.drawRange,range);assert.deepEqual(range,{start:2,count:7});assert.deepEqual(g.groups,groups);
  assert.ok(nativeCount(g,material,g.groups[1])>0);renderer.renderBufferDirect(camera,scene,g,material,object,g.groups[1]);assert.ok(seen.at(-1)>0);
 }
});
test('native error restores the current geometry and renderer before escaping',()=>{const g=geometry(),error=Error('driver draw failed'),original=function(){throw error;},renderer={renderBufferDirect:original};assert.throws(()=>withZeroVertexUpload(renderer,()=>renderer.renderBufferDirect(null,null,g,{},null,g.groups[1])),e=>e===error);assert.equal(renderer.renderBufferDirect,original);assert.deepEqual(g.drawRange,{start:2,count:7});assert.deepEqual(g.groups[1],{start:6,count:3,materialIndex:1});});
test('nested synchronous owners restore the outer wrapper and never retain zero ranges',()=>{const g=geometry(),counts=[],renderer={renderBufferDirect(_c,_s,geo,m,_o,group){counts.push(nativeCount(geo,m,group));}},original=renderer.renderBufferDirect;const outer=withZeroVertexUpload(renderer,()=>{const wrapper=renderer.renderBufferDirect;assert.equal(withZeroVertexUpload(renderer,()=>renderer.renderBufferDirect(null,null,g,{},null,g.groups[1])).draws,1);assert.equal(renderer.renderBufferDirect,wrapper);});assert.equal(outer.draws,1);assert.deepEqual(counts,[0]);assert.equal(renderer.renderBufferDirect,original);assert.deepEqual(g.drawRange,{start:2,count:7});});
test('invalid renderer and asynchronous scopes reject without retaining an override',()=>{assert.throws(()=>withZeroVertexUpload({},()=>{}),/native renderBufferDirect/);const renderer={renderBufferDirect(){}},original=renderer.renderBufferDirect;assert.throws(()=>withZeroVertexUpload(renderer,()=>Promise.resolve()),/synchronous/);assert.equal(renderer.renderBufferDirect,original);});
