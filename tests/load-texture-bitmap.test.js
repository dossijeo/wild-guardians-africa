import test from 'node:test';import assert from 'node:assert/strict';
import {loadTextureBitmap} from '../tools/experiments/load-texture-bitmap.js';
function worker(){return {terminated:0,postMessage(value){this.request=value;},terminate(){this.terminated++;}};}
test('bitmap transfer resolves and terminates its worker without closing the transferred image',async()=>{
 const w=worker(),bitmap={close(){throw Error('Must retain bitmap');}},options={imageOrientation:'none'};
 const pending=loadTextureBitmap('/image.webp',options,{workerFactory:()=>w});assert.deepEqual(w.request,{url:'/image.webp',options});w.onmessage({data:{bitmap}});assert.equal(await pending,bitmap);assert.equal(w.terminated,1);assert.equal(w.onmessage,null);
});
test('abort terminates pending worker and closes a late transferred bitmap',async()=>{
 const w=worker(),signal=new AbortController(),pending=loadTextureBitmap('/image.webp',{}, {signal:signal.signal,workerFactory:()=>w}),late=w.onmessage;let closed=0;
 signal.abort();await assert.rejects(pending,{name:'AbortError'});late({data:{bitmap:{close(){closed++;}}}});assert.equal(w.terminated,1);assert.equal(closed,1);
});
test('worker errors reject and release the worker',async()=>{
 const w=worker(),pending=loadTextureBitmap('/image.webp',{}, {workerFactory:()=>w});w.onmessage({data:{error:'decode failed'}});await assert.rejects(pending,/decode failed/);assert.equal(w.terminated,1);
});
test('an already aborted request never starts a worker',async()=>{
 const signal=new AbortController();signal.abort();let started=0;
 await assert.rejects(loadTextureBitmap('/image.webp',{}, {signal:signal.signal,workerFactory:()=>{started++;return worker();}}),{name:'AbortError'});assert.equal(started,0);
});
test('a transfer failure rejects and releases the worker',async()=>{
 const w=worker(),pending=loadTextureBitmap('/image.webp',{}, {workerFactory:()=>w});w.onmessageerror();await assert.rejects(pending,/message failed/);assert.equal(w.terminated,1);assert.equal(w.onmessageerror,null);
});
test('worker phase timings are reported without changing bitmap ownership',async()=>{
 const w=worker(),bitmap={close(){throw Error('Must retain bitmap');}};let timing;
 const pending=loadTextureBitmap('/image.webp',{}, {workerFactory:()=>w,onTiming:value=>timing=value});
 const epoch=performance.timeOrigin+performance.now();w.onmessage({data:{bitmap,timing:{receivedEpochMs:epoch,postEpochMs:epoch,fetchHeadersMs:2,fetchBodyMs:3,bitmapMs:4,workerTotalMs:9}}});
 assert.equal(await pending,bitmap);assert.equal(timing.bitmapMs,4);assert.ok(timing.startupAndDispatchMs>=0);assert.ok(timing.transferAndDeliveryMs>=0);assert.ok(timing.totalMs>=0);
});
test('a failed timing observer releases the transferred bitmap and worker',async()=>{
 const w=worker();let closed=0;const pending=loadTextureBitmap('/image.webp',{}, {workerFactory:()=>w,onTiming:()=>{throw Error('observer failed');}});
 w.onmessage({data:{bitmap:{close(){closed++;}},timing:{}}});await assert.rejects(pending,/observer failed/);assert.equal(closed,1);assert.equal(w.terminated,1);
});
