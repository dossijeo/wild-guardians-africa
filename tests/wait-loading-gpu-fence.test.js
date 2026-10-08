import test from 'node:test';
import assert from 'node:assert/strict';
import {waitLoadingGpuFence} from '../tools/experiments/wait-loading-gpu-fence.js';
function fixture(statuses=[5]) {
 const canvas=new EventTarget(),calls=[],sync={};let epoch=0;
 const gl={canvas,SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,TIMEOUT_EXPIRED:5,isContextLost:()=>false,fenceSync:(...args)=>{calls.push(['fence',...args]);return sync;},flush:()=>calls.push(['flush']),clientWaitSync:(...args)=>{calls.push(['wait',...args]);return statuses.shift()??3;},deleteSync:value=>calls.push(['delete',value])};
 return {gl,calls,sync,renderer:{getContext:()=>gl},getEpoch:()=>epoch,lose(){epoch++;canvas.dispatchEvent(new Event('webglcontextlost'));}};
}
test('candidate fence submits once, waits nonblocking and deletes current handle',async()=>{
 const f=fixture([5,5,3]);let frames=0;
 await waitLoadingGpuFence(f.renderer,{nextFrame:async()=>{frames++;},getEpoch:f.getEpoch});
 assert.equal(frames,2);assert.equal(f.calls.filter(c=>c[0]==='fence').length,1);
 assert.deepEqual(f.calls.filter(c=>c[0]==='wait'),Array.from({length:3},()=>['wait',f.sync,0,0]));assert.deepEqual(f.calls.at(-1),['delete',f.sync]);
});
test('owner abort rejects even if RAF never completes and observes late frame failure',async()=>{
 const f=fixture(),abort=new AbortController();let rejectFrame,frames=0;
 const pending=waitLoadingGpuFence(f.renderer,{signal:abort.signal,nextFrame:()=>{frames++;return new Promise((resolve,reject)=>{rejectFrame=reject;});}});
 await Promise.resolve();abort.abort();await assert.rejects(pending,/cancelled/);
 assert.equal(frames,1);assert.deepEqual(f.calls.at(-1),['delete',f.sync]);rejectFrame(Error('late frame'));await new Promise(resolve=>setTimeout(resolve,0));
});
test('deadline is checked by timer while the requested RAF is suspended',async()=>{
 const f=fixture();let clock=0;
 const pending=waitLoadingGpuFence(f.renderer,{now:()=>clock,timeout:1,pollIntervalMs:2,nextFrame:()=>new Promise(()=>{})});clock=2;
 await assert.rejects(pending,/timed out/);assert.deepEqual(f.calls.at(-1),['delete',f.sync]);
});
test('loss restored before polling never queries or deletes the stale fence',async()=>{
 const f=fixture();let resolveFrame;
 const pending=waitLoadingGpuFence(f.renderer,{getEpoch:f.getEpoch,nextFrame:()=>new Promise(resolve=>{resolveFrame=resolve;})});
 await Promise.resolve();f.lose();resolveFrame();await assert.rejects(pending,/cancelled/);
 assert.equal(f.calls.filter(c=>c[0]==='wait').length,1);assert.equal(f.calls.filter(c=>c[0]==='delete').length,0);
});
test('context-loss latch covers restored context even without an epoch callback',async()=>{
 const f=fixture();let resolveFrame;
 const pending=waitLoadingGpuFence(f.renderer,{nextFrame:()=>new Promise(resolve=>{resolveFrame=resolve;})});
 await Promise.resolve();f.gl.canvas.dispatchEvent(new Event('webglcontextlost'));resolveFrame();await assert.rejects(pending,/cancelled/);
 assert.equal(f.calls.filter(c=>c[0]==='wait').length,1);assert.equal(f.calls.filter(c=>c[0]==='delete').length,0);
});
test('failure releases fence; already cancelled owner submits nothing',async()=>{
 const failed=fixture([4]);await assert.rejects(waitLoadingGpuFence(failed.renderer),/fence failed/);assert.deepEqual(failed.calls.at(-1),['delete',failed.sync]);
 const aborted=fixture();await assert.rejects(waitLoadingGpuFence(aborted.renderer,{cancelled:()=>true}),/cancelled/);assert.deepEqual(aborted.calls,[]);
});
test('default pending RAF is cancelled and loss listener removed after owner abort',async()=>{
 const oldRequest=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
 const f=fixture(),abort=new AbortController();let callback;const cancelled=[];let listeners=0;
 const add=f.gl.canvas.addEventListener.bind(f.gl.canvas),remove=f.gl.canvas.removeEventListener.bind(f.gl.canvas);
 f.gl.canvas.addEventListener=(...args)=>{listeners++;add(...args);};f.gl.canvas.removeEventListener=(...args)=>{listeners--;remove(...args);};
 globalThis.requestAnimationFrame=cb=>{callback=cb;return 7;};globalThis.cancelAnimationFrame=id=>cancelled.push(id);
 try{const pending=waitLoadingGpuFence(f.renderer,{signal:abort.signal});await Promise.resolve();abort.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(cancelled,[7]);assert.equal(listeners,0);callback();assert.equal(f.calls.filter(c=>c[0]==='wait').length,1);}
 finally{globalThis.requestAnimationFrame=oldRequest;globalThis.cancelAnimationFrame=oldCancel;}
});
