import {pair,fakeGpu,flush,fixture,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import test from 'node:test';
import {Group,PerspectiveCamera,Scene} from 'three';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { createRemoteWebGpuClient } from '../src/rendering/remote-webgpu-client.js';
import { createRemoteWebGpuHost } from '../src/rendering/remote-webgpu-host.js';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {nativeSuspendedBodiesFromProposal} from '../src/world/native-suspended-body-reference.js';
import {nativeResumeReferenceFromProposal} from '../src/world/native-resume-reference.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import { createNativeIntentControlPublication } from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {nativeTaskRequestFixture} from './helpers/native-task-resource-requests.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {releaseTask,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';
import {nativeTaskActionReferenceFromProposal} from '../src/world/native-task-action-presentation.js';
import {copyNativeTaskActionResources} from '../src/world/native-task-action-attestation.js';
import {floorFloat32} from '../src/float32-time.js';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';

// The conditioned action ABI is exercised as a native component here. The
// ordinary action resource coordinator is deliberately not enabled by this test.
async function nativeActionClockFixture({late=false,advance=.25,absoluteStart=null}={}){
 const native=createNativeTaskGameFixture();tick(native.state,native.proposals[0].endTime-native.state.elapsed+.05,native.nav);
 if(absoluteStart!==null){native.state.elapsed=absoluteStart;assert.equal(native.planner.advanceNativeRouteExecution(absoluteStart).status,'advanced');native.planner.commitNativeCausalClock();}
 const actor=native.state.workers[0].id,planner=native.planner,p=planner.prepareNativeTaskActionProposal(planner.nativeTaskActionRequest(actor));assert.equal(p.status,'proposed');
 if(late){native.state.elapsed+=.3;assert.equal(planner.advanceNativeRouteExecution(native.state.elapsed).status,'advanced');planner.commitNativeCausalClock();assert.equal(planner.revalidateNativeTaskActionProposal(p.proposal.ticket).status,'revalidated');}
 assert.equal(native.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(native.w.memory.buffer,native.w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(native.w.nav_task_action_proposal_commit_bound(...tuple.slice(0,5),p.proposal.ticket.ticket),1);planner.commitNativeCausalClock();
 const proof=planner.nativeTaskActionBinding(actor);native.state.elapsed+=advance;assert.equal(planner.advanceNativeRouteExecution(native.state.elapsed).status,'advanced');planner.commitNativeCausalClock();
 const [sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskActionClockVersion:1}},{intentControl:{port:drawPort,session:'action-clock'},absoluteNow:()=>1000});let source;
 try{
  source=createNativeIntentControlPublication({port:sourcePort,session:'action-clock',observe:planner.observeNativeIntentControl,absoluteNow:()=>1000});await source.ready;
  // Apply a real later native world boundary; the raw component ABI does not
  // write the JS coordinator's committed-world cookie.
  const changed=await planner.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'addChunk',cx:4,cz:4}});assert.equal(changed.status,'committed',JSON.stringify(changed));await flush();
  const clock={version:1,epoch:0,elapsed:native.state.elapsed,safeUntil:native.state.elapsed+10,anchorAbsoluteMs:1000,paused:false,segments:[{start:native.state.elapsed,end:native.state.elapsed+10,rate:1,realDuration:10}]};
  return {...f,native,source,planner,proof,reference:nativeTaskActionReferenceFromProposal(p.proposal),clock,boundary:changed.worldBoundary,async close(){source.dispose();f.client.dispose();await f.host.dispose();native.close();}};
 }catch(error){source?.dispose();f.client.dispose();await f.host.dispose();native.close();throw error;}
}

for(const late of [false,true])test(`an issued native action patches only its bounded relative phase and publishes the same pick age (${late?'retained origin':'exact origin'})`,async()=>{
 const f=await nativeActionClockFixture({late});try{
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:f.reference.startTime,nativeAction:f.reference});
  const other=f.planner.nativeIntentControlBaseline().routes[0];assert(other);const otherReference={actorId:other.actorId,routeHandle:other.routeHandle,assignmentSequence:other.assignmentSequence};f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'relative',epoch:other.startTime,nativeRoute:otherReference});
  const shown=f.frame(99,{clock:f.clock,nativeWorldBoundary:f.boundary});await flush();await f.host.idle();f.host.present();await shown;
  const age=new Float32Array(f.gpu.buffers[0].data.buffer)[0],expected=floorFloat32(f.native.state.elapsed-f.proof.reference.startTime);assert.equal(age,expected);assert(age>.24&&age<.26);assert.notEqual(age,99);
  const frame=f.host.inspect().nativeRouteFrame,pick=captureNativeRoutePickFrame(f.host.inspect());assert.equal(frame.bindings[0].relativeTime,age);assert.equal(frame.bindings[0].executionEpoch,f.proof.reference.startTime);assert.equal(pick.getActionElapsed(f.reference),age);assert.equal(pick.getActionExecutionTime(f.reference),f.proof.reference.startTime+age);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[1],floorFloat32(f.native.state.elapsed-other.startTime));assert.equal(pick.getTime(otherReference,other.startTime),other.startTime+new Float32Array(f.gpu.buffers[0].data.buffer)[1]);assert.equal(f.native.state.crates.length,0);assert.deepEqual(f.errors,[]);
  const draws=f.gpu.submitted.length;assert.equal(f.native.w.nav_intent_retire_actor(f.reference.request.nativeRoute.actorId),1);f.planner.intentChanges();f.planner.commitNativeCausalClock();await flush();f.host.present();assert.equal(f.gpu.submitted.length,draws,'revoked action cannot replay its old packet');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('a long-lived action packet never plays beyond the declared action duration',async()=>{
 const f=await nativeActionClockFixture({advance:3});try{f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:f.reference.startTime,nativeAction:f.reference});const shown=f.frame(0,{clock:f.clock,nativeWorldBoundary:f.boundary});await flush();await f.host.idle();f.host.present();await shown;const age=new Float32Array(f.gpu.buffers[0].data.buffer)[0];assert.equal(age,floorFloat32(f.reference.request.duration));assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getActionElapsed(f.reference),age);assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('an action reaching a rounded absolute end submits the terminal declared phase',async()=>{
 const f=await nativeActionClockFixture({absoluteStart:1e15,advance:2.375});try{assert.equal(f.proof.reference.endTime-f.proof.reference.startTime,2.375);assert.equal(f.proof.reference.request.duration,2.4);assert.equal(f.planner.nativeTaskActionExecution(f.reference.request.nativeRoute.actorId).completed,true);assert.equal(f.planner.nativeTaskActionExecution(f.reference.request.nativeRoute.actorId).elapsed,2.4);f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:f.reference.startTime,nativeAction:f.reference});const shown=f.frame(0,{clock:f.clock,nativeWorldBoundary:f.boundary});await flush();await f.host.idle();f.host.present();await shown;assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],floorFloat32(2.4));assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('action clocks fail closed when the draw owner lacks their capability',async()=>{
 const f=await fixture();try{assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeAction:{}}),/does not support/);assert.equal(f.client.inspect().clockBindings,0);}finally{f.client.dispose();await f.host.dispose();}
});

for(const mode of ['exact','late','missing-template','missing-attestation','cancel-during-drain'])test('native action admission requires its retained packet and actual direct identity ('+mode+')',async()=>{
 const native=createNativeTaskGameFixture();tick(native.state,native.proposals[0].endTime-native.state.elapsed+.05,native.nav);
 const planner=native.planner,actor=native.state.workers[0].id,[sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskActionClockVersion:1,nativeTaskActionVersion:1}},{intentControl:{port:drawPort,session:'action-admission'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});let source,prepared,reference;
 try{
  source=createNativeIntentControlPublication({port:sourcePort,session:'action-admission',observe:planner.observeNativeIntentControl});await source.ready;
  const start=native.state.elapsed,b=planner.nativeIntentControlBaseline().routes.find(r=>r.actorId!==Number(actor.split('-').at(-1))),bRef={actorId:b.actorId,routeHandle:b.routeHandle,assignmentSequence:b.assignmentSequence},clock={version:1,epoch:0,elapsed:start,safeUntil:start+10,anchorAbsoluteMs:0,paused:false,segments:[{start,end:start+10,rate:1,realDuration:10}]};
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'relative',epoch:b.startTime,nativeRoute:bRef});
  const shown=f.frame(1,{clock});await flush();await f.host.idle();f.host.present();await shown;
  const advance=dt=>{native.state.elapsed+=dt;assert.equal(planner.advanceNativeRouteExecution(native.state.elapsed).status,'advanced');planner.commitNativeCausalClock();};
  const quiesce=source.quiesceGpuForMutation;source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);if(mode==='late')advance(.02);if(mode==='cancel-during-drain'){releaseTask(native.state,native.state.workers[0]);native.state.workers[0].status='idle';notifyWorkerPlanningChange(native.state,native.state.workers[0]);planner.flushTaskEvents();planner.commitNativeCausalClock();}return receipt;};
  if(mode==='missing-attestation'){const release=source.releaseGpuAfterMutation;source.releaseGpuAfterMutation=(receipt,options)=>release(receipt,{...options,nativeActions:[]});}
  assert.equal(planner.needsReconciliation(native.nav.version),false);
  const body=native.body(1),other=native.body(3),request=planner.nativeTaskActionRequest(actor),result=await planner.startNativeTaskActionAfterGpuQuiescence({getPublication:()=>source,request,prepareResources:async({resources,proposedWorldBoundary})=>{
   reference=nativeTaskActionReferenceFromProposal(resources);assert.equal(planner.nativeTaskActionBinding(actor),null);f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:resources.startTime,nativeAction:reference});
   prepared=await preparedWorldDraw({...f,clock,...(mode==='missing-template'?{}:{actionTemplate:reference})},proposedWorldBoundary);
   f.host.present();assert.equal(planner.nativeTaskActionBinding(actor),null);assert.deepEqual(native.body(1),body);if(mode==='late')advance(.3);
   return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedTaskActionTemplate:reference,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeTaskActionBinding),abort:prepared.abort};
  }});
  if(['exact','late'].includes(mode)){assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(planner.needsReconciliation(native.nav.version),true);assert.deepEqual(copyNativeTaskActionResources(result.resources),result.resources);assert.equal(result.resources.kind,15);assert.throws(()=>copyNativeTaskActionResources({...result.resources,kind:14}));assert.throws(()=>copyNativeTaskActionResources({...result.resources,worldBoundary:{...result.resources.worldBoundary,ticket:result.resources.worldBoundary.ticket+1}}));await flush();f.host.present();await prepared.presented;const proof=planner.nativeTaskActionBinding(actor),pick=captureNativeRoutePickFrame(f.host.inspect());assert.equal(pick.getActionElapsed(reference),0);assert.equal(pick.getActionExecutionTime(reference),proof.reference.startTime);assert.deepEqual(native.body(1),body);assert.equal(planner.nativeRouteTiming(reference.request.nativeRoute.routeHandle),null);assert.equal(native.state.crates.length,0);if(mode==='late'){assert(proof.reference.startTime>reference.startTime+.3);assert(Math.hypot(native.body(3).x-other.x,native.body(3).z-other.z)>.1);}advance(.2);await flush();f.host.present();const current=captureNativeRoutePickFrame(f.host.inspect());assert(current.getActionElapsed(reference)>.19);assert.deepEqual(f.errors,[]);}
  else{assert.notEqual(result.status,'committed',JSON.stringify(result));if(prepared)await assert.rejects(prepared.presented);if(mode==='missing-attestation'){assert.equal(result.status,'committed-control-failed');assert.equal(planner.needsReconciliation(native.nav.version),true);}else{assert.equal(planner.nativeTaskActionBinding(actor),null);if(mode==='cancel-during-drain'){assert.equal(result.status,'resources-changed');assert.equal(source.status().closed,false);}}}
 }finally{source?.dispose();f.client.dispose();await f.host.dispose();native.close();}
});

test('native action admission cannot consume a locally ready packet before its actual queue drain',async()=>{
 const native=createNativeTaskGameFixture();tick(native.state,native.proposals[0].endTime-native.state.elapsed+.05,native.nav);const planner=native.planner,actor=native.state.workers[0].id,[sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskActionClockVersion:1,nativeTaskActionVersion:1}},{intentControl:{port:drawPort,session:'action-drain'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});let source,prepared,reference,releaseDrain,signalDrain;const draining=new Promise(resolve=>{signalDrain=resolve;});
 try{source=createNativeIntentControlPublication({port:sourcePort,session:'action-drain',observe:planner.observeNativeIntentControl});await source.ready;const at=native.state.elapsed,clock={version:1,epoch:0,elapsed:at,safeUntil:at+10,anchorAbsoluteMs:0,paused:false,segments:[{start:at,end:at+10,rate:1,realDuration:10}]},before=native.body(1),original=f.gpu.device.queue.onSubmittedWorkDone;
  const pending=planner.startNativeTaskActionAfterGpuQuiescence({getPublication:()=>source,request:planner.nativeTaskActionRequest(actor),prepareResources:async({resources,proposedWorldBoundary})=>{reference=nativeTaskActionReferenceFromProposal(resources);f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:resources.startTime,nativeAction:reference});prepared=await preparedWorldDraw({...f,clock,actionTemplate:reference},proposedWorldBoundary);f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;signalDrain();});return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedTaskActionTemplate:reference,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeTaskActionBinding),abort:prepared.abort};}});
  await draining;assert.equal(planner.nativeTaskActionBinding(actor),null);assert.deepEqual(native.body(1),before);assert.equal(f.gpu.canvasSubmissions.length,0);native.state.elapsed+=.2;planner.advanceNativeRouteExecution(native.state.elapsed);planner.commitNativeCausalClock();assert.equal(planner.nativeTaskActionBinding(actor),null);f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain();const result=await pending;assert.equal(result.status,'committed',JSON.stringify(result));await flush();f.host.present();await prepared.presented;assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getActionElapsed(reference),0);assert.deepEqual(native.body(1),before);assert.deepEqual(f.errors,[]);
 }finally{releaseDrain?.();source?.dispose();f.client.dispose();await f.host.dispose();native.close();}
});

for(const mode of ['changed-source','future-world','wrong-epoch','absolute-clock','resource-extension','mixed-route'])test(`native action clock admission rejects ${mode}`,async()=>{
 const f=await nativeActionClockFixture();try{
  const action=structuredClone(f.reference),binding={byteOffset:0,semantic:'relative',epoch:action.startTime,nativeAction:action};
  if(mode==='changed-source')action.request.heading+=.1;
  if(mode==='future-world')action.worldBoundary.ticket=f.boundary.ticket+1;
  if(mode==='wrong-epoch')binding.epoch++;
  if(mode==='absolute-clock')binding.semantic='absolute';
  if(mode==='resource-extension')binding.resourceEnd=action.endTime+100;
  if(mode==='mixed-route')binding.nativeRoute=action.request.nativeRoute;
  if(['wrong-epoch','absolute-clock','resource-extension','mixed-route'].includes(mode)){assert.throws(()=>f.client.registerClockBinding(f.buffer,binding),/action phase clock/);assert.equal(f.client.inspect().clockBindings,0);}
  else{f.client.registerClockBinding(f.buffer,binding);const rejected=assert.rejects(f.frame(0,{clock:f.clock,nativeWorldBoundary:f.boundary}),mode==='future-world'?/applied world and causal clock/:/obsolete/);await flush();await f.host.idle();await rejected;assert.equal(f.gpu.submitted.length,0);}
 }finally{await f.close();}
});

test('native boundary observers wake only after the validated direct requirement is installed',()=>{
 const errors=[],seen=[],port={postMessage(){},close(){}},boundary={version:1,authorityEpoch:'owner',nativeSession:1,ticket:2,effectiveTime:10};let client;
 client=createRemoteWebGpuClient({port,capabilities:{width:20,height:10,format:'rgba8unorm'},onError:error=>errors.push(error),onNativeWorldBoundary:value=>seen.push([value,client.requiredNativeWorldBoundary()])});
 try{port.onmessage({data:{type:'native-world-boundary',worldBoundary:boundary}});assert.deepEqual(seen,[[boundary,boundary]]);port.onmessage({data:{type:'native-world-boundary',worldBoundary:{...boundary,ticket:1}}});assert.equal(seen.length,1);assert.match(errors[0].message,/regressed/);assert.deepEqual(client.requiredNativeWorldBoundary(),boundary);}finally{client.dispose();}
});
async function nativePreparationFixture(hostOptions={}, {core,capabilities}={}){
 const native=createNativeRouteExecutionFixture({core}),[sourcePort,drawPort]=pair();let source;
 const f=await fixture(capabilities?{capabilities:{width:20,height:10,format:'rgba8unorm',...capabilities}}:{}, {intentControl:{port:drawPort,session:'retained-preparation'},...hostOptions});
 native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
 source=createNativeIntentControlPublication({port:sourcePort,session:'retained-preparation',observe:native.bridge.observeNativeIntentControl});await source.ready;
 const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
 return {...f,native,source,clock,commit:()=>native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'addChunk',cx:4,cz:4}}),close(){source.dispose();f.host.dispose();native.session.dispose();}};
}

test('a solid addition uses the retained packet with its effective ticket and leaves the moving body intact',async()=>{
 const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const f=await nativePreparationFixture({}, {core:createSpatialWorld(module),capabilities:{nativeBarrierAdditionVersion:1}});
 let prepared,template,projection;
 try{
  const first=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  const oldBody=f.native.body(1),point=f.native.point(35,35);
  const result=await f.native.bridge.addNativeBarriersAfterGpuQuiescence({
   additions:[{entityId:'wall-1',x:Math.fround(point.x),z:Math.fround(point.z),halfX:1,halfZ:.5,yaw:0,passMask:0}],
   getPublication:()=>f.source,validate:()=>true,project(data){projection=data;return true;},
   async prepareResources({proposedWorldBoundary,resources,signal}){
    template=resources.nativeBarrierAddition;
    prepared=await preparedWorldDraw(f,proposedWorldBoundary,77,signal,{nativeBarrierAdditionTemplate:template});
    f.native.state.elapsed+=.1;
    assert.equal(f.native.bridge.advanceNativeRouteExecution(f.native.state.elapsed).status,'advanced');
    f.native.bridge.commitNativeCausalClock();
    assert.equal(f.host.inspect().activeSequence,1);
    return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedBarrierAdditionTemplate:template,valid:prepared.valid,abort:prepared.abort,commit(data){
     assert.equal(prepared.commit(data.worldBoundary),false);
     return prepared.commit(data.worldBoundary,data.nativeBarrierAdditionBinding);
    }};
   }
  });
  assert.equal(result.status,'committed',result.error);
  assert.deepEqual(projection.ids,result.nativeBarrierAdditionBinding.nativeIds);
  assert.equal(result.worldBoundary.ticket>template.worldBoundary.ticket,true);
  await flush();f.host.present();await prepared.presented;
  assert.equal(f.host.inspect().activeSequence,prepared.sequence);
  assert.deepEqual(f.client.requiredNativeWorldBoundary(),result.worldBoundary);
  assert.equal(f.native.body(1)[0],oldBody[0]);
  assert.notDeepEqual(f.native.body(1),oldBody);
  assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
for (const removedMotorInFrame of [false, true]) {
 test(`prepared gate removal ${removedMotorInFrame ? 'rejects its old clock' : 'retains a different gate clock'}`, async () => {
  const f = await nativePreparationFixture({}, {capabilities:{nativeBarrierAdditionVersion:1}});
  try {
   const worldBoundary = {version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10};
   const template = {
    kind:'native-barrier-addition-reference',
    version:3,
    worldBoundary,
    sourceControlSequence:f.native.w.nav_intent_last_sequence(),
    removal:{entityId:'structure-9',mechanismId:1,nativeIds:[1,2,3]},
   };
   f.client.registerClockBinding(f.buffer,{
    byteOffset:0,semantic:'relative',epoch:10,nativeGate:{gateId:removedMotorInFrame?9:10,worldBoundary},
   });
   const packet = preparedWorldDraw(f,worldBoundary,0,null,{nativeBarrierAdditionTemplate:template});
   if (removedMotorInFrame) {
    await assert.rejects(packet,/Native gate removal still includes its motor clock/);
   } else {
    const prepared = await packet;
    prepared.presented.catch(()=>{});
    assert(prepared.valid());
    prepared.abort();
   }
  } finally {
   f.close();
  }
 });
}
function preparationDraw(f,buffer,metadata,pipeline=f.pipeline,upload=null){
 f.client.beginFrame(metadata);if(upload!==null)f.client.device.queue.writeBuffer(buffer,0,new Uint32Array([upload]));
 const group=f.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]}),encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame();
}
function textureCopies(f){
 const textures=[],copies=[],groups=[],device=f.gpu.device,createEncoder=device.createCommandEncoder.bind(device),createGroup=device.createBindGroup.bind(device);
 const dimensions=size=>Array.isArray(size)?[size[0],size[1]??1,size[2]??1]:[size.width,size.height??1,size.depthOrArrayLayers??1];
 device.createTexture=descriptor=>{const size=dimensions(descriptor.size),texture={descriptor,levels:Array.from({length:descriptor.mipLevelCount??1},(_,m)=>new Uint8Array(Math.max(1,Math.floor(size[0]/2**m))*Math.max(1,Math.floor(size[1]/2**m))*size[2]*4)),createView:descriptor=>({texture,descriptor}),destroy(){this.destroyed=true;}};textures.push(texture);return texture;};
 device.createBindGroup=descriptor=>{const group=createGroup(descriptor);groups.push(group);return group;};
 device.queue.writeTexture=(destination,data,layout,size)=>{const [width,height,layers]=dimensions(size),mip=destination.mipLevel??0,origin=destination.origin??{},[x,y,z]=Array.isArray(origin)?origin:[origin.x??0,origin.y??0,origin.z??0],target=destination.texture,base=dimensions(target.descriptor.size),stride=Math.max(1,Math.floor(base[0]/2**mip)),rows=Math.max(1,Math.floor(base[1]/2**mip));for(let layer=0;layer<layers;layer++)for(let row=0;row<height;row++){const offset=(layout.offset??0)+(layer*(layout.rowsPerImage??height)+row)*(layout.bytesPerRow??width*4);target.levels[mip].set(data.subarray(offset,offset+width*4),((z+layer)*rows*stride+(y+row)*stride+x)*4);}f.gpu.calls.push(['writeTexture']);};
 device.createCommandEncoder=(...args)=>{const encoder=createEncoder(...args),extra=[];return {...encoder,copyTextureToTexture(source,target,size){copies.push({source,target,size});extra.push(()=>target.texture.levels[target.mipLevel??0].set(source.texture.levels[source.mipLevel??0]));},finish(){const result=encoder.finish();result.copies=[...(result.copies??[]),...extra];return result;}};};
 return {textures,copies,groups};
}

