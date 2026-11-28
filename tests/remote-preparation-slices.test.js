import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

async function setup(options={},gateAt=1,transport=false){
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();
 let charging=false,now=1000,release=null,enter=null,turns=0;
 const blocked=new Promise(resolve=>{enter=resolve;});
 const f=await fixture(transport?{capabilities:{width:20,height:10,format:'rgba8unorm',resourceTransportVersion:1}}:{}, {intentControl:{port:drawPort,session:'preparation-slices'},absoluteNow:()=>{if(charging)now+=.1;return now;},
  yieldResourceTask:()=>{turns++;if(turns===gateAt)return new Promise(resolve=>{release=resolve;enter();});return Promise.resolve();},...options});
 native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
 const source=createNativeIntentControlPublication({port:sourcePort,session:'preparation-slices',observe:native.bridge.observeNativeIntentControl});await source.ready;
 const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
 const shown=f.frame(1,{clock});await flush();await f.host.idle();f.host.present();await shown;
 return {...f,native,source,clock,blocked,get turns(){return turns;},charge(){charging=true;},release(){release?.();},
  async close(){charging=false;release?.();source.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();}};
}
function draw(f,boundary,{signal=null,draws=800,extraBytes=0,writes=1,extraWrites=[]}={}){
 f.client.beginFrame({nativeWorldBoundary:boundary});for(let i=0;i<writes;i++)f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([77]));
 for(const buffer of extraWrites)f.client.device.queue.writeBuffer(buffer,0,new Float32Array([77]));
 const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);for(let i=0;i<draws;i++)pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
 if(extraBytes)f.client.device.queue.writeBuffer(f.buffer,0,new Uint8Array(extraBytes));
 return f.client.prepareNativeWorldFrame({clock:f.clock,nativeWorldBoundary:boundary},{signal});
}
function mutate(f,prepareResources){return f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources});}
function preparedResult(prepared){return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};}

