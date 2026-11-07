import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSkyPixelsAsync} from '../src/rendering/prepare-sky-pixels.js';
test('sky decode transfers the input and closes the worker after success',async()=>{
 let worker,terminated=0;const buffer=new ArrayBuffer(8),result={image:{pixels:new Uint8Array(4)},environment:{pixels:new Uint8Array(4)}};
 const pending=prepareSkyPixelsAsync(buffer,1,{workerAvailable:true,createWorker:()=>worker={terminate(){terminated++;},postMessage(message,transfer){assert.equal(message.buffer,buffer);assert.equal(message.index,1);assert.deepEqual(transfer,[buffer]);queueMicrotask(()=>worker.onmessage({data:result}));}}});
 assert.equal(await pending,result);assert.equal(terminated,1);
});
test('sky decode cancellation terminates and ignores late worker results',async()=>{
 const abort=new AbortController();let worker,terminated=0;const pending=prepareSkyPixelsAsync(new ArrayBuffer(8),0,{signal:abort.signal,workerAvailable:true,createWorker:()=>worker={terminate(){terminated++;},postMessage(){}}});
 abort.abort();await assert.rejects(pending,/cancelled/);worker.onmessage({data:{}});assert.equal(terminated,1);
});
test('sky decode reports worker errors and releases worker ownership',async()=>{
 let worker,terminated=0;const pending=prepareSkyPixelsAsync(new ArrayBuffer(8),0,{workerAvailable:true,createWorker:()=>worker={terminate(){terminated++;},postMessage(){queueMicrotask(()=>worker.onmessage({data:{error:'Malformed HDR'}}));}}});await assert.rejects(pending,/Malformed HDR/);assert.equal(terminated,1);
});

test('water slope demand is sent to the auxiliary sky worker',async()=>{
 let message,transfer;const result={image:{},environment:{},waterSlope:{pixels:new Uint8Array([1,2])}},buffer=new ArrayBuffer(8),worker={terminate(){},postMessage(value,list){message=value;transfer=list;queueMicrotask(()=>worker.onmessage({data:result}));}};assert.equal(await prepareSkyPixelsAsync(buffer,0,{workerAvailable:true,waterSlope:true,createWorker:()=>worker}),result);assert.equal(message.waterSlope,true);assert.equal(transfer[0],buffer);
});
