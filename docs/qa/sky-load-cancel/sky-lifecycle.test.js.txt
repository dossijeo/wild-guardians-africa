import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSky} from '../src/rendering/sky.js';
const catalogue={panoramas:[{url:'/day.hdr'},{url:'/night.hdr'}]};
const tinyHdr=()=>Uint8Array.from([...new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 8\n'),2,2,0,8,136,50,136,60,136,70,136,128]).buffer;
function empty(sky){assert.equal(sky.scene.children.length,0);assert.equal(sky.textures.length,0);assert.equal(sky.environmentTextures.length,0);assert.equal(sky.materials.length,0);}
test('close during catalogue request aborts its signal and cannot start panoramas even with a non-aborting transport',async t=>{
 const sky=new NativeSky();let finish,calls=0,signal;
 t.mock.method(globalThis,'fetch',(url,options)=>{calls++;signal=options.signal;return new Promise(resolve=>finish=()=>resolve({ok:true,json:async()=>catalogue}));});
 const pending=sky.load();assert.equal(signal.aborted,false);sky.dispose();assert.equal(signal.aborted,true);finish();await assert.rejects(pending,/cancelled/);assert.equal(calls,1);empty(sky);await assert.rejects(sky.load(),/cancelled/);
});
test('close during binary body read cancels both requests and skips HDR decoding of late invalid data',async t=>{
 const sky=new NativeSky(),finish=[],signals=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{signals.push(options.signal);return url.endsWith('skies.json')?{ok:true,json:async()=>catalogue}:{ok:true,arrayBuffer:()=>new Promise(resolve=>finish.push(()=>resolve(new ArrayBuffer(0))))};});
 const pending=sky.load();await new Promise(resolve=>setImmediate(resolve));assert.equal(finish.length,2);sky.dispose();for(const done of finish)done();await assert.rejects(pending,/cancelled/);assert.ok(signals.every(signal=>signal.aborted));empty(sky);
});
test('an abort-aware transport rejects the pending load normally and leaves no resources',async t=>{
 const sky=new NativeSky();t.mock.method(globalThis,'fetch',(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})));
 const pending=sky.load();sky.dispose();await assert.rejects(pending,{name:'AbortError'});empty(sky);
});
test('normal day/night load keeps authored material uniforms; repeated close releases every resource once',async t=>{
 t.mock.method(globalThis,'fetch',async url=>url.endsWith('skies.json')?{ok:true,json:async()=>catalogue}:{ok:true,arrayBuffer:async()=>tinyHdr()});
 const sky=new NativeSky();await sky.load();assert.equal(sky.scene.children.length,2);assert.equal(sky.textures.length,2);assert.equal(sky.environmentTextures.length,2);
 assert.equal(sky.materials[0].uniforms.uSkyExposure.value,1.33);assert.equal(sky.materials[1].uniforms.uSkyExposure.value,.62);
 const resources=[sky.geometry,...sky.materials,...sky.textures,...sky.environmentTextures],counts=resources.map(()=>0);resources.forEach((r,i)=>r.addEventListener('dispose',()=>counts[i]++));sky.dispose();sky.dispose();assert.ok(counts.every(n=>n===1));empty(sky);
 let draws=0;sky.render({render:()=>draws++},null,null);assert.equal(draws,0);
});
