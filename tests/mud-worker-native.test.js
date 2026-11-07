import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createSpatialTerrainView} from '../src/world/wild-engine/spatial-terrain-view.js';
import {mudPatchGeometry} from '../src/rendering/mud-patches.js';
import {captureMudInputs} from '../tools/trees/mud-worker-input.js';
import {MessageChannel} from 'node:worker_threads';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {earlyWorkerOptions} from '../src/app/early-worker-options.js';
import {temporalPresentationOptions} from '../src/app/temporal-presentation-options.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';

test('the auxiliary mud worker reproduces native geometry from immutable samples',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const core=createSpatialWorld(module);core.generate(712,0,0,'mangrove');const field=createSpatialTerrainView(core);
 const worker=new Worker(new URL('../tools/trees/mud-worker-node.js',import.meta.url),{type:'module'});
 try{let id=0;for(const [cx,cz] of [[0,0],[1,-2],[-1,-1]]){
  assert.ok(core.addChunk(cx,cz)>=0);const payload=core.chunkPayload(),original=mudPatchGeometry(field,cx,cz),input=captureMudInputs(field,cx,cz,payload.terrain.positions);
  assert.ok(original);const next=++id;
  const response=new Promise((resolve,reject)=>{const onMessage=data=>{if(data.id!==next)return;worker.off('message',onMessage);worker.off('error',onError);resolve(data);};const onError=error=>{worker.off('message',onMessage);reject(error);};worker.on('message',onMessage);worker.once('error',onError);});
  worker.postMessage({id:next,input},[input.heights.buffer]);const data=await response;assert.equal(data.error,undefined);assert.ok(data.result);
  for(const [name,key] of [['position','position'],['normal','normal'],['uv','uv']])assert.deepEqual(data.result[key],original.attributes[name].array);
  assert.deepEqual(data.result.userData,original.userData);assert.equal(input.heights.byteLength,0);original.dispose();
 }}finally{await worker.terminate();}
});

test('terrain publication transfers a private mud snapshot and preserves the journal',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),core=createSpatialWorld(module);core.generate(712,0,0,'mangrove');core.addChunk(0,0);const chunk=core.chunkPayload();chunk.mudInputs=captureMudInputs(createSpatialTerrainView(core),0,0,chunk.terrain.positions);
 const channel=new MessageChannel(),journal=[],publisher=createTerrainPublication({port:channel.port1,session:'s',epoch:'e',retainRevisions:true,onCommitted:(_seq,chunks)=>journal.push(structuredClone(chunks))});
 try{const receive=new Promise((resolve,reject)=>{channel.port2.on('message',message=>{if(message.kind==='terrainHello')channel.port2.postMessage({kind:'terrainHelloAck',session:'s',epoch:'e',version:1,maxHistory:100,maxHistoryBytes:100000000});else if(message.kind==='terrainBatchBegin')channel.port2.postMessage({kind:'terrainAck',session:'s',id:message.id});else if(message.kind==='terrain'){resolve(message);channel.port2.postMessage({kind:'terrainAck',session:'s',id:message.id});}else if(message.kind==='terrainFailure')reject(Error(message.message));});});
 assert.equal(publisher.stage(chunk,0),true);assert.equal(publisher.commit(0),true);const message=await receive;assert.deepEqual(message.payload.mudInputs,chunk.mudInputs);assert.deepEqual(journal[0][0].mudInputs,chunk.mudInputs);assert.equal(chunk.mudInputs.heights.length,2401);assert.notEqual(message.payload.mudInputs.heights.buffer,chunk.mudInputs.heights.buffer);
 }finally{publisher.dispose();channel.port2.close();}
});

test('authority produces exact mud inputs for live chunks, bootstrap and recovery checkpoint',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const opening=await createSpatialCampaignOpening({seed:712,biome:'manglares',mangroveNetwork:true,mangroveSettlementVersion:2}),keys=[...opening.loaded.keys()].slice(0,2),published=[];let authority;
 try{authority=createSimulationAuthority(module,serialize(opening.state),keys,{mudPresentation:true,onTerrainChunk:chunk=>published.push(chunk)});assert.equal(published.length,keys.length);const checkpoint=authority.execute({kind:'snapshot',sequence:1,visualTerrain:true}).terrainCheckpoint.chunks,bootstrap=[];authority.publishResidentTerrainForQa(chunk=>bootstrap.push(chunk));assert.equal(checkpoint.length,keys.length);assert.equal(bootstrap.length,keys.length);for(let i=0;i<keys.length;i++){assert.deepEqual(published[i].mudInputs,checkpoint[i].mudInputs);assert.deepEqual(bootstrap[i].mudInputs,checkpoint[i].mudInputs);}}
 finally{authority?.dispose();opening.session.dispose();}
});

test('mud inputs require an explicit temporal capability and reach the worker initialization',()=>{
 const args={params:new URLSearchParams(),dev:false,hosted:true,early:false,recoveryEnabled:true,hasWebGpu:true,historicalRecovery:true,recovery:{work:true,concurrent:false,backpressure:false,compactTicks:false}};
 const ordinary=temporalPresentationOptions(args),selected=temporalPresentationOptions({...args,mudPresentation:true});assert.equal(ordinary.presentation.mudPresentation,undefined);assert.equal(selected.presentation.mudPresentation,true);
 assert.throws(()=>temporalPresentationOptions({...args,historicalRecovery:false,mudPresentation:true}),/requires temporal/);
 const options=earlyWorkerOptions({initial:{snapshot:'{}',chunkKeys:[]},temporal:selected});assert.equal(options.clientOptions.mudPresentation,true);assert.equal(earlyWorkerOptions({initial:{snapshot:'{}',chunkKeys:[]},temporal:ordinary}).clientOptions.mudPresentation,undefined);
 const sent=[],worker={postMessage(value){sent.push(value);},terminate(){}};const client=createSimulationAuthorityClient({...options.clientOptions,session:'mud',allowTerrainBootstrap:true,workerFactory:()=>worker});assert.equal(sent[0].mudPresentation,true);client.dispose();client.ready.catch(()=>{});
});
