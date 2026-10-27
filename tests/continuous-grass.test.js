import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createContinuousGrass,continuousGrassEnabled} from '../src/rendering/continuous-grass.js';
import {emit} from '../src/simulation/game.js';

test('continuous coverage requires explicit Savanna lab option',()=>{
 assert.equal(continuousGrassEnabled('sabana','?visualLab=global-lighting&grassCoverage=continuous'),true);
 for(const [biome,query] of [['sabana',''],['sabana','?grassCoverage=continuous'],['volcanes','?visualLab=global-lighting&grassCoverage=continuous']])assert.equal(continuousGrassEnabled(biome,query),false);
});
test('native coverage follows time, event invalidation, chunk ownership and idempotent disposal',async()=>{
 const modules=JSON.parse(await readFile(new URL('../public/assets/visual-lab/continuous-grass/modules.json',import.meta.url),'utf8'));
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({json:async()=>structuredClone(modules)});
 const scene=new THREE.Scene(),old=scene.onBeforeRender,texture=new THREE.Texture();let textureDisposals=0;texture.addEventListener('dispose',()=>textureDisposals++);
 const ground={uGroundDetailMap:{value:texture},uGroundSeed:{value:new THREE.Vector2()},uGroundParams:{value:new THREE.Vector4(.2,0,0,0)}};
 const state={biome:'sabana',elapsed:12,plants:[{id:1,x:0,z:0}],structures:[],events:[],sequence:0};
 const world={biomeGround:{},state,scene,quality:'media',toon:{uniforms:{},shadowUniforms:{}},terrainMeshes:[{material:{userData:{biomeGround:ground}}}],chunks:new Map(),objects:new Map(),nav:{obstacles:[],field:{seed:712}},camera:new THREE.PerspectiveCamera(42,1,.1,500)};
 world.camera.position.set(0,20,20);world.camera.lookAt(0,0,0);world.camera.updateMatrixWorld();
 let q;
 try{
  q=await createContinuousGrass(world);scene.onBeforeRender();assert.equal(q.uniforms.uCoverageTime.value,12);const selections=q.stats.selectionCount;state.elapsed=14;scene.onBeforeRender();assert.equal(q.stats.selectionCount,selections);assert.equal(q.uniforms.uCoverageTime.value,14);
  world.camera.aspect=2;world.camera.updateProjectionMatrix();scene.onBeforeRender();assert.equal(q.stats.selectionCount,selections+1,'projection changes reselect without camera translation');
  q.configureQuality('baja');scene.onBeforeRender();assert.equal(q.nearDistance,0);assert.equal(q.spacing,.5);assert.equal(q.uniforms.uCoverageFar.value,40);
  const lowSelections=q.stats.selectionCount;q.configureQuality('muy_baja');scene.onBeforeRender();assert.equal(q.group.visible,false);assert.equal(q.stats.selectionCount,lowSelections);
  q.configureQuality('media');scene.onBeforeRender();assert.equal(q.group.visible,true);assert.equal(q.spacing,.4);assert.equal(q.nearDistance,24);assert.equal(q.stats.selectionCount,lowSelections+1);
  emit(state,'WorkerMoved');assert.equal(q.occupancyDirty,undefined);emit(state,'CropPlaced',{cropId:1});assert.equal(q.occupancyDirty,true);q.flush();assert.equal(q.occupancyDirty,false);assert.equal(q.dirty,true);
  q.chunks.set('0,0',{});q.tiles.set('0,0',{chunk:'0,0'});q.release('0,0');assert.equal(q.chunks.size,0);assert.equal(q.tiles.size,0);
  let disposalCount=0;for(const e of q.meshes)for(const resource of [e.mesh.geometry,e.mesh.material])resource.addEventListener('dispose',()=>disposalCount++);
  q.dispose();q.dispose();assert.equal(disposalCount,4);assert.equal(textureDisposals,0);assert.equal(scene.onBeforeRender,old);assert.equal(scene.children.length,0);q.occupancyDirty=false;emit(state,'CropPlaced',{cropId:1});assert.equal(q.occupancyDirty,false);
 }finally{q?.dispose();globalThis.fetch=originalFetch;}
});
