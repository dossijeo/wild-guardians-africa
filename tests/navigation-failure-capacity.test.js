import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';

test('one failure beyond capacity retains recent failed routes and evicts only the oldest',()=>{
  const nav=new Navigation(712,'gran-canon',{}),start={x:0,z:0};let searches=0;
  nav.findPath=()=>{searches++;return null;};
  for(let x=0;x<50000;x++)assert.equal(nav.path(start,{x,z:1}),null);
  assert.equal(searches,50000);assert.equal(nav.failedPaths.size,50000);
  assert.equal(nav.path(start,{x:50000,z:1}),null);
  assert.equal(searches,50001);assert.equal(nav.failedPaths.size,50000);
  // This recent failure must survive insertion of an unrelated failed query.
  assert.equal(nav.path(start,{x:49999,z:1}),null);assert.equal(searches,50001);
  assert.equal(nav.path(start,{x:0,z:1}),null);assert.equal(searches,50002);
  assert.equal(nav.failedPaths.size,50000);
  assert.equal(nav.path(start,{x:50000,z:1}),null);assert.equal(searches,50002);
});

test('geometry invalidation still retries previously failed routes after capacity eviction',()=>{
  const nav=new Navigation(712,'gran-canon',{}),start={x:0,z:0};let searches=0,blocked=true;
  nav.findPath=(_a,b)=>{searches++;return blocked?null:[{x:b.x,z:b.z}];};
  for(let x=0;x<=50000;x++)assert.equal(nav.path(start,{x,z:1},.28,null,false),null);
  const end={x:50000,z:1},before=searches;
  blocked=false;
  // A changed fixture alone does not invalidate established navigation data.
  assert.equal(nav.path(start,end,.28,null,false),null);assert.equal(searches,before);
  nav.setState({structures:[],villages:[],spells:[],suppressed:[]});
  assert.equal(nav.failedPaths.size,0);
  assert.deepEqual(nav.path(start,end,.28,null,false),[end]);assert.equal(searches,before+1);
  // Refill after clear: the persistent FIFO cursor must see the new entries.
  blocked=true;
  for(let x=0;x<=50000;x++)assert.equal(nav.path(start,{x,z:2}),null);
  const count=searches;
  assert.equal(nav.path(start,{x:49999,z:2}),null);assert.equal(searches,count);
  assert.equal(nav.path(start,{x:0,z:2}),null);assert.equal(searches,count+1);
  assert.equal(nav.failedPaths.size,50000);
});
