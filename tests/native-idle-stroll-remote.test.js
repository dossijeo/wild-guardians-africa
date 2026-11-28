import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollRemoteFixture} from './helpers/native-idle-stroll-remote.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeIdleStrollFixture} from './helpers/native-idle-stroll.js';
import {fixture as gpuFixture,flush} from './helpers/remote-webgpu-fixture.js';
import {emit} from '../src/simulation/game.js';
import {cropBecameInactive} from '../src/simulation/active-crops.js';

test('prepared stroll uses its own installed program and submitted clock while retaining static resources',async()=>{
 let ready;const f=await nativeIdleStrollRemoteFixture({onPrepare(f){f.advance(.2);},onDrain(f){f.advance(.1);},onReady(f,{gpu,host,client}){ready={buffers:gpu.buffers.slice(),host:host.inspect(),created:client.inspect().resourcesCreated};}});try{
  const body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),created=f.v.client.inspect().resourcesCreated,buffers=f.v.gpu.buffers.slice(),before=f.v.host.inspect(),geometry=buffers.find(b=>b.descriptor.size===36),result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(result.receipt.nativeIdleStrollVersion,1);assert(ready);assert.deepEqual(ready.buffers.slice(buffers.length).map(b=>b.descriptor.size),[16]);assert.deepEqual(f.v.gpu.buffers,ready.buffers);assert.equal(f.v.host.inspect().uniformForks,ready.host.uniformForks);assert.equal(f.v.host.inspect().bindingForks,ready.host.bindingForks);await f.v.present();f.advance(.125);const consumer=await f.draw(),binding=consumer.nativeRouteFrame.bindings.find(b=>b.nativeStroll?.actorId===f.actor);assert(binding);const ref=result.nativeIdleStrollBinding.preparedReference;assert.deepEqual(binding.nativeStroll,ref);assert.equal(binding.executionEpoch,result.nativeIdleStrollBinding.reference.worldBoundary.effectiveTime);assert.equal(binding.relativeTime,floorFloat32(f.state.elapsed-binding.executionEpoch));const pick=captureNativeRoutePickFrame(consumer);assert.equal(pick.getStrollElapsed(ref),binding.relativeTime);assert.equal(pick.getStrollExecutionTime(ref),binding.executionEpoch+binding.relativeTime);assert.equal(pick.getStrollTime(ref),ref.worldBoundary.effectiveTime+binding.relativeTime);assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.notDeepEqual(f.worker,worker);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.idleState.rng,ref.walkRng);assert.equal(f.v.client.inspect().resourcesCreated,created);assert.equal(consumer.resources,before.resources);assert.equal(geometry.destroyed,false);assert.equal(f.v.gpu.buffers.find(b=>b.descriptor.size===36),geometry);assert.deepEqual(f.v.gpu.buffers.slice(buffers.length).map(b=>b.descriptor.size),[16]);assert.equal(consumer.uniformForks-before.uniformForks,1);assert.equal(consumer.bindingForks-before.bindingForks,1);assert.deepEqual(f.v.gpu.buffers,ready.buffers);assert.equal(consumer.uniformForks,ready.host.uniformForks);assert.equal(consumer.bindingForks,ready.host.bindingForks);assert.equal(f.v.client.inspect().resourcesCreated,ready.created);f.advance(.1);await f.draw();assert.deepEqual(f.v.gpu.buffers,ready.buffers);assert.equal(f.v.host.inspect().uniformForks,ready.host.uniformForks);assert.equal(f.v.host.inspect().bindingForks,ready.host.bindingForks);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('stroll picking rejects phase values not actually written by its submitted native clock',async()=>{
 const f=await nativeIdleStrollRemoteFixture();try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();f.advance(.2);const consumer=await f.draw(),entry=consumer.nativeRouteFrame.bindings.find(b=>b.nativeStroll);assert(entry);for(const change of [{relativeTime:.1},{relativeTime:2},{executionEpoch:entry.epoch-1},{nativeStroll:{...entry.nativeStroll,worldBoundary:{...entry.nativeStroll.worldBoundary,ticket:entry.nativeStroll.worldBoundary.ticket+100}}}]){const bad=structuredClone(consumer),index=bad.nativeRouteFrame.bindings.findIndex(b=>b.nativeStroll);Object.assign(bad.nativeRouteFrame.bindings[index],change);assert.throws(()=>captureNativeRoutePickFrame(bad));}
 }finally{await f.close();}
});

