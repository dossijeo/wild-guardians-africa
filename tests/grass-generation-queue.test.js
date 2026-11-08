import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrassGenerationQueue} from '../src/rendering/grass-generation-queue.js';
function fakeWorker(){const listeners=new Map(),messages=[];return {messages,addEventListener(name,fn){listeners.set(name,fn);},postMessage(message){messages.push(message);},terminate(){this.terminated=true;},emit(name,data){listeners.get(name)?.(data);}};}
test('queue coalesces by chunk, snapshots inputs, and drops superseded results',async()=>{
 const worker=fakeWorker(),queue=createGrassGenerationQueue(worker),input={values:[1]};
 const a=queue.submit('a',input);input.values[0]=2;const b=queue.submit('b',input);const old=queue.submit('a',input);input.values[0]=3;const latest=queue.submit('a',input);
 assert.equal(await a,null);assert.equal(await old,null);assert.deepEqual(worker.messages[0].request,{values:[1]});assert.deepEqual(queue.status(),{closed:false,active:1,queued:2});
 worker.emit('message',{data:{id:999,result:'wrong'}});assert.equal(worker.messages.length,1);
 worker.emit('message',{data:{id:worker.messages[0].id,result:'stale'}});assert.equal(worker.messages[1].request.values[0],2);
 worker.emit('message',{data:{id:worker.messages[1].id,result:'b'}});assert.equal(await b,'b');assert.equal(worker.messages[2].request.values[0],3);
 worker.emit('message',{data:{id:worker.messages[2].id,result:'latest'}});assert.equal(await latest,'latest');queue.dispose();assert.equal(worker.terminated,true);
});
test('cancellation and worker failure settle every waiting request',async()=>{
 const worker=fakeWorker(),queue=createGrassGenerationQueue(worker),a=queue.submit('a',{}),b=queue.submit('b',{});queue.cancel('a');assert.equal(await a,null);worker.emit('error',{message:'failed'});await assert.rejects(b,/failed/);assert.deepEqual(queue.status(),{closed:true,active:0,queued:0});await assert.rejects(queue.submit('x',{}),/closed/);
});
