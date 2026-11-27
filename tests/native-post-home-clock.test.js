import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeHomeArrivalRemoteFixture,prepareHomeAbsenceDraw} from './helpers/native-home-arrival-remote.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {rejectedNativeFrameTarget,rejectedHistoricalIntervalTarget,isPreparedFrameInvalidation} from '../src/rendering/webgpu-frame-recovery.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';

function surfaceContinuation(pump,readState){
 const source=readFileSync(new URL('../src/rendering/webgpu-world-surface.js',import.meta.url),'utf8');
 const entry=source.match(/function retainRejectedNativeFrame\(error,metadata\)\{[\s\S]*?(?=  function acceptPreparedNativeTerrain)/)[0];
 const renderer={info:{frame:1},shadowMap:{}},sun={shadow:{}};
 const retain=Function('remoteGpu','temporal','renderer','sun','nativeFrameState','timelinePump','rejectedNativeFrameTarget','rejectedHistoricalIntervalTarget',
  `let nativeResumeTarget,nativeRejectedFrame; ${entry} return retainRejectedNativeFrame;`)(
  {},{},renderer,sun,readState,pump,rejectedNativeFrameTarget,rejectedHistoricalIntervalTarget);
 return {retain,renderer,sun};
}

test('Home19 continues after Draw rejects an expired prepared interval in the same world',async()=>{
 const f=await nativeHomeArrivalRemoteFixture();let prepared,pump,historicalClock;
 try{
  const result=await f.native.planner.startNativeHomeArrivalAfterGpuQuiescence({actorId:f.native.actor,getPublication:()=>f.source,prepareResources:async({resources})=>{
   prepared=await prepareHomeAbsenceDraw(f,resources);return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedHomeArrivalTemplate:resources.nativeHomeArrival,valid:prepared.valid,commit:d=>prepared.commit(d.worldBoundary,d.nativeHomeArrivalBinding),abort:prepared.abort};
  }});
  assert.equal(result.status,'committed');await flush();f.host.present();await prepared.presented;
  const boundary=result.worldBoundary,at=f.native.state.elapsed;
  const retained=f.client.device.createBuffer({size:16,usage:72});await flush();await f.host.idle();const gpuBuffer=f.gpu.buffers.at(-1),resourceCount=f.host.inspect().resources;
  const clock=elapsed=>({...f.clock,elapsed,safeUntil:elapsed});
  const record=(elapsed,value,metadata={})=>{f.client.beginFrame({nativeWorldBoundary:boundary});f.client.device.queue.writeBuffer(retained,0,new Float32Array([value]));const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame({clock:clock(elapsed),nativeWorldBoundary:boundary,...metadata});};
  f.native.advance(.05);await flush();f.host.present();const before=f.host.inspect();assert.equal(before.frameTime.elapsed,at+.05);
  const receipt=record(at,99);receipt.catch(()=>{});await flush();await f.host.idle();f.host.present();await flush();
  assert.equal(f.host.inspect().failed,false,JSON.stringify(f.errors.map(e=>e.message)));
  const error=await receipt.then(()=>assert.fail('obsolete packet cannot report presented'),e=>e);
  assert.equal(error.code,'remote-frame-native-clock-obsolete');assert.equal(error.resourcePreparationsRetained,true);
  assert.equal(f.host.inspect().activeSequence,before.activeSequence);assert.equal(f.host.inspect().pendingSequence,null);assert.equal(f.host.inspect().frameTime.elapsed,at+.05);
  assert.equal(new Float32Array(gpuBuffer.data.buffer)[0],0,'obsolete uploads are retained without execution');assert.equal(gpuBuffer.destroyed,false);
  const metadata={clock:clock(at),nativeWorldBoundary:boundary},state={prepared:boundary,required:boundary};
  assert(isPreparedFrameInvalidation(error));assert.deepEqual(rejectedNativeFrameTarget(error,metadata,state),boundary);
  let applied=0,elapsed=at,cancelled=0,certified=0;
  const ends=[at+.02,at+.04,at+.05],stream={status:()=>({sequence:applied,lastElapsed:elapsed}),timelineStatus:()=>({receivedElapsed:ends.at(-1)}),
   nextTimelineBoundary:()=>applied<ends.length?{sequence:applied+1,elapsed:ends[applied]}:null,
   lastConfirmedClockSegments:()=>null,advanceNextTimelineBoundary(){elapsed=ends[applied++];return true;},
   previewNextMotionBoundary(){
    if(applied>=ends.length-1)return null;
    const start=elapsed,end=ends[applied],segments=[{start,end,rate:1,realDuration:end-start}];
    return {sequence:applied+1,start,end,reasons:[],safeForAutonomousPlayback:true,
     clockSegments:{version:1,start,end,startPauses:[],endPauses:[],complete:true,segments}};
   }};
  historicalClock=createConfirmedHistoricalClock({initialElapsed:at,now:()=>0,timeOrigin:0});
  pump=createConfirmedTimelinePump({stream,preparedIntervals:true,historicalPlayback:{clock:historicalClock,certify(value){certified++;return value;},
   start:()=>true,isCurrent:()=>true,canPrepareInterval:()=>true,cancel(){cancelled++;},finish(){},abort(){}}});
  assert.equal(pump.advance(),0);
  const historical={clock:{...historicalClock.remoteLease({allowAdvance:true}),epoch:f.clock.epoch},preparedInterval:pump.preparedInterval()};
  const expired=record(at,101,historical),refused=expired.catch(reason=>reason);
  await flush();await f.host.idle();f.host.present();
  const rejection=await refused;
  assert.equal(rejection.code,'remote-frame-native-clock-obsolete',rejection.message);
  assert.equal(rejection.resourcePreparationsRetained,true);
  assert.deepEqual(rejection.clockRejection,{epoch:0,safeUntil:ends[0],presentedThrough:at+.05});
  assert.equal(f.host.inspect().activeSequence,before.activeSequence);assert.equal(f.host.inspect().pendingSequence,null);
  assert.equal(new Float32Array(gpuBuffer.data.buffer)[0],0);
  f.native.advance(.05);await flush();f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed,at+.05,'absence replay leaves an attainable replacement boundary');
  assert.equal(rejectedNativeFrameTarget(error,{...metadata,...historical},state),null);
  let world=state;
  const surface=surfaceContinuation(pump,()=>world);
  const rejectedMetadata={...metadata,...historical};
  world={...state,required:{...boundary,ticket:boundary.ticket+1}};
  assert.equal(surface.retain(rejection,rejectedMetadata),false);
  world=state;
  assert.equal(surface.retain({...rejection,code:rejection.code,clockRejection:{...rejection.clockRejection,presentedThrough:ends[0]}},rejectedMetadata),false);
  const floorRejection={code:rejection.code,resourcePreparationsRetained:true,
   clockRejection:{epoch:0,safeUntil:ends[0],mutationFloor:ends.at(-1)}};
  assert.deepEqual(rejectedHistoricalIntervalTarget(floorRejection,rejectedMetadata,state),boundary);
  assert.equal(rejectedHistoricalIntervalTarget({...floorRejection,clockRejection:{...floorRejection.clockRejection,mutationFloor:ends[0]}},rejectedMetadata,state),null);
  assert.equal(surface.retain(rejection,{...rejectedMetadata,preparedInterval:{...historical.preparedInterval,token:2}}),false);
  assert.equal(cancelled,0);assert.equal(applied,0);
  assert.equal(surface.retain(rejection,rejectedMetadata),true);
  assert.equal(cancelled,1);assert.equal(applied,0);assert.equal(surface.sun.shadow.needsUpdate,true);
  assert.equal(pump.advance(),3);assert.equal(elapsed,at+.05);assert.equal(certified,1);
  const fresh=record(at+.05,7);await flush();await f.host.idle();f.host.present();await fresh;
  assert.equal(new Float32Array(gpuBuffer.data.buffer)[0],7);assert.equal(f.host.inspect().resources,resourceCount);assert.equal(gpuBuffer.destroyed,false);
  assert(f.host.inspect().activeSequence>before.activeSequence);assert.equal(f.host.inspect().frameTime.elapsed,at+.05);assert.deepEqual(f.errors,[]);
 }finally{pump?.dispose();historicalClock?.dispose();await f.close();}
});

test('clock obsolescence cannot retain a missing owner, different world, interval or unretained preparation',()=>{
 const boundary={version:1,authorityEpoch:'clock-world',nativeSession:1,ticket:2,effectiveTime:10},error={code:'remote-frame-native-clock-obsolete',resourcePreparationsRetained:true},metadata={nativeWorldBoundary:boundary},state={prepared:boundary,required:boundary};
 for(const patch of [{prepared:null},{required:null},{prepared:{...boundary,ticket:3}},{required:{...boundary,ticket:3}},{closed:true}])assert.equal(rejectedNativeFrameTarget(error,metadata,{...state,...patch}),null);
 assert.equal(rejectedNativeFrameTarget({...error,resourcePreparationsRetained:false},metadata,state),null);
 assert.equal(rejectedNativeFrameTarget(error,{...metadata,preparedInterval:{}},state),null);
 assert.equal(rejectedNativeFrameTarget({code:'remote-frame-native-mutation-obsolete',resourcePreparationsRetained:true},metadata,state),null,'same-world retry does not relax mutation recovery');
});
