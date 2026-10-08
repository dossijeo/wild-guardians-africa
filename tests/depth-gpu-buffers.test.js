import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createGpuBufferReader} from './browser/depth-gpu-buffers.js';

function fixture(){
 const original={},buffer={bytes:new Uint8Array([1,2,3,4])};let bound=original,fail=false;
 const gl={COPY_READ_BUFFER:1,COPY_READ_BUFFER_BINDING:2,BUFFER_SIZE:3,
  getParameter(key){assert.equal(key,2);return bound;},
  bindBuffer(target,value){assert.equal(target,1);bound=value;},
  getBufferParameter(target,key){assert.equal(target,1);assert.equal(key,3);return bound.bytes.length;},
  getBufferSubData(target,offset,out){assert.equal(target,1);assert.equal(offset,0);if(fail)throw Error('read failed');out.set(bound.bytes);}
 };
 return {gl,original,buffer,bound:()=>bound,setFail:v=>fail=v};
}
const digest=bytes=>Uint8Array.from(createHash('sha256').update(bytes).digest()).buffer;

test('complete copies capture mutations of the same GPU buffer and preserve copy-read binding',async()=>{
 const f=fixture(),reader=createGpuBufferReader(f.gl,{digest});
 const a=reader.read(f.buffer,7);assert.equal(f.bound(),f.original);
 f.buffer.bytes[0]=9;
 const b=reader.read(f.buffer,7);assert.equal(f.bound(),f.original);
 assert.equal(a.sha256,null);assert.deepEqual(await reader.finish(),{totalBytes:8,completeCopies:2,maxBufferBytes:8388608,maxTotalBytes:67108864});
 assert.equal(a.id,b.id);assert.equal(a.byteLength,4);assert.notEqual(a.sha256,b.sha256);
 assert.equal(a.sha256,createHash('sha256').update(new Uint8Array([1,2,3,4])).digest('hex'));
 assert.equal(reader.read(null,0),null);
});

test('budget rejects partial copies and restores binding after either bound or driver failures',async()=>{
 const f=fixture(),reader=createGpuBufferReader(f.gl,{maxBufferBytes:4,maxTotalBytes:4,digest});
 reader.read(f.buffer,1);assert.throws(()=>reader.read(f.buffer,1),/budget/);assert.equal(f.bound(),f.original);
 await reader.finish();
 const small=createGpuBufferReader(f.gl,{maxBufferBytes:3,digest});assert.throws(()=>small.read(f.buffer,1),/budget/);assert.equal(f.bound(),f.original);
 f.setFail(true);assert.throws(()=>createGpuBufferReader(f.gl,{digest}).read(f.buffer,1),/read failed/);assert.equal(f.bound(),f.original);
});

test('invalid budgets and failed digest cannot produce accepted hashes',async()=>{
 for(const limit of [0,-1,1.5,Infinity])assert.throws(()=>createGpuBufferReader({}, {maxBufferBytes:limit}),/limit/);
 const f=fixture(),reader=createGpuBufferReader(f.gl,{digest:()=>{throw Error('digest failed');}}),record=reader.read(f.buffer,1);
 await assert.rejects(reader.finish(),/digest failed/);assert.equal(record.sha256,null);assert.equal(f.bound(),f.original);
});
