import test from 'node:test';
import assert from 'node:assert/strict';
import {traceUploadTraffic} from '../tools/qa-renderer-upload-traffic.js';

test('GL upload diagnostics count issued subranges/texture rectangles and restore the context',()=>{
 const names=['RGBA','RGBA_INTEGER','RGB','RGB_INTEGER','RG','RG_INTEGER','RED','FLOAT','UNSIGNED_INT','INT','HALF_FLOAT','UNSIGNED_SHORT','SHORT','UNSIGNED_BYTE','UNSIGNED_SHORT_4_4_4_4','UNSIGNED_SHORT_5_5_5_1','UNSIGNED_SHORT_5_6_5','UNSIGNED_INT_24_8','UNSIGNED_INT_2_10_10_10_REV','UNSIGNED_INT_10F_11F_11F_REV','UNSIGNED_INT_5_9_9_9_REV'];
 const gl=Object.fromEntries(names.map((name,i)=>[name,i+1]));
 for(const name of ['bufferData','bufferSubData','texImage2D','texSubImage2D'])gl[name]=()=>{};
 const original=gl.bufferData,t=traceUploadTraffic(gl),data=new Float32Array(1024);
 gl.bufferData(0,100,0);gl.bufferData(0,data,0,4,8);gl.bufferSubData(0,0,data,10,12);
 gl.texSubImage2D(0,0,3,2,4,1,gl.RGBA,gl.FLOAT,data);
 gl.texImage2D(0,0,gl.RGBA,8,8,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 assert.deepEqual(t.snapshot(),{bufferAllocationBytes:132,bufferUploadBytes:80,rendererBufferUploadBytes:null,textureUploadBytes:64,bufferCalls:3,textureCalls:2});
 t.reset();assert.equal(t.snapshot().bufferUploadBytes,0);t.dispose();assert.equal(gl.bufferData,original);
});

test('issued bytes are attributed to an explicitly owned backing buffer, independently of prepared bytes',()=>{
 const gl={bufferData(){},bufferSubData(){}};
 const rendererMemory=new ArrayBuffer(256),owned=new Float32Array(rendererMemory),other=new Float32Array(64);
 const t=traceUploadTraffic(gl,{rendererMemory});
 gl.bufferData(0,owned,0,2,8);gl.bufferSubData(0,0,owned,4,3);gl.bufferSubData(0,0,other,0,10);
 assert.equal(t.snapshot().bufferUploadBytes,84);assert.equal(t.snapshot().rendererBufferUploadBytes,44);
 t.reset();assert.equal(t.snapshot().rendererBufferUploadBytes,0);t.dispose();
});


test('ownership predicate follows replacement JS arrays without reinstalling GL wrappers',()=>{
 const gl={bufferData(){},bufferSubData(){}};let owned=new Float32Array(32);
 const t=traceUploadTraffic(gl,{rendererData:data=>data?.buffer===owned.buffer});
 gl.bufferSubData(0,0,owned,1,3);const retired=owned;owned=new Float32Array(64);
 gl.bufferSubData(0,0,retired,0,4);gl.bufferSubData(0,0,owned,0,5);
 assert.equal(t.snapshot().bufferUploadBytes,48);assert.equal(t.snapshot().rendererBufferUploadBytes,32);t.dispose();
});
