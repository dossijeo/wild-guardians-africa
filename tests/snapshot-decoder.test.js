import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {decodeSnapshotAsync} from '../src/persistence/snapshot-decoder.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {newGame} from '../src/simulation/game.js';

function fake(){
 const worker={terminated:0,sent:[],postMessage(value){this.sent.push(value);},terminate(){this.terminated++;}};
 return {worker,createWorker:()=>worker,reply:state=>worker.onmessage({data:{type:'snapshot-decoded',state,decodeMs:12}})};
}
test('snapshot owner posts once, returns state, terminates and removes handlers',async()=>{
 const f=fake(),diagnostics=[],state=newGame({seed:712});
 const result=decodeSnapshotAsync('text',{workerAvailable:true,createWorker:f.createWorker,onDiagnostic:d=>diagnostics.push(d)});
 assert.deepEqual(f.worker.sent,[{type:'decode-snapshot',text:'text'}]);
 f.reply(state);assert.equal(await result,state);assert.equal(f.worker.terminated,1);
 assert.equal(f.worker.onmessage,null);assert.equal(f.worker.onerror,null);assert.equal(f.worker.onmessageerror,null);
 assert.deepEqual(diagnostics,[{mode:'worker',decodeMs:12}]);
});
test('pre-abort never creates a worker or performs fallback parsing',async()=>{
 const controller=new AbortController();controller.abort();let created=0;
 await assert.rejects(decodeSnapshotAsync('invalid',{signal:controller.signal,createWorker:()=>created++}),{name:'AbortError'});
 assert.equal(created,0);
});
test('abort owns termination and a late result cannot be adopted',async()=>{
 const f=fake(),controller=new AbortController(),diagnostics=[];
 const result=decodeSnapshotAsync('text',{workerAvailable:true,createWorker:f.createWorker,signal:controller.signal,onDiagnostic:d=>diagnostics.push(d)});
 const late=f.worker.onmessage;controller.abort();await assert.rejects(result,{name:'AbortError'});
 late({data:{type:'snapshot-decoded',state:{},decodeMs:1}});
 assert.equal(f.worker.terminated,1);assert.deepEqual(diagnostics,[]);
});
test('a never-responding worker times out without RAF and is terminated',async()=>{
 const f=fake();await assert.rejects(decodeSnapshotAsync('text',{workerAvailable:true,createWorker:f.createWorker,timeout:5}),{name:'TimeoutError'});
 assert.equal(f.worker.terminated,1);assert.equal(f.worker.onmessage,null);
});
test('worker validation errors preserve their name/message and close the owner',async()=>{
 const f=fake(),result=decodeSnapshotAsync('invalid',{workerAvailable:true,createWorker:f.createWorker});
 f.worker.onmessage({data:{type:'snapshot-decoded',error:{name:'SyntaxError',message:'Invalid JSON'}}});
 await assert.rejects(result,{name:'SyntaxError',message:'Invalid JSON'});assert.equal(f.worker.terminated,1);
});
for(const mode of ['error','messageerror','protocol'])test('worker '+mode+' failure rejects without blocking fallback',async()=>{
 const f=fake(),diagnostics=[],result=decodeSnapshotAsync('invalid',{workerAvailable:true,createWorker:f.createWorker,onDiagnostic:d=>diagnostics.push(d)});
 if(mode==='error')f.worker.onerror({message:'CSP rejected module',preventDefault(){}});
 else if(mode==='messageerror')f.worker.onmessageerror({});
 else f.worker.onmessage({data:{type:'other'}});
 await assert.rejects(result,{name:'SnapshotWorkerError'});assert.equal(f.worker.terminated,1);assert.deepEqual(diagnostics,[]);
});
test('postMessage failure and diagnostic failure still close the worker',async()=>{
 const f=fake();f.worker.postMessage=()=>{throw Error('clone rejected');};
 await assert.rejects(decodeSnapshotAsync('text',{workerAvailable:true,createWorker:f.createWorker}),{name:'SnapshotWorkerError'});
 assert.equal(f.worker.terminated,1);
 const g=fake(),result=decodeSnapshotAsync('text',{workerAvailable:true,createWorker:g.createWorker,onDiagnostic:()=>{throw Error('diagnostic rejected');}});
 g.reply({});await assert.rejects(result,/diagnostic rejected/);assert.equal(g.worker.terminated,1);
});
test('compatibility fallback is explicitly reported and preserves full validation',async()=>{
 const state=newGame({seed:712}),text=serialize(state),diagnostics=[];
 assert.deepEqual(await decodeSnapshotAsync(text,{workerAvailable:false,onDiagnostic:d=>diagnostics.push(d)}),deserialize(text));
 assert.deepEqual(diagnostics,[{mode:'synchronous-fallback',reason:'worker-unavailable'}]);
 await assert.rejects(decodeSnapshotAsync('{}',{workerAvailable:false}),/Guardado incompatible/);
 const construction=[];
 assert.deepEqual(await decodeSnapshotAsync(text,{workerAvailable:true,createWorker:()=>{throw Error('not supported');},onDiagnostic:d=>construction.push(d)}),state);
 assert.equal(construction[0].reason,'worker-construction-failed');
});
test('actual worker module preserves the complete native snapshot and validator failures',async()=>{
 const workerUrl=new URL('../src/persistence/snapshot-decode-worker.js',import.meta.url).href,terminations=[];
 const createWorker=()=>{
  const source=`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:value=>parentPort.postMessage(value)};await import(${JSON.stringify(workerUrl)});parentPort.on('message',data=>self.onmessage({data}));`;
  const native=new NodeWorker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'});
  const adapter={postMessage:value=>native.postMessage(value),terminate:()=>terminations.push(native.terminate())};
  native.on('message',data=>adapter.onmessage?.({data}));native.on('error',error=>adapter.onerror?.({message:error.message}));return adapter;
 };
 try{
  const state=newGame({seed:712});state.day=14;state.time=310;state.savedAt=12345;
  state.plants=Array.from({length:256},(_,i)=>({id:'worker-parity-'+i,species:'maiz',x:i*1.5,z:3,alive:true,growth:i%100,multiplyHarvest:i%2===0}));
  const text=serialize(state);
  assert.deepEqual(await decodeSnapshotAsync(text,{workerAvailable:true,createWorker}),deserialize(text));
  await assert.rejects(decodeSnapshotAsync('{}',{workerAvailable:true,createWorker}),/Guardado incompatible/);
 }finally{await Promise.all(terminations);}
});
