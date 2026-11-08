import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createActorTerrainSampler} from '../src/rendering/webgpu-actor-terrain.js';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
test('avoids repeated actor floor queries but handles movement and replacement',()=>{let mesh=null,count=0;const make=y=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=y;const raycast=m.raycast.bind(m);m.raycast=(...args)=>{count++;return raycast(...args);};return m;},sample=createActorTerrainSampler({get:()=>mesh});assert.equal(sample(0,0),0);mesh=make(2);assert.ok(Math.abs(sample(0,0)-2)<1e-6);sample(0,0);assert.equal(count,1);sample(1,0);assert.equal(count,2);mesh=make(5);assert.ok(Math.abs(sample(1,0)-5)<1e-6);assert.equal(count,3);mesh=null;assert.equal(sample(1,0),0);});
test('uses resident surface without raycasting and falls back when the view has no sample',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(10,10),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=2;let rays=0,available=true;const raycast=mesh.raycast.bind(mesh);mesh.raycast=(...args)=>{rays++;return raycast(...args);};const sample=createActorTerrainSampler({get:()=>mesh,surface:()=>available?2:null});
 try{assert.equal(sample(.2,.3),2);assert.equal(rays,0);available=false;assert.ok(Math.abs(sample(1.2,.3)-2)<1e-6);assert.equal(rays,1);}finally{mesh.geometry.dispose();material.dispose();}
});

test('resident Wild Engine surface agrees with rendered ground on chunks and seams in all biomes',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 for(const biome of ['savanna','desert','grand_river','volcanoes','mangrove','canyons']){
  const core=createSpatialWorld(module),scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),water=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),residency=createWebGpuTerrainResidency({scene,material,waterMaterial:water});core.generate(28,0,0,biome);residency.replace(core.chunkPayload(),1);core.addChunk(1,0);residency.replace(core.chunkPayload(),1);
  const sample=createActorTerrainSampler(residency),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),origin=new THREE.Vector3();let checks=0;
  try{for(const cx of [0,1])for(let iz=0;iz<6;iz++)for(let ix=0;ix<6;ix++){const x=cx*48-22.73+ix*8,z=-22.61+iz*8,mesh=residency.get(cx,0);mesh.updateMatrixWorld(true);ray.set(origin.set(x,1000,z),down);const expected=ray.intersectObject(mesh,false)[0]?.point.y;assert.ok(Number.isFinite(expected));assert.ok(Math.abs(sample(x,z)-expected)<.00005,`${biome}: ${x},${z}`);checks++;}
   for(const z of [-24,-15.5,0,15.5,23.99]){const mesh=residency.get(1,0);mesh.updateMatrixWorld(true);ray.set(origin.set(24,1000,z),down);const hit=ray.intersectObject(mesh,false)[0],expected=hit?.point.y??residency.surfaceInChunk(1,0,24,z);assert.ok(Math.abs(sample(24,z)-expected)<.00005,`${biome} seam: ${z}, actual ${sample(24,z)}, ray ${expected}`);checks++;}assert.equal(checks,77);
  }finally{residency.dispose();material.dispose();water.dispose();}
 }
});

test('canonical terrain owns exact seam heights without raycasts and invalidates on changed topology or transforms',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),core=createSpatialWorld(module),scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),water=new THREE.MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material,waterMaterial:water});core.generate(28,0,0,'mangrove');residency.replace(core.chunkPayload(),1);
 const mesh=residency.get(0,0),sample=createActorTerrainSampler(residency);let rays=0;const raycast=mesh.raycast.bind(mesh);mesh.raycast=(...args)=>{rays++;return raycast(...args);};
 try{
  for(const [x,z] of [[-24,-24],[0,0],[1,.5],[.5,.5],[-3,2.5],[4.5,2.5]])assert.equal(sample(x,z),residency.surface(x,z));assert.equal(rays,0);
  mesh.position.y=1;assert.equal(residency.canonicalSurface(0,0,mesh),null);sample(0,0);assert.equal(rays,1);mesh.position.y=0;
  const index=mesh.geometry.index,original=index.array[0];index.array[0]=7;index.needsUpdate=true;assert.equal(residency.canonicalSurface(0,0,mesh),null);index.array[0]=original;index.needsUpdate=true;assert.equal(sample(0,0),residency.surface(0,0));
  const originalPositions=mesh.geometry.attributes.position;mesh.geometry.setAttribute('position',originalPositions.clone());assert.equal(residency.canonicalSurface(0,0,mesh),null);mesh.geometry.setAttribute('position',originalPositions);
  const old=sample(0,0);originalPositions.array[(24*49+24)*3+1]+=2;originalPositions.needsUpdate=true;assert.equal(sample(0,0),Math.fround(old+2));
 }finally{residency.dispose();material.dispose();water.dispose();}
});
