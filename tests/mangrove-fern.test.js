import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {mangroveFernEnabled} from '../src/rendering/mangrove-fern-option.js';
import {createContinuousGrass} from '../src/rendering/continuous-grass.js';

test('fern option requires the visual lab and exact explicit selection',()=>{
 for(const q of ['', '?mangroveFerns=holly','?visualLab=global-lighting&mangroveFerns=no'])assert.equal(mangroveFernEnabled(q),false);
 assert.equal(mangroveFernEnabled('?visualLab=global-lighting&mangroveFerns=holly'),true);
});
test('native fern owns its two maps and depth materials across quality changes and disposes once',async()=>{
 const fetch=globalThis.fetch,location=globalThis.location,load=THREE.TextureLoader.prototype.loadAsync;
 const data=JSON.parse(await readFile(new URL('../public/assets/visual-lab/mangrove-leaf-fill-20261021/modules.json',import.meta.url),'utf8'));
 const owned=[];globalThis.fetch=async()=>({json:async()=>structuredClone(data)});globalThis.location={search:'?visualLab=global-lighting&mangroveFerns=holly'};
 THREE.TextureLoader.prototype.loadAsync=async()=>{const t=new THREE.Texture();owned.push(t);return t;};
 const borrowed=new THREE.Texture();let borrowedDisposed=0;borrowed.addEventListener('dispose',()=>borrowedDisposed++);
 const ground={uGroundDetailMap:{value:borrowed},uGroundSeed:{value:new THREE.Vector2()},uGroundParams:{value:new THREE.Vector4(.2,0,0,0)}};
 const world={biomeGround:{},state:{biome:'manglares',elapsed:2,plants:[],structures:[],events:[],sequence:0},scene:new THREE.Scene(),quality:'media',toon:{uniforms:{},shadowUniforms:{}},renderer:{shadowMap:{enabled:true}},sun:new THREE.DirectionalLight(),releaseNativeShadow:{cache:{invalidate(){}}},terrainMeshes:[{material:{userData:{biomeGround:ground}}}],chunks:new Map(),objects:new Map(),nav:{obstacles:[],field:{seed:712}},camera:new THREE.PerspectiveCamera()};
 let q;
 try{
  q=await createContinuousGrass(world);assert.equal(owned.length,2);assert.equal(q.spacing,.65);assert.equal(world.sun.shadow.mapSize.x,2048);assert.equal(q.audit().castShadow,true);
  let disposed=0;for(const t of owned)t.addEventListener('dispose',()=>disposed++);
  for(const e of q.meshes){assert.equal(e.mesh.geometry.index.count,96);assert.ok(e.mesh.castShadow);e.mesh.customDepthMaterial.addEventListener('dispose',()=>disposed++);}
  q.configureQuality('baja');assert.equal(q.spacing,.75);q.configureQuality('muy_baja');assert.equal(q.group.visible,false);q.configureQuality('media');assert.equal(q.spacing,.65);assert.equal(q.group.visible,true);
  q.dispose();q.dispose();assert.equal(disposed,4);assert.equal(borrowedDisposed,0);assert.equal(world.scene.children.length,0);
 }finally{q?.dispose();globalThis.fetch=fetch;globalThis.location=location;THREE.TextureLoader.prototype.loadAsync=load;borrowed.dispose();}
});
