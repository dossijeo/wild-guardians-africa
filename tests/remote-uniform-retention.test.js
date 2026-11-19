import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

async function shown(f,value){const p=f.frame(value);await flush();await f.host.idle();f.host.present();await p;}
async function write(f,values,offset=0){f.client.device.queue.writeBuffer(f.buffer,offset,new Float32Array(values));await flush();await f.host.idle();}
const contents=buffer=>Array.from(new Float32Array(buffer.data.buffer));

test('identical standalone uniform writes retain published buffer and immutable bindings',async()=>{
 const f=await fixture();try{
  await shown(f,7);const before=f.host.inspect(),buffer=f.gpu.buffers[0],writes=f.gpu.calls.filter(c=>c[0]==='writeBuffer').length;
  await write(f,[7]);await write(f,[0,0],4);
  assert.equal(f.gpu.buffers.length,1);assert.equal(f.host.inspect().uniformForks,before.uniformForks);assert.equal(f.host.inspect().bindingForks,before.bindingForks);
  assert.equal(f.gpu.calls.filter(c=>c[0]==='writeBuffer').length,writes);f.host.present();assert.equal(contents(buffer)[0],7);assert.deepEqual(f.errors,[]);
 }finally{f.client.dispose();await f.host.dispose();}
});

test('changed partial uniform writes still fork and leave the published generation intact',async()=>{
 const f=await fixture();try{
  await shown(f,7);await write(f,[9],4);
  assert.equal(f.gpu.buffers.length,2);assert.deepEqual(contents(f.gpu.buffers[0]),[7,0,0,0]);assert.deepEqual(contents(f.gpu.buffers[1]),[7,9,0,0]);
  assert.equal(f.host.inspect().uniformForks,1);assert.equal(f.host.inspect().bindingForks,1);assert.deepEqual(f.errors,[]);
 }finally{f.client.dispose();await f.host.dispose();}
});

for(const value of [11,7])test('uniform equality uses pending logical writes rather than displayed bytes ('+value+')',async()=>{
 const f=await fixture();try{
  await shown(f,7);const next=f.frame(11);next.catch(()=>{});await flush();await f.host.idle();
  await write(f,[value]);assert.equal(f.gpu.buffers.length,value===11?1:2);
  assert.equal(contents(f.gpu.buffers[0])[0],7);f.host.present();await next;
  assert.equal(contents(f.gpu.buffers[0])[0],11);if(value===7)assert.equal(contents(f.gpu.buffers[1])[0],7);assert.deepEqual(f.errors,[]);
 }finally{f.client.dispose();await f.host.dispose();}
});

test('consumer clock patches cannot be mistaken for unchanged producer bytes',async()=>{
 const f=await fixture({}, {absoluteNow:()=>0});try{
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0});
  const clock={version:1,epoch:0,elapsed:2,safeUntil:2,anchorAbsoluteMs:0,paused:true,segments:[]},p=f.frame(7,{clock});await flush();await f.host.idle();f.host.present();await p;
  assert.equal(contents(f.gpu.buffers[0])[0],2);await write(f,[7]);
  assert.equal(f.gpu.buffers.length,2);assert.equal(contents(f.gpu.buffers[0])[0],2);assert.equal(contents(f.gpu.buffers[1])[0],7);assert.deepEqual(f.errors,[]);
 }finally{f.client.dispose();await f.host.dispose();}
});

test('equal bytes still isolate a producer snapshot from future writes by the published clock',async()=>{
 let now=0;const f=await fixture({}, {absoluteNow:()=>now});try{
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0});
  const clock={version:1,epoch:0,elapsed:7,safeUntil:9,anchorAbsoluteMs:0,paused:false,segments:[{start:7,end:9,rate:1,realDuration:2}]},shown=f.frame(7,{clock});await flush();await f.host.idle();f.host.present();await shown;
  const published=f.gpu.buffers[0];assert.equal(contents(published)[0],7);await write(f,[7]);assert.equal(contents(published)[0],7);
  now=1000;f.host.present();assert.equal(contents(published)[0],8);
  const target=f.client.device.createBuffer({size:16,usage:8}),encoder=f.client.device.createCommandEncoder();encoder.copyBufferToBuffer(f.buffer,0,target,0,16);f.client.device.queue.submit([encoder.finish()]);await flush();await f.host.idle();
  assert.equal(contents(f.gpu.buffers.at(-1))[0],7,'future preparation must read its producer snapshot, not the older frame clock');assert.deepEqual(f.errors,[]);
 }finally{f.client.dispose();await f.host.dispose();}
});
