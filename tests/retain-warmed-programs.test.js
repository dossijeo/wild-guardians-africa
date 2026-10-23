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
