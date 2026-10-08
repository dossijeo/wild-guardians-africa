import test from 'node:test';import assert from 'node:assert/strict';
import {FarGroundSeamStream} from '../tools/experiments/far-ground-seam-stream.js';
import {Worker} from 'node:worker_threads';
import {TerrainField} from '../src/world/terrain.js';
import {farGroundData} from '../tools/experiments/far-ground-data.js';
import {farGroundSeam} from '../tools/experiments/far-ground-seam.js';

function harness(){const workers=[];return {workers,factory:()=>{const worker={terminated:0,messages:[],postMessage(request){this.messages.push(request);},terminate(){this.terminated++;}};workers.push(worker);return worker;}};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('seam stream deduplicates discrete keys and keeps previous completed CPU data during replacement',async()=>{
 const h=harness(),stream=new FarGroundSeamStream({workerFactory:h.factory}),first=stream.request('a',{nearBounds:[0,0,10,10]}),same=stream.request('a',{});assert.equal(first,same);await tick();
 const a={data:{positions:new Float32Array(12),indices:new Uint32Array(6)}};h.workers[0].onmessage({data:a});assert.equal(await first,a);assert.equal(h.workers[0].terminated,1);
 const next=stream.request('b',{nearBounds:[10,0,20,10]});await tick();assert.equal(stream.current.value,a);assert.equal(h.workers.length,2);const b={data:{positions:new Float32Array(18),indices:new Uint32Array(12)}};h.workers[1].onmessage({data:b});assert.equal(await next,b);assert.equal(stream.current.value,b);stream.dispose();assert.equal(stream.current,null);
});
test('late callbacks from superseded or disposed seam workers never adopt stale data',async()=>{
 const h=harness(),stream=new FarGroundSeamStream({workerFactory:h.factory}),a=stream.request('a',{});await tick();const late=h.workers[0].onmessage,b=stream.request('b',{});await tick();
 assert.equal(await a,null);assert.equal(h.workers[0].terminated,1);late({data:{data:'stale'}});assert.equal(stream.current,null);
 const lateB=h.workers[1].onmessage;stream.dispose();assert.equal(await b,null);lateB({data:{data:'after dispose'}});assert.equal(stream.current,null);assert.equal(h.workers[1].terminated,1);assert.equal(await stream.request('c',{}),null);assert.equal(h.workers.length,2);
});
test('returning to prepared seam key aborts unnecessary replacement without erasing it',async()=>{
 const h=harness(),stream=new FarGroundSeamStream({workerFactory:h.factory}),a=stream.request('a',{});await tick();const value={data:'prepared'};h.workers[0].onmessage({data:value});await a;
 const b=stream.request('b',{});await tick();assert.equal(await stream.request('a',{}),value);assert.equal(await b,null);assert.equal(stream.current.value,value);assert.equal(h.workers[1].terminated,1);stream.dispose();
});
test('seam failure retains prepared data and retries the same failed key',async()=>{
 const h=harness(),stream=new FarGroundSeamStream({workerFactory:h.factory}),a=stream.request('a',{});await tick();h.workers[0].onmessage({data:{data:'prepared'}});await a;
 const failed=stream.request('b',{});await tick();h.workers[1].onmessage({data:{error:'invalid height'}});await assert.rejects(failed,/invalid height/);assert.equal(stream.current.value.data,'prepared');
 const retry=stream.request('b',{});await tick();h.workers[2].onmessage({data:{data:'retried'}});assert.equal((await retry).data,'retried');stream.dispose();
});
test('native seam worker returns exact boundary data and transfers its output without detaching borrowed proxy data',async()=>{
 const config={seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},field=new TerrainField(config),ground=farGroundData(field,{minX:-64,maxX:64,minZ:-64,maxZ:64},{step:32}),nearBounds=[-24,-24,24,24],expected=farGroundSeam(ground,nearBounds,{nativeHeightAt:(x,z)=>field.surface(x,z)}),worker=new Worker(new URL('./fixtures/far-ground-seam-worker-node.mjs',import.meta.url));
 try{
  const messages=await new Promise((resolve,reject)=>{const received=[];worker.on('error',reject);worker.on('message',v=>{received.push(v);if(received.length===2)resolve(received);});worker.postMessage({config,ground,nearBounds});});
  assert.deepEqual(messages[0].data.positions,expected.positions);assert.deepEqual(messages[0].data.indices,expected.indices);assert.deepEqual(messages[0].data.nearBounds,nearBounds);assert.equal(messages[0].data.columns,expected.columns.length);assert.deepEqual(messages[1].lengths,[0,0]);assert.ok(ground.positions.byteLength>0);assert.ok(ground.indices.byteLength>0);
 }finally{await worker.terminate();}
});
