import test from 'node:test';
import assert from 'node:assert/strict';
import {waitGpuPreparation} from '../tools/experiments/wait-gpu-preparation.js';

test('completed warm compilation requires no additional animation frame',async()=>{
 let checks=0;
 await waitGpuPreparation(Promise.resolve(),{check:()=>checks++,nextFrame:()=>assert.fail('extra frame')});
 assert.equal(checks,1);
});

test('an owner can cancel a compilation that never resolves',async()=>{
 const cancelled=Error('owner closed');let closed=false,frames=0;
 await assert.rejects(waitGpuPreparation(new Promise(()=>{}),{
  check:()=>{if(closed)throw cancelled;},
  nextFrame:async()=>{frames++;closed=true;}
 }),error=>error===cancelled);
 assert.equal(frames,1);
});

test('context restoration cannot admit an earlier pending compilation',async()=>{
 let revision=7;
 await assert.rejects(waitGpuPreparation(new Promise(()=>{}),{
  check:()=>{if(revision!==7)throw Error('context generation changed');},
  nextFrame:async()=>{revision=9;}
 }),/context generation changed/);
});

test('a cooperative deadline does not depend on compilation settlement',async()=>{
 let elapsed=0;
 await assert.rejects(waitGpuPreparation(new Promise(()=>{}),{
  check:()=>{if(elapsed>30_000)throw Error('GPU preparation timed out');},
  nextFrame:async()=>{elapsed+=10_001;}
 }),/GPU preparation timed out/);
 assert.equal(elapsed,30_003);
});

test('compilation waits for completion and then rechecks lifetime',async()=>{
 let resolve,frames=0,checks=0;
 const pending=new Promise(done=>resolve=done);
 await waitGpuPreparation(pending,{
  check:()=>checks++,
  nextFrame:async()=>{if(++frames===2)resolve();}
 });
 assert.equal(frames,2);assert.equal(checks,3);
});

test('real compilation failure remains intact when it races cancellation',async()=>{
 const failure=Error('shader compile failed');let reject,closed=false;
 const pending=new Promise((resolve,fail)=>reject=fail);
 await assert.rejects(waitGpuPreparation(pending,{
  check:()=>{if(closed)throw Error('owner closed');},
  nextFrame:async()=>{closed=true;reject(failure);}
 }),error=>error===failure);
});

test('late rejected driver work is handled after cancellation, without adopting resources',async()=>{
 let reject,closed=false,adopted=false;
 const pending=new Promise((resolve,fail)=>reject=fail);
 await assert.rejects(waitGpuPreparation(pending,{
  check:()=>{if(closed)throw Error('owner closed');},
  nextFrame:async()=>{closed=true;}
 }).then(()=>{adopted=true;}),/owner closed/);
 reject(Error('late driver failure'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(adopted,false);
});

test('an already failed compilation does not yield and preserves even non-Error rejection',async()=>{
 const rejection={driver:'lost'};
 await assert.rejects(waitGpuPreparation(Promise.reject(rejection),{
  check:()=>assert.fail('failure should propagate'),nextFrame:()=>assert.fail('extra frame')
 }),error=>error===rejection);
});
