import test from 'node:test';
import assert from 'node:assert/strict';
import {evictOldest} from '../src/world/fifo-eviction.js';
const reference=map=>{const entry=map.keys().next();return !entry.done&&map.delete(entry.value);};
test('persistent FIFO cursor matches Map insertion order through updates, removals, clear and reinsertion',()=>{
 const keys=[undefined,null,NaN,0,-0,'x',Symbol('key'),{},...Array.from({length:32},(_,i)=>i+1)];
 const a=new Map(),b=new Map();let seed=712;
 const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let i=0;i<25000;i++){
  const key=keys[random(keys.length)],kind=random(100);
  if(kind<60){const value=random(999);a.set(key,value);b.set(key,value);}
  else if(kind<75)assert.equal(a.delete(key),b.delete(key));
  else if(kind<99)assert.equal(reference(a),evictOldest(b));
  else {a.clear();b.clear();}
  assert.deepEqual([...b],[...a],`operation ${i}`);
 }
});
test('a cursor exhausted on an empty map restarts after subsequent insertions',()=>{
 const map=new Map();assert.equal(evictOldest(map),false);map.set('a',1);assert.equal(evictOldest(map),true);assert.equal(evictOldest(map),false);
 map.set('b',2);map.set('c',3);assert.equal(evictOldest(map),true);assert.deepEqual([...map],[['c',3]]);map.clear();map.set('d',4);assert.equal(evictOldest(map),true);
});
test('full bounded caches preserve every eviction key across long insertion streams',()=>{
 for(const limit of [256,4096,12000]){
  const a=new Map(Array.from({length:limit},(_,i)=>[i,i])),b=new Map(a);
  for(let i=0;i<30000;i++){
   assert.equal(a.keys().next().value,i);assert.equal(reference(a),evictOldest(b));assert.equal(b.has(i),false);
   a.set(limit+i,i);b.set(limit+i,i);
   if(i%3000===0)assert.deepEqual([...b],[...a]);
  }
  assert.deepEqual([...b],[...a]);assert.equal(b.size,limit);
 }
});
