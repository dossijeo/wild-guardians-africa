import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';

test('host holds ordered commands under authority terrain pressure and resumes asynchronously',async()=>{
 const saved={self:globalThis.self,postMessage:globalThis.postMessage,close:globalThis.close,harness:globalThis.__terrainHostHarness},messages=[],commands=[];let blocked=false,options;
 globalThis.self={};globalThis.postMessage=message=>messages.push(message);globalThis.close=()=>{};
 globalThis.__terrainHostHarness={client(value){options=value;return {ready:Promise.resolve(),terrainBlocked:()=>blocked,submit(command){commands.push(command.kind);const sequence=commands.length;return {accepted:true,sequence,result:Promise.resolve({kind:'result',session:'s',sequence,elapsed:0,pauses:[],events:[],physicsPose:null,snapshot:'{}',residency:{missing:[]},saveAvailable:true})};},dispose(){}};}};
 const plugin={name:'mock-authority',setup(build){build.onResolve({filter:/simulation-authority-client\.js$/},()=>({path:'authority',namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const createSimulationAuthorityClient=options=>globalThis.__terrainHostHarness.client(options);',loader:'js'}));}};
 try{const bundle=await build({entryPoints:[resolve('src/simulation/worker-runtime-host.js')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const send=data=>self.onmessage({data}),flush=()=>new Promise(resolve=>setImmediate(resolve));await send({kind:'initialize',session:'s',clientOptions:{snapshot:'{}',chunkKeys:[]},runtimeOptions:{startupSuspended:true}});assert.deepEqual(commands,['snapshot']);blocked=true;options.onTerrainPressure(true);
  const pending=send({kind:'command',session:'s',id:1,command:{kind:'pause',reason:'test'}});await flush();assert.deepEqual(commands,['snapshot']);assert.equal(messages.some(message=>message.kind==='commandResult'&&message.id===1),false);
  blocked=false;options.onTerrainPressure(false);await pending;assert.deepEqual(commands,['snapshot','pause']);assert.ok(messages.some(message=>message.kind==='commandResult'&&message.id===1));await send({kind:'dispose',session:'s'});
 }finally{globalThis.self=saved.self;globalThis.postMessage=saved.postMessage;globalThis.close=saved.close;globalThis.__terrainHostHarness=saved.harness;}
});
