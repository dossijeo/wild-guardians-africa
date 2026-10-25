import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {approvedVisualSearch} from '../src/rendering/approved-visual-profile.js';
import {AfricanToon,paintedWaterMaterial,toonDestruction,toonDebris} from '../src/rendering/african-toon.js';
import {NativeSky} from '../src/rendering/sky.js';
import {BiomeGround} from '../src/rendering/biome-ground.js';
import {destructionFragment} from '../src/rendering/destruction-native.js';
import {destructionDebrisVertex,destructionDebrisFragment} from '../src/rendering/destruction-effects-native.js';
import {globalCurrentReviewQuery} from '../tools/experiments/global-current-review-recipe.mjs';

function compiled(material,toon){
 toon?.material(material);
 const lib=material.isMeshBasicMaterial?THREE.ShaderLib.basic:THREE.ShaderLib.standard;
 const shader={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};
 material.onBeforeCompile(shader,{});
 const result={vertex:shader.vertexShader,fragment:shader.fragmentShader,key:material.customProgramCacheKey()};material.dispose();return result;
}

test('preloading uses the common approved recipe without selecting a biome or fern variant',()=>{
 const search=approvedVisualSearch(),q=new URLSearchParams(search),toon=new AfricanToon({visualSearch:search}),sky=new NativeSky({visualSearch:search});
 assert.equal(toon.globalVisualLighting,true);assert.equal(sky.atmosphere,true);
 for(const flag of ['mangroveFerns','groundCache','waterCore','groundResidentMask'])assert.equal(q.has(flag),false);
 sky.dispose();
});

test('explicit instance recipes survive alternating legacy and approved worlds without global state',()=>{
 const approved=approvedVisualSearch('manglares'),legacy='visualLab=off';
 const a=new AfricanToon({visualSearch:approved}),b=new AfricanToon({visualSearch:legacy});
 const first=compiled(new THREE.MeshStandardMaterial(),a),old=compiled(new THREE.MeshStandardMaterial(),b),again=compiled(new THREE.MeshStandardMaterial(),a);
 assert.deepEqual(first,again);assert.notEqual(first.fragment,old.fragment);
 assert.ok(first.key.includes('sky-atmosphere-clouds'));assert.ok(!old.key.includes('sky-atmosphere-clouds'));
 const ground=new BiomeGround({visualSearch:approved});assert.equal(ground.visualSearch,approved);ground.dispose();
});

test('production and reviewed recipes generate identical object, water and destruction shaders in all biomes',()=>{
 for(const biome of ['sabana','gran-rio','manglares','desierto','volcanes','gran-canon']){
  const results=[approvedVisualSearch(biome),globalCurrentReviewQuery(biome)].map(visualSearch=>{
   const toon=new AfricanToon({visualSearch}),lighting={visualSearch,biome,regionalWaterBiome:biome,globalWaterSurface:!['volcanes','desierto'].includes(biome),uniforms:toon.uniforms,textures:[]};
   return {object:compiled(new THREE.MeshStandardMaterial(),toon),water:compiled(paintedWaterMaterial('#49aeb6',biome==='volcanes',712,null,lighting)),destruction:toonDestruction(destructionFragment,visualSearch),debris:toonDebris(destructionDebrisVertex,destructionDebrisFragment,visualSearch)};
  });
  assert.deepEqual(results[0],results[1],biome);
 }
});
