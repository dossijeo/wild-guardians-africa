import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {TerrainField,canyonFrame,canyonGroundColor,desertGroundColor} from '../src/world/terrain.js';
import {makeCanyonHorizon,makeDesertHorizon,HORIZON_SOURCE_SHA256} from '../src/rendering/horizon-source.js';
import {NativeHorizon,nativeNearRegion} from '../src/rendering/horizon.js';
import {AfricanToon,paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {WorldScene} from '../src/rendering/scene.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const cut=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const reference=Function('TerrainField','canyonFrame','canyonGroundColor','desertGroundColor',
  'const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;'+cut('const smooth=','const GROUPS=')+
  cut('class Geometry{','\nfunction branch(')+cut('function desertSmoothNormals(','\nclass TerrainField{')+
  cut('function makeCanyonHorizon(','\nclass ChunkManager{')+'return {makeCanyonHorizon,makeDesertHorizon};')(TerrainField,canyonFrame,canyonGroundColor,desertGroundColor);
const pack=id=>JSON.parse(readFileSync('public/content/biome-'+id+'.json'));

test('native canyon and desert horizons preserve every original position, normal and color byte',()=>{
  assert.equal(createHash('sha256').update(source).digest('hex'),HORIZON_SOURCE_SHA256);
  for(const id of ['canyons','desert'])for(const seed of ['712','918271'])for(const [cx,cz,quality] of [[0,0,'media'],[-1,1,'alta']]){
    const config={seed,biome:id,relief:1,river:true},profile=pack(id).profile,region=nativeNearRegion({x:cx*48,z:cz*48},quality),name=id==='desert'?'makeDesertHorizon':'makeCanyonHorizon';
    const actual=({makeCanyonHorizon,makeDesertHorizon})[name](config,profile,cx,cz,region.bounds),expected=reference[name](config,profile,cx,cz,region.bounds);
    assert.deepEqual(actual,expected);assert.ok(actual.terrain.length>0);assert.equal(actual.water.length>0,id==='canyons');
    // Every integer point of the inner rectangle has the same height as fine chunks.
    const field=new TerrainField(config),edge=new Map();
    for(let i=0;i<actual.terrain.length;i+=9){const x=actual.terrain[i]+cx*48,z=actual.terrain[i+2]+cz*48;if(Number.isInteger(x)&&Number.isInteger(z))edge.set(`${x},${z}`,actual.terrain[i+1]);}
    const [x0,z0,x1,z1]=region.bounds;
    for(let x=x0;x<=x1;x++)for(const z of [z0,z1])assert.equal(edge.get(`${x},${z}`),Math.fround(field.lattice(x,z)));
    for(let z=z0;z<=z1;z++)for(const x of [x0,x1])assert.equal(edge.get(`${x},${z}`),Math.fround(field.lattice(x,z)));
  }
});

test('streaming uses the eye and original resident radii, including negative boundaries',()=>{
  for(const quality of ['muy_baja','baja','media','alta']){
    const r=quality==='alta'?3:2,region=nativeNearRegion({x:-24.01,z:24},quality);assert.deepEqual(region,{cx:-1,cz:1,range:r,bounds:[(-1-r)*48-24,(1-r)*48-24,(-1+r)*48+24,(1+r)*48+24]});
    const world=Object.create(WorldScene.prototype),config={biome:'savanna'};Object.assign(world,{nav:{config},pack:{profile:{}},camera:{position:{x:-24.01,z:24}},controls:{target:{x:999,z:999}},quality,prototypes:[],scene:new THREE.Scene(),chunks:new Map(),terrainMeshes:[],horizon:{update(c,p,near){assert.deepEqual(near,region);}},terrain:()=>new THREE.Group()});
    world.syncChunks();assert.equal(world.chunks.size,(2*r+1)**2);assert.ok(world.chunks.has('-1,1'));assert.equal(world.chunks.has('20,20'),false);
  }
});

test('horizon resources survive static frames and are released once on travel, quality change and close',()=>{
  const scene=new THREE.Scene(),horizon=new NativeHorizon(scene,(bounds,outside)=>paintedWaterMaterial('#49aeb6',false,712,bounds,null,outside)),config={seed:'712',biome:'canyons',relief:1,river:true},profile=pack('canyons').profile,region=nativeNearRegion({x:0,z:0},'media');
  horizon.update(config,profile,region,'media');const first=horizon.group;assert.equal(first.position.x,0);assert.equal(first.children.length,2);assert.ok(first.children.every(o=>!o.castShadow&&!o.receiveShadow));
  let geos=0,mats=0;first.children.forEach(o=>{o.geometry.addEventListener('dispose',()=>geos++);o.material.addEventListener('dispose',()=>mats++);});
  horizon.update(config,profile,region,'media');assert.equal(horizon.group,first);assert.equal(geos,0);
  horizon.update(config,profile,nativeNearRegion({x:-48,z:48},'media'),'media');assert.equal(geos,2);assert.equal(mats,2);assert.equal(first.parent,null);assert.deepEqual(horizon.group.position.toArray(),[-48,0,48]);
  horizon.update(config,profile,region,'muy_baja');assert.ok(horizon.group.children[0].material.isMeshBasicMaterial);
  horizon.dispose();horizon.dispose();assert.equal(scene.children.length,0);
  horizon.update({...config,biome:'savanna'},profile,region,'media');assert.equal(horizon.group,null);assert.equal(scene.children.length,0);
});

test('native half-open horizon clipping excludes resident canyon terrain and river while keeping desert apron',()=>{
  const scene=new THREE.Scene(),horizon=new NativeHorizon(scene,(bounds,outside)=>paintedWaterMaterial('#49aeb6',false,712,bounds,null,outside)),config={seed:'712',biome:'canyons',relief:1,river:true},region=nativeNearRegion({x:0,z:0},'media');horizon.update(config,pack('canyons').profile,region,'media');
  const ground=horizon.group.children[0].material,water=horizon.group.children[1].material;new AfricanToon().material(ground);
  const compile=m=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader,{});return shader;};
  const g=compile(ground),w=compile(water);assert.deepEqual(g.uniforms.uHorizonBounds.value.toArray(),region.bounds);assert.equal(w.uniforms.uFluidClip.value,2);
  assert.ok(g.fragmentShader.includes('vToonWorld.x<uHorizonBounds.z'));assert.ok(w.fragmentShader.includes('uFluidClip>1.5&&inside'));
  const resident=new THREE.MeshStandardMaterial({vertexColors:true});Object.assign(resident.userData,{toonGround:true,nativeGroundColor:true});new AfricanToon().material(resident);assert.notEqual(resident.customProgramCacheKey(),ground.customProgramCacheKey());resident.dispose();
  horizon.update({...config,biome:'desert'},pack('desert').profile,region,'media');assert.equal(horizon.group.children.length,1);assert.equal(horizon.group.children[0].material.userData.horizonBounds,undefined);horizon.dispose();
});
