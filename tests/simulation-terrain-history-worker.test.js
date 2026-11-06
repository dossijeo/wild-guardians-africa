import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';

test('authority stops permanently if a command exceeds terrain history capacity',async()=>{
 const saved={self:globalThis.self,postMessage:globalThis.postMessage,fetch:globalThis.fetch,harness:globalThis.__terrainWorkerHarness},messages=[];let executions=0;
 globalThis.self={};globalThis.postMessage=message=>messages.push(message);globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>Uint8Array.from([0,97,115,109,1,0,0,0]).buffer});
 globalThis.__terrainWorkerHarness={create(_module,_snapshot,_keys,options){return {execute(command){executions++;options.onTerrainChunk({authority:'spatial-wasm',cx:0,cz:0,terrain:{positions:new Float32Array(3),colors:new Float32Array(3),indices:new Uint16Array(1)}});return {sequence:command.sequence,elapsed:0,events:[],snapshot:'{}'};},dispose(){}};}};
 const plugin={name:'mock-authority',setup(build){build.onResolve({filter:/simulation-authority\.js$/},()=>({path:'authority',namespace:'mock'}));build.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm',namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='wasm'?"export default 'fake.wasm';":"export const authoritySnapshotFields=Symbol('fields');export const createSimulationAuthority=(...args)=>globalThis.__terrainWorkerHarness.create(...args);",loader:'js'}));}};
 try{const bundle=await build({entryPoints:[resolve('src/simulation/simulation-authority-worker.js')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const terrainPort={postMessage(){},start(){},close(){}};await self.onmessage({data:{kind:'initialize',session:'s',snapshot:'{}',chunkKeys:[],terrainPort,terrainHistory:{maxPending:16,maxRetainedBytes:1,maxBatchBytes:4096,maxBatchRevisions:8}}});assert.equal(messages.at(-1).kind,'ready');
  await self.onmessage({data:{kind:'command',session:'s',command:{kind:'snapshot',sequence:1}}});assert.equal(executions,1);assert.ok(messages.some(m=>m.kind==='terrainHistoryFailure'));assert.ok(messages.some(m=>m.kind==='error'));assert.equal(messages.some(m=>m.kind==='result'),false);
  await self.onmessage({data:{kind:'command',session:'s',command:{kind:'snapshot',sequence:2}}});assert.equal(executions,1);assert.match(messages.at(-1).message,/Terrain history session failed/);assert.equal(messages.some(m=>m.kind==='result'),false);
 }finally{globalThis.self=saved.self;globalThis.postMessage=saved.postMessage;globalThis.fetch=saved.fetch;globalThis.__terrainWorkerHarness=saved.harness;}
});
