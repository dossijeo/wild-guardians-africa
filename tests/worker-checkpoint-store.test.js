import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {newGame} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {encodePhysicsCheckpoint} from '../src/simulation/physics-checkpoint-codec.js';

// Exercise the actual Worker module with a small asynchronous IndexedDB stub.
function startStore(initialRecords=[]){
 const url=new URL('../src/persistence/worker-checkpoint-store.js',import.meta.url).href;
 const source=`import {parentPort,workerData} from 'node:worker_threads';
 const records=new Map(workerData);const db={createObjectStore(){},transaction(){const tx={};tx.objectStore=()=>({get(key){const request={};setImmediate(()=>{request.result=records.get(key);request.onsuccess?.();});return request;},put(value){records.set(value.slotId,value);parentPort.postMessage({kind:'stored',record:value});setImmediate(()=>tx.oncomplete?.());}});return tx;}};
 globalThis.self={indexedDB:{open(){const request={};setImmediate(()=>{request.result=db;request.onupgradeneeded?.();request.onsuccess?.();});return request;}},postMessage:value=>parentPort.postMessage(value)};
 await import(${JSON.stringify(url)});parentPort.on('message',data=>self.onmessage({data}));`;
 return new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module',workerData:initialRecords});
}
function execute(worker,request){return new Promise((resolve,reject)=>{let stored=null;worker.on('error',reject);worker.on('message',message=>{if(message.kind==='stored')stored=message.record;else resolve({message,stored});});worker.postMessage(request);});}
test('actual checkpoint Worker validates, stores and returns only the receipt',async()=>{
 const worker=startStore(),state=newGame({seed:712,slotId:'a'});try{const checkpoint={sequence:3,saveAvailable:true,snapshot:serialize(state),raidWaitBindings:[]},request={kind:'save',databaseName:'test',slotId:'a',policy:{physics:false,nativeAuthority:false},savedAt:123,checkpoint},result=await execute(worker,request);assert.deepEqual(result.message,{kind:'result',result:{saved:true,sequence:3,elapsed:0}});const stored=deserialize(result.stored.primary);assert.equal(stored.slotId,'a');assert.equal(stored.savedAt,123);assert.deepEqual(stored.workerRaidWaitBindings,[]);}finally{await worker.terminate();}
});
test('actual checkpoint Worker rejects a different slot before writing',async()=>{
 const worker=startStore(),state=newGame({seed:712,slotId:'other'});try{const result=await execute(worker,{kind:'save',databaseName:'test',slotId:'a',policy:{physics:false,nativeAuthority:false},savedAt:123,checkpoint:{sequence:3,saveAvailable:true,snapshot:serialize(state),raidWaitBindings:[]}});assert.equal(result.message.kind,'error');assert.match(result.message.message,/slot mismatch/);assert.equal(result.stored,null);}finally{await worker.terminate();}
});
test('checkpoint Worker keeps a valid backup when the previous primary is corrupt',async()=>{
 const old=newGame({seed:711,slotId:'a'}),state=newGame({seed:712,slotId:'a'}),backup=serialize(old),worker=startStore([['a',{slotId:'a',primary:'corrupt',backup}]]);try{const result=await execute(worker,{kind:'save',databaseName:'test',slotId:'a',policy:{physics:false,nativeAuthority:false},savedAt:123,checkpoint:{sequence:3,saveAvailable:true,snapshot:serialize(state),raidWaitBindings:[]}});assert.equal(result.message.result.saved,true);assert.equal(result.stored.backup,backup);assert.equal(deserialize(result.stored.primary).seed,'712');}finally{await worker.terminate();}
});
test('checkpoint Worker preserves supported physics and does not write unavailable states',async()=>{
 const state=newGame({seed:712,slotId:'a'}),physical=encodePhysicsCheckpoint({version:1,fall:{solver:{world:new Uint8Array([1,2,3])}}}),request={kind:'save',databaseName:'test',slotId:'a',policy:{physics:true,nativeAuthority:false},savedAt:123,checkpoint:{sequence:3,saveAvailable:false,snapshot:serialize(state),raidWaitBindings:[]}},first=startStore();try{const result=await execute(first,request);assert.deepEqual(result.message.result,{saved:false,reason:'physics-active',sequence:3});assert.equal(result.stored,null);}finally{await first.terminate();}const second=startStore();try{const result=await execute(second,{...request,checkpoint:{...request.checkpoint,physicsCheckpoint:physical}});assert.equal(result.message.result.saved,true);assert.equal(deserialize(result.stored.primary).workerPhysicsCheckpoint,physical);}finally{await second.terminate();}
});
