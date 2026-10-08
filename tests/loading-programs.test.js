import test from 'node:test';
import assert from 'node:assert/strict';
import {compileLoadingPrograms} from '../src/rendering/loading-programs.js';
import {Vector4} from 'three';
function fixture(program){const material={},gl={isContextLost:()=>false};return {material,renderer:{compile:()=>new Set([material]),properties:{get:()=>({currentProgram:program})},getContext:()=>gl}};}
test('loading compilation snapshots programs before borrowed materials are restored',async()=>{let ready=false;const original={isReady:()=>ready},f=fixture(original);const pending=compileLoadingPrograms(f.renderer,{},{});f.renderer.properties.get=()=>({currentProgram:{isReady:()=>false}});ready=true;await pending;});
test('loading compilation cancellation releases a pending poll immediately',async()=>{const abort=new AbortController(),f=fixture({isReady:()=>false});const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{signal:abort.signal});abort.abort();await assert.rejects(pending,/cancelled/);});
test('loading compilation reports timeout without an indefinite poll',async()=>{let clock=0;const f=fixture({isReady:()=>false});const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{now:()=>clock,timeout:1});clock=2;await assert.rejects(pending,/timed out/);});
test('loading compilation rejects a destroyed owner before submitting programs',()=>{const f=fixture({isReady:()=>true});f.renderer.compile=()=>{throw Error('must not compile');};assert.throws(()=>compileLoadingPrograms(f.renderer,{},{},undefined,{cancelled:()=>true}),/cancelled/);});

test('explicit screen compilation restores target and viewport while its program is still pending',async()=>{
 let ready=false,target={depth:true};const previous=target,f=fixture({isReady:()=>ready}),viewport=new Vector4(1,2,3,4),scissor=new Vector4(4,3,2,1);let test=true;
 Object.assign(f.renderer,{getRenderTarget:()=>target,setRenderTarget:value=>{target=value;viewport.set(0,0,900,600);},getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>test,setViewport:v=>viewport.copy(v),setScissor:v=>scissor.copy(v),setScissorTest:v=>{test=v;},compile:()=>{assert.equal(target,null);return new Set([f.material]);}});
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{screen:true});assert.equal(target,previous);assert.deepEqual(viewport.toArray(),[1,2,3,4]);assert.deepEqual(scissor.toArray(),[4,3,2,1]);assert.equal(test,true);ready=true;await pending;
 f.renderer.compile=()=>{assert.equal(target,null);throw Error('compile fault');};assert.throws(()=>compileLoadingPrograms(f.renderer,{},{},undefined,{screen:true}),/compile fault/);assert.equal(target,previous);assert.deepEqual(viewport.toArray(),[1,2,3,4]);
});

import {compileLoadingProgramsBatched} from '../src/rendering/loading-programs.js';
test('bounded compiler retains original native objects and target-scene lighting without mutation',async()=>{
 const gl={isContextLost:()=>false};const objects=Array.from({length:7},(_,i)=>({isMesh:true,visible:i!==2,parent:{id:i},material:{id:i}}));
 const scene={traverse:fn=>objects.forEach(fn)},calls=[];let yields=0;
 const renderer={compile(view,camera,target){assert.equal(target,scene);const batch=[];view.traverse(object=>batch.push(object));view.traverseVisible(()=>assert.fail('light duplicated'));calls.push(batch);return new Set(batch.map(o=>o.material));},getContext:()=>gl,properties:{get:()=>({currentProgram:{isReady:()=>true}})}};
 const parents=objects.map(o=>o.parent);
 await compileLoadingProgramsBatched(renderer,scene,{},undefined,{batchSize:3,nextFrame:async()=>{yields++;assert.deepEqual(objects.map(o=>o.parent),parents);assert.equal(objects[2].visible,false);}});
 assert.deepEqual(calls.map(c=>c.length),[3,3,1]);assert.deepEqual(calls.flat(),objects);assert.equal(yields,3);
});
test('bounded compiler cancels before a later submission',async()=>{
 const gl={isContextLost:()=>false};let cancelled=false,calls=0;const scene={traverse:fn=>[1,2].forEach(()=>fn({isMesh:true}))};
 const renderer={compile:()=>{calls++;return new Set();},getContext:()=>gl,properties:{get:()=>({})}};
 await assert.rejects(compileLoadingProgramsBatched(renderer,scene,{},undefined,{batchSize:1,cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);assert.equal(calls,1);
});

test('compilation readiness includes every native variant of a shared material',async()=>{let ready=false;const f=fixture({isReady:()=>true});f.renderer.properties.get=()=>({currentProgram:{isReady:()=>true},programs:new Map([['instanced',{isReady:()=>ready}],['plain',{isReady:()=>true}]])});let resolved=false;const pending=compileLoadingPrograms(f.renderer,{},{}).then(()=>{resolved=true;});await Promise.resolve();assert.equal(resolved,false);ready=true;await pending;assert.equal(resolved,true);});


test('loading compilation latches loss and restoration before another program query',async()=>{
 const canvas=new EventTarget(),gl={canvas,isContextLost:()=>false};let queries=0,closed=false;
 const f=fixture({isReady:()=>{assert.equal(closed,false);queries++;return false;}});f.renderer.getContext=()=>gl;
 const pending=compileLoadingPrograms(f.renderer,{},{});canvas.dispatchEvent(new Event('webglcontextlost'));closed=true;
 await assert.rejects(pending,/cancelled/);const final=queries;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(queries,final);
});

test('loading compilation rejects generation changes even without a loss event',async()=>{
 let epoch=0,queries=0;const f=fixture({isReady:()=>{assert.equal(epoch,0);queries++;return false;}});
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{getEpoch:()=>epoch});epoch++;
 await assert.rejects(pending,/cancelled/);assert.equal(queries,1);
});
