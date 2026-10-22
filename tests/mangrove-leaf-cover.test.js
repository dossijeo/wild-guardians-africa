import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {prepareMangroveLeaves,mangroveLeafShader} from '../src/rendering/mangrove-leaf-cover.js';
import {createContinuousGrass,continuousGrassEnabled} from '../src/rendering/continuous-grass.js';

test('Mangrove leaf modules preserve authored geometry and leaf LOD mapping',async()=>{
 const raw=JSON.parse(await readFile(new URL('../public/assets/visual-lab/mangrove-leaf-fill-20261021/modules.json',import.meta.url),'utf8')),before=JSON.stringify(raw),modules=prepareMangroveLeaves(raw);
 assert.equal(JSON.stringify(raw),before);
 for(const [key,name] of [['refined','near'],['light','far']]){const m=modules[key];assert.deepEqual(m.position,raw[name].position);assert.deepEqual(m.index,raw[name].index);assert.equal(m.flatNormal.length,m.position.length);assert.equal(m.bladeRoot.length,m.position.length);assert.equal(m.uv.length,m.position.length/3*2);assert.ok(m.flatNormal.every(Number.isFinite));}
 assert.equal(modules.refined.index.length/3,32);assert.equal(modules.light.index.length/3,8);
 assert.equal(continuousGrassEnabled('manglares','?visualLab=global-lighting&grassCoverage=continuous'),true);
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({json:async()=>structuredClone(raw)});
 let q;
 try{
  const world={biomeGround:{},state:{biome:'manglares',elapsed:3,plants:[]},scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),quality:'media',toon:{uniforms:{},shadowUniforms:{}},terrainMeshes:[{material:{userData:{biomeGround:{uGroundDetailMap:{value:new THREE.Texture()},uGroundSeed:{value:new THREE.Vector2()},uGroundParams:{value:new THREE.Vector4(.115,0,0,0)}}}}}],chunks:new Map(),objects:new Map(),nav:{obstacles:[],field:{seed:712}}};
  q=await createContinuousGrass(world);assert.equal(q.spacing,.5);assert.equal(q.uniforms.uCoverageSpacing.value,1);assert.ok(q.meshes[0].mesh.material.vertexShader.includes('coverageData.w'));
  q.configureQuality('baja');assert.equal(q.spacing,.6);assert.equal(q.nearDistance,0);assert.equal(q.uniforms.uCoverageSpacing.value,1,'leaf size stays authored when density drops');q.configureQuality('media');assert.equal(q.spacing,.5);
  q.near=2;q.far=3;assert.equal(q.audit().leaves,28);assert.equal(q.audit().triangles,88);q.dispose();assert.equal(world.scene.children.length,0);
 }finally{q?.dispose();globalThis.fetch=originalFetch;}
});
