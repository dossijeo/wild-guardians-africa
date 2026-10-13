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
  const mask=Uint8Array.from(core.groundMask());
  assert.equal(mask.length,4900);
  assert(mask.some((value,index)=>index%4===0&&value>0));
  assert(mask.some((value,index)=>index%4===2&&value>0));
  assert(mask.every((value,index)=>index%4!==3||value===0),'the unbuilt settlement has no wear mask');
  assert(objects.length>0&&objects.every(o=>o.x>=-24&&o.x<24&&o.z>=-24&&o.z<24));
  const lists=core.instances();
  assert.equal(lists.length,20);assert.equal(lists.reduce((n,list)=>n+list.length,0),objects.length);
  assert(lists.flat().every(p=>p.id&&p.slot>=0&&p.slot<20&&p.sx===p.scale));
  const geometry=core.geometry();
  assert.equal(geometry.getAttribute('position').count,2401);assert.equal(geometry.index.count,13824);geometry.dispose();
  assert(core.water().some(value=>value===1));
  const river=core.waterGeometry();
  assert(river.getAttribute('position').count>0);river.dispose();
  for(const [radius,worker] of [[.28,true],[1.1,false],[1.55,false]]){
    assert.equal(core.buildNavigation(radius,worker),16);
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  core.generate(712,0,0);
  assert.deepEqual(Array.from(core.heights()),Array.from(first));assert.deepEqual(core.props(),objects);
  assert.deepEqual(Array.from(core.groundMask()),Array.from(mask));
});
test('the 35x35 ground material mask meets at adjacent chunk overlaps',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0);
  const west=Uint8Array.from(core.groundMask());
  core.addChunk(1,0);
  const east=core.groundMask();
  for(let z=0;z<35;z++)for(let x=0;x<3;x++)for(let channel=0;channel<4;channel++){
    const a=(z*35+32+x)*4+channel,b=(z*35+x)*4+channel;
    assert.equal(west[a],east[b],`ground mask overlap at (${x},${z}), channel ${channel}`);
  }
});
test('placing and destroying a wall updates local sectors and restores a route',()=>{
  const core=createSpatialSavannaPrototype(module);core.generate(123,0,0);
  core.buildNavigation(1.1,false);
  const {start,end}=crossing(core),before=core.metrics().sectorUpdates;
  const wall=core.addWall(10,0,.8,24);assert(wall>0);
  assert.notEqual(core.route(start,end).status,'found');
  assert.equal(core.edge(9,18,10,18),false);
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
test('procedural pond shares one visual and navigation water source',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0);
  const pond=core.props().find(p=>p.slot===19&&p.x>-18&&p.x<18&&p.z>-18&&p.z<18);
  assert(pond,'fixture needs an interior generated pond');
  const x=Math.floor(pond.x+24),z=Math.floor(pond.z+24),at=z*48+x;
  assert.equal(core.water()[at],1,'the pond must appear in the visual water mask');
  assert(Math.abs(core.waterLevels()[at]-pond.y)<.001,'visible water level comes from the generated pond');
  for(let i=0;i<core.water().length;i++)assert.equal(core.waterLevels()[i]>0,core.water()[i]===1,
    `water occupancy and elevation must agree at cell ${i}`);
  assert(core.heights()[Math.round(pond.z+24)*49+Math.round(pond.x+24)]<pond.y,
    'the generated terrain must be carved below the pond surface');
  core.buildNavigation(1.1,false);
  assert.equal(core.walkable(Math.round(pond.x),Math.round(pond.z)),false,
    'an animal cannot cross the same pond shown to the player');
  const geo=core.waterGeometry();
  assert(geo.getAttribute('position').count>0);
  const surface=core.waterTriangles();
  assert.equal(surface.length%9,0);
  assert(surface.some((value,i)=>i%3===1&&Math.abs(value-pond.y)<.001),
    'a smooth pond surface must use the same elevation as its visible model');
  geo.dispose();
});
test('a pond crossing a chunk boundary keeps its basin and fluid connectivity',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(17,0,0);
  const pond=core.props().find(p=>p.slot===19&&p.x+p.radius>24);
  assert(pond,'fixture needs a pond reaching the east edge');
  const west=Float32Array.from(core.heights()),westWater=Float32Array.from(core.waterTriangles());
  assert(core.addChunk(1,0)>0);
  const east=core.heights(),eastWater=core.waterTriangles();
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],east[z*49],`pond terrain seam at row ${z}`);
  const row=Math.floor(pond.z+24);
  assert.equal(core.water()[row*48],1,'neighboring chunk must receive the same pond water');
  assert(Math.abs(core.waterLevels()[row*48]-pond.y)<.001);
  const seamZ=vertices=>[...new Set(Array.from({length:vertices.length/3},(_,i)=>i*3)
    .filter(i=>Math.abs(vertices[i]-24)<.0001&&Math.abs(vertices[i+1]-pond.y)<.001)
    .map(i=>vertices[i+2].toFixed(4)))].sort();
  assert(seamZ(westWater).length>=2);
  assert.deepEqual(seamZ(westWater),seamZ(eastWater),'pond surface must meet at the chunk seam');
  core.buildNavigation(1.1,false);
  assert.equal(core.walkable(24,Math.round(pond.z)),false,'animal occupancy must continue across seam');
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
test('two resident chunks share a graph and a wall closes and reopens their seam',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);const west=Float32Array.from(core.heights());
  assert.equal(core.buildNavigation(1.1,false),16);
  assert.equal(core.route({x:17,z:0},{x:31,z:0}).status,'unknown');
  assert(core.addChunk(1,0)>0);
  assert.equal(core.metrics().loadedChunks,2);
  assert.equal(core.metrics().loadedSectors,32);
  const east=Float32Array.from(core.heights());
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],east[z*49]);
  let path=null;
  for(let z=-19;z<20&&!path;z++){
    const start={x:17,z},end={x:31,z};
    if(core.walkable(start.x,start.z)&&core.walkable(end.x,end.z)){
      const result=core.route(start,end);
      if(result.status==='found')path={start,end,result};
    }
  }
  assert(path,'expected a physical route across the resident seam');
  validRoute(core,path.start,path.result);
  const before=core.metrics().sectorUpdates;
  const wall=core.addWall(23.5,0,.8,24);
  assert.notEqual(core.route(path.start,path.end).status,'found');
  assert.equal(core.edge(23,path.start.z,24,path.start.z),false);
  assert(core.metrics().sectorUpdates-before<32,'wall edit must not rebuild all sectors');
  assert.equal(core.removeWall(wall),1);
  validRoute(core,path.start,core.route(path.start,path.end));
  assert.equal(core.buildNavigation(.28,true),32);
  assert.equal(core.metrics().loadedChunks,2);
  validRoute(core,path.start,core.route(path.start,path.end));
});
test('negative chunk coordinates retain the shared border and graph',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(.28,true);
  const center=Float32Array.from(core.heights());
  assert(core.addChunk(-1,0)>0);
  const west=Float32Array.from(core.heights());
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],center[z*49]);
  assert.equal(core.metrics().loadedSectors,32);
  let seam=null;
  for(let z=-24;z<24&&!seam;z++)if(core.edge(-25,z,-24,z))seam={start:{x:-25,z},end:{x:-24,z}};
  assert(seam,'expected at least one physical passage across the negative seam');
  validRoute(core,seam.start,core.route(seam.start,seam.end));
});
test('chunks requested before the first graph build become resident together',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  assert(core.addChunk(1,0)>0);
  assert.equal(core.buildNavigation(1.1,false),32);
  assert.equal(core.metrics().loadedChunks,2);
  assert.notEqual(core.route({x:17,z:0},{x:31,z:0}).status,'unknown');
});
test('evicting and regenerating a chunk reuses sector slots and preserves wall topology',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(1.1,false);
  core.addChunk(1,0);
  let crossing=null;
  for(let z=-19;z<20&&!crossing;z++){
    const start={x:17,z},end={x:31,z};
    if(core.route(start,end).status==='found')crossing={start,end};
  }
  assert(crossing);
  const wall=core.addWall(23.5,0,.8,24);
  assert.notEqual(core.route(crossing.start,crossing.end).status,'found');
  const memoryBefore=core.metrics().memoryBytes;
  for(let i=0;i<20;i++){
    assert.equal(core.removeChunk(1,0),1);
    assert.equal(core.metrics().loadedChunks,1);
    assert.equal(core.metrics().loadedSectors,16);
    assert.equal(core.route(crossing.start,crossing.end).status,'unknown');
    assert(core.addChunk(1,0)>0);
    assert.equal(core.metrics().loadedSectors,32);
    assert.equal(core.metrics().sectorSlots,32);
    assert.notEqual(core.route(crossing.start,crossing.end).status,'found');
  }
  assert(core.metrics().memoryBytes<=memoryBefore+65536);
  assert.equal(core.removeWall(wall),1);
  validRoute(core,crossing.start,core.route(crossing.start,crossing.end));
});
test('evicting the final chunk leaves an empty reusable graph',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(1.1,false);
  assert.equal(core.removeChunk(0,0),1);
  assert.equal(core.metrics().loadedChunks,0);
  assert.equal(core.metrics().loadedSectors,0);
  assert.equal(core.route({x:7,z:0},{x:13,z:0}).status,'unknown');
  assert(core.addChunk(0,0)>0);
  assert.equal(core.metrics().loadedSectors,16);
  assert.equal(core.metrics().sectorSlots,16);
  const {start,end}=crossing(core);
  validRoute(core,start,core.route(start,end));
});
test('an unloaded middle chunk leaves distant connectivity unknown',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(1.1,false);
  core.addChunk(1,0);core.addChunk(2,0);
  let crossing=null;
  for(let z=-19;z<20&&!crossing;z++){
    const start={x:17,z},end={x:79,z};
    if(core.route(start,end).status==='found')crossing={start,end};
  }
  assert(crossing);
  assert.equal(core.removeChunk(1,0),1);
  assert.equal(core.route(crossing.start,crossing.end).status,'unknown');
});
test('a turning four-chunk viewport reuses sectors and restores routes after revisiting',()=>{
  const core=createSpatialSavannaPrototype(module),resident=new Set(['0,0']);
  core.generate(17,0,0);core.buildNavigation(1.1,false);
  const path=[[0,0],[1,0],[1,1],[0,1],[0,0]];
  for(const [cx,cz] of path){
    const wanted=new Set([`${cx},${cz}`,`${cx+1},${cz}`,`${cx},${cz+1}`,`${cx+1},${cz+1}`]);
    for(const id of [...resident])if(!wanted.has(id)){
      assert.equal(core.removeChunk(...id.split(',').map(Number)),1);resident.delete(id);
    }
    for(const id of wanted)if(!resident.has(id)){
      assert(core.addChunk(...id.split(',').map(Number))>0);resident.add(id);
    }
    assert.equal(core.metrics().loadedSectors,64);
    assert.equal(core.metrics().sectorSlots,64);
    const x=cx*48+23;
    let checked=false;
    for(let z=cz*48-24;z<cz*48+24;z++)if(core.edge(x,z,x+1,z)){
      validRoute(core,{x,z},core.route({x,z},{x:x+1,z}));checked=true;break;
    }
    assert(checked,'each viewport should expose at least one traversable seam');
  }
  assert.equal(core.metrics().memoryBytes,4194304);
});
test('worker and animal graphs survive profile switches and local topology edits',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.addChunk(1,0);
  assert.equal(core.buildNavigation(.28,true),32);
  assert.equal(core.buildNavigation(1.1,false),32);
  const updatesAfterBuild=core.metrics().sectorUpdates;
  let crossing=null;
  for(let z=-20;z<20&&!crossing;z++){
    const start={x:23,z},end={x:24,z};
    if(core.edge(start.x,start.z,end.x,end.z)&&core.route(start,end).status==='found'){
      core.selectNavigation(true);
      if(core.route(start,end).status==='found')crossing={start,end};
      core.selectNavigation(false);
    }
  }
  assert(crossing,'both movement profiles need a shared seam passage');
  for(let i=0;i<20;i++){
    assert.equal(core.selectNavigation(true),32);
    validRoute(core,crossing.start,core.route(crossing.start,crossing.end));
    assert.equal(core.selectNavigation(false),32);
    validRoute(core,crossing.start,core.route(crossing.start,crossing.end));
  }
  assert.equal(core.metrics().sectorUpdates,updatesAfterBuild,'switching profiles must not rebuild either graph');
  const wall=core.addWall(23.5,0,.8,24);
  for(const worker of [true,false]){
    core.selectNavigation(worker);
    assert.equal(core.edge(23,crossing.start.z,24,crossing.start.z),false);
    assert.notEqual(core.route(crossing.start,crossing.end).status,'found');
  }
  assert.equal(core.removeWall(wall),1);
  for(const worker of [true,false]){
    core.selectNavigation(worker);
    validRoute(core,crossing.start,core.route(crossing.start,crossing.end));
  }
  assert.equal(core.removeChunk(1,0),1);
  for(const worker of [true,false]){
    assert.equal(core.selectNavigation(worker),16);
    assert.equal(core.route(crossing.start,crossing.end).status,'unknown');
  }
  assert(core.addChunk(1,0)>0);
  for(const worker of [true,false]){
    assert.equal(core.selectNavigation(worker),32);
    validRoute(core,crossing.start,core.route(crossing.start,crossing.end));
  }
  assert.equal(core.metrics().memoryBytes,4194304);
});
