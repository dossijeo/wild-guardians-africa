import test from 'node:test';
import assert from 'node:assert/strict';
import {retainWarmedPrograms} from '../src/rendering/retain-warmed-programs.js';
const program=()=>({usedTimes:1,destroyed:0,destroy(){this.destroyed++;}});
test('bounded snapshot retains once and destroys only unowned programs on idempotent release',()=>{
 const a=program(),b=program(),c=program(),renderer={info:{programs:[a,b,c]}};
 const lease=retainWarmedPrograms(renderer,{limit:2});assert.equal(lease.stats.retained,2);assert.equal(lease.stats.skipped,1);
 assert.deepEqual([a.usedTimes,b.usedTimes,c.usedTimes],[2,2,1]);a.usedTimes--; // last material disposed
 const later=program();renderer.info.programs.push(later);
 lease.dispose();lease.dispose();assert.equal(a.destroyed,1);assert.equal(b.destroyed,0);assert.equal(b.usedTimes,1);assert.equal(later.usedTimes,1);
 assert.deepEqual(renderer.info.programs,[later,b,c]);assert.equal(lease.stats.released,2);
});
test('unsupported versions and malformed entries do not acquire references',()=>{
 const a=program(),renderer={info:{programs:[a]}};const lease=retainWarmedPrograms(renderer,{revision:'181'});assert(lease.stats.unsupported);assert.equal(a.usedTimes,1);lease.dispose();
 const bad={usedTimes:0,destroy(){throw Error('must not destroy');}};assert(retainWarmedPrograms({info:{programs:[bad]}}).stats.unsupported);
 assert.throws(()=>retainWarmedPrograms(renderer,{limit:-1}),RangeError);
});
test('already removed programs are not destroyed twice',()=>{
 const a=program(),renderer={info:{programs:[a]}};const lease=retainWarmedPrograms(renderer);renderer.info.programs.length=0;lease.dispose();assert.equal(a.destroyed,0);
});

test('context replacement and loss abandon old handles without deleting them',()=>{
 for(const replaced of [false,true]){
  const a=program(),renderer={info:{programs:[a]},getContext:()=>({isContextLost:()=>!replaced})};
  const lease=retainWarmedPrograms(renderer);if(replaced)renderer.info.programs=[];
  lease.dispose();assert.equal(lease.stats.abandoned,1);assert.equal(lease.stats.released,0);assert.equal(a.destroyed,0);
 }
});

test('recovery prioritizes newer variants without changing renderer collection order',()=>{
 const old={...program(),id:1},recent={...program(),id:8},middle={...program(),id:4},renderer={info:{programs:[old,recent,middle]}};
 const lease=retainWarmedPrograms(renderer,{limit:2,newestFirst:true});
 assert.equal(old.usedTimes,1);assert.equal(recent.usedTimes,2);assert.equal(middle.usedTimes,2);
 assert.deepEqual(renderer.info.programs,[old,recent,middle]);lease.dispose();assert.equal(recent.usedTimes,1);
});

test('selected incremental leases avoid repinning old programs and release new owners independently',()=>{
 const a=program(),b=program(),renderer={info:{programs:[a]}};
 const first=retainWarmedPrograms(renderer,{select:p=>p===a});renderer.info.programs.push(b);
 const second=retainWarmedPrograms(renderer,{select:p=>p!==a});
 assert.deepEqual([a.usedTimes,b.usedTimes],[2,2]);a.usedTimes--;b.usedTimes--;
 second.dispose();assert.equal(b.destroyed,1);assert.equal(a.destroyed,0);
 first.dispose();assert.equal(a.destroyed,1);assert.equal(renderer.info.programs.length,0);
 assert.throws(()=>retainWarmedPrograms(renderer,{select:null}),TypeError);
});

import {createProgramRetentionScope} from '../src/rendering/retain-warmed-programs.js';
test('temporary scope bounds incremental ownership, reports exhaustion and releases once',()=>{
 const a=program(),b=program(),c=program(),renderer={info:{programs:[a]}};
 const scope=createProgramRetentionScope(renderer,{limit:2});assert(scope.acquire());assert(scope.acquire());assert.equal(a.usedTimes,2);
 renderer.info.programs.push(b);assert(scope.acquire());renderer.info.programs.push(c);assert.equal(scope.acquire(),false);assert(scope.stats.exhausted);assert.equal(c.usedTimes,1);
 a.usedTimes--;scope.dispose();scope.dispose();assert.equal(scope.stats.retained,2);assert.equal(scope.stats.released,2);assert.equal(a.destroyed,1);assert.equal(b.usedTimes,1);assert.equal(scope.acquire(),false);
});
test('temporary scope abandons old context references and rejects collection replacement',()=>{
 const a=program(),renderer={info:{programs:[a]}};const scope=createProgramRetentionScope(renderer);scope.acquire();renderer.info.programs=[];assert.equal(scope.acquire(),false);scope.dispose();assert.equal(scope.stats.abandoned,1);assert.equal(a.destroyed,0);
});