test('one large prepared packet yields internally before GPU changes and keeps the acquired image drawable',async()=>{
 const f=await setup();let prepared;
 try{
  const old=f.gpu.buffers[0],before=f.native.session.core.snapshot(),writes=f.host.inspect().queueWrites;
  const result=mutate(f,async({proposedWorldBoundary})=>{f.charge();prepared=await draw(f,proposedWorldBoundary);return preparedResult(prepared);});
  const outcome=await Promise.race([f.blocked.then(()=> 'yield'),result.then(()=> 'finished')]);
  assert.equal(outcome,'yield','the work must yield inside this packet, not only after dispatch');
  assert.equal(prepared,undefined);assert.equal(f.host.inspect().pendingSequence,null);assert.equal(f.host.inspect().queueWrites,writes);
  assert.equal(new Float32Array(old.data.buffer)[0],1);assert.deepEqual(f.native.session.core.snapshot(),before);
  const submissions=f.gpu.canvasSubmissions.length;f.host.present();assert.equal(f.gpu.canvasSubmissions.length,submissions+1);assert.equal(f.host.inspect().activeSequence,1);
  f.release();const committed=await result;assert.equal(committed.status,'committed',JSON.stringify(committed));assert(f.turns>2);
  f.host.present();await prepared.presented;assert.equal(f.host.inspect().activeSequence,2);assert.equal(new Float32Array(old.data.buffer)[0],1);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const [gateAt,transport] of [[1,false],[4,false],[6,false],[1,true]])test('cancellation at inspection slice '+gateAt+' with transport '+transport+' retains CPU preparations without acquiring the proposal; the retry can use them',async()=>{
 const f=await setup({},gateAt,transport),controller=new AbortController();let prepared;
 try{
  const before=f.native.session.core.snapshot(),writes=f.host.inspect().queueWrites;
  const result=mutate(f,async({proposedWorldBoundary})=>{f.charge();return preparedResult(await draw(f,proposedWorldBoundary,{signal:controller.signal}));});
  assert.equal(await Promise.race([f.blocked.then(()=> 'yield'),result.then(()=> 'finished')]),'yield');
  controller.abort();await flush();const cancelled=await result;await f.host.idle();
  assert.notEqual(cancelled.status,'committed');assert.equal(f.host.inspect().failed,false);assert.equal(f.host.inspect().queueWrites,writes);assert.equal(f.host.inspect().activeSequence,1);assert.equal(f.host.inspect().pendingSequence,null);assert.deepEqual(f.native.session.core.snapshot(),before);
  assert(f.host.inspect().retainedPreparationResources>0);assert.equal(f.host.inspect().preparationRecoveryRequired,false);
  f.release();
  const retried=await mutate(f,async({proposedWorldBoundary})=>{prepared=await draw(f,proposedWorldBoundary,{draws:1});return preparedResult(prepared);});
  assert.equal(retried.status,'committed',JSON.stringify(retried));f.host.present();await prepared.presented;assert.equal(f.host.inspect().retainedPreparationResources,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('a late command-count violation remains a failure after slices, with no upload or native acquisition',async()=>{
 const f=await setup({maxFrameOperations:50});
 try{
  const before=f.native.session.core.snapshot(),writes=f.host.inspect().queueWrites;
  const result=mutate(f,async({proposedWorldBoundary})=>{f.charge();return preparedResult(await draw(f,proposedWorldBoundary));});
  assert.equal(await Promise.race([f.blocked.then(()=> 'yield'),result.then(()=> 'finished')]),'yield');f.release();
  assert.notEqual((await result).status,'committed');await f.host.idle();assert.equal(f.host.inspect().queueWrites,writes);assert.equal(f.host.inspect().pendingSequence,null);assert.deepEqual(f.native.session.core.snapshot(),before);assert(f.errors.some(e=>/command count exceeds safety limit|Invalid remote pass command/.test(e.message)));
 }finally{await f.close();}
});

test('byte limits count typed payloads after a large command tree, before any native upload',async()=>{
 const f=await setup({maxFrameBytes:64});
 try{
  const before=f.native.session.core.snapshot(),writes=f.host.inspect().queueWrites;
  const result=mutate(f,async({proposedWorldBoundary})=>{f.charge();return preparedResult(await draw(f,proposedWorldBoundary,{extraBytes:128}));});
  assert.equal(await Promise.race([f.blocked.then(()=> 'yield'),result.then(()=> 'finished')]),'yield');f.release();
  assert.notEqual((await result).status,'committed');await f.host.idle();assert.equal(f.host.inspect().queueWrites,writes);assert.equal(f.host.inspect().pendingSequence,null);assert.deepEqual(f.native.session.core.snapshot(),before);assert(f.errors.some(e=>/Remote frame exceeds safety limit/.test(e.message)));
 }finally{await f.close();}
});

test('a cyclic wire packet fails inspection instead of resuming forever',async()=>{
 const f=await setup();try{
  const cycle={};cycle.self=cycle;
  await assert.rejects(f.host.handle({type:'prepare-world-frame',version:1,packet:{sequence:2,metadata:{cycle},operations:[]}}),/Cyclic remote frame/);
  assert.equal(f.host.inspect().pendingSequence,null);assert.equal(f.host.inspect().activeSequence,1);
 }finally{await f.close();}
});

test('cancellation inside prepared uploads preserves the displayed generation and retries retained bytes',async()=>{
 let uploaded=0,release,enter;const blocked=new Promise(resolve=>{enter=resolve;});
 const f=await setup({resourceSliceMs:0,yieldResourceTask:()=>uploaded===1?new Promise(resolve=>{release=resolve;enter();}):Promise.resolve()}),controller=new AbortController();
 const write=f.gpu.device.queue.writeBuffer;f.gpu.device.queue.writeBuffer=(buffer,offset,data)=>{write(buffer,offset,data);if(new Float32Array(data.buffer,data.byteOffset??0,1)[0]===77)uploaded++;};
 try{
  const old=f.gpu.buffers[0],before=f.native.session.core.snapshot();
  const result=mutate(f,async({proposedWorldBoundary})=>preparedResult(await draw(f,proposedWorldBoundary,{signal:controller.signal,draws:1,writes:12})));
  assert.equal(await Promise.race([blocked.then(()=>'yield'),result.then(()=>'finished')]),'yield');
  assert.equal(uploaded,1);assert.equal(new Float32Array(old.data.buffer)[0],1);assert.equal(f.host.inspect().pendingSequence,null);
  controller.abort();await flush();assert.notEqual((await result).status,'committed');await f.host.idle();
  assert.equal(f.host.inspect().failed,false);assert.equal(f.host.inspect().preparationRecoveryRequired,false);assert.deepEqual(f.native.session.core.snapshot(),before);
  assert(f.host.inspect().retainedPreparationResources>0);uploaded++;release();let prepared;
  const retry=await mutate(f,async({proposedWorldBoundary})=>{prepared=await draw(f,proposedWorldBoundary,{draws:1});return preparedResult(prepared);});
  assert.equal(retry.status,'committed');f.host.present();await prepared.presented;assert.equal(new Float32Array(old.data.buffer)[0],1);assert.deepEqual(f.errors,[]);
 }finally{uploaded++;release?.();await f.close();}
});

test('cancelling between COW buffers repins retained dependencies before the retry forks the remaining buffers',async()=>{
 let forks=0,tracking=false,once=false,enter,release;const blocked=new Promise(resolve=>{enter=resolve;});
 const f=await setup({resourceSliceMs:0,yieldResourceTask:()=>{if(forks===1&&!once){once=true;return new Promise(resolve=>{release=resolve;enter();});}return Promise.resolve();}}),controller=new AbortController();
 try{
  const extras=[0,1].map(()=>f.client.device.createBuffer({size:16,usage:72}));
  f.group=f.client.device.createBindGroup({entries:[f.buffer,...extras].map((buffer,binding)=>({binding,resource:{buffer}}))});
  f.client.beginFrame({clock:f.clock});for(const buffer of [f.buffer,...extras])f.client.device.queue.writeBuffer(buffer,0,new Float32Array([1]));
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const shown=f.client.endFrame();await flush();await f.host.idle();f.host.present();await shown;
  const originals=f.gpu.buffers.slice(),before=f.native.session.core.snapshot(),create=f.gpu.device.createBuffer;f.gpu.device.createBuffer=d=>{if(tracking)forks++;return create(d);};tracking=true;
  const result=mutate(f,async({proposedWorldBoundary})=>preparedResult(await draw(f,proposedWorldBoundary,{draws:1,extraWrites:extras,signal:controller.signal})));
  assert.equal(await Promise.race([blocked.then(()=>'yield'),result.then(()=>'finished')]),'yield');assert.equal(forks,1);
  controller.abort();await flush();assert.notEqual((await result).status,'committed');await f.host.idle();assert.equal(f.host.inspect().preparationRecoveryRequired,false);assert.deepEqual(f.native.session.core.snapshot(),before);release();let prepared;
  const retry=await mutate(f,async({proposedWorldBoundary})=>{prepared=await draw(f,proposedWorldBoundary,{draws:1,extraWrites:extras});return preparedResult(prepared);});
  assert.equal(retry.status,'committed');f.host.present();await prepared.presented;
  assert(originals.every(b=>new Float32Array(b.data.buffer)[0]===1));assert.equal(f.host.inspect().retainedPreparationResources,0);assert.deepEqual(f.errors,[]);
 }finally{release?.();await f.close();}
});
