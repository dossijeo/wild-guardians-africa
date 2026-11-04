import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';

function chunk(cx=0,cz=0){const positions=new Float32Array(49*49*3),colors=new Float32Array(49*49*3),indices=new Uint16Array(48*48*6);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;positions.set([x-24,(x+z)/10,z-24],i);colors.set([.2,.4,.6],i);}for(let z=0;z<48;z++)for(let x=0;x<48;x++){const a=z*49+x,k=(z*48+x)*6;indices.set([a,a+49,a+1,a+1,a+49,a+50],k);}return {authority:'spatial-wasm',cx,cz,terrain:{positions,colors,indices}};}
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
