import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {nativeIdleStrollRemoteFixture} from './helpers/native-idle-stroll-remote.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {NATIVE_STOP_POSE_FIELDS} from '../src/world/native-idle-stroll-stop.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/float32-time.js';
import {flush} from './helpers/remote-webgpu-fixture.js';

async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Moving stop remote timed out');}
// Full native/control/terrain/client/Host lifecycle, with a deterministic GPU
// queue. Original actor/Surface and hardware evidence are separate validations.
for(const [mode,duringDrain] of [['exact drain',false],['moving drain',true],['expired source','expired'],['per-pass replay','replay'],['moving gate','gate'],['missing motor uniform','missing-motor']])test(`retained stopped uniforms acquire final native values after moving preparation (${mode})`,async()=>{
 const expired=duringDrain==='expired',replay=duringDrain==='replay',gated=['gate','missing-motor'].includes(duringDrain);
 const gateId=990001,gateEntity=`structure-${gateId}`;
 let service,gateSelector;
 const f=await nativeIdleStrollRemoteFixture({configureWorld:gated?(state,{point,session})=>{
  const center=point(0,0);
  session.core.setSettlement(center.x,center.z,24,24);
  const gate={id:gateEntity,gate:true,status:'intact',material:'zarzas',x:Math.round(center.x-6)-.05,z:center.z+1,gateOpen:0,yaw:0};
  service=createSpatialGateIntents(session,state);
  assert(service.register(gate));
  assert.equal(service.installMechanism(gate.id,gate.material).status,'installed');
 }:null}),v=f.v,{port1,port2}=new MessageChannel(),errors=[];let producer,receiver,packet,selector,epoch,buffer,beforeReady,bodyAtPreparation,preparedProposal;const stopWrites=[],writeBuffer=v.gpu.device.queue.writeBuffer;v.gpu.device.queue.writeBuffer=(target,offset,data)=>{if(target.descriptor.label==='stopped-values')stopWrites.push({offset,size:data.byteLength});return writeBuffer(target,offset,data);};
 try{
  const walk=await f.run();assert.equal(walk.status,'committed',JSON.stringify(walk));await v.present();f.advance(.12);
  if(gated){assert.deepEqual(walk.nativeIdleStrollBinding.gateIds,[gateId]);assert(service.read(gateEntity).opening>0);}
  receiver=createConfirmedTerrainReceiver({port:port2,session:'moving-stop',confirmedElapsed:f.state.elapsed,retainRevisions:true,autoBootstrap:true,validateRevision:()=>{},residency:{replace(){},remove(){}},onError:error=>errors.push(error.message),prepareGraphicalBatch:async()=>({valid:()=>true,commit:()=>true,abort(){}}),async prepareGraphicalProposal(messages,options){
   assert.deepEqual(messages,[]);const stop=options.nativeIdleStrollStopTemplate;selector={kind:'native-idle-stroll-stopped-body',version:1,stop,actorId:f.actor};epoch=walk.nativeIdleStrollBinding.preparedReference.worldBoundary.effectiveTime;
   v.client.beginFrame({nativeWorldBoundary:options.proposedWorldBoundary});buffer=v.client.device.createBuffer({label:'stopped-values',size:48,usage:72});if(!replay)v.client.device.queue.writeBuffer(buffer,0,new Float32Array(12));const group=v.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]}),fields=['age',...Object.keys(NATIVE_STOP_POSE_FIELDS)];
   v.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,nativeStopped:selector});fields.forEach((field,i)=>v.client.registerClockBinding(buffer,{byteOffset:(i+1)*4,semantic:'stop-value',epoch,nativeStopped:selector,stopField:field}));
   let motorGroup;
   if(gated){
    assert.equal(stop.gates.length,1);assert.equal(stop.gates[0].gateId,gateId);
    gateSelector={kind:'native-idle-stroll-stopped-gate',version:1,stop,...stop.gates[0]};
    if(duringDrain==='gate'){
     const motor=v.client.device.createBuffer({label:'stopped-gate-opening',size:16,usage:72});
     v.client.device.queue.writeBuffer(motor,0,new Float32Array(4));
     motorGroup=v.client.device.createBindGroup({entries:[{binding:0,resource:{buffer:motor}}]});
     v.client.registerClockBinding(motor,{byteOffset:0,semantic:'stop-value',epoch:stop.worldBoundary.effectiveTime,nativeStopped:gateSelector,stopField:'opening'});
    }
   }
   const draw=()=>{const encoder=v.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:v.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setPipeline(v.pipeline);pass.setBindGroup(0,group);if(v.staticBuffer)pass.setVertexBuffer(0,v.staticBuffer);pass.draw(3);if(motorGroup){pass.setBindGroup(0,motorGroup);pass.draw(3);}pass.end();v.client.device.queue.submit([encoder.finish()]);};draw();if(replay){v.client.device.queue.writeBuffer(buffer,0,new Float32Array(12));draw();v.client.device.queue.writeBuffer(buffer,0,new Float32Array(12));draw();}
   packet=await v.client.prepareNativeWorldFrame({nativeWorldBoundary:options.proposedWorldBoundary,nativeIdleStrollStopTemplate:stop,clock:{version:1,epoch:0,elapsed:options.proposedWorldBoundary.effectiveTime,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]}},{signal:options.signal});
   packet.presented.catch(()=>{});
   bodyAtPreparation=f.body(1);f.advance(expired?walk.nativeIdleStrollBinding.reference.endTime-f.state.elapsed+.01:.2);beforeReady=v.host.inspect();return {canonicalPropsUnmasked:true,preparedWorldBoundary:packet.preparedWorldBoundary,preparedIdleStrollStopTemplate:stop,valid:packet.valid,commit:data=>packet.commit(data.worldBoundary,data.nativeIdleStrollStopBinding),abort:packet.abort};
  }});
  producer=createTerrainPublication({port:port1,session:'moving-stop',epoch:'moving-stop-world',retainRevisions:true});producer.commit(0);await until(()=>receiver.ready(0)).catch(()=>{throw Error('bootstrap '+JSON.stringify({receiver:receiver.status(),producer:producer.status(),errors}));});await until(()=>producer.status().window?.batches===0);
  const quiesce=v.source.quiesceGpuForMutation;if(duringDrain===true)v.source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);f.advance(.1);return receipt;};
  const result=await f.planner.stopNativeIdleStrollAfterGpuQuiescence({actorId:f.actor,getPublication:()=>v.source,prepareResources:request=>{preparedProposal=request.resources;return producer.prepareNativeWorldResources(request);}});
  if(duringDrain==='missing-motor'){
   assert.equal(result.status,'control-failed',JSON.stringify(result));
   assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);
   assert(v.errors.some(error=>/prepared motor opening uniform/.test(String(error))),JSON.stringify(v.errors));
   return;
  }
  if(expired){assert.equal(result.status,'stale',JSON.stringify(result));assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);await until(()=>receiver.status().nativeProposal===null);await v.host.idle();assert.equal(v.host.inspect().failed,false);assert.deepEqual(errors,[]);assert.deepEqual(v.errors,[]);return;}
  assert.equal(result.status,'committed',JSON.stringify(result));assert(result.timeTranslation.sameResourceOwners);
  if(gated)assert.deepEqual(f.body(1),bodyAtPreparation);else assert.notDeepEqual(f.body(1),bodyAtPreparation);
  assert(result.nativeIdleStrollStopBinding.projection);assert(result.worldBoundary.effectiveTime>preparedProposal.worldBoundary.effectiveTime);
  producer.commit(1);await until(()=>receiver.ready(1));receiver.confirm(1,f.state.elapsed);await flush();await v.host.idle();v.host.present();await packet.presented;
  const held=f.planner.nativeSuspendedGateRoute(f.actor),state=v.host.inspect();assert.equal(state.failed,false,JSON.stringify(v.errors));const pick=captureNativeRoutePickFrame(state),projection=pick.getStoppedBody(selector,epoch);assert.equal(projection.bodyReference.suspendedAt,result.worldBoundary.effectiveTime);assert.equal(projection.age,floorFloat32(result.worldBoundary.effectiveTime-walk.nativeIdleStrollBinding.reference.worldBoundary.effectiveTime));for(const field of Object.keys(NATIVE_STOP_POSE_FIELDS))assert.equal(projection[field],Math.fround(field==='arrived'?Number(held.pose.arrived):held.pose[field]),field);
  if(gated){
   const opening=result.nativeIdleStrollStopBinding.projection.gateEffects.rows[2];
   const preparedOpening=preparedProposal.gateEffects.rows[2];
   assert(opening>preparedOpening&&opening<1);
   assert.equal(service.read(gateEntity).opening,opening);
   assert.equal(pick.getStoppedGate(gateSelector,gateSelector.stop.worldBoundary.effectiveTime).opening,Math.fround(opening));
   const gpuMotor=v.gpu.buffers.find(value=>value.descriptor.label==='stopped-gate-opening');
   assert.equal(new Float32Array(gpuMotor.data.buffer)[0],Math.fround(opening));
  }
  stopWrites.length=0;const peer=f.body(3);f.advance(.2);await flush();await v.host.idle();v.host.present();const after=v.host.inspect(),next=captureNativeRoutePickFrame(after).getStoppedBody(selector,epoch);assert.deepEqual(f.planner.nativeSuspendedGateRoute(f.actor).pose,held.pose);assert.notDeepEqual(f.body(3),peer);assert.equal(next.yaw,projection.yaw);assert(next.at>projection.at);assert(stopWrites.length>0);assert(stopWrites.every(write=>write.offset===0&&(write.size===4||replay&&write.size===48)),JSON.stringify(stopWrites));const retained=v.gpu.buffers.findLast(value=>value.descriptor.label==='stopped-values'),values=new Float32Array(retained.data.buffer);for(const [i,field] of ['age',...Object.keys(NATIVE_STOP_POSE_FIELDS)].entries())assert.equal(values[i+1],next[field],field);assert.equal(after.resourcesCreated,beforeReady.resourcesCreated);assert.deepEqual(errors,[]);assert.deepEqual(v.errors,[]);
 }finally{producer?.dispose();receiver?.dispose();await f.close();}
});
