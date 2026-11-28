import test from 'node:test';
import assert from 'node:assert/strict';
import {pair,fakeGpu,flush} from './helpers/remote-webgpu-fixture.js';
import {createRemoteWebGpuClient} from '../src/rendering/remote-webgpu-client.js';
import {createRemoteWebGpuHost} from '../src/rendering/remote-webgpu-host.js';

function fixture({yieldResourceTask=async()=>{}}={}){
 const [producer,consumer]=pair(),gpu=fakeGpu(),errors=[];let now=1000,resolveBuffer;
 const createBuffer=gpu.device.createBuffer;gpu.device.createBuffer=descriptor=>new Promise(resolve=>{resolveBuffer=()=>resolve(createBuffer(descriptor));});
 const host=createRemoteWebGpuHost({...gpu,canvas:{width:20,height:10},port:consumer,requestFrame:()=>0,cancelFrame(){},absoluteNow:()=>now,yieldResourceTask}),client=createRemoteWebGpuClient({port:producer,capabilities:{width:20,height:10,format:'rgba8unorm'},onError:error=>errors.push(error)});
 return {gpu,host,client,errors,setTime:value=>{now=value;},spend:ms=>{now+=ms;},resolve:()=>resolveBuffer(),async close(){client.dispose();await host.dispose();}};
}

test('a queue continuation whose dependency outlives its slice yields before touching the GPU',async()=>{
 let release,entered;const yielding=new Promise(resolve=>{entered=resolve;}),f=fixture({yieldResourceTask:()=>new Promise(resolve=>{release=resolve;entered();})});try{
  const buffer=f.client.device.createBuffer({size:16,usage:72});f.client.device.queue.writeBuffer(buffer,0,new Float32Array([8]));await flush();f.setTime(10000);f.resolve();await yielding;
  assert.equal(f.host.inspect().resourceTaskYields,1);assert.equal(f.host.inspect().queueWrites,0);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],0);release();await flush();await f.host.idle();assert.equal(f.host.inspect().queueWrites,1);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],8);assert.deepEqual(f.errors,[]);
 }finally{release?.();await f.close();}
});

test('resource timing measures a real write resumed after its dependency, excluding the promise wait',async()=>{
 const f=fixture();try{
  const write=f.gpu.device.queue.writeBuffer;f.gpu.device.queue.writeBuffer=(...args)=>{f.spend(7);return write(...args);};const buffer=f.client.device.createBuffer({size:16,usage:72});f.client.device.queue.writeBuffer(buffer,0,new Float32Array([3]));await flush();assert.equal(f.host.inspect().resourceJobMaxMs,0);
  f.setTime(10000);f.resolve();await flush();await f.host.idle();const m=f.host.inspect();assert.equal(m.resourceJobMaxMs,7);assert.equal(m.resourceJobMaxType,'writeBuffer');assert.equal(m.resourceJobMaxStage,'queue');assert.equal(m.resourceJobMaxAt,10000);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],3);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('resource timing includes the native factory released by a pending dependency',async()=>{
 const f=fixture();try{
  const createGroup=f.gpu.device.createBindGroup;f.gpu.device.createBindGroup=descriptor=>{f.spend(11);return createGroup(descriptor);};const buffer=f.client.device.createBuffer({size:16,usage:72});f.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});await flush();assert.equal(f.host.inspect().resourceJobMaxMs,0);
  f.setTime(20000);f.resolve();await flush();await f.host.idle();const m=f.host.inspect();assert.equal(m.resourceJobMaxMs,11);assert.equal(m.resourceJobMaxType,'createBindGroup');assert.equal(m.resourceJobMaxStage,'build');assert.equal(m.resourceJobMaxAt,20000);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('a failed native operation retains its measured cost and the original failure',async()=>{
 const f=fixture();try{
  f.gpu.device.queue.writeBuffer=()=>{f.spend(9);throw Error('native upload failed');};const buffer=f.client.device.createBuffer({size:16,usage:72});f.client.device.queue.writeBuffer(buffer,0,new Float32Array([3]));await flush();f.setTime(30000);f.resolve();await flush();await f.host.idle();const m=f.host.inspect();assert.equal(m.resourceJobMaxMs,9);assert.equal(m.resourceJobMaxType,'writeBuffer');assert.equal(m.resourceJobMaxStage,'queue');assert.equal(m.resourceJobMaxAt,30000);assert.equal(m.failed,true);assert(f.errors.some(error=>/native upload failed/.test(error.message)));
 }finally{await f.close();}
});
