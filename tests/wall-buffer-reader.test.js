import test from 'node:test';import assert from 'node:assert/strict';import {wallBufferReader} from '../src/rendering/wall-buffer-reader.js';
test('wall bank fetch is shared, preserves ranges and legacy inputs',async()=>{
 let calls=0;const data=Uint8Array.from([1,2,3,4,5,6,7,8]).buffer;
 const read=wallBufferReader({bufferBank:{url:'bank',byteLength:8}},async url=>{calls++;assert.equal(url,'bank');return data;});
 const values=await Promise.all([read({bankOffset:0,bankLength:4}),read({bankOffset:4,bankLength:4})]);assert.equal(calls,1);assert.deepEqual([...new Uint8Array(values[1])],[5,6,7,8]);
 for(const d of [{bankOffset:1,bankLength:4},{bankOffset:4,bankLength:8},{bankOffset:0,bankLength:-1}])await assert.rejects(read(d),/Invalid/);
 const legacy=wallBufferReader({},async url=>{assert.equal(url,'old');return data;});assert.equal(await legacy({url:'old'}),data);
});
test('bank errors do not poison a later load',async()=>{
 const broken=wallBufferReader({bufferBank:{url:'x',byteLength:4}},async()=>{throw Error('aborted');});await assert.rejects(broken({bankOffset:0,bankLength:4}),/aborted/);
 const next=wallBufferReader({bufferBank:{url:'x',byteLength:4}},async()=>new ArrayBuffer(4));assert.equal((await next({bankOffset:0,bankLength:4})).byteLength,4);
});
