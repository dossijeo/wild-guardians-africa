import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera} from 'three';
import {createWebGpuNativeSky} from '../src/rendering/webgpu-native-sky.js';
const catalogue={panoramas:[{url:'/assets/day.hdr'},{url:'/assets/night.hdr'}]};
test('confirmed time drives sky phase and disposal restores the previous background',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(42,1,.1,500),fetchImpl=async url=>url.includes('skies.json')?{ok:true,json:async()=>catalogue}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)},prepare=async()=>({image:{width:2,height:2,pixels:new Uint8Array(16).fill(128)}}),sky=createWebGpuNativeSky({scene,fetchImpl,prepare});assert.equal(await sky.ready,true);assert.ok(scene.backgroundNode);sky.update(camera,{day:1,time:0,elapsed:999});assert.equal(sky.status().night,0);sky.update(camera,{day:1,time:400,elapsed:1000});assert.equal(sky.status().night,1);sky.update(camera,{day:1,time:400,elapsed:2000});assert.equal(sky.status().night,1);sky.dispose();assert.equal(scene.backgroundNode,null);assert.equal(sky.status().closed,true);
});
test('cancels sky fetch without reporting an error or installing a background',async()=>{
 const scene=new Scene();let reported=false,signal;const fetchImpl=(_,{signal:s})=>{signal=s;return new Promise((resolve,reject)=>s.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));},sky=createWebGpuNativeSky({scene,fetchImpl,onError:()=>{reported=true;}});sky.dispose();assert.equal(await sky.ready,false);assert.equal(signal.aborted,true);assert.equal(reported,false);assert.equal(scene.backgroundNode??null,null);
});
test('failed panorama preparation cancels its peer and never publishes a background',async()=>{
 const scene=new Scene();let reported,peerSignal;const fetchImpl=async url=>url.includes('skies.json')?{ok:true,json:async()=>catalogue}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)},prepare=async(_bytes,index,{signal})=>{if(index===0)throw Error('invalid panorama');peerSignal=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));},sky=createWebGpuNativeSky({scene,fetchImpl,prepare,onError:error=>{reported=error;}});assert.equal(await sky.ready,false);assert.match(reported.message,/invalid panorama/);assert.equal(peerSignal.aborted,true);assert.equal(scene.backgroundNode??null,null);sky.dispose();
});

test('sky forwards prepared reflection pixels without delaying background publication',async()=>{
 const scene=new Scene(),catalogue={panoramas:[{url:'/assets/day.hdr'},{url:'/assets/night.hdr'}]},calls=[],fetchImpl=async url=>url.includes('skies.json')?{ok:true,json:async()=>catalogue}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)},prepare=async(_data,index)=>({image:{width:1,height:1,pixels:new Uint8Array(4)},environment:{width:1,height:1,pixels:new Uint8Array([index,0,0,255])}});let finish;const sky=createWebGpuNativeSky({scene,fetchImpl,prepare,onEnvironment:values=>{calls.push(values);return new Promise(resolve=>finish=resolve);}});assert.equal(await sky.ready,true);await Promise.resolve();assert.equal(calls.length,1);assert.deepEqual(calls[0].map(value=>value.pixels[0]),[0,1]);assert.ok(scene.backgroundNode);sky.dispose();finish();
});
