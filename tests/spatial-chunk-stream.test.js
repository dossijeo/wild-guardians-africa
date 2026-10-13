import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {createSpatialChunkStream} from '../src/world/hierarchical-wasm/spatial-chunk-stream.js';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

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
