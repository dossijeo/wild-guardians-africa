import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';
import {createHierarchicalNavigationAdapter} from '../src/world/hierarchical-navigation-adapter.js';

test('new sector graph respects a native closed wall and its physical breach',()=>{
  const {s,nav}=fixture('closed-walls'),adapter=createHierarchicalNavigationAdapter(nav);
  const outside={x:15,z:29},inside={x:15,z:7},radius=1.1;
  assert.equal(adapter.path(outside,inside,radius,null,false,24),null);
  for(const id of ['wall-2-4','wall-2-5']){
    const wall=s.structures.find(t=>t.id===id);wall.status='ruined';wall.hp=0;
  }
  nav.setState(s);adapter.invalidateRect(11,16,19,21);
  const route=adapter.path(outside,inside,radius,null,false,24);
  assert(route?.length>0,'a two-module opening must be usable');
  let previous=outside;
  for(const point of route){assert(nav.segmentClear(previous,point,radius,null,false));previous=point;}
});

test('a native open gate becomes a worker portal but never an animal crossing',()=>{
  const {s,nav}=fixture('closed-walls');
  const wall=s.structures.find(t=>t.id==='wall-2-5');wall.gate=true;wall.gateOpen=true;nav.setState(s);
  const adapter=createHierarchicalNavigationAdapter(nav),outside={x:15,z:29},inside={x:15,z:7};
  const worker=adapter.path(outside,inside,.28,null,true,24);
  assert(worker?.length>0);
  let previous=outside;
  for(const point of worker){assert(nav.segmentClear(previous,point,.28,null,true));previous=point;}
  assert.equal(adapter.path(outside,inside,1.1,null,false,24),null);
});