test('retained CPU texture updates fork only the changed texture and its views, preserving displayed pixels and every mip',async()=>{
 const f=await nativePreparationFixture(),record=textureCopies(f);try{
  const texture=f.client.device.createTexture({size:{width:4,height:2,depthOrArrayLayers:2},mipLevelCount:2,usage:7,format:'rgba8unorm'}),view=texture.createView(),group=f.client.device.createBindGroup({entries:[{binding:0,resource:view}]});
  function frame(metadata,update){f.client.beginFrame(metadata);if(update)update();const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setBindGroup(0,group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame();}
  const first=frame({clock:f.clock},()=>{f.client.device.queue.writeTexture({texture},new Uint8Array(64).fill(1),{bytesPerRow:16,rowsPerImage:2},[4,2,2]);f.client.device.queue.writeTexture({texture,mipLevel:1},new Uint8Array(16).fill(2),{bytesPerRow:8,rowsPerImage:1},[2,1,2]);});await flush();await f.host.idle();f.host.present();await first;const original=record.textures[0],originalGroup=record.groups[0],created=f.client.inspect().resourcesCreated,committed=await f.commit();
  await assert.rejects(frame({clock:f.clock},()=>f.client.device.queue.writeTexture({texture,origin:[1,0,1]},new Uint8Array(8).fill(9),{bytesPerRow:8},[2,1,1])),error=>error.resourcePreparationsRetained===true);
  await f.client.device.queue.onSubmittedWorkDone();assert.equal(record.textures.length,2);assert.equal(f.host.inspect().textureForks,1);assert.deepEqual(record.copies.map(copy=>copy.size),[[4,2,2],[2,1,2]]);
  assert(original.levels[0].every(value=>value===1));assert(original.levels[1].every(value=>value===2));const next=record.textures[1];assert(next.levels[1].every(value=>value===2));assert.deepEqual(Array.from(next.levels[0].slice(32,48)),[1,1,1,1,9,9,9,9,9,9,9,9,1,1,1,1]);assert.equal(originalGroup.descriptor.entries[0].resource.texture,original);assert.equal(record.groups.at(-1).descriptor.entries[0].resource.texture,next);assert.equal(f.client.inspect().resourcesCreated,created,'producer IDs and unchanged resources are reused');
  const shown=frame({clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await shown;assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a prepared world packet uploads a separate generation and adopts only the exact direct commit without another producer turn',async()=>{
 const f=await nativePreparationFixture();let prepared;
 try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;const original=f.gpu.buffers[0],before=f.native.session.core.snapshot();
  const outcome=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   prepared=await preparedWorldDraw(f,proposedWorldBoundary);assert.equal(prepared.valid(),true);assert.deepEqual(f.native.session.core.snapshot(),before);
   assert.equal(new Float32Array(original.data.buffer)[0],1);assert.equal(new Float32Array(f.gpu.buffers.at(-1).data.buffer)[0],77);
   f.host.present();f.host.present();assert.equal(f.host.inspect().activeSequence,1,'future metadata grants no draw');
   return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});
  assert.equal(outcome.status,'committed');await flush();assert.equal(f.host.inspect().activeSequence,1);f.host.present();await prepared.presented;
  assert.equal(f.host.inspect().activeSequence,2);assert.equal(new Float32Array(original.data.buffer)[0],1);assert.equal(f.host.inspect().frameTime.elapsed,10);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const attest of [true,false])test(`an actual native suspended body requires direct attestation (${attest}) and stops drawing after cancellation`,async()=>{
 const native=nativeGateCrossingFixture(),[sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeSuspendedVersion:1}},{intentControl:{port:drawPort,session:'native-suspension'}});let source,prepared,reference;
 try{
  native.session.actorSectorRevision({worker:true});const origin=native.point(0,0);let exitZ;for(let z=6;z<=16;z+=2)if(native.w.spatial_execution_segment_clear(-32.2,z+.2,-17.2,z+.2,.28)===1){exitZ=z+.2;break;}assert(Number.isFinite(exitZ));
  const route=native.route({points:[[.05,3],[-17.2-origin.x,exitZ-origin.z],[-32.2-origin.x,exitZ-origin.z]]});assert.equal(native.admit(route).status,'admitted');assert.equal(native.bridge.beginNativeRouteExecution().status,'started');const at=native.service.read(native.gates[0].id).at+.3;assert.equal(native.advance(at).status,'advanced');native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'native-suspension',observe:native.bridge.observeNativeIntentControl});await source.ready;
  if(!attest){const release=source.releaseGpuAfterMutation;source.releaseGpuAfterMutation=(receipt,options)=>release(receipt,{...options,nativeSuspendedBodies:[]});}
  const clock={version:1,epoch:0,elapsed:at,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,segments:[{start:at,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-at}]},shown=f.frame(1,{clock});await flush();await f.host.idle();f.host.present();await shown;
  const original=f.gpu.buffers[0],result=await native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'removeChunks',chunks:[[-1,0]],releaseOnly:false},prepareResources:async({resources,proposedWorldBoundary})=>{
   [reference]=nativeSuspendedBodiesFromProposal(resources,proposedWorldBoundary);assert(reference);assert.equal(native.bridge.nativeSuspendedGateRoute(reference.nativeRoute.actorId),null);
   f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:at,nativeSuspended:reference});prepared=await preparedWorldDraw({...f,clock},proposedWorldBoundary,77);
   const count=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,count+1);assert.equal(f.host.inspect().activeSequence,1);assert.equal(new Float32Array(original.data.buffer)[0],1);
   // The preparer owns these arrays, but cannot rewrite the authority proof.
   resources.routeEffects.rows.fill(-1);
   return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});
  if(!attest){const rejected=assert.rejects(prepared.presented,/direct authority|obsolete/);await flush();await rejected;const before=f.gpu.submitted.length;f.host.present();assert.equal(f.host.inspect().activeSequence,1);assert.equal(f.gpu.submitted.length,before);assert.equal(f.host.inspect().failed,true);return;}
  assert.equal(result.status,'committed',JSON.stringify(result));await flush();f.host.present();await prepared.presented;assert.equal(f.host.inspect().activeSequence,2);assert.equal(f.host.inspect().frameTime.elapsed,at);assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getSuspendedTime(reference,at),at);assert.equal(new Float32Array(original.data.buffer)[0],1);
  assert.equal(native.advance(at+.2).status,'advanced');native.bridge.commitNativeCausalClock();await flush();f.host.present();const status=f.host.inspect();assert(status.frameTime.elapsed<=at+.2);assert.equal(status.nativeCausalClock.committedThrough,at+.2);assert.equal(status.failed,false);
  const count=f.gpu.submitted.length;assert.equal(native.bridge.cancelHomeIntent(`worker-${reference.nativeRoute.actorId}`),true);await flush();f.host.present();f.host.present();assert.equal(f.gpu.submitted.length,count,'a cancelled body never replays its held image');assert.deepEqual(f.errors,[]);
 }finally{source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();}
});

for(const [attest,stale,deferred=false,missingTemplate=false,cancelDuringDrain=false,largeDelay=false,longIndependent=false] of [[true,false],[false,false],[true,true],[true,false,true],[true,false,true,true],[true,false,true,false,true],[true,false,true,false,false,true],[true,false,true,false,false,false,true]])test(`a native resume packet needs the actual direct assignment (${attest}, stale ${stale}, deferred ${deferred}, missing template ${missingTemplate}, drain cancellation ${cancelDuringDrain}, large delay ${largeDelay}, independent horizon ${longIndependent}) before causal execution and picking`,async()=>{
 const native=nativeGateCrossingFixture(),[sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeSuspendedVersion:1,nativeResumeVersion:1,nativeDeferredResumeVersion:1}},{intentControl:{port:drawPort,session:'native-resume'},...(deferred?{absoluteNow:()=>Number.MAX_SAFE_INTEGER}:{})});let source,prepared,reference,held,independent;
 try{
  native.session.actorSectorRevision({worker:true});const origin=native.point(0,0);let exitZ;for(let z=6;z<=16;z+=2)if(native.w.spatial_execution_segment_clear(-32.2,z+.2,-17.2,z+.2,.28)===1){exitZ=z+.2;break;}assert(Number.isFinite(exitZ));
  const request=native.route({points:[[.05,3],[-17.2-origin.x,exitZ-origin.z],[-32.2-origin.x,exitZ-origin.z]]});assert.equal(native.admit(request).status,'admitted');assert.equal(native.bridge.beginNativeRouteExecution().status,'started');const at=native.service.read(native.gates[0].id).at+.3;assert.equal(native.advance(at).status,'advanced');native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'native-resume',observe:native.bridge.observeNativeIntentControl});await source.ready;
  const heldClock={version:1,epoch:0,elapsed:at,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,segments:[{start:at,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-at}]};
  const first=f.frame(1,{clock:heldClock});await flush();await f.host.idle();f.host.present();await first;
  const stop=await native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'removeChunks',chunks:[[-1,0]],releaseOnly:false},prepareResources:async({resources,proposedWorldBoundary})=>{
   [held]=nativeSuspendedBodiesFromProposal(resources,proposedWorldBoundary);assert(held);f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:at,nativeSuspended:held});const packet=await preparedWorldDraw({...f,clock:heldClock},proposedWorldBoundary);prepared=packet;
   return {preparedWorldBoundary:packet.preparedWorldBoundary,valid:packet.valid,commit:data=>packet.commit(data.worldBoundary),abort:packet.abort};
  }});assert.equal(stop.status,'committed',JSON.stringify(stop));await flush();f.host.present();await prepared.presented;
  // Restore the affected suffix before proposing its resumption. The pinned
  // body's original authority proof remains valid through this later world.
  const restore=await native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'addChunk',cx:-1,cz:0},prepareResources:async({proposedWorldBoundary})=>{
   const packet=await preparedWorldDraw({...f,clock:heldClock},proposedWorldBoundary);prepared=packet;return {preparedWorldBoundary:packet.preparedWorldBoundary,valid:packet.valid,commit:data=>packet.commit(data.worldBoundary),abort:packet.abort};
  }});assert.equal(restore.status,'committed',JSON.stringify(restore));await flush();f.host.present();await prepared.presented;
  const before=native.body(1),resumeHandle=native.bridge.nativeSuspendedGateRoute(held.nativeRoute.actorId).resumeHandle;
  if(!attest){const release=source.releaseGpuAfterMutation;source.releaseGpuAfterMutation=(receipt,options)=>release(receipt,{...options,nativeResumedRoutes:[]});}
  assert.throws(()=>native.bridge.resumeNativeGateRouteAfterGpuQuiescence({getPublication:()=>source,resumeHandle}),/retained resource preparation/);
  if(longIndependent){const handle=native.worker(2,native.point(-20,-18),native.point(20,-18));assert.equal(native.bridge.beginNativeRouteExecution().status,'started');native.bridge.commitNativeCausalClock();const plan=native.bridge.nativeRouteTiming(handle);independent={reference:{actorId:plan.actorId,assignmentSequence:plan.assignmentSequence,routeHandle:handle},start:plan.startTime,end:plan.endTime};}
  const staged=native.bridge.prepareNativeGateResumeProposal(resumeHandle);assert.equal(staged.status,'proposed');
  const revalidated=native.bridge.revalidateNativeGateResumeProposal(staged.proposal.ticket);assert.equal(revalidated.status,'revalidated');
  const wrong=await native.bridge.resumeNativeGateRouteAfterGpuQuiescence({getPublication:()=>source,resumeHandle,proposalTicket:staged.proposal.ticket,prepareResources(){throw Error('Wrong ticket prepared resources');}});assert.notEqual(wrong.status,'committed');assert(native.bridge.captureNativeGateResumeProposal(revalidated.proposal.ticket));
  if(deferred){const quiesce=source.quiesceGpuForMutation;source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);assert.equal(native.advance(native.state.elapsed+(largeDelay?100:.1)).status,'advanced');native.bridge.commitNativeCausalClock();if(cancelDuringDrain){assert.equal(native.bridge.cancelHomeIntent(`worker-${held.nativeRoute.actorId}`),true);native.bridge.commitNativeCausalClock();}return receipt;};}
  let aborted;const result=await native.bridge.resumeNativeGateRouteAfterGpuQuiescence({getPublication:()=>source,resumeHandle,deferredStart:deferred,proposalTicket:revalidated.proposal.ticket,prepareResources:async({resources,proposedWorldBoundary})=>{
   reference=nativeResumeReferenceFromProposal(resources);assert.equal(Object.hasOwn(resources,'assignmentSequence'),false);assert.equal(native.bridge.nativeRouteTiming(reference.expectedRouteHandle),null);assert.deepEqual(native.body(1),before);
   // Other independent scene resources may outlive this worker's own table.
   const clock=largeDelay||longIndependent?{...heldClock,safeUntil:resources.endTime,segments:[{start:at,end:resources.endTime,rate:1,realDuration:resources.endTime-at}]}:heldClock;if(largeDelay)f.client.registerClockBinding(f.buffer,{byteOffset:8,semantic:'absolute',epoch:0});if(independent)f.client.registerClockBinding(f.buffer,{byteOffset:12,semantic:'relative',epoch:independent.start,nativeRoute:independent.reference,resourceEnd:independent.end});f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:at,nativeResume:reference});if(deferred)f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'origin-modulo',epoch:at,nativeResume:reference,period:3.8});prepared=await preparedWorldDraw({...f,clock,...(deferred&&!missingTemplate?{resumeTemplate:reference}:{})},proposedWorldBoundary);
   const active=f.host.inspect().activeSequence;f.host.present();assert.equal(f.host.inspect().activeSequence,active);assert.deepEqual(native.body(1),before);assert.equal(native.bridge.nativeRouteTiming(reference.expectedRouteHandle),null);
   resources.rows.fill(-1);resources.points.fill(-1);for(const gate of resources.gates)gate.rows.fill(-1);
   if(deferred){assert.equal(native.advance(native.state.elapsed+(largeDelay?100:.1)).status,'advanced');native.bridge.commitNativeCausalClock();}
   if(stale){aborted=assert.rejects(prepared.presented,{name:'AbortError'});assert.equal(native.advance(at+.1).status,'advanced');native.bridge.commitNativeCausalClock();}
   return {preparedWorldBoundary:prepared.preparedWorldBoundary,...(deferred?{preparedResumeTemplate:reference}:{}),valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeResumeBinding),abort:prepared.abort};
  }});
  if(cancelDuringDrain){assert.equal(result.status,'resources-changed',JSON.stringify(result));await assert.rejects(prepared.presented);await flush();assert.equal(native.bridge.nativeRouteTiming(reference.expectedRouteHandle),null);assert.equal(native.bridge.nativeSuspendedGateRoute(held.nativeRoute.actorId),null);assert.equal(source.status().closed,false);assert.equal(f.host.inspect().failed,false);const submitted=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,submitted);return;}
  if(missingTemplate){assert.equal(result.status,'control-failed');await assert.rejects(prepared.presented);assert(native.bridge.nativeSuspendedGateRoute(held.nativeRoute.actorId));assert.equal(native.bridge.nativeRouteTiming(reference.expectedRouteHandle),null);return;}
  if(stale){assert.equal(result.status,'stale',JSON.stringify(result));await aborted;await flush();f.host.present();assert(native.bridge.nativeSuspendedGateRoute(held.nativeRoute.actorId));assert.equal(native.bridge.nativeRouteTiming(reference.expectedRouteHandle),null);assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);return;}
  if(!attest){const rejected=assert.rejects(prepared.presented,/attestation|obsolete/);await flush();await rejected;const count=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,count);assert.equal(f.host.inspect().failed,true);return;}
  assert.equal(result.status,'committed',JSON.stringify(result));assert(result.nativeRoute.assignmentSequence>reference.sourceControlSequence);assert.deepEqual(result.nativeRoute.routeHandle,reference.expectedRouteHandle);await flush();f.host.present();if(deferred)assert.equal(f.host.inspect().activeSequence,prepared.sequence,JSON.stringify({host:f.host.inspect(),source:source.status()}));await prepared.presented;
  if(deferred){const timing=native.bridge.nativeRouteTiming(result.nativeRoute.routeHandle);const phaseWrite=f.gpu.calls.filter(call=>call[0]==='writeBuffer'&&call[1]===4).at(-1);assert(phaseWrite);assert.equal(new Float32Array(new Uint8Array(phaseWrite[2]).buffer)[0],Math.fround(timing.startTime%3.8));assert.equal(result.timeTranslation.sameFloat32Motion,true);assert.equal(result.timeTranslation.sameFloat32Gates,true);assert(result.worldBoundary.effectiveTime>reference.worldBoundary.effectiveTime);}
  if(largeDelay){const value=f.gpu.calls.filter(call=>call[0]==='writeBuffer'&&call[1]===8).at(-1);assert(value);const written=new Float32Array(new Uint8Array(value[2]).buffer)[0];assert(written<=reference.endTime);assert(f.host.inspect().nativeRouteFrame.clockElapsed>reference.endTime+100);assert(result.worldBoundary.effectiveTime>reference.endTime+100);}
  assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getResumeTime(reference,at),at);assert.throws(()=>captureNativeRoutePickFrame(f.host.inspect()).getSuspendedTime(held,at),/no submitted/);const nextTime=independent?native.bridge.nativeRouteTiming(result.nativeRoute.routeHandle).endTime+.2:native.state.elapsed+.2;assert.equal(native.advance(nextTime).status,'advanced');native.bridge.commitNativeCausalClock();await flush();f.host.present();assert.equal(f.host.inspect().failed,false);assert.equal(f.host.inspect().nativeCausalClock.committedThrough,nextTime);
  if(independent){const frame=captureNativeRoutePickFrame(f.host.inspect()),at=frame.getTime(independent.reference,independent.start);assert(at>native.bridge.nativeRouteTiming(result.nativeRoute.routeHandle).endTime+.1);assert(at<=independent.end);assert.equal(f.host.inspect().failed,false);return;}
  const count=f.gpu.submitted.length;native.bridge.cancelHomeIntent(`worker-${reference.actorId}`);await flush();f.host.present();assert.equal(f.gpu.submitted.length,count);assert.deepEqual(f.errors,[]);
 }finally{source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();}
});

