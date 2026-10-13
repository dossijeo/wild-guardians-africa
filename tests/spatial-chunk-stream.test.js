import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {createSpatialChunkStream} from '../src/world/hierarchical-wasm/spatial-chunk-stream.js';
import {createSpatialSavannaSession} from '../src/world/hierarchical-wasm/spatial-savanna-session.js';
import {villageLayout} from '../src/world/villages.js';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {refreshResidentProps} from '../src/rendering/resident-props.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

test('a Sabana game state renders and routes from one spatial authority through topology events',async()=>{
  const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
  const state={seed:'712',biome:'sabana',villages:[{id:'village-1',x:0,z:0,
    buildings:villageLayout(pack,0,0)}],structures:[{id:'center-1',kind:'center',
      villageId:'village-1',culture:'mapungubwe',status:'intact',x:23,z:0,yaw:0,hp:100}],spells:[]};
  const installed=new Map(),scheduled=[];
  const session=createSpatialSavannaSession(module,state,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  const {core,stream}=session;
  assert.equal(core.snapshot().polygons.length,1+state.villages[0].buildings.filter(b=>b.kind!=='Zona común').length);
  stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]));
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(installed.size,2);assert.equal(core.metrics().loadedChunks,2);
  for(const payload of installed.values()){
    const center=payload.cx*48;
    assert.equal(payload.terrain.positions[(24*49+24)*3+1],Math.fround(core.surface(center,0)));
  }
  let passage;
  for(let z=-18;z<=18&&!passage;z++){
    const start={x:23.8,z},end={x:24.2,z};
    if(session.routeActor(start,end).status==='found'&&
       session.routeActor(start,end,{worker:false,species:'warthog'}).status==='found')
      passage={start,end};
  }
  assert(passage,'workers and animals should share a physically open chunk seam');
  state.structures.push({id:'wall-1',kind:'wall',material:'adobe',status:'intact',
    x:23.5,z:passage.start.z,yaw:0,baseScaleX:1,hp:100,gate:false});
  state.spells.push({id:'shield-1',kind:'shield',x:10,z:10,radius:1.95,remaining:10});
  session.syncState(state);
  assert.equal(core.snapshot().barriers.length,1);
  assert.equal(core.snapshot().polygons.length,2+state.villages[0].buildings.filter(b=>b.kind!=='Zona común').length);
  assert.equal(core.localClear(passage.start,passage.end),false);
  assert.notEqual(session.routeActor(passage.start,passage.end).status,'found');
  state.structures.at(-1).status='ruined';state.spells[0].remaining=0;
  session.syncState(state);
  assert.equal(core.snapshot().barriers.length,0);
  assert.equal(core.localClear(passage.start,passage.end),true);
  assert.equal(session.routeActor(passage.start,passage.end).status,'found');
  const source=[...installed.values()].find(chunk=>chunk.instances.some(list=>list.length));
  const visible=source?.instances.flat()[0];
  assert(visible?.id.startsWith('spatial:'));
  assert.throws(()=>session.syncState({...state,suppressed:['legacy-prop-id']}),/Unsupported spatial prop ID/);
  state.suppressed=[visible.id];
  const change=session.syncState(state);
  assert.deepEqual(change.removedProps,[visible.id]);
  assert.equal(core.selectChunk(source.cx,source.cz)>=0,true);
  assert.equal(core.instances().flat().some(prop=>prop.id===visible.id),false);
  const group={children:[],userData:{propSources:source.instances,
    contactInstances:source.instances.map(list=>list.slice())}};
  const refreshed=refreshResidentProps(new Map([[`${source.cx},${source.cz}`,group]]),session.suppressed,()=>{});
  assert.deepEqual(refreshed,{chunks:1,slots:1});
  assert.equal(group.userData.contactInstances.flat().some(prop=>prop.id===visible.id),false);
  assert.deepEqual(session.syncState(state).removedProps,[]);
  session.dispose();
});

