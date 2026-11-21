import test from 'node:test';import assert from 'node:assert/strict';
import {nativeIdleStrollRemoteFixture} from './helpers/native-idle-stroll-remote.js';
import {preparedWorldDraw,flush} from './helpers/remote-webgpu-fixture.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';

test('a coherent later world adopts an installed terminal WALK image awaiting Home below the new physical floor',async()=>{
 const f=await nativeIdleStrollRemoteFixture({idleStrollIdlePhase:true});let prepared;
 try{
  const walk=await f.run();assert.equal(walk.status,'committed');await f.v.present();f.advance(walk.nativeIdleStrollBinding.reference.endTime-f.state.elapsed+.2);const source=f.planner.projectNativeIdleStroll(f.state,f.worker);assert(source.arrived);const goal=f.point(6,0),request=f.planner.requestNativeIdleStrollHome(source,{villageId:1,...goal});assert(request);f.planner.commitNativeCausalClock();const body=f.body(1);await f.draw();f.advance(.2);
  const start=f.state.elapsed,clock={version:1,epoch:0,elapsed:start,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,segments:[{start,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-start}]},before=f.v.host.inspect().activeSequence,geometry=f.v.gpu.buffers.find(b=>b.descriptor.size===36);
  const changed=await f.planner.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.v.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary,signal})=>{
   prepared=await preparedWorldDraw({...f.v,clock},proposedWorldBoundary,0,signal);return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});assert.equal(changed.status,'committed',JSON.stringify(changed));await flush();await f.v.host.idle();f.v.host.present();const adopted=f.v.host.inspect();assert(adopted.nativeMutationFloor>walk.nativeIdleStrollBinding.reference.endTime);assert.notEqual(adopted.activeSequence,before,'the prior endpoint must not block its coherent replacement packet');await prepared.presented;
  const ordinary=f.v.frame(0,{clock,nativeWorldBoundary:changed.worldBoundary});await flush();await f.v.host.idle();f.v.host.present();const after=f.v.host.inspect();assert.notEqual(after.activeSequence,adopted.activeSequence);await ordinary;assert.equal(after.failed,false);const binding=after.nativeRouteFrame.bindings.find(v=>v.nativeStroll&&v.semantic==='relative');assert(binding);assert(binding.relativeTime<=nativeClockResourceEnd(binding.epoch,binding.nativeStroll.endTime)-binding.epoch);captureNativeRoutePickFrame(after);assert.deepEqual(f.body(1),body);assert.equal(geometry.destroyed,false);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});
