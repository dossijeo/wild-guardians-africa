import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector4} from 'three';
import {prepareMangroveCacheProgram} from '../src/rendering/prepare-mangrove-cache-program.js';

function fixture(){
 const gl={canvas:new EventTarget(),isContextLost:()=>false},original={},target={dispose(){this.disposed=true;}},viewport=new Vector4(1,2,3,4),scissor=new Vector4(4,3,2,1);let current=original,test=true;
 const renderer={getContext:()=>gl,getRenderTarget:()=>current,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>3,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>test,setRenderTarget(v){current=v;viewport.set(9,9,9,9);},setViewport:v=>viewport.copy(v),setScissor:v=>scissor.copy(v),setScissorTest:v=>{test=v;}};
 const cache={disposed:false,prepareProgram:fn=>fn({id:'scene'},{id:'camera'})};
 return {gl,renderer,cache,target,original,viewport,scissor,getCurrent:()=>current,makeTarget:()=>target};
}
test('ground program restores target and viewport before readiness and validates the selected program',async()=>{
 const f=fixture(),program={},calls=[];let ready;const gate=new Promise(resolve=>ready=resolve);
 const pending=prepareMangroveCacheProgram(f.renderer,f.cache,{makeTarget:f.makeTarget,compile:(renderer,scene,camera,target,options)=>{assert.equal(f.getCurrent(),f.target);assert.equal(target,scene);return gate.then(()=>options.onProgramReady(program));},prepareBindings:(renderer,p)=>calls.push(p)});
 assert.equal(f.getCurrent(),f.original);assert.deepEqual(f.viewport.toArray(),[1,2,3,4]);assert.deepEqual(f.scissor.toArray(),[4,3,2,1]);assert.equal(f.target.disposed,undefined);ready();assert.deepEqual(await pending,{bindings:1});assert.deepEqual(calls,[program]);assert.equal(f.target.disposed,true);
});
test('ground preparation restores state and cleans up when compilation fails synchronously',async()=>{
 const f=fixture();await assert.rejects(prepareMangroveCacheProgram(f.renderer,f.cache,{makeTarget:f.makeTarget,compile:()=>{throw Error('compile failure');}}),/compile failure/);assert.equal(f.getCurrent(),f.original);assert.deepEqual(f.viewport.toArray(),[1,2,3,4]);assert.equal(f.target.disposed,true);
});
test('ground preparation rejects a context loss before applying a ready program',async()=>{
 const f=fixture();let ready;const gate=new Promise(resolve=>ready=resolve);let validated=0;
 const pending=prepareMangroveCacheProgram(f.renderer,f.cache,{makeTarget:f.makeTarget,compile:(renderer,scene,camera,target,options)=>gate.then(()=>options.onProgramReady({})),prepareBindings:()=>validated++});
 f.gl.canvas.dispatchEvent(new Event('webglcontextlost'));ready();await assert.rejects(pending,/cancelled/);assert.equal(validated,0);assert.equal(f.target.disposed,true);assert.equal(f.getCurrent(),f.original);
});
test('ground preparation rejects disposed cache and abort before submission',async()=>{
 const f=fixture();f.cache.disposed=true;await assert.rejects(prepareMangroveCacheProgram(f.renderer,f.cache,{makeTarget:f.makeTarget,compile:()=>assert.fail()}),/cancelled/);const abort=new AbortController();abort.abort();f.cache.disposed=false;await assert.rejects(prepareMangroveCacheProgram(f.renderer,f.cache,{signal:abort.signal,makeTarget:f.makeTarget,compile:()=>assert.fail()}),/cancelled/);
});
test('ground preparation aborts real compiler readiness without another frame',async()=>{
 const f=fixture(),abort=new AbortController(),material={};let queries=0;f.renderer.compile=()=>new Set([material]);f.renderer.properties={get:()=>({currentProgram:{isReady(){queries++;return false;}}})};
 const pending=prepareMangroveCacheProgram(f.renderer,f.cache,{makeTarget:f.makeTarget,signal:abort.signal});abort.abort();await assert.rejects(pending,/cancelled/);const count=queries;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(queries,count);assert.equal(f.target.disposed,true);assert.equal(f.getCurrent(),f.original);
});
test('validation failure leaves renderer state restored and disposes the target',async()=>{
 const f=fixture(),failure=Error('bad linked shader');await assert.rejects(prepareMangroveCacheProgram(f.renderer,f.cache,{makeTarget:f.makeTarget,compile:(renderer,scene,camera,target,options)=>Promise.resolve().then(()=>options.onProgramReady({})),prepareBindings:()=>{throw failure;}}),error=>error===failure);assert.equal(f.getCurrent(),f.original);assert.equal(f.target.disposed,true);
});
