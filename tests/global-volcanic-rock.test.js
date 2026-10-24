import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {volcanicRockEnabled,patchVolcanicRock} from '../src/rendering/global-volcanic-rock.js';
test('layered volcanic recipe requires explicit laboratory opt-in',()=>{
 for(const q of ['', '?volcanicRock=layered','?visualLab=global-lighting','?visualLab=global-lighting&volcanicRock=1'])assert.equal(volcanicRockEnabled(q),false);
 assert.equal(volcanicRockEnabled('?visualLab=global-lighting&volcanicRock=layered'),true);
 assert.equal(patchVolcanicRock('unchanged',false),'unchanged');
 assert.throws(()=>patchVolcanicRock('missing anchors',true),/anchors missing/);
});
test('volcanic shader integration separates cache and preserves other biomes',()=>{
 const keys=[];
 for(const biome of ['volcanoes','savanna'])for(const enabled of [false,true]){
  const toon=new AfricanToon();toon.globalVisualLighting=true;
  const material=new THREE.MeshStandardMaterial();Object.assign(material.userData,{toonGround:true,groundBiome:biome,volcanicAsh:'mask',volcanicRock:enabled,biomeGround:{uGroundLayered:{value:0}}});
  toon.material(material);const shader={...THREE.ShaderLib.standard,uniforms:{}};material.onBeforeCompile(shader,{});
  assert.equal(shader.fragmentShader.includes('previousError=0.'),biome==='volcanoes'&&enabled);
  assert.equal(shader.fragmentShader.includes('qaAsh*=mix(1.,.25'),biome==='volcanoes'&&enabled);
  if(biome==='volcanoes')keys.push(material.customProgramCacheKey());
  material.dispose();toon.shadowUniforms.fallback.dispose();
 }
 assert.notEqual(keys[0],keys[1]);
});
