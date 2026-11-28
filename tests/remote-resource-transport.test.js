import test from 'node:test';
import assert from 'node:assert/strict';
import {createRemoteWebGpuClient} from '../src/rendering/remote-webgpu-client.js';
import {createRemoteWebGpuHost} from '../src/rendering/remote-webgpu-host.js';
import {pair,fakeGpu} from './helpers/remote-webgpu-fixture.js';
import {MessageChannel} from 'node:worker_threads';

test('resource reception stays bounded before the receiver can execute a resource job',async()=>{
 const [producer,consumer]=pair(),gpu=fakeGpu();let sent=0,release;
 const post=producer.postMessage;producer.postMessage=m=>{if(m.type==='create')sent++;post(m);};
 const host=createRemoteWebGpuHost({...gpu,canvas:{width:1,height:1},port:consumer,requestFrame:()=>0,cancelFrame(){},resourceSliceMs:0,yieldResourceTask:()=>new Promise(resolve=>{release=resolve;})});
 const client=createRemoteWebGpuClient({port:producer,capabilities:{resourceTransportVersion:1,width:1,height:1},onError(){}});
 try{
  for(let i=0;i<200;i++)client.device.createBuffer({size:16,usage:72});
  await new Promise(setImmediate);
  assert(sent>0&&sent<=8,`only the transport window may arrive before dispatch; received ${sent}`);
  assert.equal(gpu.buffers.length,0);
 }finally{client.dispose();release?.();await host.dispose();}
});

test('buffer batches conserve eight logical credits and send a separate ordered fence',async()=>{
 const [producer,consumer]=pair(),gpu=fakeGpu(),sent=[],errors=[];
 let release;
 const post=producer.postMessage;
 producer.postMessage=(message,transfers)=>{sent.push(message);post(message,transfers);};
 const host=createRemoteWebGpuHost({...gpu,port:consumer,canvas:{width:1,height:1},requestFrame:()=>0,cancelFrame(){},
  resourceSliceMs:0,yieldResourceTask:()=>release===undefined?new Promise(resolve=>{release=resolve;}):Promise.resolve()});
 const client=createRemoteWebGpuClient({port:producer,capabilities:{resourceTransportVersion:1,resourceBatchVersion:1},onError:e=>errors.push(e)});
 try{
  const values=Array.from({length:12},(_,index)=>new Uint32Array([index+1]));
  for(const value of values){
   const buffer=client.device.createBuffer({size:4,usage:72});
   client.device.queue.writeBuffer(buffer,0,value);
   value[0]=0;
  }
  const fence=client.device.queue.onResourceSubmissionOrdered();
  await new Promise(setImmediate);
  assert.deepEqual(sent.map(message=>[message.type,message.transportSequence,message.messages?.length]),
   [['resource-batch',4,4],['resource-batch',8,4]]);
  assert.equal(client.inspect().transportInFlight,8);
  assert.equal(gpu.buffers.length,0);
  release();
  await fence;
  assert.deepEqual(gpu.buffers.map(buffer=>new Uint32Array(buffer.data.buffer)[0]),values.map((_,index)=>index+1));
  assert.equal(sent.filter(message=>message.type==='resource-batch').length,6);
  assert.equal(sent.at(-1).type,'ordered-submission');
  assert.equal(sent.at(-1).transportSequence,25);
  assert.deepEqual(errors,[]);
 }finally{release?.();client.dispose();await host.dispose();}
});

test('a batch must have an exact sequence and contain only eligible jobs',async()=>{
 const creation=id=>({type:'create',method:'createBuffer',id,descriptor:{size:4,usage:72}});
 for(const [messages,transportSequence] of [
  [[creation('Buffer:1'),{type:'ordered-submission'}],2],
  [[creation('Buffer:1')],2],
  [Array.from({length:5},(_,i)=>creation('Buffer:'+(i+1))),5],
  [[creation('Buffer:1'),,creation('Buffer:3')],3]
 ]){
  const [producer,consumer]=pair(),gpu=fakeGpu();
  const host=createRemoteWebGpuHost({...gpu,port:consumer,canvas:{width:1,height:1},requestFrame:()=>0,cancelFrame(){}});
  try{
   producer.postMessage({type:'resource-batch',transportSequence,messages});
   await new Promise(setImmediate);
   assert.equal(host.inspect().failed,true);
   assert.equal(gpu.buffers.length,0);
  }finally{await host.dispose();}
 }
});

test('an acknowledgement of a job inside a batch cannot grant credit',async()=>{
 const [producer,consumer]=pair(),errors=[];
 const client=createRemoteWebGpuClient({port:producer,capabilities:{resourceTransportVersion:1,resourceBatchVersion:1},onError:e=>errors.push(e)});
 try{
  const frames=[];consumer.onmessage=({data})=>frames.push(data);
  for(let i=0;i<4;i++)client.device.createBuffer({size:4,usage:72});
  await new Promise(setImmediate);
  assert.equal(frames[0].transportSequence,4);
  consumer.postMessage({type:'resource-dispatched',transportSequence:2});
  await new Promise(setImmediate);
  assert.equal(client.inspect().failed,true);
  assert.match(errors[0].message,/acknowledgement/);
 }finally{client.dispose();}
});

