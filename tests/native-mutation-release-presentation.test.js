import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,pair,flush,preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

// Real WASM authority, direct publication and Host; simulated GPU and virtual
// presentation times. These tests do not measure hardware/compositor cadence.
async function setup(){
  const native=createNativeRouteExecutionFixture(),[sourcePort,drawPort]=pair();
  const raf=new Map();let serial=0,now=1000;
  const f=await fixture({}, {intentControl:{port:drawPort,session:'release-presentation'},absoluteNow:()=>now,
    requestFrame:callback=>{raf.set(++serial,callback);return serial;},cancelFrame:id=>raf.delete(id)});
  native.worker(1,native.point(-6,0),native.point(6,0));
  native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
  const source=createNativeIntentControlPublication({port:sourcePort,session:'release-presentation',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>now});
  await source.ready;
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:1000,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
  function step(at){now=at;assert.equal(raf.size,1,'only the original RAF chain');const [id,callback]=raf.entries().next().value;raf.delete(id);callback();assert.equal(raf.size,1);}
  const shown=f.frame(1,{clock});await flush();await f.host.idle();step(1000);await shown;
  return {...f,native,source,clock,step,setNow:value=>{now=value;},async close(){source.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();assert.equal(raf.size,0);}};
}

for(const delay of [30,50,100])test(`a missed presentation resumes at the exact committed release without a second RAF (${delay}ms virtual hold)`,async()=>{
  const f=await setup();let prepared,finishDrain,finishReceipt,receiptReady;
  const receiptReached=new Promise(resolve=>{receiptReady=resolve;});
  try{
    const quiesce=f.source.quiesceGpuForMutation.bind(f.source);
    f.source.quiesceGpuForMutation=async options=>{
      const receipt=await quiesce(options);receiptReady();
      await new Promise(resolve=>{finishReceipt=resolve;});return receipt;
    };
    const result=f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4},prepareResources:async({proposedWorldBoundary})=>{
      prepared=await preparedWorldDraw(f,proposedWorldBoundary);
      f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{finishDrain=resolve;});
      return {preparedWorldBoundary:prepared.preparedWorldBoundary,valid:prepared.valid,commit:data=>prepared.commit(data.worldBoundary),abort:prepared.abort};
    }});
    for(let i=0;i<100&&!finishDrain;i++)await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(typeof finishDrain,'function');assert(f.host.inspect().nativeMutationHold);
    const before=f.gpu.submitted.length,resources=f.gpu.buffers.length;
    f.step(1016);assert.equal(f.gpu.submitted.length,before,'no submit while GPU drain is pending');
    finishDrain();await receiptReached;
    f.gpu.device.queue.onSubmittedWorkDone=async()=>{};
    f.step(1000+delay);assert.equal(f.gpu.submitted.length,before,'no submit after ACK but before release');
    assert.equal(f.host.inspect().activeSequence,1);
    f.setNow(1002+delay);finishReceipt();assert.equal((await result).status,'committed');await flush();
    const status=f.host.inspect();assert.equal(status.activeSequence,2);assert.equal(status.nativeMutationHold,null);
    await prepared.presented;
    assert.equal(f.gpu.submitted.length,before+1);assert.equal(f.gpu.buffers.length,resources);
    assert.equal(status.samples.at(-1).trigger,'mutation-release');assert.equal(status.samples.at(-1).at,1002+delay);
    assert.equal(status.samples.at(-1).intervalMs,delay+2,'long hold duration remains visible, without an extra RAF interval');
    assert.equal(status.nativeRouteFrame.sequence,2);assert.equal(status.nativeRouteFrame.clockElapsed,10);
    assert.deepEqual(status.nativeRouteFrame.worldBoundary,status.nativeWorldBoundary??f.client.requiredNativeWorldBoundary());
    f.step(1032+delay);assert.equal(f.gpu.submitted.length,before+2);assert.equal(f.host.inspect().samples.at(-1).trigger,'raf');
    assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
  }finally{finishDrain?.();finishReceipt?.();await f.close();}
});

for(const mode of ['abort','no-missed-frame','hidden'])test(`release presentation preserves the normal draw guards (${mode})`,async()=>{
  const f=await setup();
  try{
    const hold=await f.source.quiesceGpuForMutation(),before=f.gpu.submitted.length;
    if(mode!=='no-missed-frame')f.step(1016);
    if(mode==='hidden')f.host.setVisibility(true);
    f.source.releaseGpuAfterMutation(hold,{committed:false});await flush();
    const draws=f.gpu.submitted.length-before;
    assert.equal(draws,mode==='abort'?1:0);
    assert.equal(f.host.inspect().nativeMutationHold,null);assert.deepEqual(f.errors,[]);
    if(mode==='hidden'){f.host.setVisibility(false);f.step(1032);assert.equal(f.gpu.submitted.length,before+1);}
  }finally{await f.close();}
});

test('a release without replacement commands never replays the old world to finish its missed presentation',async()=>{
  const f=await setup();
  try{
    const quiesce=f.source.quiesceGpuForMutation.bind(f.source),before=f.gpu.submitted.length;
    f.source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);f.step(1016);return receipt;};
    const result=await f.native.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>f.source,mutation:{type:'addChunk',cx:4,cz:4}});
    assert.equal(result.status,'committed');await flush();
    assert.equal(f.host.inspect().nativeMutationHold,null);assert.equal(f.host.inspect().activeSequence,1);
    assert.equal(f.gpu.submitted.length,before);f.step(1032);assert.equal(f.gpu.submitted.length,before);
    assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
