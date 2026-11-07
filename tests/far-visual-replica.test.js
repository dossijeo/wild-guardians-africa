import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {createFarVisualReplicaClient} from '../src/simulation/far-visual-replica-client.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

const snapshot=(revision=1,sequence=0)=>({sequence,elapsed:sequence,revision,snapshot:{revision}});
const request={cx:2,cz:-3,slots:[0,1,2,3],expectedSequence:0,expectedRevision:1};
const result=(revision=1,sequence=0)=>({cx:2,cz:-3,revision,sequence,elapsed:sequence,instances:Array.from({length:20},()=>[])});
function harness(){const sent=[];let terminated=0;const worker={postMessage:data=>sent.push(data),terminate:()=>terminated++},client=createFarVisualReplicaClient({session:'s',workerFactory:()=>worker}),receive=data=>worker.onmessage({data:{session:'s',...data}});return {client,sent,worker,receive,terminated:()=>terminated};}

test('replica coalesces spatial updates and keeps only one query in flight',async()=>{
 const h=harness();h.client.updateSnapshot(snapshot());h.client.updateSnapshot(snapshot(2,1));h.client.updateSnapshot(snapshot(3,2));assert.equal(h.sent.length,1);
 h.receive({kind:'snapshotReady',revision:1});assert.equal(h.sent.length,2);assert.equal(h.sent[1].revision,3);h.receive({kind:'snapshotReady',revision:3});
 const query={...request,expectedRevision:3,expectedSequence:2},first=h.client.query(query);assert.equal(h.sent.at(-1).kind,'query');assert.equal(await h.client.query(query),null);
 h.receive({kind:'result',id:h.sent.at(-1).id,result:result(3,2)});assert.deepEqual(await first,result(3,2));h.client.dispose();assert.equal(h.terminated(),1);
});

test('cancellation and revision changes discard results without accumulating work',async()=>{
 const h=harness();h.client.updateSnapshot(snapshot());h.receive({kind:'snapshotReady',revision:1});const abort=new AbortController(),first=h.client.query(request,{signal:abort.signal}),id=h.sent.at(-1).id;abort.abort();assert.equal(await first,null);assert.equal(await h.client.query(request),null);
 h.client.updateSnapshot(snapshot(2,1));assert.equal(h.sent.at(-1).id,id);h.receive({kind:'result',id,result:result()});assert.equal(h.sent.at(-1).kind,'snapshot');h.receive({kind:'snapshotReady',revision:2});
 const next=h.client.query({...request,expectedRevision:2,expectedSequence:1}),nextId=h.sent.at(-1).id;h.client.confirm({sequence:2,revision:3,elapsed:2});assert.equal(await next,null);h.receive({kind:'result',id:nextId,result:result(2,1)});assert.equal(await h.client.query(request),null);h.client.dispose();
});

test('a failed replica resolves pending consumers and does not restart itself',async()=>{
 const h=harness();h.client.updateSnapshot(snapshot());const first=h.client.query(request);h.worker.onerror({message:'GPU-independent spatial worker failure'});assert.equal(await first,null);assert.equal(h.client.status().state,'failed');h.client.updateSnapshot(snapshot(2,1));assert.equal(h.sent.length,1);assert.equal(await h.client.query(request),null);h.client.dispose();
});

test('confirmed clock metadata advances without resending unchanged terrain',async()=>{
 const h=harness();h.client.updateSnapshot(snapshot());h.receive({kind:'snapshotReady',revision:1});h.client.confirm({sequence:20,elapsed:4.5,revision:1});const first=h.client.query({...request,expectedSequence:20});assert.deepEqual(h.sent.at(-1).confirmed,{sequence:20,elapsed:4.5,revision:1});assert.equal(h.sent.filter(x=>x.kind==='snapshot').length,1);h.receive({kind:'result',id:h.sent.at(-1).id,result:{...result(1,20),elapsed:4.5}});assert.equal((await first).elapsed,4.5);h.client.dispose();
});

