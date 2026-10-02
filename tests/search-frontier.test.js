import test from 'node:test';
import assert from 'node:assert/strict';
import {SearchFrontier} from '../src/world/search-frontier.js';
test('Heap frontier matches stable sorting under interleaved insertions and removals',()=>{
  const frontier=new SearchFrontier(),reference=[];let seed=712;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<5000;i++){
    if(!reference.length||random()%3){const value={id:i,f:random()%31};frontier.push(value);reference.push(value);}
    else {reference.sort((a,b)=>a.f-b.f);assert.equal(frontier.pop(),reference.shift());}
    assert.equal(frontier.length,reference.length);
  }
  reference.sort((a,b)=>a.f-b.f);for(const value of reference)assert.equal(frontier.pop(),value);
  assert.equal(frontier.length,0);assert.equal(frontier.pop(),undefined);
});
