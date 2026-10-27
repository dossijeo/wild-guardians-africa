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
test('native fern owns its near maps and far atlases and depth materials across quality changes and disposes once',async()=>{
 const fetch=globalThis.fetch,location=globalThis.location,load=THREE.TextureLoader.prototype.loadAsync;
 const data=JSON.parse(await readFile(new URL('../public/assets/visual-lab/mangrove-leaf-fill-20261021/modules.json',import.meta.url),'utf8'));
 const owned=[];globalThis.fetch=async()=>({json:async()=>structuredClone(data)});globalThis.location={search:'?visualLab=global-lighting&mangroveFerns=holly'};
 THREE.TextureLoader.prototype.loadAsync=async()=>{
  if(!world.chunks.has('0,0')){
   const positions=[];for(let z=-24;z<=24;z++)for(let x=-24;x<=24;x++)positions.push(x,0,z);
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   const material=new THREE.MeshBasicMaterial();material.userData.biomeGround={uGroundMask:{value:{image:{data:new Uint8Array(35*35*4),width:35,height:35}}}};
   const mesh=new THREE.Mesh(geometry,material);mesh.userData.ground=true;const group=new THREE.Group();group.add(mesh);world.chunks.set('0,0',group);
  }
  const t=new THREE.Texture();owned.push(t);return t;
 };
 const borrowed=new THREE.Texture();let borrowedDisposed=0;borrowed.addEventListener('dispose',()=>borrowedDisposed++);
 const ground={uGroundDetailMap:{value:borrowed},uGroundSeed:{value:new THREE.Vector2()},uGroundParams:{value:new THREE.Vector4(.2,0,0,0)}};
 const world={biomeGround:{},state:{biome:'manglares',elapsed:2,plants:[],structures:[],events:[],sequence:0},scene:new THREE.Scene(),quality:'media',toon:{uniforms:{},shadowUniforms:{}},renderer:{shadowMap:{enabled:true}},sun:new THREE.DirectionalLight(),releaseNativeShadow:{cache:{invalidate(){}}},terrainMeshes:[{material:{userData:{biomeGround:ground}}}],chunks:new Map(),objects:new Map(),nav:{obstacles:[],field:{seed:712}},camera:new THREE.PerspectiveCamera()};
 let q;
 try{
  q=await createContinuousGrass(world);assert.equal(owned.length,5);assert.ok(q.chunks.has('0,0'),'chunk arriving during texture loading is reconciled before activation');assert.equal(q.spacing,.65);assert.equal(world.sun.shadow.mapSize.x,2048);assert.equal(q.audit().castShadow,true);
  let disposed=0;for(const t of owned)t.addEventListener('dispose',()=>disposed++);
  assert.equal(q.screenLod,true);assert.equal(q.meshes[0].mesh.geometry.index.count,96);assert.equal(q.meshes[1].mesh.geometry.index.count,24);assert.equal(q.meshes[0].mesh.castShadow,true);assert.equal(q.meshes[1].mesh.castShadow,false);
  const shadow=world.scene.getObjectByName('fern-prebaked-shadow');assert.ok(shadow);q.meshes[1].mesh.geometry.instanceCount=7;q.meshes[1].mesh.visible=true;q.syncLod();assert.equal(shadow.geometry.instanceCount,7);assert.equal(shadow.visible,true);
  const farMaterial=q.meshes[1].mesh.material;assert.equal(farMaterial.fog,true);assert.equal(shadow.material.fog,true);assert.ok(farMaterial.uniforms.fogColor.value.isColor);assert.notEqual(farMaterial.uniforms.fogColor,THREE.UniformsLib.fog.fogColor);assert.equal(shadow.material.uniforms.fogColor,farMaterial.uniforms.fogColor);
  for(const e of q.meshes)e.mesh.customDepthMaterial.addEventListener('dispose',()=>disposed++);
  q.configureQuality('baja');assert.equal(q.spacing,.75);q.configureQuality('muy_baja');assert.equal(q.group.visible,false);q.configureQuality('media');assert.equal(q.spacing,.65);assert.equal(q.group.visible,true);
  q.dispose();q.dispose();assert.equal(disposed,7);assert.equal(borrowedDisposed,0);assert.equal(world.scene.children.length,0);
 }finally{q?.dispose();globalThis.fetch=fetch;globalThis.location=location;THREE.TextureLoader.prototype.loadAsync=load;borrowed.dispose();for(const group of world.chunks.values())for(const mesh of group.children){mesh.geometry.dispose();mesh.material.dispose();}}
});


test('cancelled far atlas loading releases every fulfilled texture before scene mutation',async()=>{
 const {applyFernLod}=await import('../src/rendering/mangrove-fern-lod.js');
 const load=THREE.TextureLoader.prototype.loadAsync;let disposed=0;
 THREE.TextureLoader.prototype.loadAsync=async()=>{const t=new THREE.Texture();t.addEventListener('dispose',()=>disposed++);return t;};
 const q={disposed:true};
 try{await assert.rejects(applyFernLod({},q),/cancelled/);assert.equal(disposed,3);assert.equal(q.syncLod,undefined);}
 finally{THREE.TextureLoader.prototype.loadAsync=load;}
});
