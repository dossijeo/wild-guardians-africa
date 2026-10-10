import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeLoadingTrace} from '../src/app/native-loading-trace.js';
import {loadingAwaitWitness,loadingSyncWitness} from '../src/rendering/loading-sync-witness.js';

test('disabled trace allocates no collector and original awaited promise remains exact',()=>{
 assert.equal(createNativeLoadingTrace(),null);const promise=Promise.resolve(7);
 assert.equal(loadingAwaitWitness(null,'load',()=>promise,()=>assert.fail('disabled clock')),promise);
});
test('a stalled phase is observable before settlement, with independent same-label ownership',async()=>{
 const trace=createNativeLoadingTrace({enabled:true});let resolveA,resolveB,at=10;
 const a=loadingAwaitWitness(trace.witness,'load',()=>new Promise(resolve=>{resolveA=resolve;}),()=>at);
 at=20;const b=loadingAwaitWitness(trace.witness,'load',()=>new Promise(resolve=>{resolveB=resolve;}),()=>at);
 assert.deepEqual(trace.snapshot({at:50}).pending.map(p=>p.elapsedMs),[40,30]);
 at=60;resolveB(2);assert.equal(await b,2);assert.equal(trace.snapshot().pending[0].start,10);
 at=80;resolveA(1);assert.equal(await a,1);
 assert.equal(trace.snapshot().pending.length,0);const summary=trace.snapshot().completed[0];
 assert.equal(summary.count,2);assert.equal(summary.totalElapsedMs,110);assert.equal(summary.maxElapsedMs,70);
});
test('original throws and rejections retain identity and release pending ownership',async()=>{
 const trace=createNativeLoadingTrace({enabled:true}),failure=Error('original');
 assert.throws(()=>loadingAwaitWitness(trace.witness,'throw',()=>{throw failure;}),e=>e===failure);
 await assert.rejects(loadingAwaitWitness(trace.witness,'reject',()=>Promise.reject(failure)),e=>e===failure);
 assert.equal(trace.snapshot().pending.length,0);assert.equal(trace.snapshot().completed.reduce((n,s)=>n+s.failed,0),2);
});
test('diagnostic callbacks cannot alter production success or failure, or emit extra ordinary span rows',async()=>{
 const rows=[],witness=row=>rows.push(row);witness.onAwaitStart=()=>{throw Error('diagnostic');};witness.onAwaitEnd=()=>assert.fail('start failed');
 assert.equal(await loadingAwaitWitness(witness,'success',()=>Promise.resolve(42)),42);assert.equal(rows.length,1);
 witness.onAwaitStart=()=>({});witness.onAwaitEnd=()=>{throw Error('end diagnostic');};
 const failure=Error('real');await assert.rejects(loadingAwaitWitness(witness,'failure',()=>Promise.reject(failure)),e=>e===failure);assert.equal(rows.length,2);
});
test('bounded storage, immutable snapshots and close prevent retained callbacks from recording late work',async()=>{
 const trace=createNativeLoadingTrace({enabled:true,maxPending:1,maxLabels:1});let finish;
 const pending=loadingAwaitWitness(trace.witness,'pending',()=>new Promise(resolve=>{finish=resolve;}));
 trace.witness.onAwaitStart({label:'overflow',start:0});assert.equal(trace.snapshot().droppedPending,1);
 loadingSyncWitness(trace.witness,'sync',()=>1);loadingSyncWitness(trace.witness,'other',()=>2);
 const snapshot=trace.snapshot();snapshot.pending[0].label='modified';snapshot.completed[0].count=900;
 assert.equal(trace.snapshot().pending[0].label,'pending');assert.equal(trace.snapshot().completed[0].count,1);assert.equal(trace.snapshot().droppedLabels,1);
 const closed=trace.close();finish(9);assert.equal(await pending,9);assert.deepEqual(trace.snapshot(),closed);
});
