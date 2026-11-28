import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

// Real native authority, control publication, client and Host. GPU/transport
// are deterministic doubles; no hardware or healthy-recovery claim here.
async function connected(){
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair(),f=await fixture({}, {intentControl:{port:drawPort,session:'failed-drain'}});let source;
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();source=createNativeIntentControlPublication({port:sourcePort,session:'failed-drain',observe:native.bridge.observeNativeIntentControl,timeoutMs:200});const incoming=[],receive=sourcePort.onmessage;sourcePort.onmessage=e=>{incoming.push(e.data);receive(e);};await source.ready;
  const frame=f.frame(1,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]}});await flush();await f.host.idle();f.host.present();await frame;
  const original=f.gpu.device.queue.onSubmittedWorkDone;let calls=0,pending=[];
  const holdQueue=()=>{f.gpu.device.queue.onSubmittedWorkDone=()=>{calls++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));};};
  const release=()=>{for(const p of pending.splice(0))p.resolve();};
  const fail=async()=>{f.gpu.device.createShaderModule=()=>{throw Error('Injected native consumer validation failure');};f.client.device.createShaderModule({code:'invalid fixture shader'});await flush();await f.host.idle();await flush();assert(f.host.inspect().failed);assert(f.errors.some(e=>e.message.includes('Injected native consumer validation failure')));};
  return {...f,native,source,incoming,holdQueue,release,fail,get queueCalls(){return calls;},async close(){f.gpu.device.queue.onSubmittedWorkDone=original;release();source.dispose();f.client.dispose();await f.host.dispose().catch(()=>{});native.session.dispose();}};
 }catch(error){source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();throw error;}
}

test('failed native consumer freezes submissions and waits for its real drain, keeping admitted resources until explicit disposal',async()=>{
 const f=await connected();try{f.holdQueue();const submissions=f.gpu.submitted.length,buffers=f.gpu.buffers.slice();await f.fail();assert.equal(f.queueCalls,1);assert.equal(f.source.status().drained,false);assert.equal(f.source.status().closed,false);f.host.present();assert.equal(f.gpu.submitted.length,submissions);assert(buffers.every(b=>!b.destroyed));f.release();await flush();assert.equal(f.source.status().drained,true);assert.equal(f.source.status().closed,true);assert.equal(f.host.inspect().failed,true);assert(buffers.every(b=>!b.destroyed));const wire=f.incoming.filter(v=>v.type==='intent-control-retired');assert.equal(wire.length,1);const receipt=await f.source.retireGpu();assert.equal(receipt.consumerToken,wire[0].consumerToken);assert.equal(receipt.sequence,wire[0].sequence);assert.equal(receipt.drained,true);assert(Object.isFrozen(receipt));assert.equal(await f.source.retireGpu(),receipt);assert.equal(Object.hasOwn(receipt,'retirementId'),false);assert.equal(f.queueCalls,1);}finally{await f.close();}
});

test('a failure during requested retirement cannot suppress the already captured queue completion',async()=>{
 const f=await connected();let pending;try{f.holdQueue();pending=f.source.retireGpu();pending.catch(()=>{});await flush();assert.equal(f.queueCalls,1);await f.fail();assert.equal(f.queueCalls,1);assert.equal(f.source.status().drained,false);f.release();const receipt=await pending;assert(receipt.retirementId);assert.equal(f.host.intentControlStatus().drained,true);assert.equal(f.source.status().drained,true);assert.equal(f.source.status().closed,true);assert.equal(f.queueCalls,1);assert.equal(f.incoming.filter(v=>v.type==='intent-control-retired'||v.type==='intent-control-drained').length,1);}finally{f.release();await pending?.catch(()=>{});await f.close();}
});

test('failure and explicit disposal share one terminal queue wait and never destroy admitted buffers before completion',async()=>{
 const f=await connected();let disposal;try{f.holdQueue();await f.fail();assert.equal(f.queueCalls,1);const buffers=f.gpu.buffers.slice();disposal=f.host.dispose();await flush();assert.equal(f.queueCalls,1);assert(buffers.every(b=>!b.destroyed));assert.equal(f.source.status().drained,false);f.release();await disposal;await flush();assert(buffers.every(b=>b.destroyed));assert.equal(f.source.status().drained,true);assert.equal(f.incoming.filter(v=>v.type==='intent-control-retired').length,1);}finally{f.release();await disposal?.catch(()=>{});await f.close();}
});

test('rejected queue completion does not attest drainage; only later explicit device loss can retire that connection',async()=>{
 const f=await connected();let calls=0;try{f.gpu.device.queue.onSubmittedWorkDone=()=>{calls++;return Promise.reject(Error('Injected queue completion failure'));};await f.fail();await flush();assert.equal(calls,1);assert.equal(f.source.status().drained,false);assert.equal(f.source.status().closed,false);assert.equal(f.incoming.filter(v=>v.type==='intent-control-retired').length,0);f.gpu.device.destroy();await flush();assert.equal(f.source.status().drained,true);assert.equal(f.source.status().closed,true);}finally{await f.close();}
});

test('retireGpu is idempotent after a valid consumer-initiated disposal receipt, without inventing a requested retirement token',async()=>{
 const f=await connected();let disposal;try{f.holdQueue();disposal=f.host.dispose();await flush();assert.equal(f.source.status().drained,false);f.release();await disposal;await flush();assert.equal(f.source.status().drained,true);const wire=f.incoming.find(v=>v.type==='intent-control-retired');assert(wire);const first=await f.source.retireGpu(),second=await f.source.retireGpu();assert.equal(first,second);assert.equal(first.consumerToken,wire.consumerToken);assert.equal(first.authorityEpoch,wire.authorityEpoch);assert.equal(first.sequence,wire.sequence);assert.equal(first.drained,true);assert.equal(Object.hasOwn(first,'retirementId'),false);}finally{f.release();await disposal?.catch(()=>{});await f.close();}
});

test('a resource completion behind failure cannot resume an operation and submit after its drained receipt',async()=>{
 const f=await connected();let releasePipeline,rejected;try{
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{releasePipeline=resolve;});await f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'failed-late-pipeline',descriptor:{}});
  const command={__remoteCommands:[{method:'beginRenderPass',args:[{colorAttachments:[]}],commands:[{method:'setPipeline',args:[{__remoteGpuId:'failed-late-pipeline'}]},{method:'draw',args:[3]}]}]};
  const operation=f.host.handle({type:'operation',op:{method:'submit',args:[[command]]}});rejected=assert.rejects(operation,/closed|retiring/);const submissions=f.gpu.submitted.length;f.holdQueue();await f.fail();assert.equal(f.queueCalls,1);f.release();await flush();assert.equal(f.source.status().drained,true);releasePipeline({});releasePipeline=null;await rejected;assert.equal(f.gpu.submitted.length,submissions);assert.equal(f.incoming.filter(v=>v.type==='intent-control-retired').length,1);
 }finally{releasePipeline?.({});await rejected?.catch(()=>{});await f.close();}
});