test('dispatch credits preserve FIFO without waiting for a native pipeline completion',async()=>{
 const [producer,consumer]=pair(),gpu=fakeGpu();let complete;
 gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{complete=resolve;});
 const host=createRemoteWebGpuHost({...gpu,canvas:{width:1,height:1},port:consumer,requestFrame:()=>0,cancelFrame(){}});
 const errors=[],client=createRemoteWebGpuClient({port:producer,capabilities:{resourceTransportVersion:1,width:1,height:1},onError:e=>errors.push(e)});
 try{
  const pipeline=client.device.createRenderPipelineAsync({});
  for(let i=0;i<40;i++)client.device.createBuffer({size:16,usage:72});
  await client.device.queue.onResourceSubmissionOrdered();
  assert.equal(gpu.buffers.length,40);assert(client.inspect().transportPeak<=8);
  complete({});await pipeline;assert.deepEqual(errors,[]);
 }finally{complete?.({});client.dispose();await host.dispose();}
});

for(const resourceBatchVersion of [undefined,1])test('transport transfers captured write bytes without detaching caller memory ('+(resourceBatchVersion?'batched':'individual')+')',async()=>{
 const channel=new MessageChannel(),gpu=fakeGpu(),errors=[];
 const host=createRemoteWebGpuHost({...gpu,canvas:{width:1,height:1},port:channel.port2,requestFrame:()=>0,cancelFrame(){}});
 const client=createRemoteWebGpuClient({port:channel.port1,capabilities:{resourceTransportVersion:1,resourceBatchVersion,width:1,height:1},onError:e=>errors.push(e)});
 try{
  const value=new Uint32Array([11,22,33,44]),buffer=client.device.createBuffer({size:16,usage:72});
  client.device.queue.writeBuffer(buffer,0,value);value[0]=99;
  await client.device.queue.onResourceSubmissionOrdered();
  assert.equal(value.byteLength,16);assert.equal(value[0],99);assert.deepEqual([...new Uint32Array(gpu.buffers[0].data.buffer)],[11,22,33,44]);
  assert.deepEqual(errors,[]);await client.disposeAsync();
 }finally{client.dispose();await host.dispose();channel.port1.close();channel.port2.close();}
});

test('forged transport acknowledgements cannot grant capacity',async()=>{
 const [producer,consumer]=pair(),errors=[];
 const client=createRemoteWebGpuClient({port:producer,capabilities:{resourceTransportVersion:1},onError:e=>errors.push(e)});
 consumer.postMessage({type:'resource-dispatched',transportSequence:10});await new Promise(setImmediate);
 assert.equal(client.inspect().failed,true);assert.match(errors[0].message,/acknowledgement/);client.dispose();
});

for(const terminal of ['dispose','lost','error'])test('unsent canvas capture is closed after '+terminal,async t=>{
 const originalCanvas=globalThis.OffscreenCanvas,originalCapture=globalThis.createImageBitmap;
 t.after(()=>{if(originalCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=originalCanvas;if(originalCapture===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=originalCapture;});
 globalThis.OffscreenCanvas=class {};let complete,closed=0;
 globalThis.createImageBitmap=()=>new Promise(resolve=>{complete=resolve;});
 const [producer,consumer]=pair(),client=createRemoteWebGpuClient({port:producer,capabilities:{resourceTransportVersion:1},onError(){}});
 client.beginFrame();const target=client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:18});
 client.device.queue.copyExternalImageToTexture({source:new OffscreenCanvas()},{texture:target},[1,1]);
 if(terminal==='dispose')client.dispose();else consumer.postMessage(terminal==='lost'?{type:'lost',info:{reason:'destroyed'}}:{type:'error',error:'test failure'});
 await new Promise(setImmediate);complete({close(){closed++;}});await new Promise(setImmediate);
 assert.equal(closed,1);client.dispose();assert.equal(closed,1);
});

test('a producer cannot inject Host-owned prepared binding identities',async()=>{
 const gpu=fakeGpu(),[,port]=pair(),host=createRemoteWebGpuHost({...gpu,port,canvas:{width:1,height:1},requestFrame:()=>0,cancelFrame(){}});
 try{for(const key of ['preparedClockBindings','preparedCameraBindings'])await assert.rejects(host.handle({type:'prepare-world-frame',version:1,packet:{sequence:1,metadata:{},[key]:[]}}),/producer cannot supply/);}
 finally{await host.dispose();}
});

for(const terminal of ['dispose','lost','error'])test('a late canvas capture cannot restart transport after '+terminal,async t=>{
 const originalCanvas=globalThis.OffscreenCanvas,originalCapture=globalThis.createImageBitmap;
 t.after(()=>{if(originalCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=originalCanvas;if(originalCapture===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=originalCapture;});
 globalThis.OffscreenCanvas=class {};let complete,closed=0;
 globalThis.createImageBitmap=()=>new Promise(resolve=>{complete=resolve;});
 const sent=[],port={postMessage:m=>sent.push(m.type)},client=createRemoteWebGpuClient({port,capabilities:{resourceTransportVersion:1},onError(){}});
 try{
  const texture=client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:18});
  client.device.queue.copyExternalImageToTexture({source:new OffscreenCanvas()},{texture},[1,1]);
  await new Promise(setImmediate);
  if(terminal==='dispose')client.dispose();else port.onmessage({data:terminal==='lost'?{type:'lost',info:{reason:'destroyed'}}:{type:'error',error:'test failure'}});
  const terminalCount=sent.length;complete({close(){closed++;}});await new Promise(setImmediate);
  assert.equal(closed,1);assert.equal(sent.length,terminalCount,'terminal transport must not post a late bitmap');
  assert.equal(client.inspect().transportInFlight,0);
 }finally{client.dispose();}
});