for(const mode of ['current','missing-template','cancel-during-drain','missing-attestation'])test(`a first-task retained packet requires its genuine request and direct assignment (${mode})`,async()=>{
 const native=nativeTaskRequestFixture({bindBodies:true});native.claim();const planner=native.planner,[sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskStartVersion:1,nativeDeferredResumeVersion:1}},{intentControl:{port:drawPort,session:'first-task'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});let source,prepared,reference;
 try{
  planner.reconcileNavigationRevision(native.state,1);planner.flushTaskEvents();planner.reconcileWorkerRoutes(native.state,{navVersion:1});planner.flushTaskEvents();planner.reconcileWorkerRoutes(native.state,{navVersion:1});assert.equal(planner.needsReconciliation(1),false);
  source=createNativeIntentControlPublication({port:sourcePort,session:'first-task',observe:planner.observeNativeIntentControl});await source.ready;
  const b=planner.nativeRouteTiming(native.b),bReference={actorId:b.actorId,routeHandle:native.b,assignmentSequence:b.assignmentSequence},clock={version:1,epoch:0,elapsed:10,safeUntil:b.endTime,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:b.endTime,rate:1,realDuration:b.endTime-10}]};
  f.client.registerClockBinding(f.buffer,{byteOffset:12,semantic:'relative',epoch:10,nativeRoute:bReference,resourceEnd:b.endTime});const shown=f.frame(1,{clock});await flush();await f.host.idle();f.host.present();await shown;
  const advance=at=>{native.state.elapsed=at;assert.equal(planner.advanceNativeRouteExecution(at).status,'advanced');planner.commitNativeCausalClock();};
  const quiesce=source.quiesceGpuForMutation;source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);advance(native.state.elapsed+.02);if(mode==='cancel-during-drain'){const worker=native.state.workers[0];releaseTask(native.state,worker);worker.status='idle';notifyWorkerPlanningChange(native.state,worker);planner.flushTaskEvents();planner.commitNativeCausalClock();}return receipt;};
  if(mode==='missing-attestation'){const release=source.releaseGpuAfterMutation;source.releaseGpuAfterMutation=(receipt,options)=>release(receipt,{...options,nativeStartedRoutes:[]});}
  const request=planner.pendingTaskRoute(native.state.tasks[0].workerId),result=await planner.startNativeTaskRouteAfterGpuQuiescence({getPublication:()=>source,request,policy:{bodyId:1,radius:.28,urgent:true,runRemaining:4},prepareResources:async({resources,proposedWorldBoundary,deferredStart})=>{
   assert.equal(planner.needsReconciliation(1),false,'preparing resources must not announce an assignment');
   assert.equal(deferredStart,true);reference=nativeTaskStartReferenceFromProposal(resources);assert.equal(planner.nativeRouteTiming(reference.expectedRouteHandle),null);assert.equal(resources.nativeResume,undefined);f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeStart:reference,resourceEnd:resources.endTime});f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'origin-modulo',epoch:10,nativeStart:reference,period:3.8});
   prepared=await preparedWorldDraw({...f,clock,...(mode==='missing-template'?{}:{startTemplate:reference})},proposedWorldBoundary);advance(12);const active=f.host.inspect().activeSequence;f.host.present();assert.equal(f.host.inspect().activeSequence,active);return {preparedWorldBoundary:prepared.preparedWorldBoundary,...(mode==='missing-template'?{}:{preparedTaskStartTemplate:reference}),valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeTaskStartBinding),abort:prepared.abort};
  }});
  if(mode==='current'||mode==='missing-attestation')assert.equal(planner.needsReconciliation(1),true,'a real native commit must wake game reconciliation');
  if(mode==='missing-template')assert.equal(planner.needsReconciliation(1),false,'a rejected template must not announce an assignment');
  if(mode==='current'){assert.equal(result.status,'committed',JSON.stringify(result));await flush();f.host.present();await prepared.presented;assert.equal(f.host.inspect().activeSequence,prepared.sequence);const frame=captureNativeRoutePickFrame(f.host.inspect());assert.equal(frame.getStartTime(reference,10),10);assert.equal(frame.getStartExecutionTime(reference,10),12.02);assert.equal(planner.nativeTaskStartBinding(reference.actorId).assignmentSequence,result.nativeRoute.assignmentSequence);assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
   // A third body starts its other genuine claimed task while the first body
   // remains an authorized nativeStart motor in this same retained scene.
   const nextRequest=planner.pendingTaskRoute(native.state.tasks[1].workerId),buffer=f.client.device.createBuffer({size:16,usage:72});f.group=f.client.device.createBindGroup({entries:[{binding:0,resource:{buffer:f.buffer}},{binding:1,resource:{buffer}}]});let nextReference,nextPacket;
   const next=await planner.startNativeTaskRouteAfterGpuQuiescence({getPublication:()=>source,request:nextRequest,policy:{bodyId:3,radius:.28,urgent:true,runRemaining:4},prepareResources:async({resources,proposedWorldBoundary})=>{nextReference=nativeTaskStartReferenceFromProposal(resources);f.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch:resources.startTime,nativeStart:nextReference,resourceEnd:resources.endTime});nextPacket=await preparedWorldDraw({...f,clock,startTemplate:nextReference},proposedWorldBoundary);advance(12.3);return {preparedWorldBoundary:nextPacket.preparedWorldBoundary,preparedTaskStartTemplate:nextReference,valid:nextPacket.valid,commit:data=>nextPacket.commit(data.worldBoundary,data.nativeTaskStartBinding),abort:nextPacket.abort};}});
   assert.equal(next.status,'committed',JSON.stringify(next));await flush();f.host.present();await nextPacket.presented;const current=captureNativeRoutePickFrame(f.host.inspect());assert(current.getStartExecutionTime(reference,10)>12.02);assert.equal(current.getStartExecutionTime(nextReference,nextReference.worldBoundary.effectiveTime),12.32);assert.equal(f.host.inspect().failed,false);assert(planner.nativeRouteTiming(result.nativeRoute.routeHandle));assert(planner.nativeRouteTiming(next.nativeRoute.routeHandle));assert(planner.nativeRouteTiming(native.b));assert.deepEqual(f.errors,[]);
  }
  else{assert.notEqual(result.status,'committed',JSON.stringify(result));if(prepared)await assert.rejects(prepared.presented);if(mode==='cancel-during-drain'){assert.equal(result.status,'resources-changed',JSON.stringify(result));assert.equal(planner.pendingTaskRoute(reference.actorId),null);assert.equal(source.status().closed,false);assert.equal(f.host.inspect().failed,false);}else if(mode==='missing-template')assert.equal(planner.nativeRouteTiming(reference.expectedRouteHandle),null);else assert.equal(result.status,'committed-control-failed');}
 }finally{source?.dispose();f.client.dispose();await f.host.dispose();native.close();}
});

test('a draw owner without resume support refuses the candidate clock',async()=>{
 const f=await fixture();try{assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeResume:{}}),/does not support/);assert.equal(f.client.inspect().clockBindings,0);}finally{f.client.dispose();await f.host.dispose();}
});

test('a preparer cannot inject direct native execution bindings into a packet',async()=>{
 const f=await fixture();try{for(const key of ['admittedWorldBoundary','admittedResumeBinding','admittedMotionBinding','admittedClockBindings','admittedClockCoverageEnd','admittedBarrierAdditionBinding','admittedBarrierClockCoverageEnd'])await assert.rejects(f.host.handle({type:'frame',packet:{sequence:1,operations:[],[key]:{}}}),/producer cannot supply/);assert.equal(f.gpu.submitted.length,0);assert.equal(f.host.inspect().activeSequence,null);}finally{f.client.dispose();await f.host.dispose();}
});

test('a draw owner without suspension support cannot silently accept the new clock as an ordinary clock',async()=>{
 const f=await fixture();try{assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeSuspended:{}}),/does not support/);assert.equal(f.client.inspect().clockBindings,0);}finally{f.client.dispose();await f.host.dispose();}
});

test('a cancelled ready world packet retains the displayed generation and cannot activate on a later different commit',async()=>{
 const f=await nativePreparationFixture();try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;
  const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:99,effectiveTime:10},prepared=await preparedWorldDraw(f,boundary);
  prepared.abort();await assert.rejects(prepared.presented,{name:'AbortError'});await flush();f.host.present();assert.equal(f.host.inspect().activeSequence,1);assert.equal(f.host.inspect().pendingSequence,null);
  const next=await f.commit();assert.equal(next.status,'committed');await flush();f.host.present();assert.equal(f.host.inspect().activeSequence,1);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a prepared packet ready receipt waits for the actual upload fence while the prior image keeps drawing',async()=>{
 const f=await nativePreparationFixture();let release;
 try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;
  const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10};
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{release=resolve;});let ready=false;const pending=preparedWorldDraw(f,boundary).then(value=>{ready=true;return value;});pending.catch(()=>{});await flush();for(let i=0;i<1000&&!release;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(typeof release,'function');assert.equal(ready,false);
  f.host.present();assert.equal(f.host.inspect().activeSequence,1);release();const prepared=await pending;assert.equal(ready,true);prepared.abort();await flush();
 }finally{release?.();f.gpu.device.queue.onSubmittedWorkDone=async()=>{};f.close();}
});

test('prepared drawing preserves first-submit resource copies instead of silently treating them as replay',async()=>{
 const f=await nativePreparationFixture();let prepared;try{
  const source=f.client.device.createBuffer({size:16,usage:12});f.client.device.queue.writeBuffer(source,0,new Float32Array([333]));await flush();await f.host.idle();
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;
  const result=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   const metadata={clock:f.clock,nativeWorldBoundary:proposedWorldBoundary};f.client.beginFrame({nativeWorldBoundary:proposedWorldBoundary});const encoder=f.client.device.createCommandEncoder();encoder.copyBufferToBuffer(source,0,f.buffer,0,4);const pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);prepared=await f.client.prepareNativeWorldFrame(metadata);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],1);return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});
  assert.equal(result.status,'committed');await flush();f.host.present();await prepared.presented;assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],333);const copies=f.gpu.calls.filter(call=>call[0]==='copy').length;f.host.present();assert.equal(f.gpu.calls.filter(call=>call[0]==='copy').length,copies);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],333);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('an already aborted prepared frame is cancelled before FIFO admission without stranding its RPC',async()=>{
 const f=await nativePreparationFixture();try{
  const controller=new AbortController();controller.abort();const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10};
  await assert.rejects(preparedWorldDraw(f,boundary,77,controller.signal),/cancelled|unavailable/i);await flush();await f.host.idle();assert.equal(f.host.inspect().pendingSequence,null);assert.equal(f.host.inspect().failed,false);
 }finally{f.close();}
});

test('a ready packet naming a different ticket never adopts the real native mutation',async()=>{
 const f=await nativePreparationFixture();try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:99,effectiveTime:10},prepared=await preparedWorldDraw(f,boundary);
  const rejected=assert.rejects(prepared.presented,/invalidated/);const outcome=await f.commit();assert.equal(outcome.status,'committed');await flush();await rejected;f.host.present();assert.equal(f.host.inspect().activeSequence,1);assert.equal(f.host.inspect().pendingSequence,null);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('native consumer retirement invalidates its prepared successor before any later draw',async()=>{
 const f=await nativePreparationFixture();try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10},prepared=await preparedWorldDraw(f,boundary);
  const rejected=assert.rejects(prepared.presented,/cancelled/);await f.source.retireGpu();await flush();await rejected;const draws=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,draws);assert.equal(prepared.valid(),false);assert.equal(f.host.inspect().pendingSequence,null);
 }finally{f.close();}
});

test('prepared clock references are immutable even if the producer retags their logical buffer before the commit',async()=>{
 const f=await nativePreparationFixture();let prepared,nativeGate;try{
  const outcome=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   nativeGate={gateId:9,worldBoundary:proposedWorldBoundary};f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeGate});prepared=await preparedWorldDraw(f,proposedWorldBoundary);
   f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeGate:{...nativeGate,gateId:999,worldBoundary:{...proposedWorldBoundary,authorityEpoch:'foreign'}}});await flush();
   return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
  }});
  assert.equal(outcome.status,'committed');await flush();f.host.present();await prepared.presented;assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getGateTime(nativeGate,10),10);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a GPU copy cannot overwrite a prepared native presentation clock after consumer patching',async()=>{
 const f=await nativePreparationFixture();try{
  const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10},source=f.client.device.createBuffer({size:16,usage:12}),metadata={clock:f.clock,nativeWorldBoundary:boundary};
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeGate:{gateId:9,worldBoundary:boundary}});f.client.beginFrame({nativeWorldBoundary:boundary});
  const encoder=f.client.device.createCommandEncoder();encoder.copyBufferToBuffer(source,0,f.buffer,0,4);const pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setBindGroup(0,f.group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  await assert.rejects(f.client.prepareNativeWorldFrame(metadata),/clocks cannot be overwritten/);assert.equal(f.gpu.submitted.length,0);
 }finally{f.close();}
});

test('cancelling a successor before quiescence prevents physical commit even if the caller reports its local handle as valid',async()=>{
 const f=await nativePreparationFixture();try{
  // Adversarial caller skips the scheduling notification as well as lying
  // about validity. The original physical Quiesce guard must still reject it.
  f.source.waitForMutationOpportunity=async()=>{};
  const before=f.native.session.core.snapshot(),outcome=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   const prepared=await preparedWorldDraw(f,proposedWorldBoundary);prepared.abort();await flush();await f.host.idle();
   return {preparedWorldBoundary:proposedWorldBoundary,valid:()=>true,commit(){throw Error('Cancelled packet must not commit');},abort(){}};
  }});
  assert.equal(outcome.status,'control-failed');assert.deepEqual(f.native.session.core.snapshot(),before);assert.equal(f.host.inspect().failed,true);assert.equal(f.gpu.canvasSubmissions.length,0);
 }finally{f.close();}
});

test('the quiesced receipt retains its exact successor through late producer cancellation until native release',async()=>{
 const f=await nativePreparationFixture();try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;
  const outcome=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   const prepared=await preparedWorldDraw(f,proposedWorldBoundary);
   return {preparedWorldBoundary:proposedWorldBoundary,valid:prepared.valid,commit(){prepared.abort();return true;},abort:prepared.abort};
  }});
  assert.equal(outcome.status,'committed');assert.equal(outcome.receipt.preparedFrameSequence,2);await flush();f.host.present();assert.equal(f.host.inspect().activeSequence,2);assert.deepEqual(f.host.inspect().nativeRouteFrame.worldBoundary,outcome.worldBoundary);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a future world resource tag cannot prepare an unauthorized native actor assignment',async()=>{
 const f=await nativePreparationFixture();try{
  const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10};
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeRoute:{actorId:999999,assignmentSequence:1,routeHandle:{authorityEpoch:boundary.authorityEpoch,session:1,slot:0,generation:1}}});
  await assert.rejects(preparedWorldDraw(f,boundary),/unavailable|obsolete/);await flush();assert.equal(f.host.inspect().failed,false);assert.equal(f.gpu.submitted.length,0);assert.equal(f.host.inspect().pendingSequence,null);
 }finally{f.close();}
});

test('upload-only command buffers cannot stand in for a prepared world image',async()=>{
 const f=await nativePreparationFixture();try{
  const boundary={version:1,authorityEpoch:f.source.status().authorityEpoch,nativeSession:1,ticket:1,effectiveTime:10},metadata={clock:f.clock,nativeWorldBoundary:boundary};
  f.client.beginFrame({nativeWorldBoundary:boundary});const encoder=f.client.device.createCommandEncoder();encoder.clearBuffer(f.buffer);f.client.device.queue.submit([encoder.finish()]);
  await assert.rejects(f.client.prepareNativeWorldFrame(metadata),/no canvas presentation pass/);assert.equal(f.gpu.submitted.length,0);
 }finally{f.close();}
});
test('obsolete initialization survives until fresh commands use the same GPU buffer, without resending its upload',async()=>{
 const f=await nativePreparationFixture();try{
  const buffer=f.client.device.createBuffer({size:16,usage:72});await flush();await f.host.idle();const nativeBuffer=f.gpu.buffers[1],resourcesBefore=f.client.inspect().resourcesCreated;
  f.client.beginFrame({clock:f.clock});f.client.device.queue.writeBuffer(buffer,0,new Uint32Array([123]));
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const committed=await f.commit();assert.equal(committed.status,'committed');await flush();
  await assert.rejects(f.client.endFrame(),e=>e.code==='remote-frame-native-mutation-obsolete'&&e.resourcePreparationsRetained===true);await f.host.idle();
  assert.equal(new Uint32Array(nativeBuffer.data.buffer)[0],0);assert.equal(f.host.inspect().stagedOperations,1);assert.equal(f.gpu.submitted.length,0);
  const packet=preparationDraw(f,buffer,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await packet;
  assert.equal(new Uint32Array(nativeBuffer.data.buffer)[0],123);assert.equal(f.gpu.buffers[1],nativeBuffer);assert.equal(f.gpu.buffers.length,2);assert.equal(f.client.inspect().resourcesCreated,resourcesBefore+1,'only the newly recorded bind group is created');
  assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.host.inspect().stagedOperations,0);f.host.present();assert.equal(f.gpu.calls.filter(c=>c[0]==='writeBuffer').length,1);assert.equal(f.errors.length,0);
 }finally{f.close();}
});

test('retained native uniforms can finish admission behind a real fence without modifying the last displayed buffers',async()=>{
 const f=await nativePreparationFixture();try{
  const initial=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await initial;
  const displayed=f.gpu.buffers[0],committed=await f.commit();
  await assert.rejects(f.frame(2,{clock:f.clock}),error=>error.resourcePreparationsRetained===true);assert.equal(f.host.inspect().stagedOperations,1);
  const extra=f.client.device.createBuffer({size:16,usage:72});f.client.device.queue.writeBuffer(extra,0,new Uint32Array([123]));await flush();await f.host.idle();
  await f.client.device.queue.onSubmittedWorkDone();
  assert.equal(f.host.inspect().stagedOperations,0);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.host.inspect().retainedUniformUploads,2);
  assert.equal(new Float32Array(displayed.data.buffer)[0],1,'the active image still owns its old uniform generation');
  const next=f.frame(3,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await next;
  assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('independent gate resource coverage never grants time beyond the direct native causal clock',async()=>{
 const f=await nativePreparationFixture({absoluteNow:()=>1e8});try{
  const committed=await f.commit();assert.equal(committed.status,'committed');await flush();
  const nativeGate={gateId:9,worldBoundary:committed.worldBoundary},clock={...f.clock,safeUntil:Number.MAX_SAFE_INTEGER,segments:[{start:10,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-10}]};
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeGate});
  const shown=f.frame(0,{clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await shown;
  const status=f.host.inspect();assert.equal(status.nativeRouteFrame.clockElapsed,10);assert.equal(captureNativeRoutePickFrame(status).getGateTime(nativeGate,10),10);assert.equal(status.clockAtHorizon,true);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('independent gate clocks reject uncommitted and foreign native world references',async()=>{
 for(const foreign of [false,true]){const f=await nativePreparationFixture();try{
  const committed=await f.commit();assert.equal(committed.status,'committed');await flush();
  const worldBoundary={...committed.worldBoundary,...(foreign?{authorityEpoch:'foreign'}:{ticket:committed.worldBoundary.ticket+1})};
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeGate:{gateId:9,worldBoundary}});
  const rejected=assert.rejects(f.frame(0,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary}),/applied world and causal clock/);await flush();await f.host.idle();await rejected;assert.equal(f.gpu.submitted.length,0);
 }finally{f.close();}}
});
test('native commit cancels an obsolete frame waiting for an unused pipeline, preserving only its uploads',async()=>{
 const f=await nativePreparationFixture();let release;
 try{
  const buffer=f.client.device.createBuffer({size:16,usage:72});f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{release=resolve;});const slow=f.client.device.createRenderPipeline({label:'unused-old-world'});
  const old=preparationDraw(f,buffer,{clock:f.clock},slow,77),rejected=assert.rejects(old,e=>e.resourcePreparationsRetained===true);await flush();
  for(let i=0;i<100&&!release;i++)await new Promise(resolve=>setTimeout(resolve,1));
  assert.equal(typeof release,'function');assert.equal(f.host.inspect().pendingSequence,null);
  const committed=await f.commit();assert.equal(committed.status,'committed');await rejected;await f.host.idle();assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],0);
  // The old pipeline is deliberately still unresolved; recording uses the
  // already admitted pipeline and the original buffer on the original device.
  f.gpu.device.createRenderPipelineAsync=async()=>({});const packet=preparationDraw(f,buffer,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await packet;
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],77);assert.equal(f.host.inspect().nativeFrames,1);assert.equal(f.host.inspect().failed,false);assert.equal(f.errors.length,0);
 }finally{release?.({});await flush();f.close();}
});
test('already admitted pending uploads transfer their exact resource pins after a physical commit',async()=>{
 const f=await nativePreparationFixture();try{
  const buffer=f.client.device.createBuffer({size:16,usage:72}),old=preparationDraw(f,buffer,{clock:f.clock},f.pipeline,91),rejected=assert.rejects(old,e=>e.resourcePreparationsRetained===true);
  await flush();await f.host.idle();assert.equal(f.host.inspect().pendingSequence,1);const committed=await f.commit();await rejected;assert.equal(f.host.inspect().pendingSequence,null);
  const packet=preparationDraw(f,buffer,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await packet;
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],91);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.host.inspect().failed,false);
 }finally{f.close();}
});
test('later writes follow the retained initialization and unused released resources retire without being uploaded',async()=>{
 const f=await nativePreparationFixture();try{
  const buffer=f.client.device.createBuffer({size:16,usage:72}),unused=f.client.device.createBuffer({size:16,usage:72});
  f.client.beginFrame({clock:f.clock});f.client.device.queue.writeBuffer(buffer,0,new Uint32Array([5]));f.client.device.queue.writeBuffer(unused,0,new Uint32Array([9]));
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[]});pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const committed=await f.commit();await assert.rejects(f.client.endFrame(),e=>e.resourcePreparationsRetained===true);unused.destroy();f.client.device.queue.writeBuffer(buffer,0,new Uint32Array([8]));await flush();await f.host.idle();assert.equal(f.gpu.buffers[2].destroyed,false);
  const packet=preparationDraw(f,buffer,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await packet;await flush();
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],8);assert.equal(new Uint32Array(f.gpu.buffers[2].data.buffer)[0],0);assert.equal(f.gpu.buffers[2].destroyed,true);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.errors.length,0);
 }finally{f.close();}
});
test('unrepeatable rejected compute requires explicit recovery instead of losing its state and presenting a partial repair',async()=>{
 const f=await nativePreparationFixture();try{
  const committed=await f.commit();f.client.beginFrame({clock:f.clock});const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginComputePass();pass.dispatchWorkgroups(1);pass.end();f.client.device.queue.submit([encoder.finish()]);
  await assert.rejects(f.client.endFrame(),e=>e.resourcePreparationsRetained===false);assert.equal(f.host.inspect().preparationRecoveryRequired,true);assert.equal(f.gpu.submitted.length,0);
  await assert.rejects(f.frame(2,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary}),e=>e.resourcePreparationsRetained===false);assert.equal(f.gpu.submitted.length,0);assert.equal(f.host.inspect().failed,false);
 }finally{f.close();}
});
test('retained payload capacity is bounded across rejected frames and an overflow releases its retained generations',async()=>{
 const f=await nativePreparationFixture({maxFrameBytes:4});try{
  await f.commit();const buffer=f.client.device.createBuffer({size:16,usage:72});
  await assert.rejects(preparationDraw(f,buffer,{clock:f.clock},f.pipeline,1),e=>e.resourcePreparationsRetained===true);assert.equal(f.host.inspect().retainedPreparationBytes,4);
  await assert.rejects(preparationDraw(f,buffer,{clock:f.clock},f.pipeline,2),e=>e.resourcePreparationsRetained===false);
  assert.equal(f.host.inspect().preparationRecoveryRequired,true);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.host.inspect().stagedOperations,0);assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],0);assert.equal(f.errors.length,0);
 }finally{f.close();}
});
test('retirement discards unsubmitted retained uploads before draining the original GPU queue',async()=>{
 const f=await nativePreparationFixture();try{
  await f.commit();const buffer=f.client.device.createBuffer({size:16,usage:72});await assert.rejects(preparationDraw(f,buffer,{clock:f.clock},f.pipeline,10),e=>e.resourcePreparationsRetained===true);
  assert(f.host.inspect().retainedPreparationResources>0);await f.source.retireGpu();assert.equal(f.source.status().drained,true);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.host.inspect().stagedOperations,0);
  await f.client.device.queue.onSubmittedWorkDone();assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],0);assert.equal(f.host.inspect().failed,false);
 }finally{f.close();}
});
test('producer-supplied snapshot metadata cannot choose the native generation retained for an obsolete upload',async()=>{
 const f=await nativePreparationFixture();try{
  const committed=await f.commit(),buffer=f.client.device.createBuffer({size:16,usage:72});await flush();await f.host.idle();
  f.client.beginFrame({});f.client.cancelFrame();const id=buffer.__remoteGpuId;
  await f.host.handle({type:'frame',packet:{sequence:1,metadata:{nativeWorldBoundary:null},resourceSnapshot:new Map([[id,{id,kind:'createBuffer',pending:false,retired:true,nativeDestroyed:true,dependencies:new Set()}]]),operations:[{method:'writeBuffer',args:[{__remoteGpuId:id},0,new Uint32Array([39])]}]}});
  assert.equal(f.host.inspect().preparationRecoveryRequired,false);assert.equal(f.host.inspect().retainedPreparationResources,1);
  const packet=preparationDraw(f,buffer,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await packet;assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],39);assert.equal(f.host.inspect().failed,false);
 }finally{f.close();}
});
test('retained texture uploads and declared mip passes execute once on the next world, using the original texture',async()=>{
 const f=await nativePreparationFixture();try{
  const texture=f.client.device.createTexture({size:[4,4],format:'rgba8unorm',usage:20});f.client.beginFrame({clock:f.clock});
  f.client.device.queue.writeTexture({texture},new Uint8Array(64),{bytesPerRow:16},[4,4,1]);
  f.client.withTexturePreparation(texture,'mipmaps',()=>{const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),loadOp:'clear',storeOp:'store'}]});pass.setPipeline(f.pipeline);pass.draw(4,1,0,0);pass.end();f.client.device.queue.submit([encoder.finish()]);});
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const committed=await f.commit();await assert.rejects(f.client.endFrame(),e=>e.resourcePreparationsRetained===true);assert.equal(f.gpu.calls.filter(c=>c[0]==='writeTexture').length,0);
  f.client.beginFrame({clock:f.clock,nativeWorldBoundary:committed.worldBoundary});const group=f.client.device.createBindGroup({entries:[{binding:0,resource:texture.createView()}]}),fresh=f.client.device.createCommandEncoder(),drawing=fresh.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});drawing.setPipeline(f.pipeline);drawing.setBindGroup(0,group);drawing.draw(3);drawing.end();f.client.device.queue.submit([fresh.finish()]);const shown=f.client.endFrame();
  await flush();await f.host.idle();f.host.present();await shown;assert.equal(f.gpu.calls.filter(c=>c[0]==='writeTexture').length,1);assert.equal(f.gpu.calls.filter(c=>c[0]==='draw').length,2);f.host.present();assert.equal(f.gpu.calls.filter(c=>c[0]==='writeTexture').length,1);assert.equal(f.gpu.calls.filter(c=>c[0]==='draw').length,3);assert.equal(f.host.inspect().failed,false);assert.equal(f.errors.length,0);
 }finally{f.close();}
});

