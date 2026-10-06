import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferRequests} from './browser/buffer-requests.js';
function fixture(){const bound=new Map(),calls=[];const gl={ARRAY_BUFFER:1,ARRAY_BUFFER_BINDING:2,ELEMENT_ARRAY_BUFFER:3,ELEMENT_ARRAY_BUFFER_BINDING:4,getParameter:key=>bound.get(key),bufferData(...args){assert.equal(this,gl);calls.push(args);return 7;},deleteBuffer(){assert.equal(this,gl);return 8;}};return {gl,bound,calls};}
test('requests account for replacement, deletion and peak without accumulating live bytes',()=>{
 const {gl,bound,calls}=fixture(),buffer={},probe=new BufferRequests(gl);bound.set(2,buffer);
 assert.equal(gl.bufferData(1,100,0),7);gl.bufferData(1,new Float32Array(5),0);
 assert.deepEqual(calls[0],[1,100,0]);assert.equal(probe.snapshot().liveBytes,20);assert.equal(probe.snapshot().peakBytes,100);assert.equal(probe.snapshot().replacedBytes,100);
 assert.equal(gl.deleteBuffer(buffer),8);gl.deleteBuffer(buffer);assert.equal(probe.snapshot().deletedBytes,20);assert.equal(probe.snapshot().liveBuffers,0);assert.equal(probe.snapshot().liveBytes,0);probe.dispose();
});
test('WebGL2 source offsets/length use elements; DataView uses bytes; zero length uses remainder',()=>{
 const {gl,bound}=fixture(),probe=new BufferRequests(gl);bound.set(2,{});
 gl.bufferData(1,new Uint16Array(10),0,2,3);assert.equal(probe.snapshot().liveBytes,6);
 gl.bufferData(1,new Uint16Array(10),0,2,0);assert.equal(probe.snapshot().liveBytes,16);
 gl.bufferData(1,new DataView(new ArrayBuffer(12)),0,3,4);assert.equal(probe.snapshot().liveBytes,4);
 gl.bufferData(1,new ArrayBuffer(9),0);assert.equal(probe.snapshot().liveBytes,9);probe.dispose();
});
test('actual element binding follows current VAO, rather than assuming last global bind',()=>{
 const {gl,bound}=fixture(),probe=new BufferRequests(gl),a={},b={};
 bound.set(4,a);gl.bufferData(3,10,0);bound.set(4,b);gl.bufferData(3,30,0);bound.set(4,a);gl.bufferData(3,20,0);
 assert.equal(probe.snapshot().liveBytes,50);assert.equal(probe.snapshot().liveBuffers,2);probe.dispose();
});
test('unbound/unsupported requests are reported; exceptions retain original behavior',()=>{
 const {gl}=fixture(),probe=new BufferRequests(gl);gl.bufferData(1,10,0);gl.bufferData(99,10,0);assert.equal(probe.snapshot().unattributed,2);probe.dispose();
 gl.bufferData=()=>{throw Error('native failure');};const second=new BufferRequests(gl);assert.throws(()=>gl.bufferData(1,1,0),/native failure/);assert.equal(second.snapshot().requests,0);second.dispose();
});
test('cleanup preserves inherited ownership and subsequent instrumentation; constructor rollback',()=>{
 const base=fixture().gl,gl=Object.create(base),probe=new BufferRequests(gl);probe.dispose();assert.equal(Object.hasOwn(gl,'bufferData'),false);
 const second=new BufferRequests(gl),replacement=()=>{};gl.bufferData=replacement;second.dispose();assert.equal(gl.bufferData,replacement);
 const broken=fixture().gl,original=broken.bufferData;Object.defineProperty(broken,'deleteBuffer',{writable:false});assert.throws(()=>new BufferRequests(broken),TypeError);assert.equal(broken.bufferData,original);
});
