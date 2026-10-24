import test from 'node:test';
import assert from 'node:assert/strict';
import {createTexturePilot} from '../tools/experiments/loading-texture-pilot.js';
function fixture(t,{opaque=true}={}){
 const oldWorker=globalThis.Worker,oldBitmap=globalThis.ImageBitmap,oldCreate=globalThis.createImageBitmap;
 class Bitmap {constructor(){this.width=64;this.height=128;}close(){this.closed=true;}}
 globalThis.ImageBitmap=Bitmap;globalThis.createImageBitmap=async()=>new Bitmap();
 let terminated=0;
 globalThis.Worker=class{postMessage(){queueMicrotask(()=>this.onmessage({data:{pixels:new Uint8Array(64*128*4),opaque,conversionMs:1}}));}terminate(){terminated++;}};
 t.after(()=>{globalThis.Worker=oldWorker;globalThis.ImageBitmap=oldBitmap;globalThis.createImageBitmap=oldCreate;});
 const texture={image:new Bitmap(),source:{dataReady:true},generateMipmaps:true},events=[],properties=new Map([[texture,{}]]);
 const gl=Object.fromEntries(['activeTexture','bindTexture','pixelStorei'].map(k=>[k,()=>{}]));
 gl.texSubImage2D=()=>events.push('row');gl.generateMipmap=()=>events.push('mips');
 const renderer={properties:{get:t=>properties.get(t)},getContext:()=>gl,initTexture:t=>{assert.equal(t.source.dataReady,false);properties.get(t).__webglTexture={};events.push('allocate');},resetState:()=>events.push('reset')};
 let admissions=0;
 const scheduler={jobs:new Map(),submit:async(iterator)=>{for(;;){admissions++;const step=iterator.next();if(step.done)return step.value;}}};
 const assets={modelSources:new Map([['5ac817bcc.glb',{scene:{traverse:fn=>fn({material:{map:texture}})}}]])};
 const pilot=createTexturePilot(renderer,assets,{scheduler,check:()=>{}});
 return {pilot,texture,events,get admissions(){return admissions;},get terminated(){return terminated;}};
}
test('last row and mip finalization share one admission and preserve source ownership',async t=>{
 const f=fixture(t);assert.equal(await f.pilot.upload(f.texture),true);
 assert.equal(f.admissions,3);assert.deepEqual(f.events.filter(x=>x!=='reset'),['allocate','row','row','mips']);
 assert.equal(f.texture.source.dataReady,true);assert.equal(f.texture.image.closed,undefined);
 assert.equal(f.pilot.stats.completed,1);assert.equal(f.pilot.stats.units,4);
 f.pilot.dispose();assert.equal(f.terminated,1);
});
test('alpha conversion is rejected before any GPU allocation',async t=>{
 const f=fixture(t,{opaque:false});assert.equal(await f.pilot.upload(f.texture),false);
 assert.equal(f.admissions,0);assert.deepEqual(f.events,[]);assert.equal(f.pilot.stats.rejectedAlpha,1);
 f.pilot.dispose();assert.equal(f.terminated,1);
});