test('declared offscreen texture preparation survives a native commit and runs once across frame replay',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'texture-preparation'}});
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'texture-preparation',observe:native.bridge.observeNativeIntentControl});await source.ready;
  const committed=await native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'addChunk',cx:4,cz:4}});assert.equal(committed.status,'committed');
  const texture=f.client.device.createTexture({size:[4,4],format:'rgba8unorm',usage:20});
  const filter=()=>f.client.withTexturePreparation(texture,'mipmaps',()=>{
   const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(f.pipeline);pass.draw(4,1,0,0);pass.end();f.client.device.queue.submit([encoder.finish()]);
  });
  filter();await flush();await f.host.idle();assert.equal(f.host.inspect().failed,false);assert.equal(f.gpu.submitted.length,1);
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
  f.client.beginFrame({nativeWorldBoundary:committed.worldBoundary,clock});filter();
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);const receipt=f.client.endFrame();
  await flush();await f.host.idle();f.host.present();await receipt;
  assert.equal(f.gpu.submitted.length,3);f.host.present();assert.equal(f.gpu.submitted.length,4);assert.equal(f.errors.length,0);
 }finally{source?.dispose();f.host.dispose();native.session.dispose();}
});

function nativeControlEvent(type,sequence,actorId,handle,time){
  return {type,sequence,actorId,protocolVersion:2,authorityEpoch:'native-owner',
    effectiveTime:time,routeHandle:type==='RouteAssigned'?handle:null,
    revokedRouteHandle:type==='RouteInvalidated'?handle:null};
}
const nativeHandle=slot=>({authorityEpoch:'native-owner',session:1,slot,generation:1});

test('remote drawing continues during delayed pipeline preparation, using fresh command buffers and swapchain views', async () => {
  const f = await fixture();
  const receipt = f.frame(2);
  await flush(); await f.host.idle();
  f.host.present(); await receipt;
  let release;
  f.gpu.device.createRenderPipelineAsync = () => new Promise(resolve => { release = resolve; });
  const preparing = f.host.handle({ type: 'create', method: 'createRenderPipelineAsync', id: 'slow', descriptor: {} });
  f.host.present(); f.host.present();
  assert.equal(f.gpu.submitted.length, 3);
  assert.deepEqual(f.gpu.submitted.map(command => command.passes[0].colorAttachments[0].view.version), [1, 2, 3]);
  assert.equal(f.host.inspect().replayFrames, 2);
  release({}); await preparing;
  assert.equal(f.errors.length, 0);
});

test('native retirement bypasses blocked preparation, freezes every submission and waits for the real queue drain',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source,drain,releasePipeline;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'retirement'}});
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'retirement',observe:native.bridge.observeNativeIntentControl});await source.ready;
  const frame=f.frame(1,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:20,rate:1,realDuration:10}]}});await flush();await f.host.idle();f.host.present();await frame;
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{releasePipeline=resolve;});
  const preparing=f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'retirement-slow',descriptor:{}});
  await flush();assert.equal(typeof releasePipeline,'function');
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{drain=resolve;});
  const submissions=f.gpu.submitted.length;let retired=false;
  const pending=source.retireGpu().then(r=>{retired=true;return r;});await flush();
  assert.equal(retired,false);assert.equal(f.host.intentControlStatus().retiring,true);
  f.host.present();f.host.present();assert.equal(f.gpu.submitted.length,submissions);
  await assert.rejects(f.host.handle({type:'operation',op:{method:'submit',args:[[]]}}),/retiring/);
  drain();drain=null;await pending;await flush();assert.equal(f.host.intentControlStatus().drained,true);
  assert.equal(source.status().drained,true);assert.equal(source.status().closed,true);
  releasePipeline({});releasePipeline=null;await preparing;
  f.host.present();assert.equal(f.gpu.submitted.length,submissions);assert.equal(f.host.inspect().failed,false);
  assert.deepEqual(f.errors,[]);
 }finally{drain?.();releasePipeline?.({});source?.dispose();f.host.dispose();native.session.dispose();}
});

test('a late producer frame is cancelled without poisoning an accepted native retirement drain',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source,drain;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'retired-late-frame'}}),original=f.gpu.device.queue.onSubmittedWorkDone;
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'retired-late-frame',observe:native.bridge.observeNativeIntentControl});await source.ready;
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{drain=resolve;});const retired=source.retireGpu();retired.catch(()=>{});await flush();assert.equal(f.host.intentControlStatus().retiring,true);const submissions=f.gpu.submitted.length,writes=f.gpu.calls.filter(c=>c[0]==='writeBuffer').length;
  f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([99]));const error=await f.frame(2).then(()=>null,error=>error);assert.equal(error?.code,'remote-frame-native-mutation-obsolete');await f.host.idle();assert.equal(f.host.inspect().failed,false);assert.equal(f.gpu.submitted.length,submissions);assert.equal(f.gpu.calls.filter(c=>c[0]==='writeBuffer').length,writes);assert.equal(source.status().drained,false);f.gpu.device.queue.onSubmittedWorkDone=original;drain();drain=null;await retired;assert.equal(source.status().drained,true);assert.equal(f.host.intentControlStatus().drained,true);assert.deepEqual(f.errors,[]);
 }finally{f.gpu.device.queue.onSubmittedWorkDone=original;drain?.();source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();}
});

test('a pending operation cannot resume and submit after a native retirement receipt',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source,releasePipeline;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'retired-operation'}});
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'retired-operation',observe:native.bridge.observeNativeIntentControl});await source.ready;
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{releasePipeline=resolve;});
  await f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'retirement-slow',descriptor:{}});await flush();
  const count=f.gpu.submitted.length,operation=f.host.handle({type:'operation',op:{method:'submit',args:[[
    {__remoteCommands:[{method:'beginRenderPass',args:[{colorAttachments:[]}],commands:[{method:'setPipeline',args:[{__remoteGpuId:'retirement-slow'}]},{method:'draw',args:[3]}]}]}
  ]]}}),rejected=assert.rejects(operation,/retiring/);
  await source.retireGpu();releasePipeline({});releasePipeline=null;await rejected;
  assert.equal(f.gpu.submitted.length,count);assert.equal(source.status().drained,true);
 }finally{releasePipeline?.({});source?.dispose();f.host.dispose();native.session.dispose();}
});

test('disposal does not certify retirement before the queue drains, and actual device loss retires its own connection',async()=>{
 for(const lost of [false,true]){
  const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source,drain;
  const f=await fixture({}, {intentControl:{port:drawPort,session:'terminal-drain'}});
  try{
   native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
   source=createNativeIntentControlPublication({port:sourcePort,session:'terminal-drain',observe:native.bridge.observeNativeIntentControl});await source.ready;
   f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{drain=resolve;});
   if(lost)f.gpu.device.destroy();else f.host.dispose();await flush();
   assert.equal(source.status().drained,lost);
   if(!lost){assert.equal(source.status().closed,false);drain();drain=null;await flush();}
   assert.equal(source.status().drained,true);assert.equal(source.status().closed,true);
  }finally{drain?.();source?.dispose();f.host.dispose();native.session.dispose();}
 }
});

test('native revocation bypasses a resource FIFO blocked on a pending pipeline',async()=>{
  const [authorityPort,drawControlPort]=pair();let now=0;
  const f=await fixture({}, {absoluteNow:()=>now,
    intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
  const first=nativeHandle(0),other=nativeHandle(1);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,first,10));
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',2,8,other,10));
  await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:first,assignmentSequence:1}});
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:8,routeHandle:other,assignmentSequence:2}});
  const firstRef={actorId:7,routeHandle:first,assignmentSequence:1},otherRef={actorId:8,routeHandle:other,assignmentSequence:2};
  f.client.registerClockBinding(f.buffer,{byteOffset:8,semantic:'relative',epoch:10,nativeRoute:firstRef});
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,
    paused:false,segments:[{start:10,end:20,realDuration:10,rate:1}]};
  const receipt=f.frame(0,{clock});
  await flush();await f.host.idle();assert.equal(f.host.inspect().nativeRouteFrame,null);f.host.present();await receipt;
  let release;
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{release=resolve;});
  await f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'blocked',descriptor:{}});
  // This operation really holds the resource FIFO until the pipeline resolves.
  f.client.device.queue.submit([{__remoteCommands:[{method:'beginRenderPass',
    args:[{colorAttachments:[]}],commands:[{method:'setPipeline',
      args:[{__remoteGpuId:'blocked'}]}]}]}]);
  await flush();
  assert(f.host.inspect().queuedMessages>0);
  authorityPort.postMessage(nativeControlEvent('RouteInvalidated',3,7,first,10.25000003));
  await flush();
  assert.equal(f.host.intentControlStatus().sequence,3);
  now=1000;f.host.present();
  const values=new Float32Array(f.gpu.buffers[0].data.buffer);
  assert.equal(values[0],10.25,'the revoked actor stops at its native application time');
  assert.equal(values[1],11,'the unrelated actor continues autonomously');
  assert.equal(values[2],Math.fround(.25000003),'the relative actor uniform retains its own float32 precision');
  const inspected=f.host.inspect(),pick=captureNativeRoutePickFrame(inspected);
  assert.equal(inspected.nativeRouteFrame.clockElapsed,11);
  assert.equal(pick.getTime(firstRef,10),values[2]+10,'input follows this exact submitted float32 uniform rather than the global frame time');
  assert.notEqual(pick.getTime(firstRef,10),10.25000003,'input does not substitute the unquantized control boundary');
  assert.equal(pick.getTime(otherRef,0,'absolute'),11);
  assert.throws(()=>pick.getTime({...firstRef,assignmentSequence:3},10),/no submitted/);
  inspected.nativeRouteFrame.bindings[0].elapsed=999;
  assert.notEqual(f.host.inspect().nativeRouteFrame.bindings[0].elapsed,999,'inspection cannot rewrite the last submitted image');
  assert.equal(f.host.inspect().replayFrames,1);
  release({});await flush();await f.host.idle();
  assert.deepEqual(f.errors,[]);
});

test('a failed submission cannot publish new native input clocks',async()=>{
 const [authorityPort,drawControlPort]=pair();let now=0;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
 try{
  const handle=nativeHandle(0),ref={actorId:7,routeHandle:handle,assignmentSequence:1};
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,handle,10));await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:10,nativeRoute:ref});
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,realDuration:10,rate:1}]};
  const receipt=f.frame(0,{clock});await flush();await f.host.idle();f.host.present();await receipt;
  const before=f.host.inspect().nativeRouteFrame;
  now=1000;f.gpu.device.queue.submit=()=>{throw Error('native submit failed');};f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],1,'the uniform write alone did occur');
  assert.deepEqual(f.host.inspect().nativeRouteFrame,before);
  assert.equal(f.host.inspect().failed,true);
  assert.throws(()=>captureNativeRoutePickFrame(f.host.inspect()),/unavailable/);
 }finally{f.host.dispose();f.client.dispose();}
});

test('real native causal watermarks, pause, speed and revocation control one prepared GPU packet outside a blocked resource FIFO',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let now=0,source,release;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,session:'causal-test'}});
 try{
  const handle=native.worker(1,native.point(-6,0),native.point(6,0)),plan=native.bridge.nativeRouteTiming(handle);
  assert.equal(native.bridge.beginNativeRouteExecution().status,'started');native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'causal-test',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now});
  await source.ready;f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
   nativeRoute:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});
  const prepared={version:1,epoch:0,elapsed:10,safeUntil:100,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:100,rate:1,realDuration:90}]},receipt=f.frame(0,{clock:prepared});
  await flush();await f.host.idle();f.host.present();await receipt;
  const value=()=>new Float32Array(f.gpu.buffers[0].data.buffer)[0];assert.equal(value(),10);
  now=1000;f.host.present();assert.equal(value(),10,'preparation cannot invent time beyond the executed native horizon');
  assert.equal(native.advance(10.25).status,'advanced');native.bridge.commitNativeCausalClock();await flush();
  f.host.present();assert.equal(value(),10.25);
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{release=resolve;});
  await f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'causal-blocked',descriptor:{}});
  f.client.device.queue.submit([{__remoteCommands:[{method:'beginRenderPass',args:[{colorAttachments:[]}],
   commands:[{method:'setPipeline',args:[{__remoteGpuId:'causal-blocked'}]}]}]}]);await flush();assert(f.host.inspect().queuedMessages>0);
  native.bridge.commitNativeCausalClock({paused:true});await flush();const standing=native.body(1);
  now=5000;f.host.present();assert.equal(value(),10.25);assert.equal(native.advance(10.5).status,'paused');assert.deepEqual(native.body(1),standing);
  native.bridge.commitNativeCausalClock({rate:2});assert.equal(native.advance(10.75).status,'advanced');
  native.bridge.commitNativeCausalClock({rate:2});await flush();
  now=5125;f.host.present();assert.equal(value(),10.5,'speed changes reach drawing without another prepared packet');
  now=9000;f.host.present();assert.equal(value(),10.75,'silence exhausts the finite native watermark');
  assert.equal(native.w.nav_intent_cancel_home(900011),1);native.bridge.commitNativeCausalClock({paused:true,rate:2});await flush();
  now=12000;f.host.present();assert.equal(value(),10.75);assert.equal(f.host.inspect().failed,false);
  assert.equal(f.host.intentControlStatus().active,0);assert.equal(f.host.inspect().packets,1);
  assert.equal((await source.fenceGpu()).clockSequence,native.bridge.nativeCausalClock().clockSequence);
  const times=f.host.inspect().samples.map(sample=>sample.clockElapsed);for(let i=1;i<times.length;i++)assert(times[i]>=times[i-1]);
  release({});release=null;await flush();await f.host.idle();assert.deepEqual(f.errors,[]);
 }finally{release?.({});source?.dispose();f.host.dispose();native.session.dispose();}
});

test('a later prepared packet cannot drop a native-route tag to escape the causal clock of its connection',async()=>{
 const [sourcePort,drawPort]=pair();let now=0;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,authorityEpoch:'native-owner'}});
 try{
  const h=nativeHandle(0);sourcePort.postMessage(nativeControlEvent('RouteAssigned',1,7,h,10));
  sourcePort.postMessage({type:'IntentClock',protocolVersion:2,clockVersion:1,authorityEpoch:'native-owner',nativeSession:1,
   clockSequence:1,intentSequence:1,committedThrough:10,paused:false,rate:1,reanchor:true,anchorLogicalTime:10,anchorAbsoluteMs:0});await flush();
  const clock={version:1,epoch:0,elapsed:10,safeUntil:100,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:100,rate:1,realDuration:90}]};
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:7,routeHandle:h,assignmentSequence:1}});
  let receipt=f.frame(0,{clock});await flush();await f.host.idle();f.host.present();await receipt;
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0});
  receipt=f.frame(0,{clock});await flush();await f.host.idle();now=9000;f.host.present();await receipt;
  assert.equal(f.host.inspect().frameTime.elapsed,10);assert.equal(f.host.inspect().clockAtHorizon,true);
  assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{f.host.dispose();}
});

test('native clock authority cannot widen the prepared resource ceiling, even when a later pause anchors beyond it',async()=>{
 const [sourcePort,drawPort]=pair();let now=0;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,authorityEpoch:'native-owner'}});
 try{
  const h=nativeHandle(0);sourcePort.postMessage(nativeControlEvent('RouteAssigned',1,7,h,10));
  const clock={type:'IntentClock',protocolVersion:2,clockVersion:1,authorityEpoch:'native-owner',nativeSession:1,clockSequence:1,
   intentSequence:1,committedThrough:10,paused:false,rate:1,reanchor:true,anchorLogicalTime:10,anchorAbsoluteMs:0};
  sourcePort.postMessage(clock);await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:7,routeHandle:h,assignmentSequence:1}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10.25,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:10.25,rate:1,realDuration:.25}]}});await flush();await f.host.idle();f.host.present();await receipt;
  sourcePort.postMessage({...clock,clockSequence:2,committedThrough:12,reanchor:false});await flush();now=3000;f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed,10.25);
  sourcePort.postMessage({...clock,clockSequence:3,committedThrough:12,reanchor:true,paused:true,anchorLogicalTime:12,anchorAbsoluteMs:3000});
  await flush();now=5000;f.host.present();assert.equal(f.host.inspect().frameTime.elapsed,10.25);
  assert.equal(f.host.inspect().clockAtHorizon,true);assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{f.host.dispose();}
});

test('a prepared future resource generation waits for causal time instead of selecting its own logical start',async()=>{
 const [sourcePort,drawPort]=pair();let now=0;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,authorityEpoch:'native-owner'}});
 try{
  const h=nativeHandle(0);sourcePort.postMessage(nativeControlEvent('RouteAssigned',1,7,h,10));
  const clock={type:'IntentClock',protocolVersion:2,clockVersion:1,authorityEpoch:'native-owner',nativeSession:1,clockSequence:1,
   intentSequence:1,committedThrough:10,paused:false,rate:1,reanchor:true,anchorLogicalTime:10,anchorAbsoluteMs:0};
  sourcePort.postMessage(clock);await flush();f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
   nativeRoute:{actorId:7,routeHandle:h,assignmentSequence:1}});
  let receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:20,rate:1,realDuration:10}]}});await flush();await f.host.idle();f.host.present();await receipt;
  sourcePort.postMessage({...clock,clockSequence:2,committedThrough:12,reanchor:false});await flush();
  receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:11,safeUntil:12,anchorAbsoluteMs:9000,paused:false,
   segments:[{start:11,end:12,rate:1,realDuration:1}]}});await flush();await f.host.idle();now=500;f.host.present();
  assert.equal(f.host.inspect().activeSequence,1);assert.equal(f.host.inspect().pendingSequence,2);assert.equal(f.host.inspect().frameTime.elapsed,10.5);
  now=1100;f.host.present();await receipt;assert.equal(f.host.inspect().activeSequence,2);assert.equal(f.host.inspect().frameTime.elapsed,11.1);
  assert.deepEqual(f.errors,[]);
 }finally{f.host.dispose();}
});

