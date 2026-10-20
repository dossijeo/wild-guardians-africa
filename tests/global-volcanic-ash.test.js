import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {volcanicAshMode,ashMask} from '../src/rendering/global-volcanic-ash.js';

test('ash requires global laboratory plus explicit supported option',()=>{
 for(const q of ['','?volcanicAsh=mask','?visualLab=global-lighting','?visualLab=global-lighting&volcanicAsh=1'])assert.equal(volcanicAshMode(q),null);
 for(const mode of ['procedural','mask'])assert.equal(volcanicAshMode('?visualLab=global-lighting&volcanicAsh='+mode),mode);
});
test('ash compiles separately and remains restricted to volcanic ground',()=>{
 const keys=[];
 for(const biome of ['volcanoes','savanna'])for(const mode of [null,'procedural','mask']){
  const toon=new AfricanToon();toon.globalVisualLighting=true;
  const material=new THREE.MeshStandardMaterial();Object.assign(material.userData,{toonGround:true,groundBiome:biome,volcanicAsh:mode,biomeGround:{uGroundLayered:{value:0}}});
  toon.material(material);const shader={...THREE.ShaderLib.standard,uniforms:{}};material.onBeforeCompile(shader,{});
  assert.equal(shader.fragmentShader.includes('float qaAsh=0.;'),biome==='volcanoes'&&mode!==null);
  if(biome==='volcanoes')keys.push(material.customProgramCacheKey());
  material.dispose();toon.shadowUniforms.fallback.dispose();
 }
 assert.equal(new Set(keys).size,3);
});
test('ash masks preserve input and adjacent world edges',()=>{
 const src=new Uint8Array(4900).fill(123),a=ashMask(src,{minX:-48,minZ:0}),b=ashMask(src,{minX:0,minZ:0});
 for(let z=0;z<35;z++)for(let x=0;x<3;x++)assert.equal(a[(z*35+x+32)*4],b[(z*35+x)*4]);
 for(let i=0;i<src.length;i++){assert.equal(src[i],123);if(i%4)assert.equal(a[i],123);}
});
