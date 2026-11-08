import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {grassChunkFromConfirmedPayload} from '../src/rendering/grass-terrain-sampling.js';
import {generateGrassTile} from '../src/rendering/grass-tile-generation.js';
import {indexConfirmedGrassWater,nearGrassWater} from '../src/rendering/grass-water.js';
import {indexGrassObstacles} from '../src/rendering/grass-obstacles.js';
import {generateGrassChunkData} from '../src/rendering/grass-chunk-data.js';

function fixture(biome,fern){
 const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),core=createSpatialWorld(wasm);
 core.generate(123,0,0,biome,{mangroveNetwork:biome==='mangrove'});const payload=core.chunkPayload(),chunk=Object.assign(grassChunkFromConfirmedPayload(payload),indexConfirmedGrassWater(payload,.6));
 return {key:'0,0',chunks:new Map([['0,0',chunk]]),blockers:indexGrassObstacles([{x:1,z:1,radius:2}],[],.6),spacing:fern?.65:.5,seed:123,river:biome==='grand_river',mangrove:biome==='mangrove',fern,edgePadding:.6};
}
function reference(request){
 const c=request.chunks.get(request.key),items=[],stats={candidates:0,masked:0};
 for(let tx=c.cx*6-3;tx<c.cx*6+3;tx++)for(let tz=c.cz*6-3;tz<c.cz*6+3;tz++)items.push(...generateGrassTile(c,tx,tz,{...request,varied:false,stats,nearWater:(chunk,x,z)=>nearGrassWater(request.chunks,chunk,x,z,request.edgePadding)}).items);
 const anchors=new Float32Array(items.length*4),values=new Float32Array(items.length*4),slopes=new Float32Array(items.length*2);items.forEach((p,i)=>{anchors.set(p.slice(0,4),i*4);values.set(p.slice(4,8),i*4);slopes.set(p.slice(8,10),i*2);});return {anchors,values,slopes,count:items.length,stats};
}
for(const [biome,fern] of [['savanna',false],['grand_river',false],['mangrove',true]])test(`chunk data matches existing ${biome} generator`,()=>{const input=fixture(biome,fern),before=structuredClone(input),expected=reference(input),actual=generateGrassChunkData(input);assert.ok(actual.count>0);assert.deepEqual(actual,expected);assert.deepEqual(input,before);});

test('generation worker returns transferable data and preserves request identity',async()=>{
 const moduleUrl=new URL('../src/rendering/grass-generation-worker.js',import.meta.url).href;
 const source=`import {parentPort} from 'node:worker_threads'; globalThis.self={addEventListener(_name,fn){parentPort.on('message',data=>fn({data}));},postMessage(data,transfer){parentPort.postMessage(data,transfer);}}; await import(${JSON.stringify(moduleUrl)}); parentPort.postMessage({ready:true});`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'});
 try {
  await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
  const request=fixture('mangrove',true),expected=reference(request);
  const response=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});worker.postMessage({id:41,request});
  assert.deepEqual(await response,{id:41,result:expected});
 } finally {await worker.terminate();}
});


test('generation worker reports malformed requests without terminating',async()=>{
 const moduleUrl=new URL('../src/rendering/grass-generation-worker.js',import.meta.url).href;
 const source=`import {parentPort} from 'node:worker_threads'; globalThis.self={addEventListener(_name,fn){parentPort.on('message',data=>fn({data}));},postMessage(data,transfer){parentPort.postMessage(data,transfer);}}; await import(${JSON.stringify(moduleUrl)}); parentPort.postMessage({ready:true});`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'});
 try {
  await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
  const result=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});worker.postMessage({id:12,request:{}});
  assert.match((await result).error,/Invalid grass generation request/);
 } finally {await worker.terminate();}
});

test('generation worker returns optional timing while preserving the result',async()=>{
 const moduleUrl=new URL('../src/rendering/grass-generation-worker.js',import.meta.url).href;
 const source=`import {parentPort} from 'node:worker_threads'; globalThis.self={addEventListener(_name,fn){parentPort.on('message',data=>fn({data}));},postMessage(data,transfer){parentPort.postMessage(data,transfer);}}; await import(${JSON.stringify(moduleUrl)}); parentPort.postMessage({ready:true});`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'});
 try{await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});const request=fixture('savanna',false),response=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});worker.postMessage({id:42,request,qaTiming:true});const result=await response;assert.equal(result.id,42);assert.deepEqual(result.result,reference(request));assert.ok(Number.isFinite(result.qaTiming.started));assert.ok(result.qaTiming.finished>=result.qaTiming.started);}finally{await worker.terminate();}
});