test('conditioned native barrier drains GPU, blocks pre-commit packets and waits for fresh resources at the safe boundary',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let now=0,source,release;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,session:'mutation-test'}});
 try{
  const handle=native.worker(1,native.point(-6,0),native.point(6,0)),plan=native.bridge.nativeRouteTiming(handle);
  assert.equal(native.bridge.beginNativeRouteExecution().status,'started');native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'mutation-test',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now});await source.ready;
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:20,rate:1,realDuration:10}]}});await flush();await f.host.idle();f.host.present();await receipt;
  assert.equal(native.advance(11).status,'advanced');native.bridge.commitNativeCausalClock();await flush();
  const before=native.session.core.snapshot();let started;const drainStarted=new Promise(resolve=>{started=resolve;});
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{release=resolve;started();});
  const pending=native.bridge.addNativeBarrierAfterGpuQuiescence({getPublication:()=>source,...native.point(2,0),halfX:.15,halfZ:.6,yaw:.2});await drainStarted;const draws=f.gpu.submitted.length;
  assert.equal(f.host.inspect().nativeMutationHold,1);assert.deepEqual(native.session.core.snapshot(),before);assert(native.bridge.nativeRouteTiming(handle));
  now=100;f.host.present();f.host.present();assert.equal(f.gpu.submitted.length,draws,'no draw can be submitted while the mutation receipt is pending');
  release();release=null;const result=await pending;assert.equal(result.status,'committed');await flush();
  assert.equal(f.host.inspect().nativeMutationHold,null);assert.equal(f.host.inspect().nativeMutationFloor,11);
  assert.equal(f.host.inspect().nativeMutationEpoch,1);
  assert.equal(native.bridge.nativeRouteTiming(handle),null);assert.equal(f.host.intentControlStatus().active,0);
  f.host.present();assert.equal(f.gpu.submitted.length,draws,'the old prepared packet cannot be replayed after the physical commit');
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0});
  const replacement=f.frame(0,{nativeWorldBoundary:result.worldBoundary,clock:{version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:20,rate:1,realDuration:10}]}});await flush();await f.host.idle();f.host.present();await replacement;
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],11,'the replacement starts no earlier than the physical boundary');
  assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{release?.();source?.dispose();f.host.dispose();native.session.dispose();}
});

test('a cancelled native hold never advances expired prepared resources beyond their validity ceiling',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let now=0,source;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,session:'expired-mutation'}});
 try{
  const handle=native.worker(1,native.point(-6,0),native.point(6,0)),plan=native.bridge.nativeRouteTiming(handle);
  native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'expired-mutation',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now});await source.ready;
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10.5,anchorAbsoluteMs:0,paused:false,
   segments:[{start:10,end:10.5,rate:1,realDuration:.5}]}});await flush();await f.host.idle();f.host.present();await receipt;
  native.advance(11);native.bridge.commitNativeCausalClock();await flush();
  const hold=await source.quiesceGpuForMutation();assert.equal(source.releaseGpuAfterMutation(hold,{committed:false}),true);
  await flush();const count=f.gpu.submitted.length;now=5000;f.host.present();
  assert.equal(f.gpu.submitted.length,count,'expired packet remains frozen instead of being extended beyond its resources');
  assert.equal(f.host.inspect().nativeMutationFloor,11);assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{source?.dispose();f.host.dispose();native.session.dispose();}
});

test('a frame prepared before the physical commit but sent afterwards cannot borrow the new consumer epoch',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'late-world-frame'}});
 try{
  const handle=native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'late-world-frame',observe:native.bridge.observeNativeIntentControl});await source.ready;
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
  const first=f.frame(1,{clock});await flush();await f.host.idle();f.host.present();await first;
  f.client.beginFrame({clock});const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({
   colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const committed=await native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'addChunk',cx:4,cz:4}});
  assert.equal(committed.status,'committed');await flush();assert.deepEqual(f.client.requiredNativeWorldBoundary(),committed.worldBoundary);
  // A normal opportunity before the physical hold may still draw the old
  // world. Count from commit: no old packet may submit after this boundary.
  const count=f.gpu.submitted.length;
  assert(native.bridge.nativeRouteTiming(handle),'the route stays valid: world identity must reject the late packet independently');
  const late=f.client.endFrame(),rejected=assert.rejects(late,e=>e.code==='remote-frame-native-mutation-obsolete');
  await rejected;await f.host.idle();f.host.present();assert.equal(f.gpu.submitted.length,count);
  const fresh=f.frame(2,{clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await fresh;
  assert.equal(f.gpu.submitted.length,count+1);assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{source?.dispose();f.host.dispose();native.session.dispose();}
});

test('a producer cannot relabel an already prepared frame with a later native world identity',async()=>{
 const f=await fixture();try{
  f.client.beginFrame({});
  assert.throws(()=>f.client.endFrame({nativeWorldBoundary:{version:1,authorityEpoch:'native/1',nativeSession:1,ticket:1,effectiveTime:10}}),/cannot be retagged/);
  assert.equal(f.client.inspect().framesPublished,0);f.client.cancelFrame();
 }finally{f.host.dispose();}
});

test('old command buffers cannot be wrapped in a newly tagged frame or submitted outside the frame after commit',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'old-world-commands'}});
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'old-world-commands',observe:native.bridge.observeNativeIntentControl});await source.ready;
  const old=f.client.device.createCommandEncoder(),pass=old.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(f.pipeline);pass.draw(3);pass.end();const oldBuffer=old.finish();
  const committed=await native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation:{type:'addChunk',cx:4,cz:4}});
  assert.equal(committed.status,'committed');
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
  f.client.beginFrame({clock,nativeWorldBoundary:committed.worldBoundary});f.client.device.queue.submit([oldBuffer]);
  await assert.rejects(f.client.endFrame(),e=>e.code==='remote-frame-native-mutation-obsolete');assert.equal(f.gpu.submitted.length,0);
  const fresh=f.frame(2,{clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await fresh;
  const count=f.gpu.submitted.length,standalone=f.client.device.createCommandEncoder(),outside=standalone.beginRenderPass({colorAttachments:[]});
  outside.setPipeline(f.pipeline);outside.draw(3);outside.end();f.client.device.queue.submit([standalone.finish()]);await flush();await f.host.idle();
  assert.equal(f.gpu.submitted.length,count);assert.equal(f.host.inspect().failed,true);assert.match(f.errors[0].message,/Standalone drawing resources/);
 }finally{source?.dispose();f.host.dispose();native.session.dispose();}
});

test('a control-bound drawing owner cannot present even an untagged scene before receiving its native baseline',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source;
 const f=await fixture({}, {intentControl:{port:drawPort,session:'initial-world'}});
 try{
  native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
  const first=f.frame(1,{clock});await flush();await f.host.idle();f.host.present();assert.equal(f.gpu.submitted.length,0);
  source=createNativeIntentControlPublication({port:sourcePort,session:'initial-world',observe:native.bridge.observeNativeIntentControl});await source.ready;
  f.host.present();await first;assert.equal(f.gpu.submitted.length,1);assert.deepEqual(f.errors,[]);
 }finally{source?.dispose();f.host.dispose();native.session.dispose();}
});

test('standalone canvas commands cannot bypass the native bootstrap wait',async()=>{
 const [,drawPort]=pair(),f=await fixture({}, {intentControl:{port:drawPort,session:'no-world-bootstrap'}});
 try{
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(f.pipeline);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);await flush();await f.host.idle();
  assert.equal(f.gpu.submitted.length,0);assert.equal(f.host.inspect().failed,true);assert.match(f.errors[0].message,/requires a native baseline/);
 }finally{f.host.dispose();}
});

test('an older packet still waiting for GPU preparation is rejected after a conditioned mutation instead of resurrecting',async()=>{
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let now=0,source,releasePipeline;
 const f=await fixture({}, {absoluteNow:()=>now,intentControl:{port:drawPort,session:'old-packet'}});
 try{
  const handle=native.worker(1,native.point(-6,0),native.point(6,0)),plan=native.bridge.nativeRouteTiming(handle);
  native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  source=createNativeIntentControlPublication({port:sourcePort,session:'old-packet',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now});await source.ready;
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
  const initial=f.frame(0,{clock});await flush();await f.host.idle();f.host.present();await initial;
  native.advance(11);native.bridge.commitNativeCausalClock();await flush();
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{releasePipeline=resolve;});
  const slow=f.client.device.createRenderPipeline({label:'pre-mutation-slow'});f.client.beginFrame({clock});
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(slow);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const stale=f.client.endFrame(),rejected=assert.rejects(stale,error=>error.code==='remote-frame-native-mutation-obsolete');await flush();
  const result=await native.bridge.addNativeBarrierAfterGpuQuiescence({getPublication:()=>source,...native.point(2,0),halfX:.15,halfZ:.6});
  assert.equal(result.status,'committed');await flush();assert.equal(f.host.inspect().nativeMutationEpoch,1);
  releasePipeline({});releasePipeline=null;await rejected;await f.host.idle();
  assert.equal(f.host.inspect().pendingSequence,null);const submitted=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,submitted);
  assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
 }finally{releasePipeline?.({});source?.dispose();f.host.dispose();native.session.dispose();}
});

test('standalone GPU queue submissions cannot slip between a mutation drain and release',async()=>{
 for(const committed of [false,true]){
  const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();let source;
  const f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawPort,session:'standalone-hold'}});
  try{
   native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
   source=createNativeIntentControlPublication({port:sourcePort,session:'standalone-hold',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>0});await source.ready;
   const hold=await source.quiesceGpuForMutation(),before=f.gpu.submitted.length;
   f.client.device.queue.submit([{__remoteCommands:[{method:'beginRenderPass',args:[{colorAttachments:[]}],commands:[{method:'draw',args:[3]}]}]}]);
   await flush();assert.equal(f.gpu.submitted.length,before);assert(f.host.inspect().queuedMessages>0);
   source.releaseGpuAfterMutation(hold,{committed,...(committed?{worldBoundary:{version:1,authorityEpoch:source.status().authorityEpoch,
    nativeSession:native.bridge.nativeCausalClock().nativeSession,ticket:1,effectiveTime:10}}:{})});await flush();await f.host.idle();
   if(committed){assert.equal(f.gpu.submitted.length,before);assert.equal(f.host.inspect().failed,true);}
   else {assert.equal(f.gpu.submitted.length,before+1);assert.equal(f.host.inspect().failed,false);}
  }finally{source?.dispose();f.host.dispose();native.session.dispose();}
 }
});

test('native permission is checked after resource preparation, preventing late resurrection',async()=>{
  const [authorityPort,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
  const handle=nativeHandle(0);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,handle,10));
  await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:1}});
  let release;
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{release=resolve;});
  const pipeline=f.client.device.createRenderPipeline({label:'late-route'});
  f.client.beginFrame({clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}});
  const encoder=f.client.device.createCommandEncoder();
  const pass=encoder.beginRenderPass({colorAttachments:[]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt=f.client.endFrame(),rejected=assert.rejects(receipt,/obsolete or unauthorized/);
  await flush();
  authorityPort.postMessage(nativeControlEvent('RouteInvalidated',2,7,handle,11));
  await flush();
  assert.equal(f.host.intentControlStatus().sequence,2);
  release({});await flush();await f.host.idle();await rejected;
  assert.equal(f.host.inspect().activeSequence,null);
  assert.equal(f.gpu.submitted.length,0);
});

test('an obsolete route packet retains the healthy device and last frame until a prepared replacement arrives',async()=>{
 const [authorityPort,drawControlPort]=pair(),f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}}),old=nativeHandle(0),next=nativeHandle(1),clock=at=>({version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]});
 try{
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,old,10));await flush();f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:7,routeHandle:old,assignmentSequence:1}});
  const first=f.frame(0,{clock:clock(10)});await flush();await f.host.idle();f.host.present();await first;const buffers=f.gpu.buffers.length,active=f.host.inspect().activeSequence;
  authorityPort.postMessage(nativeControlEvent('RouteInvalidated',2,7,old,11));await flush();const late=f.frame(0,{clock:clock(11)}),rejected=assert.rejects(late,error=>error.code==='remote-frame-native-route-obsolete'&&error.resourcePreparationsRetained===true);await flush();await f.host.idle();await rejected;
  assert.equal(f.host.inspect().failed,false);assert.equal(f.host.inspect().activeSequence,active);assert.equal(f.client.requiredNativeWorldBoundary(),null);assert.equal(f.gpu.buffers.length,buffers);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',3,7,next,11));await flush();f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:7,routeHandle:next,assignmentSequence:3}});
  const fresh=f.frame(0,{clock:clock(11)});await flush();await f.host.idle();f.host.present();await fresh;assert.equal(f.host.inspect().failed,false);assert.notEqual(f.host.inspect().activeSequence,active);assert.equal(f.gpu.buffers.length,buffers);
 }finally{f.client.dispose();f.host.dispose();}
});

test('direct native GPU fence waits for submitted GPU work while bypassing a blocked resource FIFO',async()=>{
 const [authorityPort,drawControlPort]=pair(),messages=[];authorityPort.onmessage=({data})=>messages.push(data);
 const f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
 const handle=nativeHandle(0);authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,handle,10));await flush();
 f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:1}});
 const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,
  paused:false,segments:[{start:10,end:20,realDuration:10,rate:1}]}});
 await flush();await f.host.idle();f.host.present();await receipt;
 let releaseGpu,releasePipeline;f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseGpu=resolve;});
 f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{releasePipeline=resolve;});
 await f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'fence-blocked',descriptor:{}});
 f.client.device.queue.submit([{__remoteCommands:[{method:'beginRenderPass',args:[{colorAttachments:[]}],
  commands:[{method:'setPipeline',args:[{__remoteGpuId:'fence-blocked'}]}]}]}]);await flush();
 authorityPort.postMessage(nativeControlEvent('RouteInvalidated',2,7,handle,10.25));
 authorityPort.postMessage({type:'IntentControlFence',protocolVersion:2,fenceVersion:1,authorityEpoch:'native-owner',
  sequence:2,effectiveTime:10.25,fenceId:1});await flush();
 assert.equal(f.host.intentControlStatus().sequence,2);assert.equal(typeof releaseGpu,'function');
 assert(!messages.some(message=>message.type==='intent-control-fenced'),'control ACK alone does not drain GPU');
 assert(f.host.inspect().queuedMessages>0);f.host.present();
 releaseGpu();await flush();const ack=messages.find(message=>message.type==='intent-control-fenced');
 assert.equal(ack?.sequence,2);assert.equal(ack?.effectiveTime,10.25);assert.equal(ack?.fenceId,1);
 assert(f.host.inspect().queuedMessages>0,'GPU receipt must not wait for preparation');
 releasePipeline({});await flush();await f.host.idle();assert.deepEqual(f.errors,[]);f.host.dispose();
});

test('a native GPU fence cannot name an unreceived sequence or outlive its retired draw connection',async()=>{
 const [authorityPort,drawControlPort]=pair(),messages=[];authorityPort.onmessage=({data})=>messages.push(data);
 const f=await fixture({}, {intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
 authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,nativeHandle(0),10));await flush();
 let release;f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{release=resolve;});
 authorityPort.postMessage({type:'IntentControlFence',protocolVersion:2,fenceVersion:1,authorityEpoch:'native-owner',sequence:1,effectiveTime:10,fenceId:1});
 await flush();f.host.dispose();release();await flush();
 assert(!messages.some(message=>message.type==='intent-control-fenced'));
 const [badPort,drawPort]=pair(),g=await fixture({}, {intentControl:{port:drawPort,authorityEpoch:'native-owner'}});
 badPort.postMessage(nativeControlEvent('RouteAssigned',1,7,nativeHandle(0),10));await flush();
 badPort.postMessage({type:'IntentControlFence',protocolVersion:2,fenceVersion:1,authorityEpoch:'native-owner',sequence:2,effectiveTime:10,fenceId:1});
 await flush();assert.equal(g.host.inspect().failed,true);g.host.dispose();
});

test('GPU drain failure closes drawing without issuing a successful native fence receipt',async()=>{
 const [authorityPort,drawControlPort]=pair(),messages=[];authorityPort.onmessage=({data})=>messages.push(data);
 const f=await fixture({}, {intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
 authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,nativeHandle(0),10));await flush();
 f.gpu.device.queue.onSubmittedWorkDone=()=>Promise.reject(Error('GPU drain failed'));
 authorityPort.postMessage({type:'IntentControlFence',protocolVersion:2,fenceVersion:1,authorityEpoch:'native-owner',sequence:1,effectiveTime:10,fenceId:1});
 await flush();assert.equal(f.host.inspect().failed,true);
 assert(!messages.some(message=>message.type==='intent-control-fenced'));f.host.dispose();
});

test('publication and draw host exchange an exact GPU fence through their live control endpoints',async()=>{
 const [authorityPort,drawControlPort]=pair(),f=await fixture({}, {intentControl:{port:drawControlPort,session:'fence-session'}});
 const publication=createNativeIntentControlPublication({port:authorityPort,session:'fence-session',
  observe:callbacks=>{callbacks.onBaseline({type:'IntentBaseline',protocolVersion:2,
   authorityEpoch:'native-owner',sequence:9,effectiveTime:10,routes:[]});return ()=>{};}});
 try{
  await publication.ready;assert.deepEqual(await publication.fenceGpu(),{
   authorityEpoch:'native-owner',sequence:9,effectiveTime:10,fenceId:1});
  assert.equal(publication.status().pendingGpuFences,0);assert.deepEqual(f.errors,[]);
 }finally{publication.dispose();await flush();f.host.dispose();}
});

test('queued route clock bindings capture the native identity before caller mutation',async()=>{
  const [authorityPort,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
  const handle=nativeHandle(0);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,handle,10));
  await flush();
  const binding={byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:1}};
  f.client.registerClockBinding(f.buffer,binding);
  binding.nativeRoute.routeHandle.generation=99;
  binding.nativeRoute.assignmentSequence=99;
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}});
  await flush();await f.host.idle();f.host.present();await receipt;
  assert.deepEqual(f.errors,[]);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],10);
});

test('a prepared native frame waits for its direct bootstrap rather than using an unscoped permission',async()=>{
  const [authorityPort,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,
    intentControl:{port:drawControlPort,session:'session-a'}});
  const handle=nativeHandle(0);
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:3}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}});
  await flush();f.host.present();
  assert.equal(f.gpu.submitted.length,0);
  authorityPort.postMessage({type:'IntentBaseline',protocolVersion:2,session:'session-a',
    authorityEpoch:'native-owner',sequence:9,effectiveTime:10,
    routes:[{actorId:7,routeHandle:handle,assignmentSequence:3,startTime:8}]});
  await flush();await f.host.idle();f.host.present();await receipt;
  assert.equal(f.host.intentControlStatus().sequence,9);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],10);
  assert.deepEqual(f.errors,[]);
});

test('retiring a control connection freezes its admitted clocks without reviving old packets',async()=>{
  const [authorityPort,drawControlPort]=pair();let now=0;
  const f=await fixture({}, {absoluteNow:()=>now,
    intentControl:{port:drawControlPort,session:'session-a'}});
  const handle=nativeHandle(0);
  authorityPort.postMessage({type:'IntentBaseline',protocolVersion:2,session:'session-a',
    authorityEpoch:'native-owner',sequence:3,effectiveTime:10,
    routes:[{actorId:7,routeHandle:handle,assignmentSequence:3,startTime:10}]});
  await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:3}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,
    anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,realDuration:10,rate:1}]}});
  await flush();await f.host.idle();f.host.present();await receipt;
  now=100;f.host.present();
  const last=new Float32Array(f.gpu.buffers[0].data.buffer)[0];
  authorityPort.postMessage({type:'IntentControlClosed',protocolVersion:2,session:'session-a',
    authorityEpoch:'native-owner',sequence:3,reason:'replaced'});
  await flush();now=500;f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],last);
  assert.equal(f.host.intentControlStatus().closed,true);
  assert.deepEqual(f.errors,[]);
});

test('missing native control fails admission explicitly instead of holding a generation forever',async()=>{
  const [,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,
    intentControl:{port:drawControlPort,session:'session-a',timeoutMs:5}});
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:nativeHandle(0),assignmentSequence:3}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}}),rejected=assert.rejects(receipt,/sequence did not arrive/);
  await flush();await f.host.idle();await rejected;
  assert.equal(f.gpu.submitted.length,0);
  assert.equal(f.host.inspect().failed,true);
});

test('frame publication is bounded and writes are invisible until the atomic presentation boundary', async () => {
  const f = await fixture();
  const receipt = f.frame(7);
  assert.throws(() => f.client.beginFrame(), /backpressure/);
  await flush(); await f.host.idle();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 0);
  f.host.present(); const ack = await receipt;
  assert.equal(ack.sequence, 1);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 7);
  assert.equal(f.client.inspect().pendingFrame, null);
  f.client.beginFrame(); f.client.cancelFrame();
});

test('writeBuffer snapshots typed-array ranges without detaching or observing later mutations', async () => {
  const f = await fixture();
  const data = new Float32Array([1, 2, 3, 4]);
  f.client.device.queue.writeBuffer(f.buffer, 0, data, 1, 2);
  data.fill(99);
  await flush(); await f.host.idle();
  assert.deepEqual(Array.from(new Float32Array(f.gpu.buffers[0].data.buffer)), [2, 3, 0, 0]);
  assert.equal(data.buffer.byteLength, 16);
});

test('mappedAtCreation uploads through the native mapping without requiring COPY_DST', async () => {
  const f = await fixture();
  const mapped = f.client.device.createBuffer({ size: 8, usage: 32, mappedAtCreation: true });
  new Uint32Array(mapped.getMappedRange()).set([12, 34]);
  mapped.unmap();
  await flush(); await f.host.idle();
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [12, 34]);
  assert.equal(f.gpu.buffers[1].descriptor.usage, 36); // COPY_SRC reserved for native versioning.
});

