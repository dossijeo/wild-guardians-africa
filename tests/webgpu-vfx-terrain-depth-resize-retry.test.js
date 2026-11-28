import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuVfxTerrainDepth} from '../src/rendering/webgpu-vfx-terrain-depth.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('a failed resize retries the latest requested size after backoff without enabling stale depth',async()=>{
 let now=0,rejectFirst,enabled=false;const calls=[],bindings=[],errors=[];
 const capture={ready:true,prepare:async()=>{},render:()=>true,invalidate(){},dispose(){},resize(w,h,{publish}){calls.push([w,h]);if(calls.length===1)return new Promise((resolve,reject)=>{rejectFirst=reject;});publish(`${w}x${h}`);return Promise.resolve();}};
 const vfx={needsSoftDepth:true,setSoftDepthEnabled(v){enabled=v;}},owner=createWebGpuVfxTerrainDepth({capture,binding:{setDepthTexture(v){bindings.push(v);}},now:()=>now,onError:(kind,error)=>errors.push([kind,error.message])});
 try{
  owner.resize(20,10);await turn();owner.resize(30,15);rejectFirst(Error('temporary'));await turn();assert.deepEqual(calls,[[20,10]]);assert.equal(owner.afterPrepare(vfx),false);assert.equal(enabled,false);await turn();assert.equal(calls.length,1);
  now=1000;assert.equal(owner.afterPrepare(vfx),false);await turn();assert.deepEqual(calls,[[20,10],[30,15]]);assert.deepEqual(bindings,['30x15']);assert.equal(owner.afterPrepare(vfx),true);assert.equal(enabled,true);assert.deepEqual(errors,[['ground-depth-resize','temporary']]);
 }finally{owner.dispose();}
});

test('a transient AbortError without an aborted owner cannot cause an unbounded retry loop',async()=>{
 let now=0,calls=0;const capture={ready:true,prepare:async()=>{},render:()=>true,invalidate(){},dispose(){},resize(){calls++;throw new DOMException('cancelled','AbortError');}},owner=createWebGpuVfxTerrainDepth({capture,binding:{setDepthTexture(){}},now:()=>now}),vfx={needsSoftDepth:true,setSoftDepthEnabled(){}};
 try{owner.resize(10,10);await turn();owner.afterPrepare(vfx);await turn();assert.equal(calls,1);now=1000;owner.afterPrepare(vfx);await turn();assert.equal(calls,2);}finally{owner.dispose();}
});
