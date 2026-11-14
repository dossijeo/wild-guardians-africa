import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserSaveRepository} from '../src/persistence/browser-saves.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {newGame} from '../src/simulation/game.js';

function fixture({database={}}={}){
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 const repo=new BrowserSaveRepository(storage,{database}),state=newGame({seed:712,slotId:'a'});
 return {repo,state,data,text:serialize(state)};
}
test('prepared IndexedDB load preserves the complete state and never rewrites storage',async()=>{
 const f=fixture(),calls=[];f.repo.records=async()=>({primary:f.text});
 const state=await f.repo.loadPrepared('a',{decode:async text=>{calls.push(text);return deserialize(text);}});
 assert.deepEqual(state,f.state);assert.deepEqual(calls,[f.text]);assert.equal(f.data.size,0);
});
test('prepared load recovers corrupted or wrong-slot primary using the same validated backup',async()=>{
 for(const primary of ['corrupt',serialize(newGame({seed:713,slotId:'b'}))]){
  const f=fixture(),calls=[];f.repo.records=async()=>({primary,backup:f.text});
  const state=await f.repo.loadPrepared('a',{decode:async text=>{calls.push(text);return deserialize(text);}});
  assert.deepEqual(state,f.state);assert.deepEqual(calls,[primary,f.text]);assert.equal(f.data.size,0);
 }
});
test('source handoff preserves exactly the validated backup or legacy copy',async()=>{
 for(const legacy of [false,true]){const f=fixture({database:legacy?null:{}}),source=' \n'+f.text+'\n';if(legacy){const key=f.repo.legacy.key('a');f.data.set(key,'invalid');f.data.set(key+':backup',source);}else f.repo.records=async()=>({primary:'invalid',backup:source});const result=await f.repo.loadPrepared('a',{withSource:true,decode:async text=>deserialize(text)});assert.equal(result.source,source);assert.deepEqual(result.state,f.state);}
});
test('source handoff rejects invalid options without changing the default result',async()=>{const f=fixture();f.repo.records=async()=>({primary:f.text});await assert.rejects(f.repo.loadPrepared('a',{withSource:'yes'}),/source option/);assert.deepEqual(await f.repo.loadPrepared('a',{decode:async text=>deserialize(text)}),f.state);});
test('checkpoint persistence transfers the validated result to a Worker and removes legacy copies only after commit',async()=>{
 const f=fixture(),key=f.repo.legacy.key('a'),workers=[],checkpoint={sequence:7,saveAvailable:true,snapshot:f.text,raidWaitBindings:[]};f.data.set(key,f.text);f.data.set(key+':backup',f.text);const workerFactory=()=>{const worker={postMessage(message){this.message=message;},terminate(){this.terminated=true;}};workers.push(worker);return worker;};
 const pending=f.repo.saveWorkerCheckpoint(checkpoint,{slotId:'a',policy:{physics:false,nativeAuthority:false},savedAt:5,workerFactory});await new Promise(resolve=>setImmediate(resolve));assert.equal(workers[0].message.legacyPrimary,f.text);assert.equal(workers[0].message.checkpoint.snapshot,f.text);assert.equal(f.data.get(key),f.text);workers[0].onmessage({data:{kind:'result',result:{saved:true,sequence:7,elapsed:0}}});assert.equal((await pending).saved,true);assert.equal(workers[0].terminated,true);assert.equal(f.data.has(key),false);assert.equal(f.data.has(key+':backup'),false);
});
test('failed or unavailable Worker checkpoints retain legacy recovery copies',async()=>{
 const f=fixture(),key=f.repo.legacy.key('a'),workers=[];f.data.set(key,f.text);const workerFactory=()=>{const worker={postMessage(){},terminate(){}};workers.push(worker);return worker;},options={slotId:'a',policy:{},savedAt:5,workerFactory},checkpoint={sequence:2};
 const failed=f.repo.saveWorkerCheckpoint(checkpoint,options);await new Promise(resolve=>setImmediate(resolve));workers[0].onmessage({data:{kind:'error',message:'storage failed'}});await assert.rejects(failed,/storage failed/);assert.equal(f.data.get(key),f.text);
 const unavailable=f.repo.saveWorkerCheckpoint(checkpoint,options);await new Promise(resolve=>setImmediate(resolve));workers[1].onmessage({data:{kind:'result',result:{saved:false,reason:'physics-active',sequence:2}}});assert.equal((await unavailable).saved,false);assert.equal(f.data.get(key),f.text);
});
test('Worker checkpoint writes remain serialized by the repository queue',async()=>{
 const f=fixture(),workers=[],factory=()=>{const worker={postMessage(message){this.message=message;},terminate(){}};workers.push(worker);return worker;},options={slotId:'a',policy:{},savedAt:5,workerFactory:factory},first=f.repo.saveWorkerCheckpoint({sequence:1},options),second=f.repo.saveWorkerCheckpoint({sequence:2},options),flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();assert.equal(workers.length,1);workers[0].onmessage({data:{kind:'result',result:{saved:true,sequence:1,elapsed:0}}});await first;await flush();assert.equal(workers.length,2);workers[1].onmessage({data:{kind:'result',result:{saved:true,sequence:2,elapsed:1}}});assert.equal((await second).sequence,2);
});
test('unresponsive checkpoint Worker is terminated, retains recovery copies, and releases later saves',async()=>{
 const f=fixture(),key=f.repo.legacy.key('a'),workers=[];f.data.set(key,f.text);
 const factory=()=>{const worker={postMessage(){},terminate(){this.terminated=true;}};workers.push(worker);return worker;};
 const options={slotId:'a',policy:{},savedAt:5,timeout:15,workerFactory:factory};
 const first=f.repo.saveWorkerCheckpoint({sequence:1},options),second=f.repo.saveWorkerCheckpoint({sequence:2},{...options,timeout:1000});
 await assert.rejects(first,{name:'TimeoutError'});assert.equal(workers[0].terminated,true);assert.equal(f.data.get(key),f.text);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(workers.length,2);
 workers[1].onmessage({data:{kind:'result',result:{saved:true,sequence:2,elapsed:1}}});
 assert.equal((await second).sequence,2);assert.equal(workers[1].terminated,true);assert.equal(f.data.has(key),false);
});
test('checkpoint Worker rejects invalid timeouts before starting storage work',async()=>{
 const f=fixture();let started=false;
 for(const timeout of [0,-1,NaN,Infinity])await assert.rejects(f.repo.saveWorkerCheckpoint({sequence:1},{slotId:'a',policy:{},timeout,workerFactory:()=>{started=true;}}),/Invalid worker checkpoint persistence/);
 assert.equal(started,false);
});
test('legacy copies receive asynchronous full validation after IndexedDB recovery fails',async()=>{
 const f=fixture(),calls=[];f.repo.records=async()=>({primary:'invalid'});f.data.set(f.repo.legacy.key('a'),f.text);
 const state=await f.repo.loadPrepared('a',{decode:async text=>{calls.push(text);return deserialize(text);}});
 assert.deepEqual(state,f.state);assert.deepEqual(calls,['invalid',f.text]);assert.equal(f.data.size,1);
});
test('legacy prepared path skips staging and respects slot identity',async()=>{
 const f=fixture({database:null}),key=f.repo.legacy.key('a');
 f.data.set(key+':pending',f.text);f.data.set(key,serialize(newGame({seed:713,slotId:'b'})));f.data.set(key+':backup',f.text);
 assert.deepEqual(await f.repo.loadPrepared('a',{decode:async text=>deserialize(text)}),f.state);
 f.data.delete(key+':backup');await assert.rejects(f.repo.loadPrepared('a',{decode:async text=>deserialize(text)}),/otra ranura/);
 assert.equal(f.data.size,2);
});
test('cancelled transaction wait resolves promptly without decoding a late result',async()=>{
 const f=fixture(),controller=new AbortController();let complete,decodes=0;
 f.repo.records=()=>new Promise(resolve=>{complete=resolve;});
 const pending=f.repo.loadPrepared('a',{signal:controller.signal,decode:async text=>{decodes++;return deserialize(text);}});
 controller.abort();await assert.rejects(pending,{name:'AbortError'});
 complete({primary:f.text});await Promise.resolve();assert.equal(decodes,0);
});
test('storage and decoder waits have timer deadlines independent of RAF',async()=>{
 const f=fixture();f.repo.records=()=>new Promise(()=>{});
 await assert.rejects(f.repo.loadPrepared('a',{timeout:5}),{name:'TimeoutError'});
 f.repo.records=async()=>({primary:f.text});let aborted=false;
 await assert.rejects(f.repo.loadPrepared('a',{timeout:5,decode:(_,options)=>{options.signal.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});}}),{name:'TimeoutError'});
 assert.equal(aborted,true);
});
test('transport failures propagate without trying backup or synchronous legacy recovery',async()=>{
 const f=fixture(),calls=[];f.repo.records=async()=>({primary:f.text,backup:f.text});f.data.set(f.repo.legacy.key('a'),f.text);
 await assert.rejects(f.repo.loadPrepared('a',{decode:async text=>{calls.push(text);const error=Error('Worker transport failed');error.name='SnapshotWorkerError';throw error;}}),{name:'SnapshotWorkerError'});
 assert.deepEqual(calls,[f.text]);
});
test('owner signal closes on successful completion and pre-abort starts no storage work',async()=>{
 const f=fixture(),controller=new AbortController();let entered=0,child;
 f.repo.records=async()=>{entered++;return {primary:f.text};};controller.abort();
 await assert.rejects(f.repo.loadPrepared('a',{signal:controller.signal}),{name:'AbortError'});assert.equal(entered,0);
 await f.repo.loadPrepared('a',{decode:async(text,options)=>{child=options.signal;return deserialize(text);}});
 assert.equal(child.aborted,true);
});
test('validated slot summaries expose the actual saved clock without changing the snapshot',async()=>{
 const f=fixture();f.state.day=8;f.state.time=310;const text=serialize(f.state);
 f.repo.records=async()=>[{slotId:'a',primary:text}];
 const rows=await f.repo.list();assert.equal(rows[0].day,8);assert.equal(rows[0].time,310);
 assert.deepEqual(deserialize(text),f.state);assert.equal(f.data.size,0);
});
