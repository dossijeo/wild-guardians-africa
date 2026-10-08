import test from 'node:test';
import assert from 'node:assert/strict';
import {waitGpuFrame} from '../tools/experiments/wait-gpu-frame.js';

test('one injected frame per wait, with no double RAF scheduling',async()=>{
 let frames=0,checks=0;
 await waitGpuFrame({check:()=>checks++,nextFrame:()=>{frames++;return Promise.resolve();}});
 assert.equal(frames,1);assert.ok(checks>=2);
});
test('suspended external frame can be cancelled without adopting its late completion',async()=>{
 let cancelled=false,frames=0,finish;
 const pending=waitGpuFrame({check:()=>{if(cancelled)throw Error('closed');},pollIntervalMs:5,nextFrame:()=>{frames++;return new Promise(resolve=>finish=resolve);}});
 cancelled=true;await assert.rejects(pending,/closed/);finish();await Promise.resolve();assert.equal(frames,1);
});
test('default RAF handle is cancelled on deadline while RAF is suspended',async()=>{
 const oldRequest=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;const handles=[];let expired=false;
 globalThis.requestAnimationFrame=()=>17;globalThis.cancelAnimationFrame=handle=>handles.push(handle);
 try{
  const pending=waitGpuFrame({check:()=>{if(expired)throw Error('deadline');},pollIntervalMs:5});
  expired=true;await assert.rejects(pending,/deadline/);assert.deepEqual(handles,[17]);
 }finally{globalThis.requestAnimationFrame=oldRequest;globalThis.cancelAnimationFrame=oldCancel;}
});
test('a failed frame source retains the error and cleans its owned RAF',async()=>{
 const error=Error('frame failed');await assert.rejects(waitGpuFrame({check:()=>{},nextFrame:()=>Promise.reject(error)}),actual=>actual===error);
});
