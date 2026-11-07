import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';

test('host forwards only current regional results and aborts work on presentation disposal',async()=>{
 const saved={self:globalThis.self,postMessage:globalThis.postMessage,close:globalThis.close,harness:globalThis.__farHostHarness},messages=[],visual=[];let sequence=0,revision=1,release,querySignal;
 globalThis.self={};globalThis.postMessage=message=>messages.push(message);globalThis.close=()=>{};
 globalThis.__farHostHarness={client(){return {ready:Promise.resolve(),terrainBlocked:()=>false,queryFarVisualChunk(_request,{signal}){querySignal=signal;return new Promise(resolve=>{release=resolve;});},submit(){const n=++sequence;return {accepted:true,sequence:n,result:Promise.resolve({kind:'result',session:'s',sequence:n,elapsed:n,pauses:[],events:[],physicsPose:null,snapshot:'{}',residency:{missing:[]},saveAvailable:true,farVisualRevision:revision})};},dispose(){}};}};
 const plugin={name:'far-authority',setup(builder){builder.onResolve({filter:/simulation-authority-client\.js$/},()=>({path:'authority',namespace:'mock'}));builder.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const createSimulationAuthorityClient=options=>globalThis.__farHostHarness.client(options);',loader:'js'}));}};
 try{
  const bundle=await build({entryPoints:[resolve('src/simulation/worker-runtime-host.js')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const send=data=>self.onmessage({data}),flush=()=>new Promise(resolve=>setImmediate(resolve)),port={postMessage:value=>visual.push(value),start(){},close(){}};
  await send({kind:'initialize',session:'s',clientOptions:{snapshot:'{}',chunkKeys:[],farVisualQueries:true},runtimeOptions:{startupSuspended:true},presentationPort:port});
  port.onmessage({data:{kind:'publicationAck',session:'s',sequence:1}});
  port.onmessage({data:{kind:'farVisualQuery',session:'s',id:1,request:{cx:0,cz:0,slots:[0],expectedSequence:1}}});await flush();assert.ok(querySignal);
  await send({kind:'command',session:'s',id:1,command:{kind:'snapshot'}});assert.equal(sequence,2);release({cx:0,cz:0,sequence:1,revision:1,elapsed:1,instances:Array.from({length:20},()=>[])});await flush();assert.deepEqual(visual.find(value=>value.kind==='farVisualResult'),{kind:'farVisualResult',session:'s',id:1,result:null});
  const empty=Array.from({length:20},()=>[]);port.onmessage({data:{kind:'farVisualQuery',session:'s',id:2,request:{cx:0,cz:0,slots:[0],expectedSequence:2,expectedRevision:1}}});await flush();await send({kind:'command',session:'s',id:2,command:{kind:'snapshot'}});release({cx:0,cz:0,sequence:2,revision:1,elapsed:2,instances:empty});await flush();assert.equal(visual.find(value=>value.kind==='farVisualResult'&&value.id===2).result.revision,1);
  port.onmessage({data:{kind:'farVisualQuery',session:'s',id:3,request:{cx:0,cz:0,slots:[0],expectedSequence:3,expectedRevision:1}}});await flush();revision=2;await send({kind:'command',session:'s',id:3,command:{kind:'snapshot'}});release({cx:0,cz:0,sequence:3,revision:1,elapsed:3,instances:empty});await flush();assert.equal(visual.find(value=>value.kind==='farVisualResult'&&value.id===3).result,null);
  port.onmessage({data:{kind:'farVisualQuery',session:'s',id:4,request:{cx:0,cz:0,slots:[0],expectedSequence:4}}});await flush();const stale=release;await send({kind:'dispose',session:'s'});assert.equal(querySignal.aborted,true);stale(null);await flush();assert.equal(visual.filter(value=>value.kind==='farVisualResult').length,3);
 }finally{globalThis.self=saved.self;globalThis.postMessage=saved.postMessage;globalThis.close=saved.close;globalThis.__farHostHarness=saved.harness;}
});
