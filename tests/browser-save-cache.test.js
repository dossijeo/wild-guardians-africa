import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserSaveRepository} from '../src/persistence/browser-saves.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {newGame} from '../src/simulation/game.js';

// Transaction double: writes become visible only on successful completion.
// Native IndexedDB recovery is also exercised in browser/indexed-saves.html.
function setup() {
  const rows=new Map(),legacy=new Map();let abortNext=false;
  const storage={getItem:key=>legacy.get(key)??null,setItem:(key,value)=>legacy.set(key,value),removeItem:key=>legacy.delete(key)};
  const db={transaction(){
    let next,removed;
    const tx={error:Error('Aborted QA transaction'),objectStore:()=>({
      get(slotId){
        const request={};queueMicrotask(()=>{
          request.result=structuredClone(rows.get(slotId));request.onsuccess();
          if(abortNext){abortNext=false;tx.onabort();}
          else{if(next)rows.set(next.slotId,next);tx.oncomplete();}
        });return request;
      },
      put:record=>{next=structuredClone(record);},
      delete(slotId){removed=slotId;queueMicrotask(()=>{rows.delete(removed);tx.oncomplete();});}
    })};return tx;
  }};
  const repo=new BrowserSaveRepository(storage,{database:{}});repo.open=async()=>db;
  return {repo,rows,abort:()=>{abortNext=true;}};
}
async function countParses(text,action) {
  const parse=JSON.parse;let count=0;
  JSON.parse=function(value,...args){if(value===text)count++;return parse.call(this,value,...args);};
  try{await action();return count;}finally{JSON.parse=parse;}
}

test('only an identical durable primary avoids revalidation; queued saves capture invocation state',async()=>{
  const {repo,rows}=setup(),state=newGame({seed:712,slotId:'a'});
  await repo.save(state);const first=rows.get('a').primary;
  state.day=2;assert.equal(await countParses(first,()=>repo.save(state)),0);
  assert.equal(rows.get('a').backup,first);
  state.day=3;const a=repo.save(state);state.day=4;const b=repo.save(state);state.day=99;
  await Promise.all([a,b]);assert.equal(deserialize(rows.get('a').primary).day,4);
  assert.equal(deserialize(rows.get('a').backup).day,3);
});

test('an external valid edit is fully validated and becomes the recovery copy',async()=>{
  const {repo,rows}=setup(),state=newGame({seed:712,slotId:'a'});
  await repo.save(state);state.day=7;const external=serialize(state);
  rows.get('a').primary=external;state.day=8;
  assert.equal(await countParses(external,()=>repo.save(state)),1);
  assert.equal(rows.get('a').backup,external);
});

test('corruption and a foreign-slot primary never replace the older valid backup',async()=>{
  const {repo,rows}=setup(),state=newGame({seed:712,slotId:'a'});
  await repo.save(state);const first=rows.get('a').primary;state.day=2;await repo.save(state);
  for(const external of ['corrupt',serialize(newGame({seed:913,slotId:'b'}))]){
    rows.get('a').primary=external;state.day++;
    assert.equal(await countParses(external,()=>repo.save(state)),1);
    assert.equal(rows.get('a').backup,first);
  }
});

test('an aborted save cannot certify bytes later written externally',async()=>{
  const {repo,rows,abort}=setup(),state=newGame({seed:712,slotId:'a'});
  await repo.save(state);const committed=rows.get('a').primary;
  state.day=2;const failed=serialize(state);abort();await assert.rejects(repo.save(state),/Aborted/);
  assert.equal(rows.get('a').primary,committed);
  rows.get('a').primary=failed;state.day=3;
  assert.equal(await countParses(failed,()=>repo.save(state)),1);
  assert.equal(rows.get('a').backup,failed);
});

test('a cached primary never bypasses validation of the new gameplay state',async()=>{
  const {repo,rows}=setup(),state=newGame({seed:712,slotId:'a'});
  await repo.save(state);const committed=structuredClone(rows.get('a'));
  state.time=-1;assert.throws(()=>repo.save(state),/Reloj/);
  assert.deepEqual(rows.get('a'),committed);
  state.time=0;state.day=2;await repo.save(state);
  assert.equal(deserialize(rows.get('a').primary).day,2);
  assert.equal(rows.get('a').backup,committed.primary);
});

test('cache retains only the last slot and deleting it removes the cached snapshot',async()=>{
  const {repo,rows}=setup(),a=newGame({seed:712,slotId:'a'}),b=newGame({seed:913,slotId:'b'});
  await repo.save(a);const old=rows.get('a').primary;await repo.save(b);
  assert.equal(repo.lastCommitted.slotId,'b');a.day=2;
  assert.equal(await countParses(old,()=>repo.save(a)),1);
  await repo.delete('a');assert.equal(repo.lastCommitted,null);assert.equal(rows.has('a'),false);
  assert.equal(deserialize(rows.get('b').primary).slotId,'b');
});
