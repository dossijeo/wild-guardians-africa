import {copyNativeTaskSettlementResources} from '../src/world/native-task-settlement.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {pair,fixture,flush,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {enqueue} from '../src/simulation/tasks.js';
import {emit} from '../src/simulation/game.js';

// Real native source, consumer, transport and retained-frame lifecycle. The GPU
// queue is deterministic here; these checks do not replace hardware validation.
async function setup({supported=true}={}){
 const native=nativeTaskSettlementFixture(),planner=native.planner,[sourcePort,drawPort]=pair(),f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',...(supported?{nativeTaskSettlementVersion:1}:{})}},{intentControl:{port:drawPort,session:'settlement-admission'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 const source=createNativeIntentControlPublication({port:sourcePort,session:'settlement-admission',observe:planner.observeNativeIntentControl});await source.ready;
 const at=native.state.elapsed,clock={version:1,epoch:0,elapsed:at,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]};
 return {...f,native,planner,source,clock,advance(dt){native.advance(dt);},async close(){source.dispose();f.client.dispose();await f.host.dispose();native.close();}};
}
async function admit(f,{mode='exact',afterReady=()=>{}}={}){
 let prepared=null,reference=null;
 const quiesce=f.source.quiesceGpuForMutation;f.source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);if(mode==='late')f.advance(.02);return receipt;};
 if(mode==='missing-attestation'){const release=f.source.releaseGpuAfterMutation;f.source.releaseGpuAfterMutation=(receipt,options)=>release(receipt,{...options,nativeSettlements:[]});}
 const result=await f.planner.startNativeTaskSettlementAfterGpuQuiescence({actorId:f.native.actor,getPublication:()=>f.source,prepareResources:async({resources,proposedWorldBoundary})=>{
  reference=resources.nativeSettlement;assert.equal(f.planner.nativeTaskSettlementBinding(f.native.actor),null);
  if(mode!=='missing-clock')f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:reference.worldBoundary.effectiveTime,nativeSettlement:reference});
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'origin-modulo',period:2.5,epoch:reference.worldBoundary.effectiveTime,nativeSettlement:reference});
  prepared=await preparedWorldDraw({...f,...(mode==='missing-template'?{}:{settlementTemplate:reference})},proposedWorldBoundary);f.host.present();assert.equal(f.planner.nativeTaskSettlementBinding(f.native.actor),null);if(mode==='late')f.advance(.3);await afterReady();
  return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedTaskSettlementTemplate:reference,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary,data.nativeTaskSettlementBinding),abort:prepared.abort};
 }});
 return {result,prepared,reference};
}

for(const mode of ['exact','late','missing-template','missing-clock','missing-attestation'])test(`the native settlement consumer requires its retained clock, actual association and submitted drain (${mode})`,async()=>{
 const f=await setup();try{const before=f.native.body(1),peer=f.native.body(3),{result,prepared,reference}=await admit(f,{mode});
  if(['exact','late'].includes(mode)){assert.equal(result.status,'committed',JSON.stringify(result));assert.deepEqual(copyNativeTaskSettlementResources(result.resources),result.resources);assert.throws(()=>copyNativeTaskSettlementResources({...result.resources,kind:15}),/resources/);assert.throws(()=>copyNativeTaskSettlementResources({...result.resources,worldBoundary:{...result.resources.worldBoundary,ticket:result.resources.worldBoundary.ticket+1}}),/boundary mismatch/);await flush();f.host.present();await prepared.presented;const proof=f.planner.nativeTaskSettlementBinding(f.native.actor),pick=captureNativeRoutePickFrame(f.host.inspect());assert.equal(pick.getSettlementElapsed(reference),0);assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[1],Math.fround(proof.reference.worldBoundary.effectiveTime%2.5));assert.equal(pick.getSettlementExecutionTime(reference),proof.reference.worldBoundary.effectiveTime);assert.deepEqual(f.native.body(1),before);assert(f.native.state.crates[0].delivered);if(mode==='late'){assert(proof.reference.worldBoundary.effectiveTime>reference.worldBoundary.effectiveTime+.3);assert.notDeepEqual(f.native.body(3),peer);}f.advance(.2);await flush();f.host.present();const current=captureNativeRoutePickFrame(f.host.inspect());assert(current.getSettlementElapsed(reference)>.19);assert.deepEqual(f.errors,[]);
  }else{assert.notEqual(result.status,'committed',JSON.stringify(result));if(prepared)await assert.rejects(prepared.presented);assert.deepEqual(f.native.body(1),before);if(mode==='missing-attestation'){assert.equal(result.status,'committed-control-failed');assert(f.planner.nativeTaskSettlementBinding(f.native.actor));}else{assert.equal(f.planner.nativeTaskSettlementBinding(f.native.actor),null);assert.equal(f.native.state.crates[0].delivered,false);}}
 }finally{await f.close();}
});

