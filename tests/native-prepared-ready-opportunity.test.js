import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,pair,flush,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {setup as farmSetup,admit as farmAdmit,present as farmPresent} from './helpers/native-farm-arrival-remote.js';

// Real native authority and transport; virtual RAF and GPU, not cadence evidence.
async function setup({initial=true,hidden=false,timeoutMs=10000}={}){
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair(),raf=new Map();let id=0,now=1000;
 const f=await fixture({}, {hidden,intentControl:{port:drawPort,session:'ready-opportunity'},absoluteNow:()=>now,
  requestFrame:callback=>{raf.set(++id,callback);return id;},cancelFrame:key=>raf.delete(key)});
 native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
 const source=createNativeIntentControlPublication({port:sourcePort,session:'ready-opportunity',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now,timeoutMs});await source.ready;
 f.clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:1000,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
 function step(at){now=at;assert.equal(raf.size,1);const [key,callback]=raf.entries().next().value;raf.delete(key);callback();assert.equal(raf.size,1,'only the original RAF chain');}
 if(initial){const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();step(1000);await shown;}
 return {...f,native,source,sourcePort,drawPort,step,setNow:at=>{now=at;},async close(){source.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();assert.equal(raf.size,0);}};
}
function mutate(f,{signal,afterReady}={}){
 const state={ready:false,prepared:null};
 state.result=f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},signal,prepareResources:async({proposedWorldBoundary})=>{
  const p=await preparedWorldDraw(f,proposedWorldBoundary,77,signal);state.prepared=p;state.ready=true;await afterReady?.();
  return {preparedWorldBoundary:p.preparedWorldBoundary,valid:p.valid,commit:data=>p.commit(data.worldBoundary),abort:p.abort};
 }});return state;
}
async function settlePreparation(){for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));}

test('mutation preflight starts a short mutation after the existing opportunity, without sacrificing that opportunity',async()=>{
 const f=await setup();let finishHold;try{
  const quiesce=f.source.quiesceGpuForMutation.bind(f.source);
  f.source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);await new Promise(resolve=>{finishHold=resolve;});return receipt;};
  f.setNow(1015);const m=mutate(f);await settlePreparation();
  assert.equal(f.host.inspect().activeSequence,1);
  const before=f.gpu.canvasSubmissions.length;f.step(1016);
  assert.equal(f.gpu.canvasSubmissions.length,before+1,'a short mutation must not consume the imminent opportunity');
  await settlePreparation();assert.equal(typeof finishHold,'function');assert(f.host.inspect().nativeMutationHold);
  f.setNow(1021);finishHold();
  assert.equal((await m.result).status,'committed');await flush();
  assert.equal(f.host.inspect().nativeMutationHold,null);f.step(1032);await m.prepared.presented;
  assert.equal(f.host.inspect().activeSequence,2);assert(f.host.inspect().presentationOpportunities.every(p=>p.outcome!=='mutation-hold'));
  assert.deepEqual(f.errors,[]);
 }finally{finishHold?.();await f.close();}
});

for(const options of [{initial:false},{initial:false,hidden:true}])test('bootstrap needs no previous image or RAF: '+JSON.stringify(options),async()=>{
 const f=await setup(options);try{const m=mutate(f);assert.equal((await m.result).status,'committed');assert.equal(f.host.inspect().activeSequence,null);assert.equal(f.host.inspect().mutationOpportunityWaiting,false);assert.equal(f.gpu.canvasSubmissions.length,0);}finally{await f.close();}
});