test('a retained READY stroll packet keeps the preceding native cycle visible while the source advances',async()=>{
 let ready=false;const f=await nativeIdleStrollRemoteFixture({async onReady(f,{host}){ready=true;const body=f.body(1);f.advance(.2);await flush();await host.idle();host.present();const state=host.inspect(),old=state.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle);assert.equal(state.failed,false);assert(old);assert(old.relativeTime<=old.nativeIdleCycle.duration);assert.deepEqual(f.body(1),body);}});try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));assert(ready);await f.v.present();assert((await f.draw()).nativeRouteFrame.bindings.some(b=>b.nativeStroll));assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('retirement retains the actual retimed origin and clamps its last submitted stroll phase',async()=>{
 const f=await nativeIdleStrollRemoteFixture({onPrepare(f){f.advance(.3);}});try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();f.advance(.2);await f.draw();const retiredAt=f.state.elapsed;assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const count=f.v.gpu.buffers.length,origin=result.nativeIdleStrollBinding.reference.worldBoundary.effectiveTime;f.advance(.4);const consumer=await f.draw(),binding=consumer.nativeRouteFrame.bindings.find(b=>b.nativeStroll);assert(binding);assert.equal(binding.executionEpoch,origin);assert.equal(binding.relativeTime,floorFloat32(retiredAt-origin));const pick=captureNativeRoutePickFrame(consumer);assert.equal(pick.getStrollExecutionTime(binding.nativeStroll),origin+binding.relativeTime);assert.equal(f.v.gpu.buffers.length,count);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('a consumer without advertised stroll support rejects its clock before sending an unscoped binding',async()=>{
 const f=nativeIdleStrollFixture();let gpu;try{const p=f.prepare().proposal;gpu=await gpuFixture();assert.throws(()=>gpu.client.registerClockBinding(gpu.buffer,{byteOffset:0,semantic:'relative',epoch:p.startTime,resourceEnd:p.endTime,nativeStroll:p.nativeIdleStroll}),/support native Idle stroll/);await flush();await gpu.host.idle();assert.equal(gpu.host.inspect().failed,false);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));}finally{gpu?.client.dispose();await gpu?.host.dispose();f.close();}
});

test('a retired stroll anchor uses the next prepared cycle and replaces its submitted clock',async()=>{
 const f=await nativeIdleStrollRemoteFixture();try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();
  const old=result.nativeIdleStrollBinding;
  const plant=f.state.plants.find(row=>row.id===`plant-${old.reference.anchor.id}`);
  plant.alive=false;cropBecameInactive(f.state.plants);emit(f.state,'CropDestroyed',{targetId:plant.id});f.planner.flushWorldEvents();
  assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported','the old Walk still owns motion');
  f.advance(old.reference.endTime-f.state.elapsed+.1);f.planner.projectNativeIdleStroll(f.state,f.worker);
  const before=await f.draw(),pose=f.body(1);
  assert(before.nativeRouteFrame.bindings.some(row=>row.nativeStroll));
  const acquired=await f.v.run(o=>f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,...o}),{kind:'idle-cycle'});
  assert.equal(acquired.status,'committed',JSON.stringify(acquired));await f.v.present();
  const binding=acquired.nativeIdleCycleBinding,reference=binding.reference;
  assert.equal(reference.sourceBody.kind,'native-idle-stroll-reanchor-source');
  assert.equal(reference.sourceBody.sourceSequence,old.assignmentSequence);
  assert.equal(reference.bodyId,old.reference.bodyId);
  const submitted=await f.draw(),pick=captureNativeRoutePickFrame(submitted);
  assert.equal(pick.getIdleCycleElapsed(binding.preparedReference),0);
  assert(submitted.nativeRouteFrame.bindings.every(row=>!row.nativeStroll));
  assert.equal(f.worker.idleState.anchorId,reference.anchor.id);
  assert.deepEqual(f.body(1),pose);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});