test('Idle remains drawable through a genuine pending task and stops when its actual next route is issued',async()=>{
 const f=await setup();try{const {result,prepared,reference}=await admit(f);assert.equal(result.status,'committed');await flush();f.host.present();await prepared.presented;const state=f.native.state,target=createPlant(`plant-${state.nextId++}`,'mijo',f.native.target.x,f.native.target.z,f.native.worker.centerId);target.growth=cropSpec('mijo').growth_seconds;target.harvestRequested=true;state.plants.push(target);emit(state,'CropPlaced',{targetId:target.id});enqueue(state,f.native.worker.centerId,'harvest',target.id);f.planner.flushTaskEvents();assert.equal(f.planner.commitTaskBatchToState(state,f.planner.planIfNeeded(state.elapsed),{navVersion:1,pendingResources:true}),1);f.planner.commitNativeCausalClock();f.advance(.2);await flush();f.host.present();const prior=f.host.inspect().nativeRouteFrame;assert(captureNativeRoutePickFrame(f.host.inspect()).getSettlementElapsed(reference)>.19);
  const proof=f.planner.nativeTaskSettlementBinding(f.native.actor),r=proof.reference,p=r.pose,next=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.native.actor),{bodyId:r.bodyId,radius:p.radius,runPhase:p.runPhase,walkPhase:p.walkPhase,carryPhase:p.carryPhase,runRemaining:p.runRemaining});assert.equal(next.status,'proposed');assert.equal(f.native.w.nav_task_start_proposal_commit_bound(...f.native.tuple().slice(0,5),next.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();await flush();f.host.present();assert.deepEqual(f.host.inspect().nativeRouteFrame,prior);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('stationary admission cannot consume resources or credit the crate before the actual queue drain',async()=>{
 const f=await setup();let releaseDrain,signalDrain;const draining=new Promise(resolve=>{signalDrain=resolve;});try{const before=f.native.body(1),peer=f.native.body(3),original=f.gpu.device.queue.onSubmittedWorkDone,pending=admit(f,{afterReady(){f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;signalDrain();});}});await draining;assert.equal(f.planner.nativeTaskSettlementBinding(f.native.actor),null);assert.equal(f.native.state.crates[0].delivered,false);assert.deepEqual(f.native.body(1),before);assert.equal(f.gpu.canvasSubmissions.length,0);f.advance(.2);assert.notDeepEqual(f.native.body(3),peer);assert.equal(f.native.state.crates[0].delivered,false);f.gpu.device.queue.onSubmittedWorkDone=original;releaseDrain();const {result,prepared,reference}=await pending;assert.equal(result.status,'committed',JSON.stringify(result));await flush();f.host.present();await prepared.presented;assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getSettlementElapsed(reference),0);assert.deepEqual(f.native.body(1),before);assert.deepEqual(f.errors,[]);
 }finally{releaseDrain?.();await f.close();}
});

test('an older draw consumer cannot register or prepare the new stationary authority',async()=>{
 const f=await setup({supported:false});try{const p=f.native.prepareSettlement().proposal,r=p.nativeSettlement;assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'relative',epoch:r.worldBoundary.effectiveTime,nativeSettlement:r}),/does not support native settlement/);await assert.rejects(preparedWorldDraw({...f,settlementTemplate:r},p.worldBoundary),/does not support native settlements/);f.client.cancelFrame();assert.equal(f.planner.nativeTaskSettlementBinding(f.native.actor),null);assert.deepEqual(f.errors,[]);}finally{await f.close();}
});
