import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderCpuCalls} from './browser/render-cpu-calls.js';

test('inclusive CPU scopes preserve calls/errors, omit out-of-frame work and restore method ownership',()=>{
 let time=0;const target={sync(x){assert.equal(this,target);time+=3;if(x==='fail')throw Error('failure');return x;}},probe=new RenderCpuCalls(target,()=>time),original=probe.hooks[0].original;
 assert.equal(target.sync(7),7);probe.begin();assert.equal(target.sync(9),9);assert.throws(()=>target.sync('fail'),/failure/);assert.throws(()=>probe.begin(),/Nested/);
 assert.deepEqual(probe.end(),{'world.sync':{calls:2,totalMs:6,maximumMs:3}});target.sync(1);probe.dispose();assert.equal(target.sync,original);
});

test('nested scopes are inclusive and a newer hook remains owned by its installer',()=>{
 let time=0;const world={assetGroups:{update(){time+=2;}},sync(){time+=1;this.assetGroups.update();time+=1;}},probe=new RenderCpuCalls(world,()=>time);
 probe.begin();world.sync();const rows=probe.end();assert.equal(rows['world.sync'].totalMs,4);assert.equal(rows['groups.update'].totalMs,2);
 const later=()=>{};world.sync=later;probe.dispose();assert.equal(world.sync,later);
});

test('a failing constructor rolls back inherited methods and existing hooks',()=>{
 const original=()=>{},world=Object.create({syncChunks:original});Object.defineProperty(world,'sync',{value:()=>{},writable:false});
 assert.throws(()=>new RenderCpuCalls(world),TypeError);assert.equal(Object.hasOwn(world,'syncChunks'),false);assert.equal(world.syncChunks,original);
});


test('optional framebuffer scopes retain target arguments, nested timings and ownership; default leaves them untouched',()=>{
 let time=0,target=null;const depth={setSize(w,h){assert.equal(this,depth);assert.deepEqual([w,h],[20,10]);time+=1;}},gl={bindFramebuffer(value){assert.equal(this,gl);assert.equal(value,depth);time+=2;}},renderer={getContext:()=>gl,getRenderTarget:()=>target,setRenderTarget(value){assert.equal(this,renderer);target=value;gl.bindFramebuffer(value);time+=3;}},world={renderer,destructionPass:{smokeDepth:depth}};
 const original=renderer.setRenderTarget,plain=new RenderCpuCalls(world,()=>time);assert.equal(renderer.setRenderTarget,original);plain.dispose();
 const probe=new RenderCpuCalls(world,()=>time,{submission:true});probe.begin();renderer.setRenderTarget(depth);depth.setSize(20,10);const rows=probe.end();assert.equal(rows['renderer.target.depth'].totalMs,5);assert.equal(rows['gl.bindFramebuffer'].totalMs,2);assert.equal(rows['depthTarget.setSize'].totalMs,1);probe.dispose();assert.equal(renderer.setRenderTarget,original);
});
