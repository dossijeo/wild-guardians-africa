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
