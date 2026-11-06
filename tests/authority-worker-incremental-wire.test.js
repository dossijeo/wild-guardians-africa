import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';

test('actual authority Worker transports incremental WASM states, pauses and checkpoints in order',async()=>{
 const snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const plugin={name:'wasm-url',setup(builder){builder.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm-url',namespace:'test-url'}));builder.onLoad({filter:/.*/,namespace:'test-url'},()=>({contents:'export default "wild-engine.wasm"',loader:'js'}));}};
 const bundle=await build({entryPoints:[resolve('src/simulation/simulation-authority-worker.js')],bundle:true,write:false,platform:'node',format:'iife',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});
 const shim=`const {parentPort}=require('node:worker_threads');const {readFileSync}=require('node:fs');globalThis.self=globalThis;globalThis.crypto=require('node:crypto').webcrypto;globalThis.fetch=async()=>new Response(readFileSync(${JSON.stringify(resolve('src/world/wild-engine/spatial-savanna.wasm'))}));globalThis.postMessage=value=>parentPort.postMessage(value);globalThis.close=()=>parentPort.close();\n${bundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`;
 const raw=[],reference=createSimulationAuthority(module,snapshot,keys,{compactPausedAcks:true,checkpointRaidWaitsOnly:true,compactPresentationPaths:true,prepareTransportSnapshots:true}),workerFactory=()=>{const thread=new Worker(shim,{eval:true}),wrapper={postMessage:(value,transfer)=>thread.postMessage(value,transfer),terminate:()=>thread.terminate()};thread.on('message',data=>{raw.push(data);wrapper.onmessage?.({data});});thread.on('error',error=>wrapper.onerror?.({message:error.message}));return wrapper;},client=createSimulationAuthorityClient({session:'s',snapshot,chunkKeys:keys,incrementalPublications:true,compactPausedAcks:true,checkpointRaidWaitsOnly:true,compactPresentationPaths:true,nativeAuthorityCheckpoints:true,workerFactory});
 try{await client.ready;const commands=[{kind:'snapshot'},{kind:'pause',reason:'menu'},{kind:'advance',seconds:.05,nightFastForward:false},{kind:'resume',reason:'menu'},{kind:'snapshot',nativeAuthorityCheckpoint:true}];for(const [index,command] of commands.entries()){const result=await client.submit(command).result,expected=reference.execute({...command,sequence:index+1});assert.equal(result.sequence,index+1);assert.deepEqual(result.events,expected.events);assert.deepEqual(result.value,expected.value);if(!result.unchanged)assert.equal(result.snapshot,expected.snapshot);if(command.nativeAuthorityCheckpoint)assert.deepEqual(result.nativeAuthorityCheckpoint,expected.nativeAuthorityCheckpoint);}
  const wire=raw.filter(item=>item.kind==='result');assert.equal(wire.length,commands.length);assert.equal(typeof wire[0].snapshot,'string');assert.equal(typeof wire.at(-1).snapshot,'string');assert.ok(wire.slice(1,-1).some(item=>item.snapshotDelta),'intermediate wire must include a delta');assert.ok(wire.slice(1,-1).filter(item=>item.snapshotDelta).every(item=>!Object.hasOwn(item,'snapshot')));
 }finally{client.dispose();reference.dispose();}
});
