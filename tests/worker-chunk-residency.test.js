import test from 'node:test';
import assert from 'node:assert/strict';
import {workerChunkDemand} from '../src/rendering/worker-chunk-residency.js';
test('workers retain home and current data independently of camera or night status',()=>{
  const state={villages:[{id:'v',entry:{x:60,z:0}}],workers:[{villageId:'v',x:92,z:-9,status:'idle'}]};
  const before=structuredClone(state),keys=workerChunkDemand(state);
  assert(keys.has('1,0'));assert(keys.has('2,0'));assert.deepEqual(state,before);
  state.workers=[];assert.equal(workerChunkDemand(state).size,0);
});
test('path demand covers intermediate chunks and seams without filling its rectangle',()=>{
  const keys=workerChunkDemand({workers:[{x:0,z:0,path:[{x:240,z:240}]}]});
  for(let n=0;n<=5;n++)assert(keys.has(`${n},${n}`));
  assert(keys.has('1,0'));assert(keys.has('0,1'));
  assert(!keys.has('5,0'));assert(!keys.has('0,5'));
});
test('only referenced homes and centers are retained; invalid optional points are ignored',()=>{
  const state={villages:[{id:'far',x:960,z:960}],structures:[{id:'c',kind:'center',x:-48,z:0}],
    workers:[{x:0,z:0,centerId:'c',taskApproach:{destination:{x:144,z:0}},path:[null]}]};
  const keys=workerChunkDemand(state);assert(keys.has('-1,0'));assert(keys.has('3,0'));assert(!keys.has('20,20'));
});
