import test from 'node:test';import assert from 'node:assert/strict';
import {TextureBitmapWorkerPool} from '../tools/experiments/texture-bitmap-worker-pool.js';
function setup(){const workers=[];const pool=new TextureBitmapWorkerPool({workerFactory:()=>{const w={sent:[],terminated:0,postMessage(value){this.sent.push(value);},terminate(){this.terminated++;}};workers.push(w);return w;}});return {pool,workers};}
test('serial requests reuse one worker and transfer ownership to callers',async()=>{
 const {pool,workers}=setup(),a=pool.load('a',{}),b=pool.load('b',{}),bitmap={close(){throw Error('Retained');}};
 assert.equal(workers.length,1);assert.equal(workers[0].sent.length,1);workers[0].onmessage({data:{bitmap}});assert.equal(await a,bitmap);assert.equal(workers[0].sent[1].url,'b');workers[0].onmessage({data:{bitmap}});assert.equal(await b,bitmap);assert.equal(workers.length,1);pool.dispose();assert.equal(workers[0].terminated,1);
});
test('cancelling a queued request leaves the active decode intact',async()=>{
 const {pool,workers}=setup(),signal=new AbortController(),a=pool.load('a',{}),b=pool.load('b',{}, {signal:signal.signal});signal.abort();await assert.rejects(b,{name:'AbortError'});assert.equal(workers[0].terminated,0);workers[0].onmessage({data:{bitmap:{}}});await a;assert.equal(workers[0].sent.length,1);pool.dispose();
});
test('active cancellation replaces worker and closes stale transfers',async()=>{
 const {pool,workers}=setup(),signal=new AbortController(),a=pool.load('a',{}, {signal:signal.signal}),late=workers[0].onmessage,b=pool.load('b',{});signal.abort();await assert.rejects(a,{name:'AbortError'});assert.equal(workers[0].terminated,1);assert.equal(workers.length,2);let closed=0;late({data:{bitmap:{close(){closed++;}}}});assert.equal(closed,1);workers[1].onmessage({data:{bitmap:{}}});await b;pool.dispose();
});
test('dispose rejects active and queued requests and prevents later work',async()=>{
 const {pool,workers}=setup(),a=pool.load('a',{}),b=pool.load('b',{});pool.dispose();await assert.rejects(a,/disposed/);await assert.rejects(b,/disposed/);await assert.rejects(pool.load('c',{}),/disposed/);pool.dispose();assert.equal(workers[0].terminated,1);
});
test('worker failure rejects current request and restarts queued work',async()=>{
 const {pool,workers}=setup(),a=pool.load('a',{}),b=pool.load('b',{});workers[0].onerror({message:'worker crashed'});await assert.rejects(a,/crashed/);assert.equal(workers[0].terminated,1);assert.equal(workers.length,2);workers[1].onmessage({data:{bitmap:{}}});await b;pool.dispose();
});
test('already cancelled requests do not create a worker',async()=>{
 const {pool,workers}=setup(),signal=new AbortController();signal.abort();await assert.rejects(pool.load('a',{}, {signal:signal.signal}),{name:'AbortError'});assert.equal(workers.length,0);pool.dispose();
});
test('observer failure closes bitmap and leaves the worker usable',async()=>{
 const {pool,workers}=setup();let closed=0;const a=pool.load('a',{}, {onTiming:()=>{throw Error('observer failed');}}),b=pool.load('b',{});
 workers[0].onmessage({data:{bitmap:{close(){closed++;}},timing:{}}});await assert.rejects(a,/observer failed/);assert.equal(closed,1);assert.equal(workers.length,1);workers[0].onmessage({data:{bitmap:{}}});await b;pool.dispose();
});
