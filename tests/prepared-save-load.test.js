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
