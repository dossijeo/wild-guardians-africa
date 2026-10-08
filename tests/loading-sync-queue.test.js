import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingSyncQueue} from '../src/rendering/loading-sync-queue.js';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('one accumulated CPU budget spreads 36 expensive synchronous tasks in order',async()=>{
 let clock=0,frames=0;const order=[],queue=new LoadingSyncQueue({now:()=>clock,nextFrame:()=>{frames++;return Promise.resolve();}});
 const work=Array.from({length:36},(_,i)=>queue.run(()=>{order.push(i);clock+=7;return i;}));
 assert.deepEqual(await Promise.all(work),Array.from({length:36},(_,i)=>i));assert.deepEqual(order,Array.from({length:36},(_,i)=>i));assert.equal(frames,35);assert.equal(queue.stats.cpuMs,252);assert.equal(queue.stats.completed,36);queue.dispose();
});
test('cheap tasks share the frame without an obligatory yield per actor; idle pump restarts',async()=>{
 let clock=0,frames=0;const queue=new LoadingSyncQueue({now:()=>clock,nextFrame:()=>{frames++;return Promise.resolve();}});
 await Promise.all(Array.from({length:36},(_,i)=>queue.run(()=>{clock+=.1;return i;})));assert.equal(frames,0);await flush();assert.equal(await queue.run(()=>42),42);queue.dispose();
});
test('owner abort wakes a suspended RAF and rejects queued work without late adoption',async()=>{
 const owner=new AbortController();let clock=0,resolveFrame,adoptions=0;const queue=new LoadingSyncQueue({signal:owner.signal,now:()=>clock,nextFrame:()=>new Promise(r=>resolveFrame=r)});
 const first=queue.run(()=>{clock+=7;});const pending=queue.run(()=>adoptions++);const rejected=assert.rejects(pending,{name:'AbortError'});await first;await flush();owner.abort();await rejected;resolveFrame();await flush();assert.equal(adoptions,0);assert.equal(queue.closed,true);queue.dispose();
});
test('deadline and context epoch are checked independently of suspended RAF',async()=>{
 for(const mode of ['deadline','epoch']){let clock=0,epoch=0,adoptions=0;const queue=new LoadingSyncQueue({getEpoch:()=>epoch,now:()=>clock,timeout:10,pollIntervalMs:2,nextFrame:()=>new Promise(()=>{})});const first=queue.run(()=>{clock+=7;});const second=queue.run(()=>adoptions++);const rejected=assert.rejects(second,{name:mode==='epoch'?'AbortError':'TimeoutError'});await first;await flush();if(mode==='epoch')epoch++;else clock=100;await rejected;assert.equal(adoptions,0);assert.equal(queue.closed,true);}
});
test('already aborted owner never runs a task',async()=>{const owner=new AbortController();owner.abort();const queue=new LoadingSyncQueue({signal:owner.signal});await assert.rejects(queue.run(()=>assert.fail()),{name:'AbortError'});});
test('individual failure and diagnostic failure preserve success of following synchronous jobs',async()=>{
 const error=Error('native clone');const queue=new LoadingSyncQueue({onDiagnostic:()=>{throw Error('diagnostic');}});const failed=assert.rejects(queue.run(()=>{throw error;}),e=>e===error);assert.equal(await queue.run(()=>42),42);await failed;assert.equal(queue.stats.failed,1);queue.dispose();
});
test('async jobs are rejected and their later failures remain observed',async()=>{let reject;const queue=new LoadingSyncQueue();await assert.rejects(queue.run(()=>new Promise((resolve,r)=>reject=r)),{name:'TypeError'});reject(Error('late'));await flush();queue.dispose();});
test('validation rejects unusable budgets and tasks',async()=>{assert.throws(()=>new LoadingSyncQueue({frameBudget:0}),RangeError);const queue=new LoadingSyncQueue();await assert.rejects(queue.run(null),TypeError);queue.dispose();await assert.rejects(queue.run(()=>1),{name:'AbortError'});});

test('serial promise continuations keep accumulated CPU until a real frame, including empty queues',async()=>{let clock=0,frames=0;const queue=new LoadingSyncQueue({now:()=>clock,nextFrame:()=>{frames++;return Promise.resolve();}});for(let i=0;i<36;i++){await queue.run(()=>{clock+=7;});await flush();}assert.equal(frames,35);queue.dispose();});
