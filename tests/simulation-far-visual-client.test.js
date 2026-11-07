import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

const request={cx:2,cz:-3,slots:[0,1,2,3],expectedSequence:0};
test('far requests are bounded, cancellable and do not reorder simulation commands',async()=>{
 const sent=[],worker={postMessage:message=>sent.push(message),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',farVisualQueries:true,workerFactory:()=>worker});
 assert.equal(sent[0].farVisualQueries,true);worker.onmessage({data:{session:'s',kind:'ready'}});await client.ready;
 const controller=new AbortController(),first=client.queryFarVisualChunk(request,{signal:controller.signal});assert.equal(sent.at(-1).kind,'farVisualQuery');
 assert.equal(await client.queryFarVisualChunk(request),null);const firstId=sent.at(-1).id;controller.abort();assert.equal(await first,null);
 // Cancelling the consumer cannot enqueue another native job until the old
 // result has actually returned from the authority Worker.
 assert.equal(await client.queryFarVisualChunk(request),null);worker.onmessage({data:{session:'s',kind:'farVisualResult',id:firstId,result:null}});
 const second=client.queryFarVisualChunk(request),secondId=sent.at(-1).id;worker.onmessage({data:{session:'s',kind:'farVisualResult',id:firstId,result:null}});
 const command=client.submit({kind:'snapshot'});assert.equal(sent.at(-1).kind,'command');assert.equal(await client.queryFarVisualChunk(request),null);
 const result={cx:2,cz:-3,sequence:0,revision:4,elapsed:3,instances:Array.from({length:20},()=>[])};worker.onmessage({data:{session:'s',kind:'farVisualResult',id:secondId,result}});assert.deepEqual(await second,result);
 worker.onmessage({data:{session:'s',kind:'result',sequence:1}});await command.result;client.dispose();
});

test('far responses with stale revisions or unexpected slots are rejected locally',async()=>{
 const sent=[],worker={postMessage:message=>sent.push(message),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',farVisualQueries:true,workerFactory:()=>worker});
 worker.onmessage({data:{session:'s',kind:'ready'}});await client.ready;
 const first=client.queryFarVisualChunk({...request,expectedRevision:7}),base={cx:2,cz:-3,sequence:0,revision:8,elapsed:3,instances:Array.from({length:20},()=>[])};
 worker.onmessage({data:{session:'s',kind:'farVisualResult',id:sent.at(-1).id,result:base}});await assert.rejects(first,/Invalid far visual result/);
 const second=client.queryFarVisualChunk(request);base.instances[5].push({id:'unexpected',slot:5,x:0,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});worker.onmessage({data:{session:'s',kind:'farVisualResult',id:sent.at(-1).id,result:base}});await assert.rejects(second,/Invalid far visual result/);assert.equal(client.status().state,'ready');client.dispose();
});

test('one waiting far query yields to queued player actions and can be cancelled before dispatch',async()=>{
 const sent=[],worker={postMessage:message=>sent.push(message),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',farVisualQueries:true,workerFactory:()=>worker});worker.onmessage({data:{session:'s',kind:'ready'}});await client.ready;
 const tick=client.submit({kind:'advance'}),action=client.submit({kind:'pause'}),later=client.submit({kind:'advance'}),cancel=new AbortController(),cancelled=client.queryFarVisualChunk(request,{signal:cancel.signal});assert.equal(await client.queryFarVisualChunk(request),null);cancel.abort();assert.equal(await cancelled,null);
 const waiting=client.queryFarVisualChunk(request);worker.onmessage({data:{session:'s',kind:'result',sequence:1}});await tick.result;assert.equal(sent.at(-1).command.kind,'pause');
 worker.onmessage({data:{session:'s',kind:'result',sequence:2}});await action.result;assert.equal(sent.at(-2).kind,'farVisualQuery');const id=sent.at(-2).id;assert.equal(sent.at(-1).command.kind,'advance');
 worker.onmessage({data:{session:'s',kind:'farVisualResult',id,result:null}});assert.equal(await waiting,null);worker.onmessage({data:{session:'s',kind:'result',sequence:3}});await later.result;client.dispose();
});

test('the outer runtime can reserve the next boundary for a player action',async()=>{
 let outerAction=true;const sent=[],worker={postMessage:message=>sent.push(message),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',farVisualQueries:true,canDispatchFar:()=>!outerAction,workerFactory:()=>worker});worker.onmessage({data:{session:'s',kind:'ready'}});await client.ready;
 const tick=client.submit({kind:'advance'}),waiting=client.queryFarVisualChunk(request);worker.onmessage({data:{session:'s',kind:'result',sequence:1}});await tick.result;assert.equal(sent.filter(item=>item.kind==='farVisualQuery').length,0);
 outerAction=false;const action=client.submit({kind:'pause'});assert.equal(sent.at(-1).command.kind,'pause');worker.onmessage({data:{session:'s',kind:'result',sequence:2}});await action.result;assert.equal(sent.at(-1).kind,'farVisualQuery');worker.onmessage({data:{session:'s',kind:'farVisualResult',id:sent.at(-1).id,result:null}});assert.equal(await waiting,null);client.dispose();
});

test('actual authority Worker serves far queries at an ordered boundary', {skip:!process.env.WILD_ENGINE_FAR_VISUAL_WASM},async(t)=>{
 const path=resolve(process.env.WILD_ENGINE_FAR_VISUAL_WASM),snapshot=gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),wasm=new WebAssembly.Module(readFileSync(path)),reference=createSimulationAuthority(wasm,snapshot,['0,0']);
 const plugin={name:'wasm-url',setup(builder){builder.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm-url',namespace:'test-url'}));builder.onLoad({filter:/.*/,namespace:'test-url'},()=>({contents:'export default "wild-engine.wasm"',loader:'js'}));}};
 const bundle=await build({entryPoints:[resolve('src/simulation/simulation-authority-worker.js')],bundle:true,write:false,platform:'node',format:'iife',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});
 const shim=`const {parentPort}=require('node:worker_threads');const {readFileSync}=require('node:fs');globalThis.self=globalThis;globalThis.crypto=require('node:crypto').webcrypto;globalThis.fetch=async()=>new Response(readFileSync(${JSON.stringify(path)}));globalThis.postMessage=value=>parentPort.postMessage(value);globalThis.close=()=>parentPort.close();\n${bundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`;
 const workerFactory=()=>{const thread=new Worker(shim,{eval:true}),wrapper={postMessage:(value,transfer)=>thread.postMessage(value,transfer),terminate:()=>thread.terminate()};thread.on('message',data=>wrapper.onmessage?.({data}));thread.on('error',error=>wrapper.onerror?.({message:error.message}));return wrapper;};
 const client=createSimulationAuthorityClient({session:'s',snapshot,chunkKeys:['0,0'],farVisualQueries:true,workerFactory});
 try{await client.ready;const query=client.queryFarVisualChunk(request),command=client.submit({kind:'snapshot'}),actual=await query,expected=reference.queryFarVisualChunk(request);assert.deepEqual(actual,expected);const result=await command.result,control=reference.execute({kind:'snapshot',sequence:1});assert.equal(result.snapshot,control.snapshot);assert.deepEqual(result.events,control.events);assert.equal(result.farVisualRevision,actual.revision);assert.equal(await client.queryFarVisualChunk(request),null);const later=await client.queryFarVisualChunk({...request,expectedRevision:actual.revision});assert.equal(later.sequence,1);assert.deepEqual(later.instances,actual.instances);
  const advance={kind:'advance',seconds:.001,nightFastForward:false};const began=performance.now(),queued=Array.from({length:8},()=>client.submit(advance)),received=[];assert.ok(queued.every(item=>item.accepted));
  const waiting=client.queryFarVisualChunk({...request,expectedRevision:actual.revision});assert.equal(await client.queryFarVisualChunk(request),null);
  for(let i=0;i<queued.length;i++){received.push(await queued[i].result);assert.equal(received[i].sequence,i+2);}
  const elapsed=performance.now()-began,after=await waiting;assert.ok(after);assert.ok(after.sequence>=2&&after.sequence<9);for(let i=0;i<received.length;i++){const baseline=reference.execute({...advance,sequence:i+2});assert.equal(received[i].snapshot,baseline.snapshot);assert.deepEqual(received[i].events,baseline.events);}
  const times=[];for(let i=0;i<5;i++){const started=performance.now(),query=client.queryFarVisualChunk({...request,expectedRevision:actual.revision}),action=client.submit({kind:'snapshot'});await query;await action.result;times.push(performance.now()-started);}t.diagnostic(`8 queued advances with query: ${elapsed.toFixed(2)} ms; query plus following snapshot max: ${Math.max(...times).toFixed(2)} ms (5 runs)`);
 }
 finally{client.dispose();reference.dispose();}
});
