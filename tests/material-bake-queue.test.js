import test from 'node:test';
import assert from 'node:assert/strict';
import {MaterialBakeQueue} from '../src/rendering/material-bake-queue.js';
function owner() {
 const destroyed = [], draws = [], published = []; let id = 0;
 const spec = (version, bytes=8, tiles=3) => ({version,bytes,tiles,
  create:()=>({id:++id}),draw:(target,tile)=>draws.push([target.id,tile]),
  publish:target=>published.push(target.id),destroy:target=>destroyed.push(target.id)});
 return {spec,destroyed,draws,published};
}
test('camera replacement keeps published target until every tile is ready; budget counts both',()=>{
 const q=new MaterialBakeQueue({budgetBytes:20,reservedBytes:4}),o=owner();
 assert.equal(q.request('chunk',o.spec(1)),'queued');q.step();q.step();q.step();
 assert.deepEqual(o.published,[1]);assert.equal(q.stats.bytes,12);
 assert.equal(q.request('chunk',o.spec(2)),'queued');q.step();
 assert.deepEqual(o.destroyed,[]);assert.equal(q.stats.bytes,20);
 assert.equal(q.request('other',o.spec(1)),'budget');
 q.step();q.step();assert.deepEqual(o.published,[1,2]);assert.deepEqual(o.destroyed,[1]);
 assert.equal(q.stats.bytes,12);assert.equal(q.stats.peakBytes,20);
 q.dispose();q.dispose();assert.deepEqual(o.destroyed,[1,2]);assert.equal(q.stats.bytes,4);
});
test('successive invalidations cancel partial stale bake and coalesce duplicate versions',()=>{
 const q=new MaterialBakeQueue({budgetBytes:16}),o=owner();
 q.request('chunk',o.spec(1));q.step();
 assert.equal(q.request('chunk',o.spec(1)),'unchanged');
 assert.equal(q.request('chunk',o.spec(2)),'queued');assert.deepEqual(o.destroyed,[1]);
 q.step();q.step();q.step();assert.deepEqual(o.published,[2]);
 assert.equal(q.request('chunk',o.spec(2)),'unchanged');assert.equal(q.step(),false);
});
test('unload cancels pending work and releases resident data without late publication',()=>{
 const q=new MaterialBakeQueue({budgetBytes:16}),o=owner();
 q.request('chunk',o.spec(1));q.step();q.step();q.step();
 q.request('chunk',o.spec(2));q.step();q.remove('chunk');
 assert.equal(q.step(),false);assert.deepEqual(o.published,[1]);assert.deepEqual(o.destroyed,[2,1]);assert.equal(q.stats.bytes,0);
 q.dispose();assert.throws(()=>q.request('chunk',o.spec(3)),/closed/);
});
test('failed generation releases temporary resource but preserves prior published data',()=>{
 const q=new MaterialBakeQueue({budgetBytes:16}),o=owner();q.request('chunk',o.spec(1,8,1));q.step();
 q.request('chunk',{...o.spec(2),draw(){throw Error('context failure');}});
 assert.throws(()=>q.step(),/context failure/);assert.equal(q.stats.bytes,8);assert.deepEqual(o.published,[1]);assert.deepEqual(o.destroyed,[2]);
 q.dispose();assert.deepEqual(o.destroyed,[2,1]);
});

test('an owner disposed during drawing cannot publish a stale target',()=>{
 const q=new MaterialBakeQueue({budgetBytes:8}),o=owner();
 q.request('chunk',{...o.spec(1,8,1),draw(){q.remove('chunk');}});q.step();
 assert.deepEqual(o.published,[]);assert.deepEqual(o.destroyed,[1]);assert.equal(q.stats.bytes,0);assert.equal(q.entries.size,0);
});

test('over-budget invalidation cancels obsolete pending data without evicting the resident target',()=>{
 const q=new MaterialBakeQueue({budgetBytes:16}),o=owner();q.request('chunk',o.spec(1,8,1));q.step();
 q.request('chunk',o.spec(2));q.step();assert.equal(q.request('chunk',o.spec(3,12)),'budget');
 assert.equal(q.step(),false);assert.deepEqual(o.published,[1]);assert.deepEqual(o.destroyed,[2]);assert.equal(q.stats.bytes,8);
});

test('crossfade retains and budgets old target, deferring further replacements until release',()=>{
 const q=new MaterialBakeQueue({budgetBytes:16}),o=owner();q.request('chunk',o.spec(1,8,1));q.step();
 q.request('chunk',{...o.spec(2,8,1),retainPrevious:true});q.step();
 assert.equal(q.stats.bytes,16);assert.deepEqual(o.destroyed,[]);assert.equal(q.retired.size,1);
 assert.equal(q.request('chunk',o.spec(3,8,1)),'transition');assert.equal(q.pending.size,0);
 q.releasePrevious('chunk');q.releasePrevious('chunk');assert.deepEqual(o.destroyed,[1]);assert.equal(q.stats.bytes,8);
 q.request('chunk',{...o.spec(3,8,1),retainPrevious:true});q.step();q.dispose();
 assert.deepEqual(o.destroyed,[1,2,3]);assert.equal(q.stats.bytes,0);assert.equal(q.retired.size,0);
});
