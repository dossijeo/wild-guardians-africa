import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialSavannaPrototype} from '../src/world/hierarchical-wasm/spatial-savanna-adapter.js';
import {nativeTerrainBuffer} from '../src/rendering/terrain-geometry.js';
import {nativeWaterBuffer} from '../src/rendering/water-geometry.js';
import {chunkTransferables} from '../src/rendering/chunk-data.js';
import {SpatialSurfaceView} from '../src/world/hierarchical-wasm/spatial-surface-view.js';
import {ANIMAL_SPATIAL_PROFILES} from '../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';

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
test('continuous actor connectors preserve fractional and negative positions without crossing static barriers',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  core.buildNavigation(.28,true);
  let fixture;
  for(let z=-16;z<=16&&!fixture;z++)for(let x=-17;x<=-7&&!fixture;x++){
    const start={x:x-.12,z:z+.12},end={x:x+4-.12,z:z+.12};
    if(!core.localClear(start,{x,z})||!core.localClear(end,{x:x+4,z}))continue;
    if(core.route({x,z},{x:x+4,z}).status==='found')fixture={start,end};
  }
  assert(fixture,'expected a fractional crossing on the negative side of the chunk');
  assert.throws(()=>core.route(fixture.start,fixture.end),/integer coordinates/);
  const initial=core.routeWorld(fixture.start,fixture.end);
  assert.equal(initial.status,'found');
  assert.deepEqual(initial.points.at(-1),fixture.end);
  let previous=fixture.start;
  for(const point of initial.points){
    assert(core.localClear(previous,point),`continuous connector must be physically clear: ${JSON.stringify([previous,point])}`);
    previous=point;
  }
  const wall=core.addBarrier(fixture.end.x,fixture.end.z,.3,.3,0);
  assert(wall>0);
  assert.equal(core.localClear(fixture.end,fixture.end),false);
  assert.notEqual(core.routeWorld(fixture.start,fixture.end).status,'found');
  core.removeBarrier(wall);
  assert.equal(core.routeWorld(fixture.start,fixture.end).status,'found');
});
test('the dry Desert chunk shares visible dunes, solid props and hierarchical routes',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0,'desert');
  const heights=Float32Array.from(core.heights()),props=core.props();
  assert(Math.max(...heights)-Math.min(...heights)>8,'dune relief must be visible');
  assert(props.length>0&&props.length<100,'desert props must remain sparse');
  assert(core.water().every(value=>value===0));
  assert.equal(core.waterTriangles().length,0);
  assert(core.groundMask().every((value,i)=>i%4!==2||value===0),
    'desert ground mask has no water moisture channel');
  const west=Float32Array.from(core.heights());
  assert(core.addChunk(1,0)>0);
  const east=core.heights();
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],east[z*49],`desert height seam row ${z}`);
  core.selectChunk(0,0);
  const solid=props.find(prop=>prop.slot<=3||prop.slot>=10);
  assert(solid,'desert fixture needs a visible solid prop');
  for(const [radius,worker] of [[.28,true],[1.1,false]]){
    core.buildNavigation(radius,worker);
    assert(core.propBlocked(solid.x,solid.z),'visible desert props must block their collision point');
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  const wall=core.addBarrier(23.5,0,.8,5,0);assert(wall>0);
  const state=JSON.parse(JSON.stringify(core.snapshot()));
  assert.equal(state.version,3);assert.equal(state.biome,'desert');
  const restored=createSpatialSavannaPrototype(module);
  restored.restoreState(state,0,0);restored.addChunk(1,0);
  restored.buildNavigation(.28,true);restored.buildNavigation(1.1,false);
  assert.deepEqual(restored.snapshot(),state);
  restored.selectChunk(0,0);
  assert.deepEqual(Array.from(restored.heights()),Array.from(heights));
  assert.deepEqual(restored.props(),props);
  assert.equal(restored.waterTriangles().length,0);
});
test('Grand River shares wet terrain, floating flora, solids and both route profiles',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0,'grand_river');
  const first=Float32Array.from(core.heights()),props=core.props();
  assert(core.water().some(Boolean));
  assert(core.waterTriangles().length>0);
  assert(props.length>0);
  const floating=props.filter(prop=>prop.slot===9);
  assert(floating.length>0,'the river fixture should include floating plants');
  for(const prop of floating)
    assert(Math.abs(prop.y-core.fluidLevel(prop.x,prop.z))<.001,
      'floating plants must sit on the C++ water surface');
  const solid=props.find(prop=>prop.slot<=3||prop.slot>=10&&prop.slot<=12||prop.slot>=18);
  assert(solid);
  for(const [radius,worker] of [[.28,true],[1.1,false]]){
    assert.equal(core.buildNavigation(radius,worker),16);
    assert(core.propBlocked(solid.x,solid.z));
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  core.addChunk(1,0);
  const east=core.heights();
  for(let z=0;z<49;z++)assert.equal(first[z*49+48],east[z*49]);
  const state=JSON.parse(JSON.stringify(core.snapshot()));
  assert.equal(state.biome,'grand_river');
  const restored=createSpatialSavannaPrototype(module);
  restored.restoreState(state,0,0);
  assert.deepEqual(restored.props(),props);
});
test('Volcanoes shares basalt, lava, collision and both route profiles',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0,'volcanoes');
  const heights=Float32Array.from(core.heights()),props=core.props();
  assert(props.length>0);
  assert(core.water().some(Boolean),'lava must occupy wet terrain cells');
  assert(core.waterTriangles().length>0,'lava needs visible geometry');
  const colors=core.colors();
  assert(colors[0]<.6&&colors[1]<.6&&colors[2]<.6,'terrain must retain a dark basalt palette');
  const solid=props.find(prop=>prop.slot<=3||prop.slot>=10&&prop.slot<=12||prop.slot>=18);
  assert(solid);
  for(const [radius,worker] of [[.28,true],[1.1,false]]){
    assert.equal(core.buildNavigation(radius,worker),16);
    assert(core.propBlocked(solid.x,solid.z));
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  core.addChunk(1,0);
  for(let z=0;z<49;z++)assert.equal(heights[z*49+48],core.heights()[z*49]);
  const wall=core.addBarrier(23.5,0,.8,5,0);assert(wall>0);
  const state=JSON.parse(JSON.stringify(core.snapshot()));
  assert.equal(state.biome,'volcanoes');
  const restored=createSpatialSavannaPrototype(module);
  restored.restoreState(state,0,0);
  assert.deepEqual(restored.snapshot(),state);
  assert.deepEqual(restored.props(),props);
});
test('Mangroves share flooded channels, terrain, obstacles and routes',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0,'mangrove');
  const heights=Float32Array.from(core.heights()),props=core.props();
  assert(props.length>0);
  assert(core.water().some(Boolean));
  assert(core.water().some(value=>!value),'the marsh must retain dry routes');
  assert(core.waterTriangles().length>0);
  assert(core.waterLevels().some(level=>level>3.3));
  const waterMesh=core.waterTriangles();
  for(let i=0;i<waterMesh.length;i+=9){
    const x=(waterMesh[i]+waterMesh[i+3]+waterMesh[i+6])/3;
    const z=(waterMesh[i+2]+waterMesh[i+5]+waterMesh[i+8])/3;
    assert(core.fluidLevel(x,z)>0,'visible water triangle must remain inside the logical flooded region');
  }
  const tree=props.find(prop=>prop.slot===0||prop.slot===1);
  assert(tree,'the test seed needs a mangrove tree');
  assert(core.propBlocked(tree.x,tree.z));
  for(const [radius,worker] of [[.28,true],[1.1,false]]){
    assert.equal(core.buildNavigation(radius,worker),16);
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  core.addChunk(1,0);
  for(let z=0;z<49;z++)assert.equal(heights[z*49+48],core.heights()[z*49]);
  const state=JSON.parse(JSON.stringify(core.snapshot()));
  assert.equal(state.biome,'mangrove');
  const restored=createSpatialSavannaPrototype(module);
  restored.restoreState(state,0,0);
  assert.deepEqual(restored.snapshot(),state);
  assert.deepEqual(restored.props(),props);
});
test('a mangrove settlement dries its local flooded area without changing distant water',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0,'mangrove');
  const before=Uint8Array.from(core.water());
  const flooded=before.findIndex((value,i)=>value&&
    Math.abs(i%48-24)<12&&Math.abs(Math.floor(i/48)-24)<12);
  assert(flooded>=0,'the fixture needs central flooded terrain');
  const x=-24+flooded%48+.5,z=-24+Math.floor(flooded/48)+.5;
  const distant={x:200,z:200,level:core.fluidLevel(200,200)};
  core.addSettlement(x,z,4,4);
  assert.equal(core.fluidLevel(x,z),0);
  assert.notDeepEqual(Array.from(core.water()),Array.from(before));
  assert.equal(core.fluidLevel(distant.x,distant.z),distant.level);
});
test('Gran Cañón keeps its gorge, water barrier and worker crossing in one spatial core',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0,'canyons');
  const heights=Float32Array.from(core.heights()),props=core.props();
  assert(Math.max(...heights)-Math.min(...heights)>20,'the gorge needs visible height');
  assert(props.some(prop=>prop.slot>=2&&prop.slot<=4),'the canyon needs a geological landmark');
  assert(core.water().some(Boolean));
  assert(core.waterTriangles().length>0);
  const wet={x:-12,z:0};assert(core.fluidLevel(wet.x,wet.z)>0);
  core.buildNavigation(.28,true);
  assert(core.walkable(wet.x,wet.z),'workers must be able to cross the canyon river');
  validRoute(core,{x:-19,z:0},core.route({x:-19,z:0},{x:-4,z:0}));
  core.buildNavigation(1.1,false);
  assert(!core.walkable(wet.x,wet.z),'animals must not enter the canyon river');
  core.addChunk(1,0);
  for(let z=0;z<49;z++)assert.equal(heights[z*49+48],core.heights()[z*49]);
  const state=JSON.parse(JSON.stringify(core.snapshot()));
  assert.equal(state.biome,'canyons');
  const restored=createSpatialSavannaPrototype(module);
  restored.restoreState(state,0,0);
  assert.deepEqual(restored.snapshot(),state);
  assert.deepEqual(restored.props(),props);
});
test('the render payload and synchronous field query read one spatial world across chunks',()=>{
  const core=createSpatialWorld(module),view=new SpatialSurfaceView();
  core.generate(28,0,0,'canyons');view.install(core.chunkPayload());
  core.addChunk(1,0);view.install(core.chunkPayload());
  for(const cx of [0,1])for(let zi=0;zi<12;zi++)for(let xi=0;xi<12;xi++){
    const x=cx*48-22.5+xi*4,z=-22.5+zi*4;
    assert(Math.abs(view.surface(x,z)-core.surface(x,z))<.00005,`surface ${x},${z}`);
    const slope=Math.hypot(core.surface(x+.8,z)-core.surface(x-.8,z),
      core.surface(x,z+.8)-core.surface(x,z-.8))/1.6;
    assert(Math.abs(core.slope(x,z)-slope)<1e-9);
  }
  const a=core.currentChunk();assert.equal(a.cx,1);
  assert(core.selectChunk(0,0)>=0);assert.equal(core.currentChunk().cx,0);
  assert(Number.isNaN(core.surface(96,0)),'unloaded terrain is unknown');
});
test('resident surface and water queries match both rendered chunks in every biome',()=>{
  for(const biome of ['savanna','desert','grand_river','volcanoes','mangrove','canyons']){
    const core=createSpatialWorld(module),view=new SpatialSurfaceView();
    core.generate(28,0,0,biome);
    const firstWater=Float32Array.from(core.waterLevels());view.install(core.chunkPayload());
    core.addChunk(1,0);
    const secondWater=Float32Array.from(core.waterLevels());view.install(core.chunkPayload());
    for(const [cx,water] of [[0,firstWater],[1,secondWater]]){
      for(let zi=0;zi<8;zi++)for(let xi=0;xi<8;xi++){
        const x=cx*48-21.75+xi*6,z=-21.25+zi*6;
        assert(Math.abs(view.surface(x,z)-core.surface(x,z))<.00005,`${biome} surface ${cx}`);
      }
      for(let zi=0;zi<48;zi+=3)for(let xi=0;xi<48;xi+=3){
        const x=cx*48-23.5+xi,z=-23.5+zi;
        assert(Math.abs(water[zi*48+xi]-core.fluidLevel(x,z))<.00001,
          `${biome} water ${cx} ${xi},${zi}`);
      }
    }
  }
});
test('five animal radii retain independent logical graphs across profile switches and wall edits',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0,'savanna');
  const profiles=Object.values(ANIMAL_SPATIAL_PROFILES).map(({index,radius})=>[index,radius]);
  const grids=new Map();
  for(const [index,radius] of profiles){
    assert(core.buildNavigationProfile(index,radius,false)>0,`animal profile ${index}`);
    const values=[];
    for(let z=-20;z<=20;z+=2)for(let x=-20;x<=20;x+=2)
      values.push(core.walkable(x,z));
    grids.set(index,values);
  }
  const small=grids.get(ANIMAL_SPATIAL_PROFILES.lion.index),large=grids.get(ANIMAL_SPATIAL_PROFILES.rhino.index);
  assert(small.some((value,i)=>value&&!large[i]),'species radii should distinguish a narrow passage');
  assert(large.every((value,i)=>!value||small[i]),'a large species cannot enter cells unavailable to a smaller one');
  const before=core.metrics().sectorUpdates;
  for(const [index] of profiles){
    assert(core.selectNavigationProfile(index)>0);
    const values=[];
    for(let z=-20;z<=20;z+=2)for(let x=-20;x<=20;x+=2)
      values.push(core.walkable(x,z));
    assert.deepEqual(values,grids.get(index),`profile ${index} changed on selection`);
  }
  assert.equal(core.metrics().sectorUpdates,before,'switching must not rebuild the selected graph');
  const wall=core.addWall(10,0,.8,24);
  assert(wall>0);
  for(const [index] of profiles){
    core.selectNavigationProfile(index);
    assert(!core.edge(9,0,10,0),`wall must update profile ${index}`);
  }
  assert.equal(core.removeWall(wall),1);
  for(const [index] of profiles){
    core.selectNavigationProfile(index);
    assert.deepEqual([...Array(21)].map((_,i)=>core.walkable(-20+i*2,0)),
      grids.get(index).slice(10*21,11*21),`profile ${index} did not recover after wall removal`);
  }
  assert(core.addChunk(1,0)>0);
  for(const [index] of profiles)
    assert.equal(core.selectNavigationProfile(index),32,`profile ${index} did not stream the second chunk`);
  assert.equal(core.removeChunk(1,0),1);
  for(const [index] of profiles)
    assert.equal(core.selectNavigationProfile(index),16,`profile ${index} did not evict the second chunk`);
});
test('generated prop footprints follow each production scatter rule',()=>{
  const slots=[3.8,3.1,3.0,1.7,1.1,.9,1.4,.45,.35,.5,1.2,1.7,1.2,1.8,1.3,1.0,.9,1.7,4.0,5.0];
  const desert=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url))).profile.bounds;
  const canyon=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile.bounds;
  const core=createSpatialSavannaPrototype(module);
  for(const biome of ['savanna','desert','grand_river','volcanoes','mangrove','canyons']){
    core.generate(28,0,0,biome);
    for(const prop of core.props().filter(prop=>prop.group<6)){
      const expected=(biome==='desert'?desert[prop.slot].radius:
        biome==='canyons'?canyon[prop.slot].radius:slots[prop.slot])*prop.scale;
      assert(Math.abs(prop.radius-expected)<.0005,`${biome} slot ${prop.slot} radius`);
    }
  }
});
test('removing a generated obstacle changes the same visual and logical world and survives reload',()=>{
  for(const biome of ['savanna','desert']){
    const core=createSpatialSavannaPrototype(module);
    core.generate(28,0,0,biome);
    core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
    const solid=core.props().find(p=>p.group<=5&&
      (p.slot<=3||(p.slot>=10&&p.slot<=12)||p.slot>=18));
    assert(solid,`${biome} needs a removable solid`);
    const identity={group:solid.group,gx:solid.gx,gz:solid.gz};
    const before=core.instances().flat().find(p=>p.id===`spatial:${solid.group}:${solid.gx}:${solid.gz}`);
    assert(before,'rendered instance must expose the stable identity');
    assert(core.propBlocked(solid.x,solid.z));
    assert.equal(core.removeProp(identity),1);
    assert.equal(core.removeProp(identity),0,'a prop cannot be removed twice');
    assert(!core.props().some(p=>p.group===solid.group&&p.gx===solid.gx&&p.gz===solid.gz));
    assert(!core.propBlocked(solid.x,solid.z),'the removed prop must leave no logical collider');
    const state=JSON.parse(JSON.stringify(core.snapshot()));
    assert.deepEqual(state.removedProps,[identity]);
    const restored=createSpatialSavannaPrototype(module);
    restored.restoreState(state,0,0);
    restored.buildNavigation(.28,true);restored.buildNavigation(1.1,false);
    assert.deepEqual(restored.snapshot(),state);
    assert.deepEqual(restored.props(),core.props());
    for(const worker of [true,false]){
      core.selectNavigation(worker);restored.selectNavigation(worker);
      for(let z=-24;z<24;z++)for(let x=-24;x<24;x++){
        assert.equal(core.walkable(x,z),restored.walkable(x,z),`${biome} cell ${x},${z}`);
        for(const [dx,dz] of [[1,0],[0,1]])if(x+dx<24&&z+dz<24)
          assert.equal(core.edge(x,z,x+dx,z+dz),restored.edge(x,z,x+dx,z+dz),
            `${biome} edge ${x},${z} → ${x+dx},${z+dz}`);
      }
    }
  }
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
test('a WASM chunk uses the production render payload contract and transfers without JS terrain sampling',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.addChunk(1,0);
  const payload=core.chunkPayload();
  assert.equal(payload.cx,1);assert.equal(payload.cz,0);
  assert.equal(payload.terrain.positions.length,49*49*3);
  assert.equal(payload.terrain.colors.length,49*49*3);
  assert.equal(payload.terrain.indices.length,48*48*6);
  assert.equal(payload.groundMask.length,35*35*4);
  assert.equal(payload.terrain.positions[0],-24);
  assert.equal(payload.terrain.positions[2],-24);
  assert.equal(payload.terrain.positions[1],core.heights()[0]);
  const buffers=chunkTransferables(payload);
  assert.equal(buffers.length,5);
  const received=structuredClone(payload,{transfer:buffers});
  assert.equal(payload.terrain.positions.byteLength,0);
  const ground=nativeTerrainBuffer(received.terrain),river=nativeWaterBuffer(received.water);
  assert.equal(ground.getAttribute('position').count,2401);
  assert.equal(ground.index.count,48*48*6);
  assert.equal(ground.getAttribute('color').count,2401);
  assert.equal(ground.getAttribute('normal').count,2401);
  assert(received.instances.reduce((count,slot)=>count+slot.length,0)>0);
  ground.dispose();river?.dispose();
});
test('building both navigation profiles does not regenerate or change the selected visual chunk',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(28,0,0);
  core.setSettlement(10,8,7,6);
  core.addChunk(1,0);
  core.selectChunk(0,0);
  const before=core.chunkPayload();
  core.buildNavigation(.28,true);
  core.buildNavigation(1.1,false);
  const after=core.chunkPayload();
  assert.deepEqual(after,before);
});
test('the JS surface view samples only transferred WASM triangles across chunks and site updates',()=>{
  const core=createSpatialSavannaPrototype(module),view=new SpatialSurfaceView();
  core.generate(712,0,0);
  for(const cx of [0,1]){
    if(cx)core.addChunk(cx,0);
    view.install(core.chunkPayload());
    for(let i=0;i<250;i++){
      const x=cx*48-23.9+(i*.61803398875%1)*47.8;
      const z=-23.9+(i*.41421356237%1)*47.8;
      assert(Math.abs(view.surface(x,z)-core.surface(x,z))<.00002,`surface mismatch at ${x},${z}`);
    }
  }
  assert.equal(view.size,2);
  core.selectChunk(1,0);
  assert(Math.abs(view.surface(24,0)-core.surface(24,0))<.00002);
  assert.equal(view.surface(96,0),undefined,'unloaded terrain remains unknown');
  core.selectChunk(0,0);
  const before=Float32Array.from(core.chunkPayload().terrain.positions);
  core.setSettlement(10,8,7,6);
  view.install(core.chunkPayload());
  assert.notDeepEqual(Array.from(core.chunkPayload().terrain.positions),Array.from(before));
  assert(Math.abs(view.surface(14,10)-core.surface(14,10))<.00002);
  core.removeChunk(1,0);view.remove(1,0);
  assert.equal(view.surface(25,0),undefined);
  assert(Math.abs(view.surface(24,0)-core.surface(24,0))<.00002,
    'the west chunk retains its shared edge when its neighbor is evicted');
  view.clear();assert.equal(view.size,0);
});
test('a settlement command flattens and clears the same C++ terrain used for navigation',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const before=core.metrics().sectorUpdates;
  const level=core.setSettlement(10,8,7,6);
  assert(Number.isFinite(level)&&level>0);
  assert(Math.abs(core.heights()[(8+24)*49+(10+24)]-level)<.001);
  assert(core.groundMask().some((value,index)=>index%4===3&&value>0));
  assert(core.props().every(prop=>Math.hypot(prop.x-10,prop.z-8)>=19+prop.radius+4));
  assert(core.metrics().sectorUpdates>before,'the topological edit must refresh resident sectors');
  const west=Float32Array.from(core.heights());
  assert(core.addChunk(1,0)>0);
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],core.heights()[z*49]);
  for(const worker of [true,false]){
    assert.equal(core.selectNavigation(worker),32);
    for(let z=-18;z<19;z++)if(core.edge(23,z,24,z))
      validRoute(core,{x:23,z},core.route({x:23,z},{x:24,z}));
  }
  core.generate(712,0,0);
  assert(core.groundMask().every((value,index)=>index%4!==3||value===0));
  assert.equal(core.setSettlement(10,8,7,6),level);
});
test('a river strip no longer renders across dry settlement terrain',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  const riverCells=[];
  for(let x=-23;x<24;x++)if(core.water()[(8+24)*48+x+24])riverCells.push(x);
  assert(riverCells.length>0);
  const siteX=Math.max(...riverCells)+5;
  assert(core.setSettlement(siteX,8,7,6)>3.58);
  const triangles=core.waterTriangles();
  for(let i=0;i<triangles.length;i+=9){
    const x=(triangles[i]+triangles[i+3]+triangles[i+6])/3;
    const z=(triangles[i+2]+triangles[i+5]+triangles[i+8])/3;
    assert(!(Math.abs(x-siteX)<4&&Math.abs(z-8)<3&&Math.abs(triangles[i+1]-3.6)<.01),
      `river triangle remains above dry settlement terrain at (${x},${z})`);
  }
});
test('generated water triangles remain on the spatial core\'s wet terrain',()=>{
  const core=createSpatialSavannaPrototype(module);
  const contains=(v,i,x,z)=>{
    const ax=v[i+3]-v[i],az=v[i+5]-v[i+2];
    const bx=v[i+6]-v[i+3],bz=v[i+8]-v[i+5];
    const cx=v[i]-v[i+6],cz=v[i+2]-v[i+8];
    const a=ax*(z-v[i+2])-az*(x-v[i]);
    const b=bx*(z-v[i+5])-bz*(x-v[i+3]);
    const c=cx*(z-v[i+8])-cz*(x-v[i+6]);
    // The curved bank is approximated by straight triangle edges. A few
    // centimetres at a 1 m sample point are visually and physically benign.
    const tolerance=.08;
    const pa=tolerance*Math.hypot(ax,az),pb=tolerance*Math.hypot(bx,bz),pc=tolerance*Math.hypot(cx,cz);
    return a>=-pa&&b>=-pb&&c>=-pc||a<=pa&&b<=pb&&c<=pc;
  };
  for(const seed of [28,712,17])for(const settlement of [false,true]){
    core.generate(seed,0,0);
    if(settlement)core.setSettlement(10,8,7,6);
    const vertices=core.waterTriangles();
    assert(vertices.length>0);
    for(let i=0;i<vertices.length;i+=9){
      const x=(vertices[i]+vertices[i+3]+vertices[i+6])/3;
      const y=vertices[i+1];
      const z=(vertices[i+2]+vertices[i+5]+vertices[i+8])/3;
      const level=core.fluidLevel(x,z);
      assert(Math.abs(level-y)<.001,
        `dry water triangle ${i/9} at ${x},${z}, rendered ${y}, logical ${level}, seed ${seed}, settlement ${settlement}`);
    }
    for(let z=-23.5;z<24;z++)for(let x=-23.5;x<24;x++){
      if(Math.abs(core.fluidLevel(x,z)-3.6)>.001)continue;
      let covered=false;
      for(let i=0;i<vertices.length;i+=9)if(Math.abs(vertices[i+1]-3.6)<.001&&contains(vertices,i,x,z)){
        covered=true;break;
      }
      assert(covered,`navigational river has no visible water at ${x},${z}, seed ${seed}, settlement ${settlement}`);
    }
  }
});
test('the clipped river surface joins at a north-south chunk seam',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(17,0,0);
  const south=Float32Array.from(core.waterTriangles());
  assert(core.addChunk(0,1)>0);
  const north=core.waterTriangles();
  const seam=vertices=>[...new Set(Array.from({length:vertices.length/3},(_,i)=>i*3)
    .filter(i=>Math.abs(vertices[i+2]-24)<.0001&&Math.abs(vertices[i+1]-3.6)<.001)
    .map(i=>vertices[i].toFixed(4)))].sort();
  assert(seam(south).length>=2);
  assert.deepEqual(seam(south),seam(north));
});
test('multiple settlements preserve distant terrain and refresh only nearby resident chunks',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const firstLevel=core.setSettlement(10,8,7,6);
  const firstHeights=Float32Array.from(core.heights());
  const firstMask=Uint8Array.from(core.groundMask());
  const firstProps=core.props();
  core.addChunk(2,0);
  const distantOriginal=Float32Array.from(core.heights());
  const before=core.metrics().sectorUpdates;
  const secondLevel=core.addSettlement(96,8,7,6);
  const updated=core.metrics().sectorUpdates-before;
  assert(Number.isFinite(secondLevel)&&secondLevel>0);
  assert(updated>0&&updated<=16,`distant settlement refreshed ${updated} sectors`);
  assert(Math.abs(core.heights()[(8+24)*49+24]-secondLevel)<.001);
  assert(core.groundMask().some((value,index)=>index%4===3&&value>0));
  assert(core.props().every(prop=>Math.hypot(prop.x-96,prop.z-8)>=19+prop.radius+4));
  assert.notDeepEqual(Array.from(core.heights()),Array.from(distantOriginal));
  const sectors=core.metrics().sectorUpdates;
  assert(core.selectChunk(0,0)>0);
  assert.equal(core.metrics().sectorUpdates,sectors,'reading a resident chunk must not rebuild navigation');
  assert.deepEqual(Array.from(core.heights()),Array.from(firstHeights));
  assert.deepEqual(Array.from(core.groundMask()),Array.from(firstMask));
  assert.deepEqual(core.props(),firstProps);
  assert.equal(core.setSettlement(10,8,7,6),firstLevel);
  assert(core.selectChunk(2,0)>0);
  assert.deepEqual(Array.from(core.heights()),Array.from(distantOriginal),
    'replacing the settlement list must remove the old distant site');
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
test('a dynamic passage updates local worker and animal topology independently',()=>{
  const core=createSpatialSavannaPrototype(module);core.generate(712,0,0);
  core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  core.setSettlement(10,8,7,6);
  for(const worker of [true,false]){
    core.selectNavigation(worker);
    assert.equal(core.walkable(10,8),true,'fixture needs a clear settlement cell');
  }
  const before=core.metrics().sectorUpdates;
  const gate=core.addBarrier(10,8,.4,.4,1);
  assert(gate>0);
  assert(core.metrics().sectorUpdates>before);
  assert(core.metrics().sectorUpdates-before<16,'only nearby sectors should change');
  core.selectNavigation(true);assert.equal(core.walkable(10,8),true);
  core.selectNavigation(false);assert.equal(core.walkable(10,8),false);
  assert.equal(core.setBarrierPassability(gate,0),1);
  core.selectNavigation(true);assert.equal(core.walkable(10,8),false);
  const unchanged=core.metrics().sectorUpdates;
  assert.equal(core.setBarrierPassability(gate,0),1);
  assert.equal(core.metrics().sectorUpdates,unchanged,'an unchanged gate must not rebuild sectors');
  assert.equal(core.setBarrierPassability(gate,3),1);
  for(const worker of [true,false]){
    core.selectNavigation(worker);assert.equal(core.walkable(10,8),true);
  }
  assert.equal(core.setBarrierPassability(gate,4),0);
  assert.equal(core.removeWall(gate),1);
  assert.equal(core.setBarrierPassability(gate,0),0,'removed barriers cannot be changed');
});
test('indexed dynamic barriers preserve point and edge collision semantics across both profiles',()=>{
  const core=createSpatialSavannaPrototype(module);core.generate(123,0,0);
  core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const points=[],edges=[],base=new Map();
  for(let z=-23;z<=22;z++)for(let x=-23;x<=22;x++){
    points.push({x,z});edges.push({x,z,nx:x+1,nz:z},{x,z,nx:x,nz:z+1});
  }
  for(const worker of [true,false]){
    core.selectNavigation(worker);
    base.set(worker,{points:points.map(({x,z})=>core.walkable(x,z)),
      edges:edges.map(({x,z,nx,nz})=>core.edge(x,z,nx,nz))});
  }
  const barriers=[];
  for(let i=0;i<24;i++){
    const x=-22+(i%8)*6,z=-20+Math.floor(i/8)*16,passMask=i%4;
    barriers.push({id:core.addBarrier(x,z,.3+(i%3)*.2,.4,passMask),x,z,
      halfX:.3+(i%3)*.2,halfZ:.4,passMask});
  }
  const clear=(x,z,radius,bit)=>barriers.every(b=>(b.passMask&bit)||
    !(Math.abs(x-b.x)<b.halfX+radius&&Math.abs(z-b.z)<b.halfZ+radius));
  for(const worker of [true,false]){
    const radius=worker?0.28:1.1,bit=worker?1:2,original=base.get(worker);
    core.selectNavigation(worker);
    points.forEach(({x,z},i)=>assert.equal(core.walkable(x,z),
      original.points[i]&&clear(x,z,radius,bit),`point ${x},${z}, worker ${worker}`));
    edges.forEach(({x,z,nx,nz},i)=>{
      let expected=original.edges[i]&&clear(x,z,radius,bit)&&clear(nx,nz,radius,bit);
      for(let t=1;t<4;t++)expected=expected&&clear(x+(nx-x)*t/4,z+(nz-z)*t/4,radius,bit);
      assert.equal(core.edge(x,z,nx,nz),expected,`edge ${x},${z} -> ${nx},${nz}, worker ${worker}`);
    });
  }
  for(const barrier of barriers)assert.equal(core.removeBarrier(barrier.id),1);
  for(const worker of [true,false]){
    core.selectNavigation(worker);const original=base.get(worker);
    points.forEach(({x,z},i)=>assert.equal(core.walkable(x,z),original.points[i]));
    edges.forEach(({x,z,nx,nz},i)=>assert.equal(core.edge(x,z,nx,nz),original.edges[i]));
  }
});
test('a wall-chain batch matches individual barriers with one local refresh per sector',()=>{
  const single=createSpatialSavannaPrototype(module),batch=createSpatialSavannaPrototype(module);
  for(const core of [single,batch]){
    core.generate(712,0,0);core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  }
  const chain=Array.from({length:40},(_,i)=>({x:-20+i,z:0,halfX:.49,halfZ:.45,passMask:0}));
  const beforeSingle=single.metrics().sectorUpdates,beforeBatch=batch.metrics().sectorUpdates;
  const individualIds=chain.map(({x,z,halfX,halfZ,passMask})=>single.addBarrier(x,z,halfX,halfZ,passMask));
  const batchIds=batch.addBarriersBatch(chain);
  assert.deepEqual(batchIds,individualIds);
  assert(batch.metrics().sectorUpdates-beforeBatch<single.metrics().sectorUpdates-beforeSingle,
    'a sector crossed by several wall modules should be rebuilt once in the batch');
  for(const worker of [true,false]){
    single.selectNavigation(worker);batch.selectNavigation(worker);
    for(let z=-4;z<=4;z++)for(let x=-22;x<=22;x++){
      assert.equal(batch.walkable(x,z),single.walkable(x,z),`passability ${x},${z},${worker}`);
      assert.equal(batch.edge(x,z,x+1,z),single.edge(x,z,x+1,z),`east edge ${x},${z},${worker}`);
      assert.equal(batch.edge(x,z,x,z+1),single.edge(x,z,x,z+1),`north edge ${x},${z},${worker}`);
    }
    for(const [start,end] of [[{x:-22,z:-3},{x:22,z:-3}],
      [{x:-22,z:3},{x:22,z:3}],[{x:0,z:-3},{x:0,z:3}]])
      assert.deepEqual(batch.route(start,end),single.route(start,end));
  }
  const updates=batch.metrics().sectorUpdates;
  assert.throws(()=>batch.addBarriersBatch([{x:5,z:6,halfX:.4,halfZ:.4},
    {x:6,z:6,halfX:-1,halfZ:.4}]),/Invalid spatial barrier batch/);
  assert.equal(batch.metrics().sectorUpdates,updates,'invalid input must not change topology');
  assert.equal(batch.addBarrier(21,4,.4,.4),single.addBarrier(21,4,.4,.4),
    'invalid batch must not consume barrier IDs');
  for(const id of [individualIds[0],individualIds[20],individualIds[39]]){
    assert.equal(batch.removeBarrier(id),single.removeBarrier(id));
  }
  for(const worker of [true,false]){
    single.selectNavigation(worker);batch.selectNavigation(worker);
    assert.deepEqual(batch.route({x:0,z:-3},{x:0,z:3}),single.route({x:0,z:-3},{x:0,z:3}));
  }
});
test('versioned spatial state restores settlements, sparse barrier IDs and both navigation profiles',()=>{
  const original=createSpatialSavannaPrototype(module);
  original.generate(2026,0,0);original.addChunk(1,0);
  original.setSettlement(10,8,7,6);original.addSettlement(62,8,7,6);
  original.buildNavigation(.28,true);original.buildNavigation(1.1,false);
  const removed=original.addBarrier(-12,3,.5,.5);assert.equal(original.removeBarrier(removed),1);
  const ids=original.addBarriersBatch([
    {x:23.5,z:0,halfX:.8,halfZ:7,passMask:0},
    {x:23.5,z:10,halfX:.8,halfZ:4,passMask:1}
  ]);
  const state=JSON.parse(JSON.stringify(original.snapshot()));
  assert.deepEqual(state.barriers.map(barrier=>barrier.id),ids);
  assert.equal(state.nextBarrierId,ids.at(-1)+1);
  const payloads=[0,1].map(cx=>{original.selectChunk(cx,0);return original.chunkPayload();});
  const routes=[];
  for(const worker of [true,false]){
    original.selectNavigation(worker);
    routes.push(original.route({x:20,z:0},{x:27,z:0}));
  }
  const restored=createSpatialSavannaPrototype(module);
  restored.restoreState(state,0,0);restored.addChunk(1,0);
  restored.buildNavigation(.28,true);restored.buildNavigation(1.1,false);
  assert.deepEqual(restored.snapshot(),state);
  for(const [cx,payload] of payloads.entries()){
    restored.selectChunk(cx,0);
    assert.deepEqual(restored.chunkPayload(),payload);
  }
  for(const [index,worker] of [true,false].entries()){
    restored.selectNavigation(worker);
    assert.deepEqual(restored.route({x:20,z:0},{x:27,z:0}),routes[index]);
  }
  assert.equal(restored.addBarrier(6,2,.4,.4),original.addBarrier(6,2,.4,.4),
    'the next barrier ID must survive reload');
  const before=restored.snapshot();
  assert.throws(()=>restored.restoreState({...before,barriers:[before.barriers[0],before.barriers[0]]}),
    /Invalid spatial barrier/);
  assert.throws(()=>restored.restoreState({...before,removedProps:[
    {group:0,gx:1,gz:2},{group:0,gx:1,gz:2}]}),/sorted and unique/);
  assert.deepEqual(restored.snapshot(),before,'invalid snapshots must not reset a running world');
  const legacy={...state,version:2};delete legacy.removedProps;
  const legacyRestored=createSpatialSavannaPrototype(module);
  legacyRestored.restoreState(legacy,0,0);
  assert.equal(legacyRestored.snapshot().biome,'savanna');
  assert.deepEqual(legacyRestored.snapshot().removedProps,[]);
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
    core.addChunk(1,0);core.selectChunk(0,0);
    const halo=core.metrics().haloProps;
    core.selectChunk(1,0);
    assert.equal(core.removeProp(external),1);
    core.selectChunk(0,0);
    assert.equal(core.metrics().haloProps,halo-1,'neighboring logical halo must lose the removed prop');
    core.selectChunk(1,0);
    assert(!core.props().some(p=>p.group===external.group&&p.gx===external.gx&&p.gz===external.gz));
    const restored=createSpatialSavannaPrototype(module);
    restored.restoreState(core.snapshot(),0,0);restored.addChunk(1,0);
    restored.buildNavigation(1.1,false);
    for(let x=20;x<=27;x++)for(let zz=-24;zz<24;zz++){
      assert.equal(core.walkable(x,zz),restored.walkable(x,zz));
      if(x<27)assert.equal(core.edge(x,zz,x+1,zz),restored.edge(x,zz,x+1,zz));
    }
    caseFound=true;
  }
  assert(caseFound,'expected a neighboring tree or rock to overlap a tested seam');
});
test('indexed obstacle checks agree with every visible solid across the surrounding chunks',()=>{
  for(const biome of ['savanna','desert','grand_river']){
    const core=createSpatialSavannaPrototype(module),neighbor=createSpatialSavannaPrototype(module),solids=[];
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++){
      neighbor.generate(712,cx,cz,biome);
      solids.push(...neighbor.props().filter(p=>p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18));
    }
    core.generate(712,0,0,biome);
    for(const [radius,worker] of [[.28,true],[1.1,false]]){
      core.buildNavigation(radius,worker);
      for(let z=-24;z<24;z++)for(let x=-24;x<24;x++){
        const expected=solids.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+radius);
        assert.equal(core.propBlocked(x,z),expected,
          `${biome} prop occupancy at ${x},${z}, radius ${radius}`);
      }
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