test('destroy retains resources referenced by the active frame, then retires after replacement', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.buffer.destroy(); await flush(); await f.host.idle();
  assert.equal(f.gpu.buffers[0].destroyed, false);
  await f.host.handle({ type: 'frame', packet: { sequence: 2, metadata: {}, width: 20, height: 10, operations: [{ method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginRenderPass', args: [{}], commands: [{ method: 'draw', args: [3] }] }] }]] }] } });
  f.host.present(); await flush();
  assert.equal(f.gpu.buffers[0].destroyed, true);
});

test('clock patch advances only inside a confirmed lease and overrides producer writes', async () => {
  const f = await fixture();
  f.client.registerClockBinding(f.buffer, { byteOffset: 0, semantic: 'absolute', epoch: 0 });
  const clock = { version: 1, epoch: 0, elapsed: 2, anchorAbsoluteMs: 0, safeUntil: 3, paused: false, segments: [{ start: 2, end: 3, realDuration: 1, rate: 1 }] };
  const receipt = f.frame(500, { clock });
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 3);
  f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 3);
});

test('one-shot buffer copies do not replay and resource fences work before any frame', async () => {
  const f = await fixture();
  await f.client.device.queue.onSubmittedWorkDone();
  const encoder = f.client.device.createCommandEncoder();
  encoder.copyBufferToBuffer(f.buffer, 0, f.buffer, 4, 4);
  const commands = encoder.finish();
  f.client.beginFrame();
  f.client.device.queue.submit([commands]);
  const receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.host.present();
  assert.equal(f.gpu.calls.filter(call => call[0] === 'copy').length, 1);
  assert.throws(() => f.client.device.queue.submit([commands]), /already submitted/);
});

test('preparation cannot mutate published buffers until the next frame commits', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([9]));
  await flush(); await f.host.idle(); f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(f.host.inspect().stagedOperations, 0);
  assert.equal(f.host.inspect().uniformForks, 1);
  assert.equal(f.host.inspect().bindingForks, 1);
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 9);
  await f.client.device.queue.onSubmittedWorkDone();
  receipt = f.frame(10); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 10);
  assert.equal((await f.client.inspectAsync()).consumer.backend, 'webgpu');
  assert.equal(f.errors.length, 0);
});

test('a write after packet publication forks the pending generation instead of reordering writes', async () => {
  const f = await fixture();
  const receipt = f.frame(1);
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([2]));
  await flush(); await f.host.idle();
  assert.equal(f.gpu.buffers.length, 2);
  f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 2);
  f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
});

test('partial preparation writes fork the logical state of an already published pending frame', async () => {
  const f = await fixture();
  const receipt = f.frame(1);
  f.client.device.queue.writeBuffer(f.buffer, 4, new Float32Array([2]));
  await flush(); await f.host.idle();
  assert.deepEqual(Array.from(new Float32Array(f.gpu.buffers[1].data.buffer)), [1, 2, 0, 0]);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Float32Array(f.gpu.buffers[0].data.buffer)), [1, 0, 0, 0]);
});

test('endFrame metadata is the final clock/event boundary, not the metadata at beginFrame', async () => {
  const f = await fixture();
  f.client.beginFrame({ stale: true });
  const encoder = f.client.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt = f.client.endFrame({ confirmed: 123 });
  await flush(); await f.host.idle(); f.host.present();
  assert.deepEqual((await receipt).metadata, { confirmed: 123 });
});

test('multipass uniform writes retain queue order on independent replay', async () => {
  const f = await fixture();
  const valuesAtSubmission = [];
  const submit = f.gpu.device.queue.submit;
  f.gpu.device.queue.submit = commands => { valuesAtSubmission.push(new Float32Array(f.gpu.buffers[0].data.buffer)[0]); submit(commands); };
  f.client.beginFrame();
  for (const value of [20, 30]) {
    f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([value]));
    const encoder = f.client.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]);
  }
  const receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.host.present();
  assert.deepEqual(valuesAtSubmission, [20, 30, 20, 30]);
});

test('replay restores the baseline when a draw precedes the only uniform write', async () => {
  const f = await fixture();
  const valuesAtSubmission = [];
  const submit = f.gpu.device.queue.submit;
  f.gpu.device.queue.submit = commands => { valuesAtSubmission.push(new Float32Array(f.gpu.buffers[0].data.buffer)[0]); submit(commands); };
  const group = f.client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer: f.buffer } }] });
  f.client.beginFrame();
  for (const value of [null, 1]) {
    if (value !== null) f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([value]));
    const encoder = f.client.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({}); pass.setBindGroup(0, group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]);
  }
  const receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt; f.host.present();
  assert.deepEqual(valuesAtSubmission, [0, 1, 0, 1]);
});

test('a current-texture view created for a future frame survives unrelated retirement', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.beginFrame();
  const view = f.client.context.getCurrentTexture().createView();
  const transient = f.client.device.createBuffer({ size: 4, usage: 8 }); transient.destroy();
  const encoder = f.client.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store' }] }); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.errors.length, 0);
  assert.equal(f.host.inspect().activeSequence, 2);
});

test('canceling presentation preserves completed upload bookkeeping without publishing the canceled frame', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const group = f.client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer: f.buffer } }] });
  f.client.beginFrame();
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([9]));
  let encoder = f.client.device.createCommandEncoder();
  let pass = encoder.beginRenderPass({ colorAttachments: [{ view: f.client.context.getCurrentTexture().createView() }] });
  pass.setBindGroup(0, group); pass.draw(3); pass.end(); f.client.device.queue.submit([encoder.finish()]);
  f.client.cancelFrame();
  await flush(); await f.host.idle(); await f.client.device.queue.onSubmittedWorkDone();
  assert.equal(f.host.inspect().packets, 1);
  assert.equal(f.gpu.submitted.length, 1);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 9);
  f.client.beginFrame();
  encoder = f.client.device.createCommandEncoder(); pass = encoder.beginRenderPass({});
  pass.setBindGroup(0, group); pass.draw(3); pass.end(); f.client.device.queue.submit([encoder.finish()]);
  receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 9);
  assert.equal(f.host.inspect().activeSequence, 3);
});

test('one-shot compute cannot silently freeze while a remote animation clock advances', async () => {
  const f = await fixture();
  await assert.rejects(f.host.handle({ type: 'frame', packet: {
    sequence: 1, width: 20, height: 10,
    metadata: { clock: { version: 1, epoch: 0, elapsed: 0, anchorAbsoluteMs: 0, safeUntil: 1, paused: false, segments: [{ start: 0, end: 1, realDuration: 1, rate: 1 }] } },
    operations: [{ method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginComputePass', args: [{}], commands: [] }] }]] }],
  } }), /one-shot compute/);
  assert.equal(f.host.inspect().packets, 0);
});

test('finalizer release drops producer ownership without calling native destroy', async () => {
  let deliver;
  const registered = new Set();
  const f = await fixture({ finalizationRegistryFactory(callback) { deliver = callback; return { register(_target, id) { registered.add(id); } }; } });
  const transient = f.client.device.createBuffer({ size: 4, usage: 8 });
  await flush(); await f.host.idle();
  const count = f.host.inspect().resources;
  assert(registered.has(transient.__remoteGpuId));
  deliver(transient.__remoteGpuId);
  await flush(); await f.host.idle();
  assert.equal(f.host.inspect().resources, count - 1);
  assert.equal(f.gpu.buffers[1].destroyed, false);
});

test('recorded proxies remain retained through ACK and native frame pins outlive producer finalization', async () => {
  let deliver;
  const f = await fixture({ finalizationRegistryFactory(callback) { deliver = callback; return { register() {} }; } });
  assert(f.group.__remoteDependencies.has(f.buffer));
  const receipt = f.frame(1);
  deliver(f.buffer.__remoteGpuId); deliver(f.group.__remoteGpuId); deliver(f.pipeline.__remoteGpuId);
  await flush(); await f.host.idle();
  assert.equal(f.host.inspect().producerReleases, 0);
  assert(f.client.inspect().retainedResources >= 3);
  f.host.present(); await receipt; await flush(); await f.host.idle();
  assert.equal(f.host.inspect().producerReleases, 3);
  assert.equal(f.gpu.buffers[0].destroyed, false);
  f.host.present();
  assert.equal(f.errors.length, 0);
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const replacement = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await replacement;
  assert.equal(f.host.inspect().resources, 1);
  assert.equal(f.gpu.buffers[0].destroyed, false);
});

test('a bind group retains released native buffer storage until its own release', async () => {
  const f = await fixture();
  await f.host.handle({ type: 'release', id: f.buffer.__remoteGpuId });
  const before = f.host.inspect().resources;
  const receipt = f.frame(3); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.gpu.buffers[0].destroyed, false);
  assert(f.host.inspect().resources >= before);
  assert.equal(f.errors.length, 0);
});

function preparedInterval(start, end) {
  return { preparedInterval: { start, end }, clock: { version: 1, epoch: 0, elapsed: start, safeUntil: end, anchorAbsoluteMs: 0, paused: false, consumerAnchored: true, segments: [{ start, end, realDuration: end - start, rate: 1 }] } };
}

test('a prepared successor cannot replace the currently executing interval early', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now });
  let receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle(); f.host.present();
  assert.equal((await receipt).metadata.clock.consumerAnchored, false);
  now = 1200;
  receipt = f.frame(1, preparedInterval(1, 2)); await flush(); await f.host.idle(); f.host.present();
  assert.equal(f.host.inspect().activeSequence, 1);
  assert.equal(f.host.inspect().pendingSequence, 2);
  assert.equal(f.client.inspect().pendingFrame, 2);
  assert.equal(f.host.inspect().frameTime.elapsed, .2);
  now = 2000; f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 2000);
  assert.equal(f.host.inspect().activeSequence, 2);
  assert.equal(f.host.inspect().frameTime.elapsed, 1);
  now = 2200; f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, 1.2);
});

test('late preparation holds the old safe endpoint then begins the new interval without rewind', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now });
  let receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle(); f.host.present(); await receipt;
  now = 2400; f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, 1);
  receipt = f.frame(1, preparedInterval(1, 2)); await flush(); await f.host.idle();
  now = 2450; f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 2400);
  assert.equal(f.host.inspect().frameTime.elapsed, 1.05);
  assert.equal(f.errors.length, 0);
});

test('visibility suspension preserves the active interval and shifts the queued successor without catch-up', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now });
  let receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle(); f.host.present(); await receipt;
  now = 1200; f.host.present(); f.host.setVisibility(true);
  now = 1600;
  receipt = f.frame(1, preparedInterval(1, 2)); await flush(); await f.host.idle();
  now = 4000; f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, .2);
  assert.equal(f.host.inspect().activeSequence, 1);
  f.host.setVisibility(false); f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, .2);
  assert.equal(f.host.inspect().pendingSequence, 2);
  assert.equal(f.host.inspect().hiddenMs, 2800);
  now = 4800; f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 4800);
  assert.equal(f.host.inspect().frameTime.elapsed, 1);
  assert.equal(f.errors.length, 0);
});

test('a first packet received while hidden starts at resume rather than skipping its interval', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now, hidden: true });
  const receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle();
  now = 4000; f.host.present();
  assert.equal(f.host.inspect().nativeFrames, 0);
  f.host.setVisibility(false); f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 4000);
  assert.equal(f.host.inspect().frameTime.elapsed, 0);
});

test('invalid resource references are rejected before any frame upload mutates the displayed generation', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await assert.rejects(f.host.handle({ type: 'frame', packet: {
    sequence: 2, width: 20, height: 10, metadata: {}, operations: [
      { method: 'writeBuffer', args: [{ __remoteGpuId: f.buffer.__remoteGpuId }, 0, new Float32Array([99])] },
      { method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginRenderPass', args: [{}], commands: [{ method: 'setBindGroup', args: [0, { __remoteGpuId: 'missing' }] }, { method: 'draw', args: [3] }] }] }]] },
    ],
  } }), /Unknown.*remote GPU resource/);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(f.host.inspect().activeSequence, 1);
  assert.equal(f.host.inspect().pendingSequence, null);
});

test('a valid but regressive clock cannot mutate resources or replace the displayed generation', async () => {
  const f = await fixture();
  const clock = { version: 1, epoch: 0, elapsed: 2, safeUntil: 2, anchorAbsoluteMs: 0, paused: true, segments: [] };
  const receipt = f.frame(1, { clock }); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await f.host.handle({ type: 'frame', packet: {
    sequence: 2, width: 99, height: 99, metadata: { clock: { ...clock, elapsed: 1, safeUntil: 1 } }, operations: [
      { method: 'writeBuffer', args: [{ __remoteGpuId: f.buffer.__remoteGpuId }, 0, new Float32Array([99])] },
      { method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginRenderPass', args: [{}], commands: [{ method: 'draw', args: [3] }] }] }]] },
    ],
  } });
  f.host.present(); await flush();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(f.host.inspect().activeSequence, 1);
  assert.equal(f.host.inspect().nativeFrames, 1);
  assert.match(f.errors[0]?.message, /rewind/);
});

test('retiring N unrelated resources performs N localized checks and no active graph traversals', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const count = 200;
  for (let i = 0; i < count; i++) await f.host.handle({ type: 'create', method: 'createBuffer', id: `unused:${i}`, descriptor: { size: 4, usage: 8 } });
  const before = f.host.inspect();
  for (let i = 0; i < count; i++) await f.host.handle({ type: 'destroy', id: `unused:${i}` });
  await flush();
  const after = f.host.inspect();
  assert.equal(after.dependencyVisits, before.dependencyVisits);
  assert.equal(after.retirementChecks - before.retirementChecks, count);
  assert.equal(before.resources - after.resources, count);
  assert.equal(f.gpu.buffers[0].destroyed, false);
});

test('explicit native destruction waits for staged preparation to reach a generation boundary', async () => {
  const f = await fixture();
  const storage = f.client.device.createBuffer({ size: 16, usage: 136 });
  const group = f.client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer: storage } }] });
  function render() {
    f.client.beginFrame();
    const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
    pass.setBindGroup(0, group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]); return f.client.endFrame();
  }
  let receipt = render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(storage, 0, new Uint32Array([3]));
  const transient = f.client.device.createBuffer({ size: 16, usage: 72 }); transient.destroy();
  await flush(); await f.host.idle(); await flush();
  assert.equal(f.host.inspect().stagedOperations, 1);
  assert.equal(f.gpu.buffers[2].destroyed, false);
  receipt = render(); await flush(); await f.host.idle(); f.host.present(); await receipt; await flush();
  assert.equal(f.gpu.buffers[2].destroyed, true);
});

test('an unrelated asynchronous pipeline cannot block publication of a newer frame using ready resources', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  let completePipeline;
  f.gpu.device.createRenderPipelineAsync = () => new Promise(resolve => { completePipeline = resolve; });
  const pipelinePromise = f.client.device.createRenderPipelineAsync({ label: 'new-material' });
  receipt = f.frame(2);
  await flush(); await f.host.idle();
  assert.equal(f.host.inspect().pendingResources, 1);
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 2);
  // Queue fences cover submitted queue work, not unrelated shader compilation.
  await f.client.device.queue.onSubmittedWorkDone();
  completePipeline({}); await pipelinePromise;
  assert.equal(f.host.inspect().pendingResources, 0);
});

test('pipeline-derived layouts and bind groups wait only on their branch and follow uniform forks', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  let completePipeline;
  f.gpu.device.createRenderPipelineAsync = () => new Promise(resolve => { completePipeline = resolve; });
  const pipeline = f.client.device.createRenderPipeline({ label: 'new-material' });
  const layout = pipeline.getBindGroupLayout(0);
  const group = f.client.device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: f.buffer } }] });
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([9]));
  receipt = f.frame(2); await flush(); await f.host.idle();
  assert.equal(f.host.inspect().pendingResources, 3);
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2);
  completePipeline({ getBindGroupLayout: () => ({ nativeLayout: true }) });
  for (let i = 0; i < 20 && f.host.inspect().pendingResources; i++) { await new Promise(resolve => setTimeout(resolve, 0)); await flush(); }
  assert.equal(f.host.inspect().pendingResources, 0);
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
  pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.errors.length, 0);
  assert.equal(f.host.inspect().activeSequence, 3);
});

test('explicit proxy device destruction reaches the native device and resolves lost before cleanup', async () => {
  const f = await fixture();
  const receipt = f.frame(1), rejected = assert.rejects(receipt, /device lost/);
  f.client.device.destroy();
  const lost = await f.client.device.lost;
  await rejected; await flush();
  assert.equal(lost.reason, 'destroyed');
  assert(f.gpu.calls.some(call => call[0] === 'deviceDestroy'));
  assert.equal(f.client.inspect().pendingFrame, null);
  assert.equal(f.errors.length, 0);
});

test('clock offsets override stale multipass uniforms and baseline restoration before every submission', async () => {
  const f = await fixture();
  f.client.registerClockBinding(f.buffer, { byteOffset: 4, semantic: 'absolute', epoch: 0 });
  const values = [], submit = f.gpu.device.queue.submit;
  f.gpu.device.queue.submit = commands => { values.push(new Float32Array(f.gpu.buffers[0].data.buffer)[1]); submit(commands); };
  f.client.beginFrame({ clock: { version: 1, epoch: 0, elapsed: 5, safeUntil: 5, anchorAbsoluteMs: 0, paused: true, segments: [] } });
  for (const write of [false, true]) {
    if (write) f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([11, 99, 12, 13]));
    const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
    pass.setBindGroup(0, f.group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]);
  }
  const receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt; f.host.present();
  assert.deepEqual(values, [5, 5, 5, 5]);
});

test('frame and fence diagnostics distinguish posting, admission, first draw, ACK and local refusal', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await f.client.device.queue.onSubmittedWorkDone();
  const timing = f.client.inspect().frameTimings.at(-1);
  assert(timing.endFrameCalledAt <= timing.endFrameReturnedAt);
  assert(timing.postedAt <= timing.postCompletedAt);
  assert(timing.consumer.workerReceivedAt <= timing.consumer.admissionStartedAt);
  assert(timing.consumer.admittedAt <= timing.consumer.firstDrawStartedAt);
  assert(timing.consumer.firstDrawCompletedAt <= timing.ackReceivedAt);
  assert(f.client.inspect().fenceTimings.at(-1).consumer.finishedAt);
  f.client.beginFrame(); f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([2]));
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(f.client.inspect().fenceTimings.at(-1).localRejected, true);
  f.client.cancelFrame(); await flush(); await f.host.idle();
});

test('pending native fence promises preserve their queue prefixes without blocking later resources or frames', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const held = [], completionOrder = [];
  f.gpu.device.queue.onSubmittedWorkDone = () => new Promise(resolve => held.push({ resolve, prefix: f.gpu.calls.length }));
  const firstFence = f.client.device.queue.onSubmittedWorkDone().then(() => completionOrder.push(1));
  f.client.device.createBuffer({ size: 4, usage: 8 });
  receipt = f.frame(2); await flush(); await f.host.idle();
  assert.equal(held.length, 1);
  assert.equal(f.gpu.buffers.length, 2);
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2);
  const secondFence = f.client.device.queue.onSubmittedWorkDone().then(() => completionOrder.push(2));
  await flush(); await f.host.idle();
  assert.equal(held.length, 2);
  assert(held[0].prefix < held[1].prefix);
  assert.deepEqual(completionOrder, []);
  held[0].resolve(); await firstFence;
  assert.deepEqual(completionOrder, [1]);
  held[1].resolve(); await secondFence;
  assert.deepEqual(completionOrder, [1, 2]);
  assert.equal(f.errors.length, 0);
});

test('device loss rejects a pending fence without waiting for its native promise to finish', async () => {
  const f = await fixture();
  f.gpu.device.queue.onSubmittedWorkDone = () => new Promise(() => {});
  const fence = f.client.device.queue.onSubmittedWorkDone();
  const rejected = assert.rejects(fence, /device lost/);
  await flush(); await f.host.idle();
  f.client.device.destroy();
  assert.equal((await f.client.device.lost).reason, 'destroyed');
  await rejected;
  assert.equal(f.errors.length, 0);
});

test('pending mapping, shader diagnostics and error scopes do not block ready frames', async () => {
  const f = await fixture();
  const readback = f.client.device.createBuffer({ size: 16, usage: 9 });
  await flush(); await f.host.idle();
  let finishMap, finishInfo, finishScope;
  f.gpu.buffers[1].mapAsync = () => new Promise(resolve => { finishMap = resolve; });
  f.gpu.device.createShaderModule = () => ({ getCompilationInfo: () => new Promise(resolve => { finishInfo = resolve; }) });
  f.gpu.device.popErrorScope = () => new Promise(resolve => { finishScope = resolve; });
  const mapping = readback.mapAsync(1), info = f.client.device.createShaderModule({ code: '' }).getCompilationInfo();
  const scope = f.client.device.popErrorScope();
  const receipt = f.frame(4); await flush(); await f.host.idle();
  assert.equal(readback.mapState, 'pending');
  assert.equal(typeof finishMap, 'function'); assert.equal(typeof finishInfo, 'function'); assert.equal(typeof finishScope, 'function');
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 1);
  finishScope(null); assert.equal(await scope, null);
  finishInfo({ messages: [{ message: 'warning', type: 'warning', lineNum: 1 }] });
  assert.equal((await info).messages[0].message, 'warning');
  finishMap(); await mapping;
  assert.equal(readback.mapState, 'mapped'); assert.equal(readback.getMappedRange().byteLength, 16);
  readback.unmap(); await flush(); await f.host.idle();
  assert.equal(f.errors.length, 0);
});

