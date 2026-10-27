import test from 'node:test';
import assert from 'node:assert/strict';
import {InstancedBufferAttribute} from 'three';
import {WebGLAttributes} from '../node_modules/three/src/renderers/webgl/WebGLAttributes.js';
import {patchCoveragePrefix} from '../tools/experiments/coverage-prefix-upload-patch.mjs';
test('selected prefixes survive shrink, regrowth, deferred uploads and shared shadow consumers',()=>{
 const mark=new Function('g','count',patchCoveragePrefix("for(const name of ['coverageAnchor','coverageData','coverageSlope'])g.attributes[name].needsUpdate=true;"));
 let bound,copied=0;const gl={FLOAT:5126,createBuffer:()=>({}),bindBuffer:(t,b)=>{bound=b;},bufferData:(t,a)=>{bound.bytes=new Uint8Array(a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength));},bufferSubData:(t,d,a,o=0,n=a.length-o)=>{const v=new Uint8Array(a.buffer,a.byteOffset+o*a.BYTES_PER_ELEMENT,n*a.BYTES_PER_ELEMENT);bound.bytes.set(v,d);copied+=v.length;},deleteBuffer:()=>{}};
 const api=WebGLAttributes(gl),g={attributes:Object.fromEntries([['coverageAnchor',4],['coverageData',4],['coverageSlope',2]].map(([n,size])=>[n,new InstancedBufferAttribute(new Float32Array(16*size),size)]))};
 let revision=0;
 for(const batch of [[8],[3],[0],[12],[15,2],[0,7],[1,0,9]]){
  for(const count of batch){revision++;for(const a of Object.values(g.attributes))for(let i=0;i<count*a.itemSize;i++)a.array[i]=revision*100+i;mark(g,count);}
  const count=batch.at(-1);
  for(const a of Object.values(g.attributes)){api.update(a,34962);const expected=new Uint8Array(a.array.buffer,0,count*a.itemSize*4);assert.deepEqual(api.get(a).buffer.bytes.subarray(0,expected.length),expected);const before=copied;api.update(a,34962);assert.equal(copied,before,'shared shadow consumer must not upload twice');}
 }
 assert(copied<7*16*10*4,'later uploads must not transfer the complete capacity');
});
