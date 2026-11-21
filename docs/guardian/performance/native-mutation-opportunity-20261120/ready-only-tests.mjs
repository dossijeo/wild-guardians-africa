import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,pair,flush,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

// Real native authority and transport; virtual RAF and GPU, not cadence evidence.
async function setup({initial=true,hidden=false}={}){
 const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair(),raf=new Map();let id=0,now=1000;
 const f=await fixture({}, {hidden,intentControl:{port:drawPort,session:'ready-opportunity'},absoluteNow:()=>now,
  requestFrame:callback=>{raf.set(++id,callback);return id;},cancelFrame:key=>raf.delete(key)});
 native.worker(1,native.point(-6,0),native.point(6,0));native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
 const source=createNativeIntentControlPublication({port:sourcePort,session:'ready-opportunity',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now});await source.ready;
 f.clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:1000,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
 function step(at){now=at;assert.equal(raf.size,1);const [key,callback]=raf.entries().next().value;raf.delete(key);callback();assert.equal(raf.size,1,'only the original RAF chain');}
 if(initial){const shown=f.frame(1,{clock:f.clock});await flush();await f.host.idle();step(1000);await shown;}
 return {...f,native,source,step,setNow:at=>{now=at;},async close(){source.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();assert.equal(raf.size,0);}};
}
function mutate(f,{signal,afterReady}={}){
 const state={ready:false,prepared:null};
 state.result=f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},signal,prepareResources:async({proposedWorldBoundary})=>{
  const p=await preparedWorldDraw(f,proposedWorldBoundary,77,signal);state.prepared=p;state.ready=true;await afterReady?.();
  return {preparedWorldBoundary:p.preparedWorldBoundary,valid:p.valid,commit:data=>p.commit(data.worldBoundary),abort:p.abort};
 }});return state;
}
async function settlePreparation(){for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));}

test('READY starts a short mutation after the existing opportunity, without sacrificing that opportunity',async()=>{
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
 const f=await setup(options);try{const m=mutate(f);assert.equal((await m.result).status,'committed');assert.equal(f.host.inspect().activeSequence,null);assert.equal(f.host.inspect().preparedReadyWaiting,false);assert.equal(f.gpu.canvasSubmissions.length,0);}finally{await f.close();}
});

for(const during of [false,true])test('hidden consumers do not depend on a suspended RAF ('+(during?'hide while waiting':'already hidden')+')',async()=>{
 const f=await setup();try{
  if(!during)f.host.setVisibility(true);const m=mutate(f);
  if(during){await settlePreparation();assert.equal(f.host.inspect().preparedReadyWaiting,true);assert.equal(m.ready,false);f.host.setVisibility(true);}
  assert.equal((await m.result).status,'committed');assert.equal(f.host.inspect().preparedReadyWaiting,false);assert.equal(f.gpu.canvasSubmissions.length,1);
  f.host.setVisibility(false);f.step(1032);await m.prepared.presented;assert.equal(f.host.inspect().activeSequence,2);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const terminal of ['cancel','retire','dispose','device-loss'])test(terminal+' releases a READY waiter without publishing the cancelled preparation',async()=>{
 const f=await setup(),controller=new AbortController();try{
  const before=f.native.session.core.snapshot(),m=mutate(f,{signal:controller.signal});await settlePreparation();assert.equal(f.host.inspect().preparedReadyWaiting,true);
  if(terminal==='cancel')controller.abort();
  if(terminal==='retire')await f.source.retireGpu();
  if(terminal==='dispose')await f.host.dispose();
  if(terminal==='device-loss')f.gpu.device.destroy();
  const result=await m.result;await flush();assert.notEqual(result.status,'committed');assert.equal(m.ready,false);assert.equal(f.host.inspect().preparedReadyWaiting,false);assert.equal(f.gpu.canvasSubmissions.length,1);assert.deepEqual(f.native.session.core.snapshot(),before);
  if(terminal==='cancel'){
   assert.equal(f.host.inspect().failed,false);const retry=mutate(f);await settlePreparation();assert.equal(f.host.inspect().preparedReadyWaiting,true);f.step(1032);
   assert.equal((await retry.result).status,'committed');await flush();f.step(1048);await retry.prepared.presented;assert.deepEqual(f.errors,[]);
  }
 }finally{controller.abort();await f.close();}
});

test('a normal opportunity that cannot submit still releases READY, without manufacturing a presentation',async()=>{
 const f=await setup();try{
  const m=mutate(f);await settlePreparation();assert.equal(f.host.inspect().preparedReadyWaiting,true);
  // Direct Host entry makes the canvas unavailable while this isolated fixture
  // is waiting. READY cannot depend on successfully drawing its replacement.
  await f.host.handle({type:'unconfigure'});const before=f.gpu.canvasSubmissions.length;f.step(1016);
  assert.equal(f.gpu.canvasSubmissions.length,before);assert.equal(f.host.inspect().presentationOpportunities.at(-1).outcome,'awaiting-prepared-frame');
  assert.equal((await m.result).status,'committed');assert.equal(f.host.inspect().preparedReadyWaiting,false);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