test('pending mapping cancellation preserves newer mappings and explicit destruction', async () => {
  const f = await fixture();
  const buffer = f.client.device.createBuffer({ size: 16, usage: 9 });
  await flush(); await f.host.idle();
  const held = [];
  f.gpu.buffers[1].mapAsync = () => new Promise((resolve, reject) => held.push({ resolve, reject }));
  const first = buffer.mapAsync(1), firstRejected = assert.rejects(first, /canceled/);
  await flush(); await f.host.idle(); buffer.unmap();
  const second = buffer.mapAsync(1);
  await firstRejected; await flush(); await f.host.idle();
  held[0].resolve(); await flush();
  assert.equal(buffer.mapState, 'pending');
  held[1].resolve(); await second; assert.equal(buffer.mapState, 'mapped');
  buffer.unmap(); await flush(); await f.host.idle();
  const third = buffer.mapAsync(1), thirdRejected = assert.rejects(third, /destroy/);
  await flush(); await f.host.idle(); buffer.destroy();
  await thirdRejected; await flush(); await f.host.idle();
  held[2].resolve(); await flush();
  assert.equal(buffer.mapState, 'unmapped'); assert.equal(f.gpu.buffers[1].destroyed, true);
  assert.equal(f.errors.length, 0);
});

test('native mapping rejection and device loss restore proxy mapState', async () => {
  const f = await fixture();
  const buffer = f.client.device.createBuffer({ size: 16, usage: 9 });
  await flush(); await f.host.idle();
  f.gpu.buffers[1].mapAsync = () => Promise.reject(Error('Invalid map range'));
  await assert.rejects(buffer.mapAsync(1), /Invalid map range/);
  assert.equal(buffer.mapState, 'unmapped'); assert.equal(f.errors.length, 0);
  f.gpu.buffers[1].mapAsync = () => new Promise(() => {});
  const mapped = buffer.mapAsync(1), rejected = assert.rejects(mapped, /device lost/);
  await flush(); await f.host.idle(); f.client.device.destroy();
  await rejected; assert.equal(buffer.mapState, 'unmapped');
});

async function storageFixture(access = 'read-only-storage', usage = 168) {
  const f = await fixture();
  const storage = f.client.device.createBuffer({ size: 16, usage });
  const layout = access === null ? undefined : f.client.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: 1, buffer: { type: access } }] });
  const group = f.client.device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: storage } }] });
  f.client.device.queue.writeBuffer(storage, 0, new Uint32Array([1, 2, 3, 4]));
  await flush(); await f.host.idle();
  function render({ write, copy } = {}) {
    f.client.beginFrame();
    if (write) f.client.device.queue.writeBuffer(storage, 0, new Uint32Array(write));
    const encoder = f.client.device.createCommandEncoder();
    if (copy) encoder.copyBufferToBuffer(copy, 0, storage, 0, 16);
    const pass = encoder.beginRenderPass({}); pass.setBindGroup(0, group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]); return f.client.endFrame();
  }
  return { ...f, storage, render };
}

test('readonly storage forks by native copy, retains GPU contents and preserves the published generation', async () => {
  const f = await storageFixture();
  let receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const old = f.gpu.buffers[1];
  // Emulate a completed native write before the snapshot; no CPU shadow exists.
  new Uint32Array(old.data.buffer)[1] = 70;
  f.client.device.queue.writeBuffer(f.storage, 8, new Uint32Array([90]));
  await f.client.device.queue.onSubmittedWorkDone();
  const fork = f.gpu.buffers[2];
  assert.deepEqual(Array.from(new Uint32Array(old.data.buffer)), [1, 70, 3, 4]);
  assert.deepEqual(Array.from(new Uint32Array(fork.data.buffer)), [1, 70, 90, 4]);
  assert.equal(f.host.inspect().bufferForks, 1); assert.equal(f.host.inspect().stagedOperations, 0);
  assert.deepEqual(f.host.inspect().bufferForkLastResource,{reference:f.storage.__remoteGpuId,label:'',size:16,usage:old.descriptor.usage|8});
  f.host.present(); assert.equal(old.destroyed, false);
  receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2); assert.equal(f.errors.length, 0);
});

test('native storage fork overlays pending CPU writes without publishing them early', async () => {
  const f = await storageFixture();
  const receipt = f.render({ write: [10, 20] }); await flush(); await f.host.idle();
  f.client.device.queue.writeBuffer(f.storage, 8, new Uint32Array([30]));
  await f.client.device.queue.onSubmittedWorkDone();
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[2].data.buffer)), [10, 20, 30, 4]);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [10, 20, 3, 4]);
});

test('writable or unclassified storage and pending GPU outputs cannot bypass the fence invariant', async () => {
  for (const access of ['storage', null]) {
    const f = await storageFixture(access);
    const receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
    f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
    await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
    assert.equal(f.host.inspect().bufferForks || 0, 0);
    assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0], 1);
  }
  const f = await storageFixture();
  const source = f.client.device.createBuffer({ size: 16, usage: 12 });
  f.client.device.queue.writeBuffer(source, 0, new Uint32Array([5, 6, 7, 8]));
  const receipt = f.render({ copy: source }); await flush(); await f.host.idle();
  f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(f.host.inspect().bufferForks || 0, 0);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [5, 6, 7, 8]);
});

test('published vertex and index buffers use generation copies without CPU shadows', async () => {
  const f = await fixture();
  const vertex = f.client.device.createBuffer({ size: 16, usage: 40 });
  const index = f.client.device.createBuffer({ size: 16, usage: 24 });
  for (const buffer of [vertex, index]) f.client.device.queue.writeBuffer(buffer, 0, new Uint32Array([1, 2, 3, 4]));
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
  pass.setVertexBuffer(0, vertex); pass.setIndexBuffer(index, 'uint32'); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(vertex, 0, new Uint32Array([10]));
  f.client.device.queue.writeBuffer(index, 0, new Uint32Array([20]));
  await f.client.device.queue.onSubmittedWorkDone();
  assert.equal(f.host.inspect().bufferForks, 2);
  assert.deepEqual(f.gpu.buffers.slice(1).map(buffer => new Uint32Array(buffer.data.buffer)[0]), [1, 1, 10, 20]);
});

test('canvas reconfiguration cannot invalidate pending or active frames and unconfigure stops replay', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle();
  let reconfigured = 0;
  f.gpu.context.configure = () => { reconfigured++; };
  const configure = { type: 'configure', descriptor: { format: 'bgra8unorm' } };
  await assert.rejects(f.host.handle(configure), /configuration is fixed/);
  f.host.present(); await receipt;
  await assert.rejects(f.host.handle(configure), /configuration is fixed/);
  assert.equal(reconfigured, 0);
  const count = f.gpu.submitted.length;
  await f.host.handle({ type: 'unconfigure' }); f.host.present();
  assert.equal(f.gpu.submitted.length, count);
});

test('pending query resolution protects its actual destination buffer from premature generation copies', async () => {
  const f = await storageFixture('read-only-storage', 168 | 512);
  const queries = f.client.device.createQuerySet({ type: 'occlusion', count: 2 });
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder();
  encoder.resolveQuerySet(queries, 0, 2, f.storage, 0);
  const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt = f.client.endFrame(); await flush(); await f.host.idle();
  f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(f.host.inspect().bufferForks || 0, 0);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [77, 77, 77, 77]);
});

test('ordered resource admission acknowledges captured writes before GPU completion without weakening real fences', async () => {
  const f = await fixture();
  let nativeFenceCalls = 0, releaseGpu, completed = false;
  f.gpu.device.queue.onSubmittedWorkDone = () => { nativeFenceCalls++; return new Promise(resolve => { releaseGpu = resolve; }); };
  const resource = f.client.device.createBuffer({ size: 16, usage: 8 });
  const bytes = new Uint32Array([12, 34, 56, 78]);
  f.client.device.queue.writeBuffer(resource, 0, bytes); bytes.fill(99);
  const ordered = await f.client.device.queue.onResourceSubmissionOrdered();
  assert.deepEqual(ordered, { kind: 'remote-ordered-submission', submitted: true });
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [12, 34, 56, 78]);
  assert.equal(nativeFenceCalls, 0);
  const completion = f.client.device.queue.onSubmittedWorkDone().then(() => { completed = true; });
  await flush(); await f.host.idle();
  assert.equal(nativeFenceCalls, 1); assert.equal(completed, false);
  const receipt = f.frame(2); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await f.client.device.queue.onResourceSubmissionOrdered();
  assert.equal(completed, false);
  releaseGpu(); await completion; assert.equal(completed, true);
});

test('ordered admission rejects uncommitted local frames and unsafe published mutations', async () => {
  const f = await storageFixture('storage');
  f.client.beginFrame(); f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
  await assert.rejects(f.client.device.queue.onResourceSubmissionOrdered(), /uncommitted remote frame/);
  f.client.cancelFrame(); await flush(); await f.host.idle();
  const receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([10]));
  await assert.rejects(f.client.device.queue.onResourceSubmissionOrdered(), /uncommitted published/);
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0], 9);
});

test('ordered admission cannot hide a preceding resource upload error', async () => {
  const f = await fixture();
  f.gpu.device.queue.writeBuffer = () => { throw Error('Native upload rejected'); };
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([1]));
  await assert.rejects(f.client.device.queue.onResourceSubmissionOrdered(), /Native upload rejected/);
  assert.equal(f.host.inspect().failed, true);
});

test('ordered admission waits for captured external image payloads, never their GPU completion', async t => {
  const originalCanvas = globalThis.OffscreenCanvas, originalBitmap = globalThis.createImageBitmap;
  t.after(() => { globalThis.OffscreenCanvas = originalCanvas; globalThis.createImageBitmap = originalBitmap; });
  globalThis.OffscreenCanvas = class {};
  let finishCapture, acknowledged = false, closed = 0, uploads = 0, fences = 0;
  class CapturedBitmap { constructor() { this.marker = 'captured'; } close() { closed++; } }
  globalThis.createImageBitmap = () => new Promise(resolve => { finishCapture = () => resolve(new CapturedBitmap()); });
  const f = await fixture();
  f.gpu.device.createTexture = descriptor => ({ descriptor });
  f.gpu.device.queue.copyExternalImageToTexture = source => { assert.equal(source.source.marker, 'captured'); uploads++; };
  f.gpu.device.queue.onSubmittedWorkDone = () => { fences++; return new Promise(() => {}); };
  const texture = f.client.device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: 2 });
  f.client.device.queue.copyExternalImageToTexture({ source: new globalThis.OffscreenCanvas() }, { texture }, [1, 1]);
  const ready = f.client.device.queue.onResourceSubmissionOrdered().then(() => { acknowledged = true; });
  await flush(); await f.host.idle();
  assert.equal(acknowledged, false); assert.equal(uploads, 0);
  finishCapture(); await ready;
  assert.equal(uploads, 1); assert.equal(closed, 1); assert.equal(fences, 0);
});


test('acknowledged remote disposal waits for the real native queue drain before retiring its control connection',async()=>{
 const f=await nativePreparationFixture();let releaseDrain,finished=false;
 try{
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;});
  const closing=f.client.disposeAsync();assert.equal(f.client.disposeAsync(),closing);closing.then(()=>{finished=true;});const deadline=performance.now()+5000;while(!releaseDrain&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,0));assert.equal(typeof releaseDrain,'function');
  assert.equal(finished,false);assert.equal(f.source.status().drained,false);const submissions=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,submissions);
  releaseDrain();assert.deepEqual(await closing,{disposed:true});await flush();assert.equal(finished,true);assert.equal(f.source.status().drained,true);assert.equal(f.host.inspect().resources,0);assert.deepEqual(f.errors,[]);
 }finally{releaseDrain?.();f.close();}
});

test('failed disposal RPC rejects without fabricating a successful close acknowledgement',async()=>{
 let terminated=0;const f=await fixture({terminate:()=>{terminated++;}});
 try{f.gpu.device.queue.onSubmittedWorkDone=()=>Promise.reject(Error('queue drain failed'));await assert.rejects(f.client.disposeAsync(),/queue drain failed/);assert.equal(terminated,0);assert.deepEqual(f.errors,[]);}finally{f.client.dispose();f.host.dispose();}
 assert.equal(terminated,1);
});


test('a close RPC joins an already stopped host and survives expected device loss until its receipt',async()=>{
 const f=await fixture();let releaseDrain,drains=0,settled=false;
 try{f.gpu.device.queue.onSubmittedWorkDone=()=>{drains++;return new Promise(resolve=>{releaseDrain=resolve;});};const stopped=f.host.dispose(),closing=f.client.disposeAsync();closing.then(()=>{settled=true;});await flush();assert.equal(drains,1);assert.equal(settled,false);f.gpu.device.destroy();await flush();assert.equal(settled,false);releaseDrain();await stopped;assert.deepEqual(await closing,{disposed:true});assert.equal(drains,1);assert.deepEqual(f.errors,[]);}finally{releaseDrain?.();f.client.dispose();f.host.dispose();}
});

// The production native authority, client and Host are used here; GPU and
// transport are deterministic doubles. These are upload/lifetime checks,
// not acceptance of retained world recovery or hardware cadence.
function unpublishedFenceUploadDraw(f,buffer,metadata){
 f.client.beginFrame(metadata);f.client.device.queue.writeBuffer(buffer,0,new Uint32Array([123]));f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([2]));
 const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame();
}
function unpublishedFenceVertexDraw(f,vertex,metadata,upload=null,extra=null){
 f.client.beginFrame(metadata);
 f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([1]));
 if(extra)f.client.device.queue.writeBuffer(extra,0,new Uint32Array([29]));
 if(upload!==null)f.client.device.queue.writeBuffer(vertex,0,new Uint32Array([upload]));
 const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.setVertexBuffer(0,vertex);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.endFrame();
}

test('retained unpublished non-uniform upload reaches the existing queue fence without changing the displayed generation',async()=>{
 const f=await nativePreparationFixture();let release,original;
 try{
  const first=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  const displayed=f.gpu.buffers[0],buffer=f.client.device.createBuffer({size:16,usage:9});await flush();await f.host.idle();const nativeBuffer=f.gpu.buffers[1],committed=await f.commit();
  const rejected=unpublishedFenceUploadDraw(f,buffer,{clock:f.clock});
  await assert.rejects(rejected,e=>e.resourcePreparationsRetained===true);assert.equal(new Uint32Array(nativeBuffer.data.buffer)[0],0);
  original=f.gpu.device.queue.onSubmittedWorkDone;let completed=false,calls=0;f.gpu.device.queue.onSubmittedWorkDone=()=>{calls++;return new Promise(resolve=>{release=resolve;});};
  const fence=f.client.device.queue.onSubmittedWorkDone().then(()=>{completed=true;});fence.catch(()=>{});await flush();await f.host.idle();await flush();
  assert.equal(calls,1);assert.equal(completed,false);assert.equal(new Uint32Array(nativeBuffer.data.buffer)[0],123);assert.equal(new Float32Array(displayed.data.buffer)[0],1);assert.equal(f.host.inspect().bufferForks??0,0);
  release();await fence;assert.equal(f.host.inspect().retainedNonUniformBufferUploads,1);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.equal(f.host.inspect().stagedOperations,0);
  f.gpu.device.queue.onSubmittedWorkDone=original;original=null;
  const next=f.frame(3,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await next;
  assert.equal(new Uint32Array(nativeBuffer.data.buffer)[0],123);assert.deepEqual(f.errors,[]);
 }finally{if(original)f.gpu.device.queue.onSubmittedWorkDone=original;release?.();f.close();}
});

test('destroyed unpublished retained buffer completes its queued upload before actual deferred destruction',async()=>{
 const f=await nativePreparationFixture();try{
  await f.commit();const buffer=f.client.device.createBuffer({size:16,usage:9});await flush();await f.host.idle();const nativeBuffer=f.gpu.buffers[1],destroy=nativeBuffer.destroy;let destroyedBytes=null;
  nativeBuffer.destroy=()=>{destroyedBytes=new Uint32Array(nativeBuffer.data.buffer)[0];destroy.call(nativeBuffer);};
  await assert.rejects(unpublishedFenceUploadDraw(f,buffer,{clock:f.clock}),e=>e.resourcePreparationsRetained===true);buffer.destroy();await flush();await f.host.idle();assert.equal(nativeBuffer.destroyed,false);
  await f.client.device.queue.onSubmittedWorkDone();await flush();assert.equal(destroyedBytes,123);assert.equal(nativeBuffer.destroyed,true);assert.equal(f.host.inspect().retainedNonUniformBufferUploads,1);assert.equal(f.host.inspect().retainedPreparationResources,0);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a retained published vertex buffer remains protected from admission fence uploads',async()=>{
 const f=await nativePreparationFixture();try{
  const vertex=f.client.device.createBuffer({size:16,usage:44});f.client.device.queue.writeBuffer(vertex,0,new Uint32Array([3]));const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  const nativeVertex=f.gpu.buffers[1];await f.commit();await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},99),e=>e.resourcePreparationsRetained===true);
  const buffers=f.gpu.buffers.length;await assert.rejects(f.client.device.queue.onSubmittedWorkDone(),/uncommitted changes/);
  assert.equal(new Uint32Array(nativeVertex.data.buffer)[0],3);assert.equal(f.gpu.buffers.length,buffers);assert.equal(f.host.inspect().failed,false);assert(f.host.inspect().stagedOperations>0);
 }finally{f.close();}
});

test('a remote prepared replacement can own retained vertex uploads that the global fence rejects',async()=>{
 const f=await nativePreparationFixture();let prepared;
 try{
  const device=f.client.device,vertex=device.createBuffer({size:16,usage:44});
  device.queue.writeBuffer(vertex,0,new Uint32Array([3]));
  const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  const displayed=f.gpu.buffers[1],previous=await f.commit();
  assert.equal(previous.status,'committed');
  await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},99),error=>error.resourcePreparationsRetained===true);
  await assert.rejects(device.queue.onSubmittedWorkDone(),/uncommitted changes/);
  const result=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,
   mutation:{type:'addChunk',cx:5,cz:4},async prepareResources({proposedWorldBoundary,signal}){
    const metadata={clock:f.clock,nativeWorldBoundary:proposedWorldBoundary};
    f.client.beginFrame(metadata);
    const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[
     {view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.setVertexBuffer(0,vertex);pass.draw(3);pass.end();
    device.queue.submit([encoder.finish()]);
    prepared=await f.client.prepareNativeWorldFrame(metadata,{signal});
    assert.equal(new Uint32Array(displayed.data.buffer)[0],3);
    const fork=f.gpu.buffers.find(buffer=>new Uint32Array(buffer.data.buffer)[0]===99);
    assert(fork&&fork!==displayed);
    assert.equal(f.host.inspect().activeSequence,1);
    return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,abort:prepared.abort,
     commit:data=>prepared.commit(data.worldBoundary)};
   }});
  assert.equal(result.status,'committed',result.error);await flush();f.host.present();await prepared.presented;
  assert.equal(new Uint32Array(displayed.data.buffer)[0],3);
  assert.equal(f.host.inspect().stagedOperations,0);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const closeWithoutFrame of [false,true])test('retirement fences preserve the retained vertex generation through '+(closeWithoutFrame?'consumer shutdown':'replacement'),async()=>{
 const f=await nativePreparationFixture(),queue=f.client.device.queue;
 const completions=[],errors=[];
 const physicalFence=f.gpu.device.queue.onSubmittedWorkDone;
 const renderer={backend:{isWebGPUBackend:true,device:f.client.device},compileAsync:async()=>{}};
 const admission=createWebGpuPipelineAdmission({renderer,scene:new Scene(),camera:new PerspectiveCamera(),onFatal:error=>errors.push(error)});
 async function waitForFence(){
  const deadline=performance.now()+2000;
  while(!completions.length&&!errors.length&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));
  assert.ifError(errors[0]);assert(completions.length,'expected an actual GPU completion fence');
 }
 try{
  const vertex=f.client.device.createBuffer({size:16,usage:44});
  queue.writeBuffer(vertex,0,new Uint32Array([3]));
  const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock});
  await flush();await f.host.idle();f.host.present();await first;
  const displayed=f.gpu.buffers[1],committed=await f.commit();
  await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},99),error=>error.resourcePreparationsRetained===true);
  const staged=f.host.inspect().stagedOperations;
  assert(staged>0);await assert.rejects(queue.onSubmittedWorkDone(),/uncommitted/);
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>completions.push(resolve));
  let released=false;
  const retiring=new Promise(resolve=>admission.deferRelease(new Group(),()=>{released=true;vertex.destroy();resolve();}));
  await waitForFence();
  await flush();await f.host.idle();await flush();
  assert.equal(completions.length,1);assert.equal(released,false);
  completions.shift()();await flush();await f.host.idle();
  assert.equal(released,false);
  assert.equal(new Uint32Array(displayed.data.buffer)[0],3);
  assert.equal(displayed.destroyed,false);assert.equal(f.host.inspect().stagedOperations,staged);
  if(closeWithoutFrame){
   admission.dispose();await waitForFence();assert.equal(released,false);completions.shift()();await retiring;await flush();await f.host.idle();
   assert.equal(displayed.destroyed,false);
   const shutdown=f.client.disposeAsync();await waitForFence();
   assert.equal(displayed.destroyed,false);assert(completions.length>0);
   for(const complete of completions.splice(0))complete();await shutdown;
  }else{
   await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},101),error=>error.resourcePreparationsRetained===true);
   f.host.present();await flush();assert.equal(released,false);
   assert.equal(new Uint32Array(displayed.data.buffer)[0],3);assert.equal(completions.length,0);
   const next=f.frame(3,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});
   await flush();await f.host.idle();
   assert.equal(displayed.destroyed,false);
   assert.equal(released,false);f.host.present();await next;await waitForFence();await f.host.idle();
   assert.equal(displayed.destroyed,false);assert(completions.length>0);
   for(const complete of completions.splice(0))complete();await retiring;await flush();await f.host.idle();
   assert.equal(displayed.destroyed,false);assert(completions.length>0);
   for(const complete of completions.splice(0))complete();await flush();
  }
  assert.equal(displayed.destroyed,true);assert.deepEqual(f.errors,[]);
 }finally{admission.dispose();f.gpu.device.queue.onSubmittedWorkDone=physicalFence;for(const complete of completions)complete();f.close();}
});