test('replica failure leaves the authority and its next command usable',async()=>{
 const messages=[],authority={postMessage:data=>messages.push(data),terminate(){}},replica={postMessage(){},terminate(){}};
 const client=createSimulationAuthorityClient({session:'s',snapshot:'{}',chunkKeys:[],farVisualQueries:true,workerFactory:()=>authority,farReplicaWorkerFactory:()=>replica});
 authority.onmessage({data:{kind:'farVisualSnapshot',session:'s',...snapshot()}});authority.onmessage({data:{kind:'ready',session:'s'}});await client.ready;
 const waiting=client.queryFarVisualChunk(request);replica.onerror({message:'failed'});assert.equal(await waiting,null);assert.equal(client.status().state,'ready');
 const command=client.submit({kind:'snapshot'});authority.onmessage({data:{kind:'result',session:'s',sequence:1,elapsed:0,farVisualRevision:1,snapshot:'{}'}});assert.equal((await command.result).sequence,1);assert.equal(client.farQueryStatus().state,'failed');assert.equal(await client.queryFarVisualChunk(request),null);client.dispose();
});

test('actual replica bypasses a busy authority lane while commands remain deterministic',async()=>{
 const path=resolve(process.env.WILD_ENGINE_FAR_VISUAL_WASM??'src/world/wild-engine/spatial-savanna.wasm'),module=new WebAssembly.Module(readFileSync(path));
 const original=gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),reference=createSimulationAuthority(module,original,['0,0']);
 const plugin={name:'wasm-url',setup(builder){builder.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm-url',namespace:'test-url'}));builder.onLoad({filter:/.*/,namespace:'test-url'},()=>({contents:'export default "wild-engine.wasm"',loader:'js'}));}};
 async function factoryFor(entry){const bundle=await build({entryPoints:[resolve(entry)],bundle:true,write:false,platform:'node',format:'iife',define:{'import.meta.env':'{"DEV":false}'},plugins:[plugin]});const shim=`const {parentPort}=require('node:worker_threads');const {readFileSync}=require('node:fs');globalThis.self=globalThis;globalThis.crypto=require('node:crypto').webcrypto;globalThis.fetch=async()=>new Response(readFileSync(${JSON.stringify(path)}));globalThis.postMessage=value=>parentPort.postMessage(value);globalThis.close=()=>parentPort.close();\n${bundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`;return ()=>{const thread=new Worker(shim,{eval:true}),wrapper={postMessage:(value,transfer)=>thread.postMessage(value,transfer),terminate:()=>thread.terminate()};thread.on('message',data=>wrapper.onmessage?.({data}));thread.on('error',error=>wrapper.onerror?.({message:error.message}));return wrapper;};}
 const [workerFactory,farReplicaWorkerFactory]=await Promise.all([factoryFor('src/simulation/simulation-authority-worker.js'),factoryFor('src/simulation/far-visual-replica-worker.js')]);
 let snapshots=0;
 const countedFactory=()=>{const worker=workerFactory();let listener;Object.defineProperty(worker,'onmessage',{get:()=>data=>{if(data.data?.kind==='farVisualSnapshot')snapshots++;listener?.(data);},set:value=>{listener=value;}});return worker;};
 const client=createSimulationAuthorityClient({session:'s',snapshot:original,chunkKeys:['0,0'],farVisualQueries:true,canDispatchFar:()=>false,workerFactory:countedFactory,farReplicaWorkerFactory});
 try{
  await client.ready;const revision=reference.farVisualRevision(),q={...request,expectedRevision:revision},first=await client.queryFarVisualChunk(q);assert.deepEqual(first,reference.queryFarVisualChunk(q));assert.equal(client.farQueryStatus().mode,'replica');
  const commands=[{kind:'advance',seconds:.001,nightFastForward:false},{kind:'pause',reason:'b2-test'},{kind:'snapshot'},{kind:'resume',reason:'b2-test'},{kind:'advance',seconds:.001,nightFastForward:false},{kind:'snapshot'}];const queued=commands.map(command=>client.submit(command));const whileBusy=client.queryFarVisualChunk(q);assert.equal(client.farQueryStatus().outstanding!==null,true);
  for(let i=0;i<queued.length;i++){const actual=await queued[i].result,expected=reference.execute({...commands[i],sequence:i+1});assert.equal(actual.snapshot,expected.snapshot);assert.deepEqual(actual.events,expected.events);}
  const far=await whileBusy;assert.ok(far);assert.deepEqual(far.instances,first.instances);assert.equal(far.revision,revision);assert.equal(client.status().state,'ready');assert.equal(snapshots,1,'unchanged spatial inputs must not publish snapshots per tick');
 }finally{client.dispose();reference.dispose();}
});
