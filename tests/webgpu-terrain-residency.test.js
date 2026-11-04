import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';

function chunk(cx=0,cz=0){const positions=new Float32Array(49*49*3),colors=new Float32Array(49*49*3),indices=new Uint16Array(48*48*6);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;positions.set([x-24,(x+z)/10,z-24],i);colors.set([.2,.4,.6],i);}for(let z=0;z<48;z++)for(let x=0;x<48;x++){const a=z*49+x,k=(z*48+x)*6;indices.set([a,a+49,a+1,a+1,a+49,a+50],k);}return {authority:'spatial-wasm',cx,cz,terrain:{positions,colors,indices}};}
test('samples the confirmed terrain triangles exactly, including replacement and chunk boundaries',()=>{
 const scene=new THREE.Scene(),residency=createWebGpuTerrainResidency({scene,material:new THREE.MeshBasicMaterial({side:THREE.DoubleSide})}),data=chunk(-1,1);
 for(let i=0;i<data.terrain.positions.length/3;i++)data.terrain.positions[i*3+1]=Math.fround(Math.sin(i*.3)*3);
 residency.replace(data,1);const mesh=residency.get(-1,1);mesh.updateWorldMatrix(true,false);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(let z=24;z<72;z+=.731)for(let x=-72;x< -24;x+=.829){ray.set(new THREE.Vector3(x,1000,z),down);const expected=ray.intersectObject(mesh,false)[0]?.point.y;assert.ok(Math.abs(residency.surface(x,z)-expected)<1e-5,`${x},${z}`);}
 assert.equal(residency.surface(-24,30),null);const newer=chunk(-1,1);newer.terrain.positions.forEach((v,i)=>{if(i%3===1)newer.terrain.positions[i]=10;});residency.replace(newer,2);assert.equal(residency.surface(-60,40),10);assert.equal(residency.replace(data,1),false);assert.equal(residency.surface(-60,40),10);residency.remove(-1,1,3);assert.equal(residency.surface(-60,40),null);residency.dispose();
});
test('keeps native chunk geometry and rejects stale updates and removals',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material}),data=chunk(1,-2);
 assert.equal(residency.replace(data,1),true);const mesh=residency.get(1,-2);assert.deepEqual(mesh.position.toArray(),[48,0,-96]);assert.equal(mesh.geometry.attributes.position.array,data.terrain.positions);assert.equal(mesh.material,material);assert.equal(mesh.geometry.index.count,48*48*6);
 assert.equal(residency.replace(chunk(1,-2),1),false);assert.equal(residency.remove(1,-2,0),false);assert.equal(residency.get(1,-2),mesh);
 let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);assert.equal(residency.remove(1,-2,2),true);assert.equal(disposed,1);assert.equal(residency.replace(data,1),false);assert.equal(residency.size,0);
 assert.equal(residency.replace(chunk(1,-2),3),true);residency.dispose();assert.equal(scene.children.length,0);assert.throws(()=>residency.replace(data,4),/disposed/);
});
test('invalid replacement leaves the current surface intact',()=>{
 const scene=new THREE.Scene(),residency=createWebGpuTerrainResidency({scene,material:new THREE.MeshBasicMaterial()}),data=chunk();residency.replace(data,1);const current=residency.get(0,0),bad=chunk();bad.terrain.indices=new Uint16Array(3);
 assert.throws(()=>residency.replace(bad,2),/Invalid Wild Engine/);assert.equal(residency.get(0,0),current);assert.equal(scene.children.length,1);residency.dispose();
});
test('keeps water paired with its confirmed chunk and disposes old geometry',()=>{
 const scene=new THREE.Scene(),waterMaterial=new THREE.MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material:new THREE.MeshBasicMaterial(),waterMaterial}),data=chunk(1,-2);data.water=new Float32Array([0,1,0,1,1,0,0,1,1]);residency.replace(data,1);const water=residency.getWater(1,-2);assert.deepEqual(water.position.toArray(),[48,0,-96]);assert.equal(water.geometry.attributes.position.array,data.water);assert.equal(water.material,waterMaterial);let disposed=0;water.geometry.addEventListener('dispose',()=>disposed++);
 const bad=chunk(1,-2);bad.water=new Float32Array([1]);assert.throws(()=>residency.replace(bad,2),/Invalid Wild Engine water/);assert.equal(residency.getWater(1,-2),water);assert.equal(disposed,0);
 const dry=chunk(1,-2);dry.water=new Float32Array(0);residency.replace(dry,2);assert.equal(disposed,1);assert.equal(residency.getWater(1,-2),null);assert.equal(residency.waterSize,0);assert.equal(residency.replace(data,1),false);residency.dispose();assert.equal(scene.children.length,0);
});

test('owns per-chunk materials and preserves the fallback',()=>{
 const scene=new THREE.Scene(),fallback=new THREE.MeshBasicMaterial(),owned=[],residency=createWebGpuTerrainResidency({scene,material:fallback,materialFactory:data=>{if(!data.groundMask)return null;const material=new THREE.MeshBasicMaterial();material.addEventListener('dispose',()=>owned.push(data.cx));return material;}}),first=chunk();first.groundMask=new Uint8Array(35*35*4);residency.replace(first,1);assert.notEqual(residency.get(0,0).material,fallback);residency.replace(chunk(),2);assert.deepEqual(owned,[0]);assert.equal(residency.get(0,0).material,fallback);residency.dispose();
});

test('checkpoint replaces terrain without consuming the next authoritative revision',()=>{
 const residency=createWebGpuTerrainResidency({scene:new THREE.Scene(),material:new THREE.MeshBasicMaterial()}),old=chunk(),checkpoint=chunk(),future=chunk();
 checkpoint.terrain.positions[1]=17;future.terrain.positions[1]=23;residency.replace(old,4);residency.restoreCheckpoint(checkpoint);
 assert.equal(residency.get(0,0).geometry.attributes.position.array[1],17);
 assert.equal(residency.replace(old,4),false);assert.equal(residency.replace(future,5),true);
 assert.equal(residency.get(0,0).geometry.attributes.position.array[1],23);residency.dispose();
});
