import test from 'node:test';
import assert from 'node:assert/strict';
import {HierarchicalNavigator} from '../src/world/hierarchical-navigation.js';

const fixture=()=>{
  const blocked=new Set(),gate=new Set(),width=24,height=24;
  for(let z=0;z<height;z++)blocked.add(`11,${z}`);
  gate.add('11,12');
  const pass=(x,z,profile)=>x>=0&&z>=0&&x<width&&z<height&&(!blocked.has(`${x},${z}`)||profile==='worker'&&gate.has(`${x},${z}`));
  const clear=(a,b,profile)=>{
    const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*8));
    for(let i=0;i<=steps;i++)if(!pass(Math.round(a.x+(b.x-a.x)*i/steps),Math.round(a.z+(b.z-a.z)*i/steps),profile))return false;
    return true;
  };
  const nav=new HierarchicalNavigator({sectorSize:8,cellPassable:pass,edgePassable:clear,connectorClear:clear});
  return {nav,blocked,gate,pass,clear};
};

test('sector graph gives workers a gate while rejecting the same animal crossing',()=>{
  const {nav,clear}=fixture(),from={x:3,z:12},to={x:19,z:12};
  const worker=nav.path(from,to,'worker');
  assert(worker?.length>0);
  let previous=from;for(const point of worker){assert(clear(previous,point,'worker'));previous=point;}
  assert.equal(nav.path(from,to,'warthog'),null);
  assert(nav.metrics.sectorsBuilt>0);
});

test('a local breach invalidates nearby sectors and opens the animal route',()=>{
  const {nav,blocked,clear}=fixture(),from={x:3,z:12},to={x:19,z:12};
  assert.equal(nav.path(from,to,'warthog'),null);
  blocked.delete('11,12');nav.invalidateRect(11,12,11,12);
  assert(nav.metrics.sectorsInvalidated>0);
  const route=nav.path(from,to,'warthog');assert(route);
  let previous=from;for(const point of route){assert(clear(previous,point,'warthog'));previous=point;}
});

test('a rebuilt wall closes the breach without retaining an obsolete portal',()=>{
  const {nav,blocked}=fixture(),from={x:3,z:12},to={x:19,z:12};
  blocked.delete('11,12');assert(nav.path(from,to,'warthog'));
  blocked.add('11,12');nav.invalidateRect(11,12,11,12);
  assert.equal(nav.path(from,to,'warthog'),null);
});

test('same geometry and profile produce deterministic routes after rebuilding the graph',()=>{
  const a=fixture(),b=fixture(),from={x:2,z:4},to={x:20,z:19};
  assert.deepEqual(a.nav.path(from,to,'worker'),b.nav.path(from,to,'worker'));
  a.nav.clear();assert.deepEqual(a.nav.path(from,to,'worker'),b.nav.path(from,to,'worker'));
});
