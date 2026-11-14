import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker,MessageChannel} from 'node:worker_threads';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {createConfirmedCameraTerrain,cameraTerrainHeights} from '../src/app/confirmed-camera-terrain.js';
import {runPausedWorkerLoadingReveal} from '../src/app/worker-loading-reveal.js';

test('real authority Worker publishes a new chunk while loading reveal is paused', {timeout:30000},async()=>{
 const snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const plugin={name:'wasm-url',setup(b){b.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm-url',namespace:'test-url'}));b.onLoad({filter:/.*/,namespace:'test-url'},()=>({contents:'export default "wild-engine.wasm"',loader:'js'}));}};
 const bundle=await build({entryPoints:[resolve('src/simulation/simulation-authority-worker.js')],bundle:true,write:false,platform:'node',format:'iife',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});
 const shim=`const {parentPort}=require('node:worker_threads');const {readFileSync}=require('node:fs');globalThis.self=globalThis;globalThis.crypto=require('node:crypto').webcrypto;globalThis.fetch=async()=>new Response(readFileSync(${JSON.stringify(resolve('src/world/wild-engine/spatial-savanna.wasm'))}));globalThis.postMessage=value=>parentPort.postMessage(value);globalThis.close=()=>parentPort.close();\n${bundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`;
 const channel=new MessageChannel(),terrain=createConfirmedCameraTerrain(),session='loading-test';let resolveChunk,rejectChunk;const chunk=new Promise((resolve,reject)=>{resolveChunk=resolve;rejectChunk=reject;});
 channel.port2.on('message',m=>{if(m.kind==='terrainHello')channel.port2.postMessage({kind:'terrainHelloAck',session,epoch:m.epoch,version:1,maxHistory:256,maxHistoryBytes:100000000});else if(m.kind==='terrainBatchBegin'||m.kind==='terrainBatchEnd')channel.port2.postMessage({kind:'terrainAck',session,id:m.id});else if(m.kind==='terrain'){if(m.payload.cx===4&&m.payload.cz===0){try{terrain.ingest({cx:4,cz:0,epoch:m.epoch,sequence:m.sequence,revision:m.revision,heights:cameraTerrainHeights(m.payload)});resolveChunk(m);}catch(error){rejectChunk(error);}}channel.port2.postMessage({kind:'terrainAck',session,id:m.id});}else if(m.kind==='terrainFailure')rejectChunk(Error(m.message));});
 const factory=()=>{const thread=new Worker(shim,{eval:true}),wrapper={postMessage:(value,transfer)=>thread.postMessage(value,transfer),terminate:()=>thread.terminate()};thread.on('message',data=>wrapper.onmessage?.({data}));thread.on('error',error=>wrapper.onerror?.({message:error.message}));return wrapper;};
 const client=createSimulationAuthorityClient({session,snapshot,chunkKeys:keys,terrainPort:channel.port1,terrainHistory:{maxPending:256,maxRetainedBytes:100000000,maxBatchBytes:100000000,maxBatchRevisions:256},workerFactory:factory});
 try{await client.ready;await runPausedWorkerLoadingReveal({runtime:{submit:c=>client.submit(c).result},isCurrent:()=>true,play:async()=>{const added=client.submit({kind:'addChunk',key:'4,0'}).result,m=await chunk;assert.throws(()=>terrain.surface(192,0),/unavailable/);const result=await added;assert.equal(result.sequence,m.sequence);terrain.confirm(result.sequence);assert.ok(Number.isFinite(terrain.surface(192,0)));const state=deserialize((await client.submit({kind:'snapshot'}).result).snapshot);assert.ok(state.pauses.includes('loading-reveal'));}});const state=deserialize((await client.submit({kind:'snapshot'}).result).snapshot);assert.equal(state.pauses.includes('loading-reveal'),false);}finally{client.dispose();channel.port2.close();terrain.dispose();}
});
