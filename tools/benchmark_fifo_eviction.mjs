import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {evictOldest} from '../src/world/fifo-eviction.js';
const rows=[];
for(const limit of [4096,8192,12000]){
 const timing={reference:[],reused:[]};
 for(let trial=0;trial<12;trial++){
  const maps={reference:new Map(Array.from({length:limit},(_,i)=>[i,i])),reused:new Map(Array.from({length:limit},(_,i)=>[i,i]))};
  for(const mode of trial%2?['reused','reference']:['reference','reused']){
   const map=maps[mode],start=performance.now();
   for(let i=0;i<30000;i++){
    if(mode==='reference')map.delete(map.keys().next().value);else evictOldest(map);
    map.set(limit+i,i);
   }
   if(trial>=2)timing[mode].push(performance.now()-start);
  }
  assert.deepEqual([...maps.reused],[...maps.reference]);
 }
 const summarize=v=>{const a=[...v].sort((a,b)=>a-b);return {samples:a.length,minMs:a[0],medianMs:(a[4]+a[5])/2,maxMs:a.at(-1)};};
 rows.push({limit,evictions:30000,reference:summarize(timing.reference),reused:summarize(timing.reused)});
}
console.log(JSON.stringify({node:process.version,scope:'Isolated Map FIFO eviction/insert operation, 30000 evictions per sample, ten samples after two warmups, alternating order, setup excluded, insertion order and complete final maps equal. Not a frame/GPU/mobile benchmark.',rows},null,2));
