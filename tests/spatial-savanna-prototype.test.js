import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialSavannaPrototype} from '../src/world/hierarchical-wasm/spatial-savanna-adapter.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
function validRoute(core,start,result){
  assert.equal(result.status,'found');
  let point=start;
  for(const next of result.points){assert(core.edge(point.x,point.z,next.x,next.z));point=next;}
}
function crossing(core){
  for(let z=-19;z<20;z++){
    const start={x:7,z},end={x:13,z};
    if(core.walkable(start.x,start.z)&&core.walkable(end.x,end.z)&&core.route(start,end).status==='found')return {start,end};
  }
  throw Error('No unblocked test crossing found');
}
test('one C++ source generates visual data and valid worker/animal routes',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  const first=Float32Array.from(core.heights()),objects=core.props();
  assert.equal(first.length,2401);assert.equal(core.colors().length,7203);
  assert(objects.length>0&&objects.every(o=>o.x>=-24&&o.x<24&&o.z>=-24&&o.z<24));
  const lists=core.instances();
  assert.equal(lists.length,20);assert.equal(lists.reduce((n,list)=>n+list.length,0),objects.length);
  assert(lists.flat().every(p=>p.id&&p.slot>=0&&p.slot<20&&p.sx===p.scale));
  const geometry=core.geometry();
  assert.equal(geometry.getAttribute('position').count,2401);assert.equal(geometry.index.count,13824);geometry.dispose();
  assert(core.water().some(value=>value===1));
  const river=core.waterGeometry();
  assert(river.index.count>0);river.dispose();
  for(const [radius,worker] of [[.28,true],[1.1,false],[1.55,false]]){
    assert.equal(core.buildNavigation(radius,worker),16);
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  core.generate(712,0,0);
  assert.deepEqual(Array.from(core.heights()),Array.from(first));assert.deepEqual(core.props(),objects);
});
test('placing and destroying a wall updates local sectors and restores a route',()=>{
  const core=createSpatialSavannaPrototype(module);core.generate(123,0,0);
  core.buildNavigation(1.1,false);
  const {start,end}=crossing(core),before=core.metrics().sectorUpdates;
  const wall=core.addWall(10,0,.8,24);assert(wall>0);
  assert.equal(core.route(start,end).status,'blocked');
  assert(core.metrics().sectorUpdates>before);
  assert(core.metrics().sectorUpdates-before<16);
  assert.equal(core.removeWall(wall),1);
  validRoute(core,start,core.route(start,end));
});
test('neighboring chunks share their terrain seam and seed-dependent props',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(2026,0,0);
  const west=Float32Array.from(core.heights()),westProps=core.props();
  core.generate(2026,1,0);
  const east=Float32Array.from(core.heights());
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],east[z*49]);
  core.generate(2027,0,0);
  assert.notDeepEqual(core.props(),westProps);
});
test('a visible solid prop occupies its logical collision point',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(1.1,false);
  const prop=core.props().find(p=>(p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18)&&
    Math.round(p.x)>=-24&&Math.round(p.x)<24&&Math.round(p.z)>=-24&&Math.round(p.z)<24);
  assert(prop);
  assert.equal(core.walkable(Math.round(prop.x),Math.round(prop.z)),false);
});
test('a neighboring chunk owns the instance while its footprint blocks our edge',()=>{
  const core=createSpatialSavannaPrototype(module);
  let caseFound=false;
  for(let seed=1;seed<=60&&!caseFound;seed++){
    core.generate(seed,1,0);
    const external=core.props().find(p=>(p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18)&&
      p.x>=24&&p.x-p.radius-1.1<23.5&&p.z>=-24&&p.z<24);
    if(!external)continue;
    core.generate(seed,0,0);
    assert(core.metrics().haloProps>0);
    assert(!core.props().some(p=>p.x===external.x&&p.z===external.z&&p.slot===external.slot));
    core.buildNavigation(1.1,false);
    const z=Math.max(-24,Math.min(23,Math.round(external.z)));
    assert.equal(core.walkable(23,z),false);
    caseFound=true;
  }
  assert(caseFound,'expected a neighboring tree or rock to overlap a tested seam');
});
test('indexed obstacle checks agree with every visible solid across the surrounding chunks',()=>{
  const core=createSpatialSavannaPrototype(module),neighbor=createSpatialSavannaPrototype(module),solids=[];
  for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++){
    neighbor.generate(712,cx,cz);
    solids.push(...neighbor.props().filter(p=>p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18));
  }
  core.generate(712,0,0);
  for(const [radius,worker] of [[.28,true],[1.1,false]]){
    core.buildNavigation(radius,worker);
    for(let z=-24;z<24;z++)for(let x=-24;x<24;x++){
      const expected=solids.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+radius);
      assert.equal(core.propBlocked(x,z),expected,`prop occupancy at ${x},${z}, radius ${radius}`);
    }
  }
});
