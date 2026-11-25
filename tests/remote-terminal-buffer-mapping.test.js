import assert from 'node:assert/strict';
import test from 'node:test';
import {fakeGpu, fixture, flush, pair} from './helpers/remote-webgpu-fixture.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

// Destroy invalidates mappings synchronously. Deliver the loss notification
// independently, through the real client/Host transport and native control port.
for (const order of ['unmap-first','loss-first','live-error','map-completes','map-rejects','map-request']) {
  test('remote mapping and terminal device retirement: '+order, async()=>{
    const native=createNativeRouteExecutionFixture(), [sourcePort,drawPort]=pair();
    const retirements=[],send=drawPort.postMessage;
    drawPort.postMessage=data=>{
      if(data.type==='intent-control-retired')retirements.push(data);
      send(data);
    };
    const gpu=fakeGpu(), announceLoss=gpu.device.destroy;
    let destroyed=false,rangeCalls=0,completeMap,failMap,completeDrain,source,now=0,releaseDispatch;
    gpu.device.destroy=()=>{destroyed=true;};
    const f=await fixture({}, {device:gpu.device,intentControl:{port:drawPort,session:'loss'},absoluteNow:()=>now,
      yieldResourceTask:()=>new Promise(resolve=>{releaseDispatch=resolve;})});
    try{
      native.worker(1,native.point(-6,0),native.point(6,0));
      native.bridge.beginNativeRouteExecution();native.bridge.commitNativeCausalClock();
      source=createNativeIntentControlPublication({port:sourcePort,session:'loss',observe:native.bridge.observeNativeIntentControl,absoluteNow:()=>0});
      await source.ready;
      const isMap=order.startsWith('map-');
      const buffer=f.client.device.createBuffer({size:16,usage:isMap?9:32,mappedAtCreation:!isMap});
      await flush();await f.host.idle();
      const actual=gpu.buffers.at(-1),liveError=new DOMException('getMappedRange failed','OperationError');
      actual.getMappedRange=()=>{
        rangeCalls++;
        if(destroyed||order==='live-error')throw liveError;
        return actual.data.buffer;
      };
      actual.mapAsync=()=>new Promise((resolve,reject)=>{completeMap=resolve;failMap=reject;});
      gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{completeDrain=resolve;});
      let mapRejected,settled=false;
      function requestMap(){
        const result=buffer.mapAsync(1);
        result.finally(()=>{settled=true;}).catch(()=>{});
        mapRejected=assert.rejects(result,/WebGPU device lost/);
        mapRejected.catch(()=>{});
      }
      if(isMap&&order!=='map-request'){
        requestMap();await flush();await f.host.idle();
        assert.equal(typeof completeMap,'function');
      }
      if(order==='live-error'){
        buffer.unmap();await flush();await f.host.idle();await flush();
        assert.equal(rangeCalls,1);
        assert.match(f.errors[0]?.message,/OperationError: getMappedRange failed/);
        assert.equal(destroyed,false);
        assert.equal(retirements.length,0);
        completeDrain();await flush();
        assert.equal(retirements.length,1);
        return;
      }
      if(order==='unmap-first')buffer.unmap();
      if(order==='loss-first'){
        now=5;buffer.unmap();await flush();
        assert.equal(typeof releaseDispatch,'function');
      }
      f.client.device.destroy();await flush();
      assert.equal(destroyed,true);
      if(order==='loss-first'){announceLoss();await f.client.device.lost;releaseDispatch();}
      if(order==='map-completes')completeMap();
      if(order==='map-rejects')failMap(liveError);
      if(order==='map-request')requestMap();
      await flush();await f.host.idle();await flush();
      if(order!=='loss-first'){
        assert.equal(settled,false);
        assert.equal(retirements.length,0);
        assert.deepEqual(f.errors,[]);
        assert.equal(rangeCalls,0);
        announceLoss();
      }
      assert.equal((await f.client.device.lost).reason,'destroyed');
      if(mapRejected)await mapRejected;
      await flush();
      assert.deepEqual(f.errors,[]);
      assert.equal(rangeCalls,0);
      if(order==='map-request')assert.equal(completeMap,undefined);
      assert.equal(retirements.length,1);
      assert.equal(source.status().drained,true);
      completeDrain();await f.host.dispose();await flush();
      assert.equal(retirements.length,1);
    }finally{
      releaseDispatch?.();completeDrain?.();announceLoss();await flush();completeDrain?.();
      source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();
    }
  });
}
