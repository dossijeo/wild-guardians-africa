import test from 'node:test';import assert from 'node:assert/strict';
import {FarSceneStream} from '../tools/experiments/far-scene-stream.js';
function fixture(){const jobs=[];const stream=new FarSceneStream({load:(request,{signal})=>new Promise((resolve,reject)=>jobs.push({request,signal,resolve,reject}))});return {stream,jobs};}
test('stream retains complete region during a replacement and ignores stale completion',async()=>{
 const {stream,jobs}=fixture(),a=stream.request('a',{x:0});await Promise.resolve();jobs[0].resolve({data:'a'});await a;
 const b=stream.request('b',{x:1});await Promise.resolve();assert.equal(stream.current.value.data,'a');
 const c=stream.request('c',{x:2});await Promise.resolve();assert.equal(jobs[1].signal.aborted,true);jobs[1].resolve({data:'b'});assert.equal(await b,null);assert.equal(stream.current.value.data,'a');
 jobs[2].resolve({data:'c'});assert.equal((await c).data,'c');assert.equal(stream.current.key,'c');assert.equal(stream.pending,null);stream.dispose();
});
test('duplicate requests share a worker and completed keys reuse the resident result',async()=>{
 const {stream,jobs}=fixture(),a=stream.request('a',{}),b=stream.request('a',{});assert.equal(a,b);await Promise.resolve();assert.equal(jobs.length,1);jobs[0].resolve({data:1});await a;assert.equal((await stream.request('a',{})).data,1);assert.equal(jobs.length,1);
});
test('failure preserves old region and can be retried; obsolete errors do not replace current errors',async()=>{
 const {stream,jobs}=fixture(),a=stream.request('a',{});await Promise.resolve();jobs[0].resolve({data:'a'});await a;
 const b=stream.request('b',{});await Promise.resolve();jobs[1].reject(Error('failure'));await assert.rejects(b,/failure/);assert.equal(stream.current.key,'a');
 const retry=stream.request('b',{});await Promise.resolve();assert.equal(stream.error,null);const c=stream.request('c',{});await Promise.resolve();jobs[2].reject(Error('obsolete'));assert.equal(await retry,null);assert.equal(stream.error,null);jobs[3].resolve({data:'c'});await c;
});
test('dispose aborts once and late arrays cannot become resident; queued obsolete loads never start',async()=>{
 const {stream,jobs}=fixture(),a=stream.request('a',{}),b=stream.request('b',{});await Promise.resolve();assert.equal(jobs.length,1);assert.deepEqual(jobs[0].request,{});assert.equal(await a,null);stream.dispose();stream.dispose();assert.equal(jobs[0].signal.aborted,true);jobs[0].resolve({data:'late'});assert.equal(await b,null);assert.equal(stream.current,null);assert.equal(await stream.request('new',{}),null);
});

test('returning to the resident region cancels an intermediate load without regeneration',async()=>{
 const {stream,jobs}=fixture(),a=stream.request('a',{});await Promise.resolve();jobs[0].resolve({data:'a'});await a;
 const b=stream.request('b',{});await Promise.resolve();assert.equal((await stream.request('a',{})).data,'a');assert.equal(jobs[1].signal.aborted,true);assert.equal(jobs.length,2);jobs[1].resolve({data:'b'});assert.equal(await b,null);assert.equal(stream.current.key,'a');
});
