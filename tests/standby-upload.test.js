import test from 'node:test';import assert from 'node:assert/strict';
import {readBoundFloatAttribute} from '../tools/experiments/capture-standby-upload.js';
function glFixture({stride=16,offset=4,type=1,size=52}={}){
 const data=new Float32Array([99,1,2,3,4,5,6,7,8,9,10,11,12]),buffer={},previous={},bindings=[];let bound=previous;
 const gl={FLOAT:1,VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:2,VERTEX_ATTRIB_ARRAY_TYPE:3,VERTEX_ATTRIB_ARRAY_STRIDE:4,VERTEX_ATTRIB_ARRAY_POINTER:5,COPY_READ_BUFFER_BINDING:6,COPY_READ_BUFFER:7,BUFFER_SIZE:8,
  getAttribLocation:()=>0,getVertexAttrib:(loc,p)=>p===2?buffer:p===3?type:stride,getVertexAttribOffset:()=>offset,getParameter:()=>bound,bindBuffer:(target,b)=>{bindings.push(b);bound=b;},getBufferParameter:()=>size,getBufferSubData:(target,byteOffset,out)=>out.set(data.subarray(byteOffset/4,byteOffset/4+out.length))};return {gl,previous,bindings};
}
test('GPU readback respects stride and offset and restores the previous read binding',()=>{
 const f=glFixture();assert.deepEqual(Array.from(readBoundFloatAttribute(f.gl,{},'nativeVisibility',3,1)),[1,5,9]);assert.equal(f.bindings.at(-1),f.previous);
});
test('invalid or overrun GPU attribute buffers remain errors and restore state',()=>{
 const f=glFixture({size:8});assert.throws(()=>readBoundFloatAttribute(f.gl,{},'instanceMatrix',2,4),/exceeds buffer/);assert.equal(f.bindings.at(-1),f.previous);
 const bad=glFixture({type:12});assert.throws(()=>readBoundFloatAttribute(bad.gl,{},'instanceMatrix',1,4),/layout/);assert.equal(bad.bindings.length,0);
});
