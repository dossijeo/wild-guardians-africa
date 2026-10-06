import test from 'node:test';import assert from 'node:assert/strict';import {Vector4} from 'three';
import {renderScreenPreload,waitForGpuPreload} from '../src/rendering/screen-preload.js';
test('screen preload retains the target and restores viewport, scissor and clearing after a draw error',()=>{
 const viewport=new Vector4(1,2,300,200),scissor=new Vector4(3,4,100,80),target={},renderer={autoClear:true,test:false,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest(){return this.test;},setViewport(...args){viewport.copy(args[0]?.isVector4?args[0]:new Vector4(...args));},setScissor(...args){scissor.copy(args[0]?.isVector4?args[0]:new Vector4(...args));},setScissorTest(value){this.test=value;},getRenderTarget:()=>target,render(){assert.deepEqual(viewport.toArray(),[0,0,0,0]);assert.deepEqual(scissor.toArray(),[0,0,0,0]);assert.equal(this.autoClear,false);assert.equal(this.test,true);assert.equal(this.getRenderTarget(),target);throw Error('draw failed');}};
 assert.throws(()=>renderScreenPreload(renderer,{},{}),/draw failed/);assert.deepEqual(viewport.toArray(),[1,2,300,200]);assert.deepEqual(scissor.toArray(),[3,4,100,80]);assert.equal(renderer.autoClear,true);assert.equal(renderer.test,false);
});
function setup(statuses){const sync={},calls=[];const gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,TIMEOUT_EXPIRED:5,isContextLost:()=>false,fenceSync:(...args)=>{calls.push(['fence',...args]);return sync;},flush:()=>calls.push(['flush']),clientWaitSync:(...args)=>{calls.push(['wait',...args]);return statuses.shift()??3;},deleteSync:value=>calls.push(['delete',value])};return {gl,calls,sync,renderer:{getContext:()=>gl}};}
test('GPU readiness waits across frames without a blocking wait and deletes the fence',async()=>{
 const {renderer,calls,sync}=setup([5,5,3]);let frames=0;await waitForGpuPreload(renderer,{nextFrame:async()=>{frames++;}});assert.equal(frames,2);assert.deepEqual(calls.filter(c=>c[0]==='wait'),[['wait',sync,0,0],['wait',sync,0,0],['wait',sync,0,0]]);assert.deepEqual(calls.at(-1),['delete',sync]);
});
test('cancellation while waiting rejects readiness and releases its fence',async()=>{
 const {renderer,calls,sync}=setup([5]);let cancelled=false;await assert.rejects(waitForGpuPreload(renderer,{cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);assert.deepEqual(calls.at(-1),['delete',sync]);
});
test('failed and expired waits release their fences',async()=>{
 const failed=setup([4]);await assert.rejects(waitForGpuPreload(failed.renderer),/fence failed/);assert.equal(failed.calls.at(-1)[0],'delete');
 const expired=setup([5]);let time=0;await assert.rejects(waitForGpuPreload(expired.renderer,{timeout:10,now:()=>time,nextFrame:async()=>{time=11;}}),/timed out/);assert.equal(expired.calls.at(-1)[0],'delete');
});