test('chunk selection distinguishes an absent chunk from a resident chunk with zero props',async()=>{
  const real=createSpatialWorld(module);
  real.generate(712,0,0);
  assert.equal(real.selectChunk(9,9),-1);
  const installed=new Map(),scheduled=[];
  let added=0,selected=0;
  const core={currentChunk:()=>({cx:0,cz:0}),selectChunk:()=>{selected++;return 0;},
    addChunk:()=>{added++;throw Error('Resident empty chunk was regenerated');},
    chunkPayload:()=>({cx:2,cz:3})};
  const stream=createSpatialChunkStream(core,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  stream.plan(new Map([['2,3',{cx:2,cz:3,score:0}]]));
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(selected,1);assert.equal(added,0);
  assert.equal(installed.size,1);
  stream.dispose();
});

test('one resident C++ world supplies streamed render chunks and actor routes',async()=>{
  const core=createSpatialWorld(module),installed=new Map(),scheduled=[];
  core.generate(712,0,0);core.buildNavigation(.28,true);
  const stream=createSpatialChunkStream(core,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]));
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(stream.summary().created,2);
  assert.equal(core.metrics().loadedChunks,2);
  for(const [key,data] of installed){
    const center=24*49+24;
    assert.equal(data.terrain.positions[center*3+1],
      Math.fround(core.surface(data.cx*48,data.cz*48)),`rendered and navigated height differs at ${key}`);
    assert.equal(data.terrain.positions.length,49*49*3);
    assert.equal(data.instances.length,20);
  }
  let crossing;
  for(let z=-18;z<=18&&!crossing;z++){
    const start={x:23.8,z},end={x:24.2,z};
    if(core.routeWorld(start,end).status==='found')crossing={start,end};
  }
  assert(crossing,'the same spatial world must route through its rendered seam');
  const wall=core.addWall(23.5,0,.8,24);
  assert.notEqual(core.routeWorld(crossing.start,crossing.end).status,'found');
  core.removeWall(wall);
  assert.equal(core.routeWorld(crossing.start,crossing.end).status,'found');
  installed.delete('1,0');
  assert.equal(stream.releaseChunk(1,0),1);
  assert.equal(core.metrics().loadedChunks,1);
  assert.notEqual(core.routeWorld(crossing.start,crossing.end).status,'found');
  stream.dispose();
});

test('stream cancellation does not generate chunks that were never requested by the renderer',()=>{
  const core=createSpatialWorld(module),installed=new Map(),scheduled=[];
  core.generate(712,0,0);core.buildNavigation(.28,true);
  const stream=createSpatialChunkStream(core,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  stream.plan(new Map([['1,0',{cx:1,cz:0,score:0}]]));
  stream.dispose();
  assert.equal(scheduled.length,0);
  assert.equal(core.metrics().loadedChunks,1);
  assert.equal(installed.size,0);
});

test('production terrain installer accepts the same C++ payload used for navigation',()=>{
  const core=createSpatialWorld(module);core.generate(712,0,0);core.buildNavigation(.28,true);
  const pack=JSON.parse(readFileSync(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
  const data=core.chunkPayload(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial();
  geometry.computeBoundingBox();
  const world={buildPropSlot:WorldScene.prototype.buildPropSlot,nav:{field:core,suppressed:new Set(),
    chunk(){throw Error('The renderer must use the C++ payload');}},pack,
    prototypes:Array.from({length:20},()=>[0,1,2].map(()=>new THREE.Mesh(geometry,material))),
    quality:'media',terrainMeshes:[],waterPrototypes:Array(20).fill(null),
    fluidMaterial:new THREE.MeshBasicMaterial(),state:{biome:'sabana'}};
  const group=WorldScene.prototype.terrain.call(world,0,0,data);
  assert.equal(world.terrainMeshes[0].geometry.getAttribute('position').count,49*49);
  assert.equal(group.userData.contactInstances.flat().length,data.instances.flat().length);
  const center=world.terrainMeshes[0].geometry.getAttribute('position').getY(24*49+24);
  assert.equal(center,Math.fround(core.surface(0,0)));
  group.traverse(object=>{if(object.isInstancedMesh)object.dispose();if(object.isMesh&&object.geometry!==geometry)object.geometry.dispose();});
  geometry.dispose();material.dispose();world.fluidMaterial.dispose();
});
