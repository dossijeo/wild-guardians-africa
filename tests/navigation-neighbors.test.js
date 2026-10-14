import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';

function flat(){
  const nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];
  nav.setState({structures:[],villages:[],spells:[],suppressed:[]});return nav;
}

test('Overlapping routes reuse logical sectors while preserving physical waypoints',()=>{
  const cached=flat(),fresh=flat();
  const wall={id:'barrier',kind:'house',x:0,z:0,footprint:[{x:2,z:-4},{x:3,z:-4},{x:3,z:4},{x:2,z:4}]};
  for(const nav of [cached,fresh])nav.obstacles=[wall];
  const start={x:0,z:0},end={x:7.25,z:0};
  const first=cached.path(start,end,.28,null,true);assert.ok(first);
  const planner=cached._hierarchical.planner,built=planner.metrics.sectorsBuilt;
  assert.deepEqual(cached.path(start,end,.28,null,true),first);
  assert.equal(planner.metrics.sectorsBuilt,built,'An unchanged route reuses its sectors');
  assert.deepEqual(first,fresh.path(start,end,.28,null,true));
  let previous=start;for(const point of first){assert.ok(cached.segmentClear(previous,point,.28,null,true));previous=point;}
});

test('Movement profiles and proposed geometry cannot contaminate live sectors',()=>{
  const nav=flat(),state=nav.state,from={x:0,z:0},to={x:5,z:0};
  assert.ok(nav.path(from,to,.28,null,true));
  const adapter=nav._hierarchical,worker=adapter.profile(.28,true,null);
  assert.notEqual(adapter.profile(.9,true,null),worker);
  assert.notEqual(adapter.profile(.28,false,null),worker);
  assert.notEqual(adapter.profile(.28,true,'center'),worker);
  const preview=nav.forBuildingPlacement({id:'preview',kind:'house',x:2,z:0,radius:1});
  preview.path(from,to,.28,null,true);
  assert.notEqual(preview._hierarchical,adapter);
  assert.ok(nav.path(from,to,.28,null,true));
  state.spells=[{id:'shield',kind:'shield',x:5,z:0,radius:1,remaining:20}];nav.setState(state);
  assert.equal(nav.path(from,to,.28,null,false),null);
  assert.ok(nav.path(from,to,.28,null,true));
});

test('Returned route mutations do not alter the shared sector graph',()=>{
  const nav=flat(),from={x:0,z:0},to={x:4,z:0};
  const original=nav.path(from,to);assert.ok(original);
  const built=nav._hierarchical.planner.metrics.sectorsBuilt;
  original[0].x=100;original.push({x:999,z:999});
  const next=nav.path(from,to);
  assert.deepEqual(next.at(-1),to);assert.ok(next.every(point=>point.x!==999));
  assert.equal(nav._hierarchical.planner.metrics.sectorsBuilt,built);
});
