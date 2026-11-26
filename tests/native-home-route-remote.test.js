import test from 'node:test';
import assert from 'node:assert/strict';
import {pair,fixture,flush,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

// Actual native source/control/consumer channels and retained packet lifecycle;
// the GPU queue itself is a deterministic double, not hardware evidence.
async function setup(){
 const native=nativeTaskSettlementFixture();native.worker.contractDay=native.state.day-1;
 const [sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskSettlementVersion:1,nativeHomeRouteVersion:1}},{intentControl:{port:drawPort,session:'home-admission'},absoluteNow:()=>Number.MAX_SAFE_INTEGER}),source=createNativeIntentControlPublication({port:sourcePort,session:'home-admission',observe:native.planner.observeNativeIntentControl});await source.ready;
 const at=native.state.elapsed,clock={version:1,epoch:0,elapsed:at,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]};let stationary;
 const settled=await native.planner.startNativeTaskSettlementAfterGpuQuiescence({actorId:native.actor,getPublication:()=>source,prepareResources:async({resources,proposedWorldBoundary})=>{const r=resources.nativeSettlement;f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:r.worldBoundary.effectiveTime,nativeSettlement:r});stationary=await preparedWorldDraw({...f,clock,settlementTemplate:r},proposedWorldBoundary);return {preparedWorldBoundary:stationary.preparedWorldBoundary,preparedTaskSettlementTemplate:r,valid:stationary.valid,commit:data=>stationary.commit(data.worldBoundary,data.nativeTaskSettlementBinding),abort:stationary.abort};}});
 assert.equal(settled.status,'committed',JSON.stringify({status:settled.status,error:settled.error}));await flush();f.host.present();await stationary.presented;
 return {...f,native,planner:native.planner,source,sourcePort,clock,async close(){source.dispose();f.client.dispose();await f.host.dispose();native.close();}};
}
async function admit(f,{mode='exact',afterReady=()=>{}}={}){
 let prepared=null,reference=null;const quiesce=f.source.quiesceGpuForMutation;f.source.quiesceGpuForMutation=async options=>{const r=await quiesce(options);if(mode==='late')f.native.advance(.02);return r;};
 if(mode==='missing-attestation'){const release=f.source.releaseGpuAfterMutation;f.source.releaseGpuAfterMutation=(r,data)=>release(r,{...data,nativeHomes:[]});}
 const result=await f.planner.startNativeHomeRouteAfterGpuQuiescence({actorId:f.native.actor,getPublication:()=>f.source,prepareResources:async({resources,proposedWorldBoundary})=>{reference=resources.nativeHome;if(mode!=='missing-clock')f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:reference.worldBoundary.effectiveTime,nativeHome:reference});else f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'origin-modulo',period:2.5,epoch:reference.worldBoundary.effectiveTime,nativeHome:reference});f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'origin-modulo',period:2.5,epoch:reference.worldBoundary.effectiveTime,nativeHome:reference});prepared=await preparedWorldDraw({...f,...(mode==='missing-template'?{}:{homeTemplate:reference})},proposedWorldBoundary);if(mode==='late')f.native.advance(.3);await afterReady();return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedHomeRouteTemplate:reference,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeHomeRouteBinding),abort:prepared.abort};}});
 return {result,prepared,reference};
}

