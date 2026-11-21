import test from 'node:test';import assert from 'node:assert/strict';
import {nativeHomeArrivalRemoteFixture,prepareHomeAbsenceDraw} from './helpers/native-home-arrival-remote.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {rejectedNativeFrameTarget,isPreparedFrameInvalidation} from '../src/rendering/webgpu-frame-recovery.js';

test('ordinary packet overtaken after Home19 is rejected before drawing and can be rerecorded in the same world',async()=>{
 const f=await nativeHomeArrivalRemoteFixture();let prepared;
 try{
  const result=await f.native.planner.startNativeHomeArrivalAfterGpuQuiescence({actorId:f.native.actor,getPublication:()=>f.source,prepareResources:async({resources})=>{
   prepared=await prepareHomeAbsenceDraw(f,resources);return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedHomeArrivalTemplate:resources.nativeHomeArrival,valid:prepared.valid,commit:d=>prepared.commit(d.worldBoundary,d.nativeHomeArrivalBinding),abort:prepared.abort};
  }});
  assert.equal(result.status,'committed');await flush();f.host.present();await prepared.presented;
  const boundary=result.worldBoundary,at=f.native.state.elapsed;
  const retained=f.client.device.createBuffer({size:16,usage:72});await flush();await f.host.idle();const gpuBuffer=f.gpu.buffers.at(-1),resourceCount=f.host.inspect().resources;
  const clock=elapsed=>({...f.clock,elapsed,safeUntil:elapsed});
  const ordinary=(elapsed,value)=>{f.client.beginFrame({nativeWorldBoundary:boundary});f.client.device.queue.writeBuffer(retained,0,new Float32Array([value]));const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame({clock:clock(elapsed),nativeWorldBoundary:boundary});};
  f.native.advance(.05);await flush();f.host.present();const before=f.host.inspect();assert.equal(before.frameTime.elapsed,at+.05);
  const receipt=ordinary(at,99);receipt.catch(()=>{});await flush();await f.host.idle();f.host.present();await flush();
  assert.equal(f.host.inspect().failed,false,JSON.stringify(f.errors.map(e=>e.message)));
  const error=await receipt.then(()=>assert.fail('obsolete packet cannot report presented'),e=>e);
  assert.equal(error.code,'remote-frame-native-clock-obsolete');assert.equal(error.resourcePreparationsRetained,true);
  assert.equal(f.host.inspect().activeSequence,before.activeSequence);assert.equal(f.host.inspect().pendingSequence,null);assert.equal(f.host.inspect().frameTime.elapsed,at+.05);
  assert.equal(new Float32Array(gpuBuffer.data.buffer)[0],0,'obsolete uploads are retained without execution');assert.equal(gpuBuffer.destroyed,false);
  const metadata={clock:clock(at),nativeWorldBoundary:boundary},state={prepared:boundary,required:boundary};
  assert(isPreparedFrameInvalidation(error));assert.deepEqual(rejectedNativeFrameTarget(error,metadata,state),boundary);
  const fresh=ordinary(at+.05,7);await flush();await f.host.idle();f.host.present();await fresh;
  assert.equal(new Float32Array(gpuBuffer.data.buffer)[0],7);assert.equal(f.host.inspect().resources,resourceCount);assert.equal(gpuBuffer.destroyed,false);
  assert(f.host.inspect().activeSequence>before.activeSequence);assert.equal(f.host.inspect().frameTime.elapsed,at+.05);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('clock obsolescence cannot retain a missing owner, different world, interval or unretained preparation',()=>{
 const boundary={version:1,authorityEpoch:'clock-world',nativeSession:1,ticket:2,effectiveTime:10},error={code:'remote-frame-native-clock-obsolete',resourcePreparationsRetained:true},metadata={nativeWorldBoundary:boundary},state={prepared:boundary,required:boundary};
 for(const patch of [{prepared:null},{required:null},{prepared:{...boundary,ticket:3}},{required:{...boundary,ticket:3}},{closed:true}])assert.equal(rejectedNativeFrameTarget(error,metadata,{...state,...patch}),null);
 assert.equal(rejectedNativeFrameTarget({...error,resourcePreparationsRetained:false},metadata,state),null);
 assert.equal(rejectedNativeFrameTarget(error,{...metadata,preparedInterval:{}},state),null);
 assert.equal(rejectedNativeFrameTarget({code:'remote-frame-native-mutation-obsolete',resourcePreparationsRetained:true},metadata,state),null,'same-world retry does not relax mutation recovery');
});
