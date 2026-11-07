import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuVfxTerrainDepth} from '../src/rendering/webgpu-vfx-terrain-depth.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('depth capture follows demand and never waits for preparation in a frame',async()=>{
 let finish,prepared=false,renders=0,enabled=false,disposed=0;const capture={get ready(){return prepared;},prepare(){return new Promise(resolve=>{finish=()=>{prepared=true;resolve();};});},render(){renders++;return true;},invalidate(){prepared=false;},resize(){},dispose(){disposed++;}},vfx={needsSoftDepth:false,setSoftDepthEnabled(value){enabled=value;}},owner=createWebGpuVfxTerrainDepth({capture,binding:{setDepthTexture(){}}});
 try{assert.equal(owner.afterPrepare(vfx),false);await turn();assert.equal(finish,undefined);vfx.needsSoftDepth=true;assert.equal(owner.afterPrepare(vfx),false);assert.equal(enabled,false);await turn();assert.equal(typeof finish,'function');assert.equal(owner.afterPrepare(vfx),false);assert.equal(renders,0);finish();await turn();assert.equal(owner.afterPrepare(vfx),true);assert.equal(enabled,true);assert.equal(renders,1);owner.invalidate();vfx.needsSoftDepth=false;assert.equal(owner.afterPrepare(vfx),false);assert.equal(enabled,false);}finally{owner.dispose();assert.equal(disposed,1);}
});
test('resize disables depth until the newest target is published and disposes safely',async()=>{
 const requests=[],bindings=[];let enabled=false,disposed=false;const capture={ready:true,prepare:async()=>{},render:()=>true,invalidate(){},resize(w,h,{publish}){return new Promise(resolve=>requests.push({w,h,finish(){publish(`${w}x${h}`);resolve();}}));},dispose(){disposed=true;}},vfx={needsSoftDepth:true,setSoftDepthEnabled(value){enabled=value;}},owner=createWebGpuVfxTerrainDepth({capture,binding:{setDepthTexture:value=>bindings.push(value)}});
 try{assert.equal(owner.afterPrepare(vfx),true);owner.resize(20,10);await turn();assert.equal(owner.afterPrepare(vfx),false);assert.equal(enabled,false);owner.resize(30,15);requests[0].finish();await turn();assert.equal(requests.length,2);assert.equal(owner.afterPrepare(vfx),false);requests[1].finish();await turn();assert.deepEqual(bindings,['20x10','30x15']);assert.equal(owner.afterPrepare(vfx),true);assert.equal(enabled,true);}finally{owner.dispose();assert.equal(disposed,true);}
});
test('capture errors disable the effect and limit retries',async()=>{
 let time=0,attempts=0;const errors=[],capture={get ready(){return false;},prepare(){attempts++;return Promise.reject(Error('offline'));},render(){throw Error('unexpected');},invalidate(){},resize(){},dispose(){}},vfx={needsSoftDepth:true,setSoftDepthEnabled(){}},owner=createWebGpuVfxTerrainDepth({capture,binding:{setDepthTexture(){}},now:()=>time,onError:(kind,error)=>errors.push([kind,error.message])});
 try{owner.afterPrepare(vfx);await turn();assert.equal(attempts,1);owner.afterPrepare(vfx);await turn();assert.equal(attempts,1);time=1000;owner.afterPrepare(vfx);await turn();assert.equal(attempts,2);assert.deepEqual(errors,[['ground-depth','offline'],['ground-depth','offline']]);}finally{owner.dispose();}
});