for(const during of [false,true])test('hidden consumers do not depend on a suspended RAF ('+(during?'hide while waiting':'already hidden')+')',async()=>{
 const f=await setup();try{
  if(!during)f.host.setVisibility(true);const m=mutate(f);
  if(during){await settlePreparation();assert.equal(f.host.inspect().mutationOpportunityWaiting,true);assert.equal(f.source.status().pendingMutationHold,null);f.host.setVisibility(true);}
  assert.equal((await m.result).status,'committed');assert.equal(f.host.inspect().mutationOpportunityWaiting,false);assert.equal(f.gpu.canvasSubmissions.length,1);
  f.host.setVisibility(false);f.step(1032);await m.prepared.presented;assert.equal(f.host.inspect().activeSequence,2);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const terminal of ['cancel','retire','dispose','device-loss'])test(terminal+' releases a mutation preflight waiter without publishing the cancelled preparation',async()=>{
 const f=await setup(),controller=new AbortController();try{
  const before=f.native.session.core.snapshot(),m=mutate(f,{signal:controller.signal});await settlePreparation();assert.equal(f.host.inspect().mutationOpportunityWaiting,true);
  if(terminal==='cancel')controller.abort();
  if(terminal==='retire')await f.source.retireGpu();
  if(terminal==='dispose')await f.host.dispose();
  if(terminal==='device-loss')f.gpu.device.destroy();
  const result=await m.result;await flush();assert.notEqual(result.status,'committed');assert.equal(f.source.status().pendingMutationHold,null);assert.equal(f.host.inspect().mutationOpportunityWaiting,false);assert.equal(f.gpu.canvasSubmissions.length,1);assert.deepEqual(f.native.session.core.snapshot(),before);
  if(terminal==='cancel'){
   assert.equal(f.host.inspect().failed,false);const retry=mutate(f);await settlePreparation();assert.equal(f.host.inspect().mutationOpportunityWaiting,true);f.step(1032);
   assert.equal((await retry.result).status,'committed');await flush();f.step(1048);await retry.prepared.presented;assert.deepEqual(f.errors,[]);
  }
 }finally{controller.abort();await f.close();}
});

test('a normal opportunity that cannot submit still releases mutation preflight, without manufacturing a presentation',async()=>{
 const f=await setup();try{
  const m=mutate(f);await settlePreparation();assert.equal(f.host.inspect().mutationOpportunityWaiting,true);
  // Direct Host entry makes the canvas unavailable while this isolated fixture
  // is waiting. mutation preflight cannot depend on successfully drawing its replacement.
  await f.host.handle({type:'unconfigure'});const before=f.gpu.canvasSubmissions.length;f.step(1016);
  assert.equal(f.gpu.canvasSubmissions.length,before);assert.equal(f.host.inspect().presentationOpportunities.at(-1).outcome,'awaiting-prepared-frame');
  assert.equal((await m.result).status,'committed');assert.equal(f.host.inspect().mutationOpportunityWaiting,false);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('acquisition delayed after READY obtains a fresh opportunity, never a remembered presentation slot',async()=>{
 const f=await setup();let acquire;try{
  const m=mutate(f,{afterReady:()=>new Promise(resolve=>{acquire=resolve;})});await settlePreparation();assert.equal(m.ready,true);
  f.step(1016);f.step(3000);f.setNow(3015);acquire();await settlePreparation();
  assert.equal(f.host.inspect().mutationOpportunityWaiting,true);assert.equal(f.host.inspect().nativeMutationHold,null);
  f.step(3016);assert.equal((await m.result).status,'committed');await flush();f.step(3032);await m.prepared.presented;
  assert(f.host.inspect().presentationOpportunities.every(p=>p.outcome!=='mutation-hold'));assert.deepEqual(f.errors,[]);
 }finally{acquire?.();await f.close();}
});

test('a real preflight NACK rejects a cancelled packet despite a lying local valid handle, without closing a healthy channel',async()=>{
 const f=await setup({initial:false});try{
  const before=f.native.session.core.snapshot(),result=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
   const p=await preparedWorldDraw(f,proposedWorldBoundary);p.abort();await flush();await f.host.idle();
   return {preparedWorldBoundary:proposedWorldBoundary,valid:()=>true,commit(){throw Error('Cancelled packet cannot commit');},abort(){}};
  }});
  assert.equal(result.status,'control-failed');assert.deepEqual(f.native.session.core.snapshot(),before);assert.equal(f.gpu.canvasSubmissions.length,0);
  assert.equal(f.host.inspect().nativeMutationHold,null);assert.equal(f.host.inspect().failed,false);assert.equal(f.source.status().closed,false);
  const retry=mutate(f);assert.equal((await retry.result).status,'committed');assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('preflight does not freeze native movement or clock and the later physical receipt captures fresh state',async()=>{
 const f=await setup();try{
  const before=f.native.body(1),clock=f.source.status().clockSequence,pending=f.source.waitForMutationOpportunity();await flush();
  await assert.rejects(f.source.waitForMutationOpportunity(),/busy/);await assert.rejects(f.source.quiesceGpuForMutation(),/busy/);await assert.rejects(f.source.fenceGpu(),/not ready/);
  assert.equal(f.host.inspect().nativeMutationHold,null);assert.equal(f.native.advance(10.1).status,'advanced');f.native.bridge.commitNativeCausalClock();await flush();
  assert.notDeepEqual(f.native.body(1),before);assert(f.source.status().clockSequence>clock);f.step(1100);await pending;
  assert.equal(f.host.inspect().nativeRouteFrame.clockElapsed,10.1);assert.equal(f.host.inspect().nativeMutationHold,null);
  const receipt=await f.source.quiesceGpuForMutation();assert.equal(receipt.effectiveTime,10.1);assert.equal(receipt.clockSequence,f.source.status().clockSequence);
  f.source.releaseGpuAfterMutation(receipt);await flush();assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('the common Farm admission keeps actor B moving during preflight and captures its expected receipt afterwards',async()=>{
 const f=await farmSetup();let preparation;try{
  const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();f.host.present();await shown;
  const wait=f.source.waitForMutationOpportunity.bind(f.source),before=f.body(3),time=f.state.elapsed;let observed=false;
  f.source.waitForMutationOpportunity=async options=>{
   const pending=wait(options);await flush();assert.equal(f.host.inspect().mutationOpportunityWaiting,true);assert.equal(f.host.inspect().nativeMutationHold,null);
   f.advance(.1);await flush();assert.notDeepEqual(f.body(3),before);assert.equal(f.host.inspect().nativeMutationHold,null);
   f.host.present();assert(f.host.inspect().nativeRouteFrame.clockElapsed>time);observed=true;await pending;
  };
  preparation=farmAdmit(f);const result=await preparation.promise;assert.equal(result.status,'committed',JSON.stringify(result));assert(observed);
  assert.equal(result.receipt.effectiveTime,time+.1);assert.equal(f.state.elapsed,time+.1);await farmPresent(f,preparation);assert.deepEqual(f.errors,[]);
 }finally{preparation?.prepared?.abort();await f.close();}
});

for(const inTransit of [false,true])test('abort before a hold permits immediate retry, including an in-transit notification: '+inTransit,async()=>{
 const f=await setup(),controller=new AbortController();try{
  let delayed;const post=f.drawPort.postMessage;
  if(inTransit)f.drawPort.postMessage=data=>{if(data.type==='intent-mutation-opportunity')delayed=data;else post(data);};
  const rejected=assert.rejects(f.source.waitForMutationOpportunity({signal:controller.signal}),{name:'AbortError'});await flush();
  if(inTransit){f.step(1016);assert(delayed);}controller.abort();await flush();
  if(inTransit){f.drawPort.postMessage=post;post(delayed);}await rejected;assert.equal(f.source.status().closed,false);assert.equal(f.host.inspect().mutationOpportunityWaiting,false);
  const retry=f.source.waitForMutationOpportunity();await flush();f.step(1032);await retry;assert.equal(f.source.status().pendingMutationOpportunity,null);assert.equal(f.host.inspect().nativeMutationHold,null);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const field of ['session','consumerToken','opportunityId','duplicate','timeout'])test('an invalid or missing opportunity cannot authorize a physical hold: '+field,async()=>{
 const f=await setup({timeoutMs:field==='timeout'?30:10000});try{
  let notification;const post=f.drawPort.postMessage;
  f.drawPort.postMessage=data=>{if(data.type==='intent-mutation-opportunity'){notification=data;if(field==='duplicate')post(data);else post({...data,[field]:field==='opportunityId'?999:'foreign'});}else post(data);};
  const pending=f.source.waitForMutationOpportunity(),rejected=field==='duplicate'?null:assert.rejects(pending,/opportunity/);await flush();
  if(field!=='timeout')f.step(1016);
  if(field==='duplicate'){await pending;post(notification);await flush();assert.equal(f.source.status().closed,true);}else await rejected;
  assert.equal(f.host.inspect().nativeMutationHold,null);assert.equal(f.source.status().closed,true);assert.equal(f.source.status().pendingMutationOpportunity,null);
 }finally{await f.close();}
});
