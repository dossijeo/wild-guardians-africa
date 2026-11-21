import assert from 'node:assert/strict';
import {pair,fixture,flush,preparedWorldDraw} from './remote-webgpu-fixture.js';
import {nativeTaskSettlementFixture} from './native-task-settlement.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';

// Actual source/control/retained packet handoffs through settled Home and its
// moving corridor. The queue is a deterministic double; no hardware receipt.
export async function nativeHomeArrivalRemoteFixture({supported=true,ack=m=>m}={}){
 const native=nativeTaskSettlementFixture();native.worker.contractDay=native.state.day-1;
 const [sourcePort,drawPort]=pair(),post=drawPort.postMessage;drawPort.postMessage=m=>post(ack(m));const f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskSettlementVersion:1,nativeHomeRouteVersion:1,...(supported?{nativeHomeArrivalVersion:1}:{})}},{intentControl:{port:drawPort,session:'home-arrival'},absoluteNow:()=>Number.MAX_SAFE_INTEGER}),source=createNativeIntentControlPublication({port:sourcePort,session:'home-arrival',observe:native.planner.observeNativeIntentControl});
 try{await source.ready;const clock={version:1,epoch:0,elapsed:native.state.elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]};let stationary,moving;
  const settled=await native.planner.startNativeTaskSettlementAfterGpuQuiescence({actorId:native.actor,getPublication:()=>source,prepareResources:async({resources,proposedWorldBoundary})=>{const r=resources.nativeSettlement;f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:r.worldBoundary.effectiveTime,nativeSettlement:r});stationary=await preparedWorldDraw({...f,clock,settlementTemplate:r},proposedWorldBoundary);return {preparedWorldBoundary:stationary.preparedWorldBoundary,preparedTaskSettlementTemplate:r,valid:stationary.valid,commit:d=>stationary.commit(d.worldBoundary,d.nativeTaskSettlementBinding),abort:stationary.abort};}});
  assert.equal(settled.status,'committed',JSON.stringify({status:settled.status,error:settled.error}));await flush();f.host.present();await stationary.presented;
  const home=await native.planner.startNativeHomeRouteAfterGpuQuiescence({actorId:native.actor,getPublication:()=>source,prepareResources:async({resources,proposedWorldBoundary})=>{const r=resources.nativeHome;f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:r.worldBoundary.effectiveTime,nativeHome:r});moving=await preparedWorldDraw({...f,clock,homeTemplate:r},proposedWorldBoundary);return {preparedWorldBoundary:moving.preparedWorldBoundary,preparedHomeRouteTemplate:r,valid:moving.valid,commit:d=>moving.commit(d.worldBoundary,d.nativeHomeRouteBinding),abort:moving.abort};}});
  assert.equal(home.status,'committed',JSON.stringify({status:home.status,error:home.error}));await flush();f.host.present();await moving.presented;native.advance(home.nativeHomeRouteBinding.reference.endTime+.05-native.state.elapsed);assert(native.planner.projectNativeHomeExecution(native.state,native.worker).arrived);await flush();f.host.present();
  return {...f,native,source,clock,home:home.nativeHomeRouteBinding,async close(){source.dispose();f.client.dispose();await f.host.dispose();native.close();}};
 }catch(error){source.dispose();f.client.dispose();await f.host.dispose();native.close();throw error;}
}

export async function prepareHomeAbsenceDraw(f,resources,{missingTemplate=false,stillVisible=false,optionsGated=false}={}){
 if(optionsGated){resources=structuredClone(resources);resources.nativeHomeArrival.sourceHome.gateIds.push(7);}
 const boundary=resources.worldBoundary,metadata={clock:f.clock,nativeWorldBoundary:boundary,...(!missingTemplate?{nativeHomeArrivalTemplate:resources.nativeHomeArrival}:{})};f.client.beginFrame({nativeWorldBoundary:boundary});
 const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});if(stillVisible){pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.draw(3);}pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.prepareNativeWorldFrame(metadata);
}