test('a retirement request cannot cover a later upload outside the retained generation set',async()=>{
 const f=await nativePreparationFixture(),queue=f.client.device.queue;
 try{
  const vertex=f.client.device.createBuffer({size:16,usage:44});queue.writeBuffer(vertex,0,new Uint32Array([3]));
  const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  await f.commit();await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},99),error=>error.resourcePreparationsRetained===true);
  const other=f.client.device.createBuffer({size:16,usage:44});
  queue.writeBuffer(other,0,new Uint32Array([11]));
  await assert.rejects(queue.onRetirementWorkDone(),/uncommitted changes/);
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],3);
  assert.equal(new Uint32Array(f.gpu.buffers.at(-1).data.buffer)[0],0);
  assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('an unpublished COW vertex generation can finish retained uploads while the old published generation remains unchanged',async()=>{
 const f=await nativePreparationFixture();try{
  const vertex=f.client.device.createBuffer({size:16,usage:44});f.client.device.queue.writeBuffer(vertex,0,new Uint32Array([3]));const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  const displayed=f.gpu.buffers[1];f.client.device.queue.writeBuffer(vertex,0,new Uint32Array([11]));await flush();await f.host.idle();const pending=f.gpu.buffers[2];assert.notEqual(pending,displayed);assert.equal(f.host.inspect().bufferForks,1);
  const committed=await f.commit();await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},22),e=>e.resourcePreparationsRetained===true);await f.client.device.queue.onSubmittedWorkDone();
  assert.equal(new Uint32Array(displayed.data.buffer)[0],3);assert.equal(new Uint32Array(pending.data.buffer)[0],22);assert.equal(f.host.inspect().bufferForks,1);assert.equal(f.host.inspect().retainedNonUniformBufferUploads,1);
  const next=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});await flush();await f.host.idle();f.host.present();await next;assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a mixed retained fence batch validates every destination before writing an unpublished buffer or forking a displayed uniform',async()=>{
 const f=await nativePreparationFixture();try{
  const vertex=f.client.device.createBuffer({size:16,usage:44});f.client.device.queue.writeBuffer(vertex,0,new Uint32Array([3]));const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock});await flush();await f.host.idle();f.host.present();await first;
  const extra=f.client.device.createBuffer({size:16,usage:9});await flush();await f.host.idle();const pending=f.gpu.buffers[2];await f.commit();await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},99,extra),e=>e.resourcePreparationsRetained===true);
  const buffers=f.gpu.buffers.length,writes=f.gpu.calls.filter(v=>v[0]==='writeBuffer').length;await assert.rejects(f.client.device.queue.onSubmittedWorkDone(),/uncommitted changes/);
  assert.equal(new Uint32Array(pending.data.buffer)[0],0);assert.equal(f.gpu.calls.filter(v=>v[0]==='writeBuffer').length,writes);assert.equal(f.gpu.buffers.length,buffers);assert.equal(f.host.inspect().failed,false);
 }finally{f.close();}
});

// Real transport, retained Host packets and native-object lifetimes; the queue
// records byte-level effects in the existing double, not physical GPU timing.
for(const pendingFrame of [false,true])test(`standalone sampled texture upload fences without changing ${pendingFrame?'pending':'active'} publication`,async()=>{
 const f=await fixture(),record=textureCopies(f);let pendingReceipt;
 try{
  const texture=f.client.device.createTexture({size:[4,2,2],mipLevelCount:2,usage:23,format:'rgba8unorm'}),view=texture.createView(),group=f.client.device.createBindGroup({entries:[{binding:0,resource:view}]});
  const draw=update=>{f.client.beginFrame();update?.();const e=f.client.device.createCommandEncoder(),p=e.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});p.setPipeline(f.pipeline);p.setBindGroup(0,group);p.draw(3);p.end();f.client.device.queue.submit([e.finish()]);return f.client.endFrame();};
  const first=draw(()=>{f.client.device.queue.writeTexture({texture},new Uint8Array(64).fill(1),{bytesPerRow:16,rowsPerImage:2},[4,2,2]);f.client.device.queue.writeTexture({texture,mipLevel:1},new Uint8Array(16).fill(2),{bytesPerRow:8,rowsPerImage:1},[2,1,2]);});await flush();await f.host.idle();f.host.present();await first;
  const old=record.textures[0],oldGroup=record.groups[0],created=f.client.inspect().resourcesCreated;
  if(pendingFrame){pendingReceipt=draw(()=>f.client.device.queue.writeTexture({texture,origin:[1,0,1]},new Uint8Array(8).fill(3),{bytesPerRow:8},[2,1,1]));pendingReceipt.catch(()=>{});await flush();await f.host.idle();}
  f.client.device.queue.writeTexture({texture,origin:[2,0,1]},new Uint8Array(4).fill(9),{bytesPerRow:4},[1,1,1]);
  f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([7]));
  await f.client.device.queue.onSubmittedWorkDone();assert.equal(f.host.inspect().stagedOperations,0);assert.equal(record.textures.length,2);assert.equal(f.host.inspect().textureForks,1);
  const next=record.textures[1];assert(old.levels[0].every(v=>v===1));assert(old.levels[1].every(v=>v===2));assert(next.levels[1].every(v=>v===2));assert.deepEqual(Array.from(next.levels[0].slice(32,48)),[1,1,1,1,...Array(4).fill(pendingFrame?3:1),9,9,9,9,1,1,1,1]);
  assert.equal(oldGroup.descriptor.entries[0].resource.texture,old);assert.equal(record.groups.at(-1).descriptor.entries[0].resource.texture,next);assert.equal(f.client.inspect().resourcesCreated,created);
  f.client.device.queue.writeTexture({texture,origin:[0,1,0]},new Uint8Array(4).fill(5),{bytesPerRow:4},[1,1,1]);await f.client.device.queue.onSubmittedWorkDone();assert.equal(record.textures.length,2,'reuse the unpublished generation');
  if(pendingReceipt){f.host.present();await pendingReceipt;pendingReceipt=null;assert.deepEqual(Array.from(old.levels[0].slice(32,48)),[1,1,1,1,3,3,3,3,3,3,3,3,1,1,1,1]);}
  const last=draw();await flush();await f.host.idle();f.host.present();await last;assert.deepEqual(f.errors,[]);
 }finally{pendingReceipt?.catch(()=>{});f.client.dispose();await f.host.dispose();}
});

for(const unsafe of ['storage','attachment','pending-copy','no-copy-src'])test(`standalone texture ${unsafe} cannot bypass the publication fence`,async()=>{
 const f=await fixture(),record=textureCopies(f);let receipt;
 try{
  const texture=f.client.device.createTexture({size:[2,2],usage:unsafe==='storage'?15:unsafe==='no-copy-src'?6:23,format:'rgba8unorm'}),view=texture.createView(),group=f.client.device.createBindGroup({entries:[{binding:0,resource:view}]});
  f.client.beginFrame();f.client.device.queue.writeTexture({texture},new Uint8Array(16).fill(1),{bytesPerRow:8},[2,2]);
  const e=f.client.device.createCommandEncoder(),p=e.beginRenderPass({colorAttachments:[{view:unsafe==='attachment'?view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});p.setPipeline(f.pipeline);p.setBindGroup(0,group);p.draw(3);p.end();
  if(unsafe==='pending-copy')e.copyTextureToTexture({texture},{texture},[2,2]);
  f.client.device.queue.submit([e.finish()]);receipt=f.client.endFrame();receipt.catch(()=>{});await flush();await f.host.idle();
  if(unsafe!=='pending-copy'){f.host.present();await receipt;receipt=null;}
  f.client.device.queue.writeTexture({texture},new Uint8Array(16).fill(9),{bytesPerRow:8},[2,2]);await assert.rejects(f.client.device.queue.onSubmittedWorkDone(),/uncommitted/);
  assert.equal(record.textures.length,1);assert.equal(f.host.inspect().textureForks??0,0);assert(f.host.inspect().stagedOperations>0);assert.equal(f.host.inspect().failed,false);
  if(receipt){f.host.present();await receipt;receipt=null;}
 }finally{receipt?.catch(()=>{});f.client.dispose();await f.host.dispose();}
});

test('a 1x64 upload forks only its sampled generation and retires it after its real queue fence',async()=>{
 const f=await fixture(),record=textureCopies(f),fences=[];let receipt,originalFence;
 try{
  const descriptor={size:[1,64],usage:23,format:'rgba8unorm'},texture=f.client.device.createTexture(descriptor),untouched=f.client.device.createTexture(descriptor),group=f.client.device.createBindGroup({entries:[{binding:0,resource:texture.createView()},{binding:1,resource:untouched.createView()}]});
  const draw=update=>{f.client.beginFrame();update?.();const e=f.client.device.createCommandEncoder(),p=e.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});p.setPipeline(f.pipeline);p.setBindGroup(0,group);p.draw(3);p.end();f.client.device.queue.submit([e.finish()]);return f.client.endFrame();};
  receipt=draw(()=>{for(const t of [texture,untouched])f.client.device.queue.writeTexture({texture:t},new Uint8Array(256).fill(1),{bytesPerRow:4},[1,64]);});await flush();await f.host.idle();f.host.present();await receipt;receipt=null;
  const old=record.textures[0],other=record.textures[1],before=f.client.inspect().resourcesCreated;
  receipt=draw(()=>f.client.device.queue.writeTexture({texture,origin:[0,10]},new Uint8Array(4).fill(3),{bytesPerRow:4},[1,1]));receipt.catch(()=>{});await flush();await f.host.idle();
  originalFence=f.gpu.device.queue.onSubmittedWorkDone;f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(r=>fences.push(r));
  f.client.device.queue.writeTexture({texture,origin:[0,20]},new Uint8Array(4).fill(9),{bytesPerRow:4},[1,1]);let complete=false;const fence=f.client.device.queue.onSubmittedWorkDone().then(()=>complete=true);fence.catch(()=>{});await flush();await f.host.idle();await flush();
  assert.equal(complete,false);assert.equal(record.textures.length,3);assert.equal(record.copies.length,1);assert.deepEqual(record.copies[0].size,[1,64,1]);assert.equal(record.textures[2].levels[0].byteLength,256);
  assert.equal(other,record.textures[1]);assert(other.levels[0].every(v=>v===1));assert.equal(old.destroyed,undefined);assert(old.levels[0].every(v=>v===1));assert.equal(f.client.inspect().resourcesCreated,before);assert.equal(f.host.inspect().stagedOperations,0);
  assert.equal(record.groups.at(-1).descriptor.entries[1].resource.texture,other);assert.equal(record.groups.at(-1).descriptor.entries[0].resource.texture,record.textures[2]);
  for(const done of fences.splice(0))done();await fence;assert.equal(complete,true);assert.equal(old.destroyed,undefined,'pending snapshot still pins the old texture');
  f.host.present();await receipt;receipt=null;assert.equal(old.destroyed,undefined,'active snapshot still owns its texture');
  receipt=draw();await flush();await f.host.idle();f.host.present();await receipt;receipt=null;await flush();assert.equal(old.destroyed,undefined,'retirement still awaits the native queue fence');assert(fences.length>0);
  for(const done of fences.splice(0))done();await flush();await flush();assert.equal(old.destroyed,true);assert.equal(other.destroyed,undefined);assert.equal(record.textures[2].destroyed,undefined);assert.deepEqual(f.errors,[]);
 }finally{if(originalFence)f.gpu.device.queue.onSubmittedWorkDone=originalFence;for(const done of fences.splice(0))done();receipt?.catch(()=>{});f.client.dispose();await f.host.dispose();}
});

for(const format of ['bc1-rgba-unorm','etc2-rgba8unorm','eac-rg11unorm','astc-4x4-unorm'])test(`standalone compressed ${format} stays behind the publication fence`,async()=>{
 const f=await fixture();let receipt;
 try{
  const texture=f.client.device.createTexture({size:[4,4],usage:7,format}),group=f.client.device.createBindGroup({entries:[{binding:0,resource:texture.createView()}]});
  f.client.beginFrame();const e=f.client.device.createCommandEncoder(),p=e.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});p.setPipeline(f.pipeline);p.setBindGroup(0,group);p.draw(3);p.end();f.client.device.queue.submit([e.finish()]);receipt=f.client.endFrame();await flush();await f.host.idle();f.host.present();await receipt;receipt=null;
  f.client.device.queue.writeTexture({texture},new Uint8Array(16),{bytesPerRow:16},[4,4]);await assert.rejects(f.client.device.queue.onSubmittedWorkDone(),/uncommitted/);assert.equal(f.host.inspect().textureForks??0,0);assert.equal(f.host.inspect().failed,false);
 }finally{receipt?.catch(()=>{});f.client.dispose();await f.host.dispose();}
});

for(const destination of ['resolve','depth','buffer-copy'])test(`texture destination classification protects ${destination} without traversing unrelated bindings`,async()=>{
 const f=await fixture(),record=textureCopies(f);let receipt;
 try{
  const texture=f.client.device.createTexture({size:[2,2],usage:23,format:'rgba8unorm'}),view=texture.createView(),group=f.client.device.createBindGroup({entries:[{binding:0,resource:view}]});
  f.client.beginFrame();f.client.device.queue.writeTexture({texture},new Uint8Array(16).fill(1),{bytesPerRow:8},[2,2]);const e=f.client.device.createCommandEncoder(),desc={colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',...(destination==='resolve'?{resolveTarget:view}:{})}],...(destination==='depth'?{depthStencilAttachment:{view,depthLoadOp:'clear',depthStoreOp:'store'}}:{})};
  // Descriptor doubles deliberately classify a depth destination irrespective
  // of format; physical format validation remains the GPU's separate contract.
  const p=e.beginRenderPass(desc);p.setPipeline(f.pipeline);p.setBindGroup(0,group);p.draw(3);p.end();if(destination==='buffer-copy'){const source=f.client.device.createBuffer({size:512,usage:12});e.copyBufferToTexture({buffer:source,bytesPerRow:256},{texture},[2,2]);}
  f.client.device.queue.submit([e.finish()]);receipt=f.client.endFrame();receipt.catch(()=>{});await flush();await f.host.idle();
  f.client.device.queue.writeTexture({texture},new Uint8Array(16).fill(9),{bytesPerRow:8},[2,2]);await assert.rejects(f.client.device.queue.onSubmittedWorkDone(),/uncommitted/);assert.equal(record.textures.length,1);assert.equal(f.host.inspect().textureForks??0,0);assert.equal(f.host.inspect().failed,false);
 }finally{receipt?.catch(()=>{});f.client.dispose();await f.host.dispose();}
});

import {prepareWebGpuTexture as preparePrivateUpload} from '../src/rendering/webgpu-texture-upload.js';
import {createWebGpuCombatTexture as newCombatPalette} from '../src/rendering/webgpu-combat-playback.js';

test('private VFX palette submits actual pixels while unrelated published storage waits for its replacement',async()=>{
  const f=await storageFixture('storage'),queue=f.client.device.queue,record=textureCopies(f);
  let shown=f.render();await flush();await f.host.idle();f.host.present();await shown;
  const original=f.gpu.buffers[1],palette=newCombatPalette();
  const gpuTexture=f.client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:6});
  const rgba=new Uint8Array([7,11,13,255]);let freed=0;
  const renderer={backend:{isWebGPUBackend:true,device:f.client.device,get:texture=>{
    assert.equal(texture,palette);return {texture:gpuTexture};
  }},initTexture:texture=>{assert.equal(texture,palette);queue.writeTexture({texture:gpuTexture},rgba,{bytesPerRow:4},[1,1]);}};
  queue.writeBuffer(f.storage,0,new Uint32Array([23]));
  await preparePrivateUpload({renderer,texture:palette,privateUpload:true,release:()=>{freed++;}});
  assert.deepEqual(record.textures.at(-1).levels[0],rgba);
  assert.equal(f.gpu.buffers[1],original);assert.equal(new Uint32Array(original.data.buffer)[0],1);
  await assert.rejects(queue.onResourceSubmissionOrdered(),/uncommitted published/);
  await assert.rejects(queue.onSubmittedWorkDone(),/uncommitted/);
  shown=f.render();await flush();await f.host.idle();f.host.present();await shown;
  assert.equal(new Uint32Array(original.data.buffer)[0],23);
  assert.equal(freed,0);assert.equal(f.host.inspect().failed,false);
});

test('private VFX upload refuses a texture in the active frame, a foreign proxy and an open encoder frame',async()=>{
  const f=await fixture(),queue=f.client.device.queue,record=textureCopies(f);
  const texture=f.client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:6});
  const group=f.client.device.createBindGroup({entries:[{binding:0,resource:texture.createView()}]});
  queue.writeTexture({texture},new Uint8Array([1,2,3,4]),{bytesPerRow:4},[1,1]);
  const unwritten=f.client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:6});
  await assert.rejects(queue.onPrivateTextureSubmissionOrdered(unwritten),/independent unpublished/);
  f.client.beginFrame();
  await assert.rejects(queue.onPrivateTextureSubmissionOrdered(texture),/inside a remote frame/);
  const enc=f.client.device.createCommandEncoder(),pass=enc.beginRenderPass({});
  pass.setBindGroup(0,group);pass.draw(3);pass.end();queue.submit([enc.finish()]);
  const shown=f.client.endFrame();await flush();await f.host.idle();f.host.present();await shown;
  await assert.rejects(queue.onPrivateTextureSubmissionOrdered(texture),/independent unpublished/);
  await assert.rejects(queue.onPrivateTextureSubmissionOrdered({...texture}),/Unknown private texture/);
  assert.deepEqual([...record.textures[0].levels[0]],[1,2,3,4]);assert.equal(f.host.inspect().failed,false);
});

test('private VFX upload cannot cross an unclassified queued encoder submission',async()=>{
  const f=await storageFixture('storage'),queue=f.client.device.queue,record=textureCopies(f);
  const shown=f.render();await flush();await f.host.idle();f.host.present();await shown;
  queue.writeBuffer(f.storage,0,new Uint32Array([31]));
  const destination=f.client.device.createBuffer({size:16,usage:12}),encoder=f.client.device.createCommandEncoder();
  encoder.copyBufferToBuffer(f.storage,0,destination,0,4);queue.submit([encoder.finish()]);
  const texture=f.client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:6});
  queue.writeTexture({texture},new Uint8Array([8,7,6,5]),{bytesPerRow:4},[1,1]);
  await assert.rejects(queue.onPrivateTextureSubmissionOrdered(texture),/independent unpublished/);
  assert.deepEqual([...record.textures[0].levels[0]],[0,0,0,0]);
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0],1);
  assert.equal(f.host.inspect().failed,false);
});

for(const ending of ['present','end-frame-production'])test('deferred retirement protects an unrelated unowned uniform through '+ending,async()=>{
 const f=await nativePreparationFixture(),queue=f.client.device.queue;
 const completions=[],errors=[],physicalFence=f.gpu.device.queue.onSubmittedWorkDone;
 const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true,device:f.client.device},compileAsync:async()=>{}},scene:new Scene(),camera:new PerspectiveCamera(),onFatal:e=>errors.push(e)});
 try{
  const vertex=f.client.device.createBuffer({size:16,usage:44});
  const first=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},3);
  await flush();await f.host.idle();f.host.present();await first;
  const displayed=f.gpu.buffers[1],committed=await f.commit();
  await assert.rejects(unpublishedFenceVertexDraw(f,vertex,{clock:f.clock},99),e=>e.resourcePreparationsRetained===true);
  const unrelated=f.client.device.createBuffer({size:112,usage:76,label:'bindingBuffer_object'});
  queue.writeBuffer(unrelated,0,new Uint32Array([57]));
  await assert.rejects(queue.onRetirementWorkDone(),/uncommitted changes/);
  await assert.rejects(queue.onSubmittedWorkDone(),/uncommitted changes/);
  let released=false;
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>completions.push(resolve));
  const release=new Promise(resolve=>admission.deferRelease(new Group(),()=>{released=true;resolve();}));
  const until=async predicate=>{const end=performance.now()+1500;while(!predicate()&&!errors.length&&performance.now()<end)await new Promise(r=>setTimeout(r,1));assert.ifError(errors[0]);assert(predicate());};
  await until(()=>f.host.inspect().fenceTimings.some(t=>t.retryAfterPresentation!==undefined));
  f.host.present();await flush();await f.host.idle();
  assert.equal(completions.length,0);assert.equal(released,false);assert.equal(new Uint32Array(displayed.data.buffer)[0],3);
  const extra=f.gpu.buffers[2];assert.equal(new Uint32Array(extra.data.buffer)[0],0);
  if(ending==='present'){
   const next=unpublishedFenceVertexDraw(f,vertex,{clock:f.clock,nativeWorldBoundary:committed.worldBoundary});
   await flush();await f.host.idle();f.host.present();await next;
   assert.equal(new Uint32Array(extra.data.buffer)[0],57);
  }else{
   admission.dispose();await flush();assert.equal(released,false);
   f.client.endFrameProduction();
   assert.throws(()=>f.client.beginFrame(),/ended frame production/);
  }
  await until(()=>completions.length>0);assert.equal(released,false);
  for(const complete of completions.splice(0))complete();await release;
  if(ending!=='present'){assert.equal(new Uint32Array(displayed.data.buffer)[0],3);assert.equal(new Uint32Array(extra.data.buffer)[0],0);}
  assert.deepEqual(errors,[]);assert.equal(f.host.inspect().failed,false);
 }finally{admission.dispose();f.gpu.device.queue.onSubmittedWorkDone=physicalFence;for(const done of completions)done();f.close();}
});