for(const mode of ['exact','late','missing-template','missing-clock','missing-attestation'])test(`Home needs its exact retained template, relative clock, issued association and queue drain (${mode})`,async()=>{
 const f=await setup();try{const before=f.native.body(1),ledger=JSON.stringify(f.native.state.ledger),held=f.planner.nativeTaskSettlementBinding(f.native.actor),{result,prepared,reference}=await admit(f,{mode});if(['exact','late'].includes(mode)){assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));assert.equal(result.receipt.nativeHomeRouteVersion,1);assert.deepEqual(result.receipt.preparedHomeRouteTemplate,reference);await flush();f.host.present();await prepared.presented;const proof=f.planner.nativeHomeRouteBinding(f.native.actor),first=captureNativeRoutePickFrame(f.host.inspect());assert.equal(first.getHomeElapsed(reference),0);assert.equal(first.getHomeExecutionTime(reference),proof.reference.worldBoundary.effectiveTime);assert(f.gpu.calls.some(c=>c[0]==='writeBuffer'&&c[1]===4&&new Float32Array(Uint8Array.from(c[2]).buffer)[0]===Math.fround(proof.reference.worldBoundary.effectiveTime%2.5)));assert.deepEqual(f.native.body(1),before);assert.equal(JSON.stringify(f.native.state.ledger),ledger);if(mode==='late')assert(proof.reference.worldBoundary.effectiveTime>reference.worldBoundary.effectiveTime+.3);f.native.advance(.2);await flush();f.host.present();const next=captureNativeRoutePickFrame(f.host.inspect());assert(next.getHomeElapsed(reference)>.19);assert(next.getHomeExecutionTime(reference)<=f.native.state.elapsed);assert.notDeepEqual(f.native.body(1),before);assert.equal(f.native.worker.status,'returning');assert.deepEqual(f.errors,[]);}else{assert.notEqual(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));if(prepared)await assert.rejects(prepared.presented);assert.deepEqual(f.native.body(1),before);if(mode==='missing-attestation'){assert.equal(result.status,'committed-control-failed');assert(f.planner.nativeHomeRouteBinding(f.native.actor));}else{assert.equal(f.planner.nativeHomeRouteBinding(f.native.actor),null);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.native.actor),held);}}
 }finally{await f.close();}
});

test('Home cannot consume or move the stationary body before actual submitted queue work finishes',async()=>{
 const f=await setup();let releaseDrain,signalDrain;const draining=new Promise(resolve=>{signalDrain=resolve;});try{const body=f.native.body(1),original=f.gpu.device.queue.onSubmittedWorkDone,pending=admit(f,{afterReady(){f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;signalDrain();});}});await draining;assert(f.planner.nativeTaskSettlementBinding(f.native.actor));assert.equal(f.planner.nativeHomeRouteBinding(f.native.actor),null);assert.deepEqual(f.native.body(1),body);f.native.advance(.2);assert.deepEqual(f.native.body(1),body);f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain();const {result,prepared}=await pending;assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await flush();f.host.present();await prepared.presented;assert.deepEqual(f.errors,[]);
 }finally{releaseDrain?.();await f.close();}
});

test('an ordinary Home packet admitted before a direct revocation settles at the next draw opportunity',async()=>{
 const f=await setup();
 try{
  const {result,prepared}=await admit(f);
  assert.equal(result.status,'committed');
  await flush();f.host.present();await prepared.presented;
  const {reference}=f.planner.nativeHomeRouteBinding(f.native.actor);
  const worldBoundary=reference.worldBoundary,metadata={clock:f.clock,nativeWorldBoundary:worldBoundary};
  const active=f.host.inspect().nativeRouteFrame.sequence;
  const retired=assert.rejects(f.frame(7,metadata),{code:'remote-frame-native-route-obsolete'});
  retired.catch(()=>{});
  await flush();await f.host.idle();
  const pending=f.host.inspect().pendingSequence;
  assert.ok(pending>active);
  const before=f.gpu.canvasSubmissions.length;

  const {session,authorityEpoch,sentSequence,sentTime}=f.source.status();
  // Drive just the consumer side of the direct port for this revocation.
  f.sourcePort.onmessage=null;
  f.sourcePort.postMessage({type:'RouteInvalidated',protocolVersion:2,session,authorityEpoch,sequence:sentSequence+1,
   actorId:reference.actorId,effectiveTime:sentTime,state:0,routeHandle:null,revokedRouteHandle:reference.expectedRouteHandle});
  await flush();await f.host.idle();
  f.host.present();await flush();
  const stopped=f.host.inspect();
  assert.equal(stopped.pendingSequence,null,JSON.stringify(stopped.errors));
  assert.equal(stopped.nativeRouteFrame.sequence,active);
  assert.equal(f.gpu.canvasSubmissions.length,before);
  await retired;

  const clean=f.client.device.createBuffer({size:16,usage:72});
  const group=f.client.device.createBindGroup({entries:[{binding:0,resource:{buffer:clean}}]});
  f.client.beginFrame(metadata);
  const encoder=f.client.device.createCommandEncoder();
  const pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(f.pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const next=f.client.endFrame();
  await flush();await f.host.idle();f.host.present();await next;
  const replacement=f.host.inspect().nativeRouteFrame;
  assert.ok(replacement.sequence>pending);
  assert.equal(replacement.bindings.some(binding=>binding.nativeHome),false);
  assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
