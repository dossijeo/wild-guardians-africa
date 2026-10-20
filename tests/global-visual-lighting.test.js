import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';

test('experimental constant palettes cannot reuse a shader program across biomes',()=>{
 const toon=new AfricanToon();toon.globalVisualLighting=true;
 const keys=['savanna','grand_river','mangrove','canyons','volcanoes','desert'].map(groundBiome=>{
  const material=new THREE.MeshStandardMaterial();Object.assign(material.userData,{toonGround:true,groundBiome});toon.material(material);
  const key=material.customProgramCacheKey();material.dispose();return key;
 });
 assert.equal(new Set(keys).size,6);
});

test('dry roughness is opt-in and limited to mapped Savanna, River and Canyon ground',()=>{
 for(const enabled of [false,true])for(const groundBiome of ['savanna','grand_river','mangrove','canyons','volcanoes','desert'])for(const mapped of (['savanna','grand_river','canyons'].includes(groundBiome)?[false,true]:[true])){
  const toon=new AfricanToon();toon.globalVisualLighting=enabled;
  const material=new THREE.MeshStandardMaterial();Object.assign(material.userData,{toonGround:true,groundBiome});
  if(mapped)material.userData.biomeGround={uGroundLayered:{value:0}};
  toon.material(material);const shader={...THREE.ShaderLib.standard,uniforms:{}};material.onBeforeCompile(shader,{});
  assert.equal(shader.fragmentShader.includes('baseRough=max(baseRough,.86)'),enabled&&mapped&&['savanna','grand_river','canyons'].includes(groundBiome),`${enabled}/${groundBiome}/${mapped}`);
  material.dispose();toon.shadowUniforms.fallback.dispose();
 }
});
