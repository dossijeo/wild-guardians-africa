import test from 'node:test';import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';import {readFile} from 'node:fs/promises';
import {buildFarSceneData} from '../tools/experiments/far-scene-data.js';
import {loadFarSceneData} from '../tools/experiments/far-scene-loader.js';
test('native worker returns identical scene arrays and detaches all transferred buffers',async()=>{
 const pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
 const request={config:{seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},profile:pack.profile,treeBounds:{minX:-180,maxX:180,minZ:-230,maxZ:48},groundBounds:{minX:-240,maxX:240,minZ:-300,maxZ:180}};
 const worker=new Worker(new URL('./fixtures/far-scene-worker-node.mjs',import.meta.url));
 try{
  const messages=await new Promise((resolve,reject)=>{const received=[];worker.on('error',reject);worker.on('message',v=>{received.push(v);if(received.length===2)resolve(received);});worker.postMessage(request);});
  assert.deepEqual(messages[0].data,buildFarSceneData(request));assert.equal(messages[0].data.trees.length,112);assert.equal(messages[0].data.ground.indices.length/3,28800);assert.ok(messages[0].buildMs>=0);assert.deepEqual(messages[1].lengths,[0,0,0]);
 }finally{await worker.terminate();}
});
function fake(){return {terminated:0,requests:[],postMessage(v){this.requests.push(v);},terminate(){this.terminated++;}};}
test('native worker vegetation-only protocol returns the same trees with no ground transfers',async()=>{
 const pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
 const request={config:{seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},profile:pack.profile,treeBounds:{minX:-180,maxX:180,minZ:-230,maxZ:48},treesOnly:true};
 const worker=new Worker(new URL('./fixtures/far-scene-worker-node.mjs',import.meta.url));
 try{
  const messages=await new Promise((resolve,reject)=>{const received=[];worker.on('error',reject);worker.on('message',v=>{received.push(v);if(received.length===2)resolve(received);});worker.postMessage(request);});
  assert.deepEqual(messages[0].data,buildFarSceneData(request));assert.equal(messages[0].data.trees.length,112);assert.equal(messages[0].data.ground,null);assert.deepEqual(messages[1].lengths,[]);
 }finally{await worker.terminate();}
});
test('loader resolves once and releases worker handlers on success',async()=>{
 const worker=fake(),promise=loadFarSceneData({seed:1},{workerFactory:()=>worker}),late=worker.onmessage;
 late({data:{data:{trees:[]},buildMs:1}});late({data:{error:'late'}});
 assert.equal((await promise).buildMs,1);assert.equal(worker.terminated,1);assert.equal(worker.onmessage,null);assert.equal(worker.onerror,null);
});
test('loader cancellation prevents construction or cancels an active request and ignores late data',async()=>{
 const before=new AbortController();before.abort();let created=0;
 await assert.rejects(loadFarSceneData({}, {signal:before.signal,workerFactory:()=>{created++;return fake();}}),{name:'AbortError'});assert.equal(created,0);
 const controller=new AbortController(),worker=fake(),promise=loadFarSceneData({}, {signal:controller.signal,workerFactory:()=>worker}),late=worker.onmessage;
 controller.abort();late({data:{data:{}}});await assert.rejects(promise,{name:'AbortError'});assert.equal(worker.terminated,1);assert.equal(worker.onmessage,null);
});
test('worker error, decode error and post failures reject and terminate once',async()=>{
 for(const kind of ['response','runtime','message','post']){
  const worker=fake();if(kind==='post')worker.postMessage=()=>{throw Error('post failed');};
  const promise=loadFarSceneData({}, {workerFactory:()=>worker});
  if(kind==='response')worker.onmessage({data:{error:'build failed'}});
  if(kind==='runtime')worker.onerror({message:'runtime failed'});
  if(kind==='message')worker.onmessageerror({});
  await assert.rejects(promise,/failed/);assert.equal(worker.terminated,1);
 }
});

test('overlapping regional scenes keep identical native tree IDs and transforms',async()=>{
 const pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
 const config={seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)};
 const region=x=>buildFarSceneData({config,profile:pack.profile,treeBounds:{minX:x-180,maxX:x+180,minZ:-230,maxZ:48},groundBounds:{minX:x-240,maxX:x+240,minZ:-300,maxZ:180}});
 const a=region(0),b=region(96),byId=new Map(b.trees.map(t=>[t.id,t]));let shared=0;
 for(const tree of a.trees)if(byId.has(tree.id)){assert.deepEqual(byId.get(tree.id),tree);shared++;}
 assert.ok(shared>40);assert.equal(new Set(b.trees.map(t=>t.id)).size,b.trees.length);
});


test('regional color grid transfers from worker without changing native tree population or coarse contact data',async()=>{
 const pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
 const request={config:{seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},profile:pack.profile,treeBounds:{minX:-48,maxX:48,minZ:-48,maxZ:48},groundBounds:{minX:-64,maxX:64,minZ:-64,maxZ:64},step:32,colorMapStep:4,waterSurface:true};
 const worker=new Worker(new URL('./fixtures/far-scene-worker-node.mjs',import.meta.url));
 try{
  const messages=await new Promise((resolve,reject)=>{const received=[];worker.on('error',reject);worker.on('message',v=>{received.push(v);if(received.length===2)resolve(received);});worker.postMessage(request);});
  const actual=messages[0].data,plain=buildFarSceneData({...request,colorMapStep:null});assert.deepEqual(actual,buildFarSceneData(request));assert.deepEqual(actual.trees,plain.trees);assert.deepEqual(actual.ground.positions,plain.ground.positions);assert.deepEqual(actual.ground.indices,plain.ground.indices);assert.equal(actual.ground.nx,4);assert.equal(actual.ground.colorMap.width,33);assert.deepEqual(messages[1].lengths,[0,0,0,0]);
 }finally{await worker.terminate();}
});


test('mapped average palette executes in the real worker without changing geometry, IDs or water coverage',async()=>{
 const pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8')),palette=JSON.parse(await readFile(new URL('../docs/qa/far-ground-native-palette-pilot/palette.json',import.meta.url),'utf8'));
 const request={config:{seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},profile:pack.profile,treeBounds:{minX:-48,maxX:48,minZ:-48,maxZ:48},groundBounds:{minX:-64,maxX:64,minZ:-64,maxZ:64},step:32,colorMapStep:4,waterSurface:true,groundWash:0,groundPalette:palette};
 const worker=new Worker(new URL('./fixtures/far-scene-worker-node.mjs',import.meta.url));
 try{
  const messages=await new Promise((resolve,reject)=>{const received=[];worker.on('error',reject);worker.on('message',v=>{received.push(v);if(received.length===2)resolve(received);});worker.postMessage(request);});
  const actual=messages[0].data,plain=buildFarSceneData({...request,groundPalette:null});assert.deepEqual(actual,buildFarSceneData(request));assert.deepEqual(actual.trees,plain.trees);assert.deepEqual(actual.ground.positions,plain.ground.positions);assert.deepEqual(actual.ground.indices,plain.ground.indices);assert.notDeepEqual(actual.ground.colorMap.data,plain.ground.colorMap.data);for(let i=3;i<actual.ground.colorMap.data.length;i+=4)assert.equal(actual.ground.colorMap.data[i],plain.ground.colorMap.data[i]);assert.deepEqual(messages[1].lengths,[0,0,0,0]);
  assert.throws(()=>buildFarSceneData({...request,config:{...request.config,biome:'canyons'}}),/only supports/);assert.throws(()=>buildFarSceneData({...request,groundPalette:{}}),/palette/);
 }finally{await worker.terminate();}
});
