import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {canyonSandEnabled,canyonSandFull,canyonSandSoft} from '../src/rendering/global-canyon-sand.js';
test('full canyon sand requires explicit laboratory opt-in',()=>{
 for(const q of ['', '?canyonSand=full','?visualLab=global-lighting'])assert.equal(canyonSandEnabled(q),false);
 assert.equal(canyonSandEnabled('?visualLab=global-lighting&canyonSand=1'),true);
 assert.equal(canyonSandFull('?visualLab=global-lighting&canyonSand=1'),false);
 assert.equal(canyonSandFull('?visualLab=global-lighting&canyonSand=full'),true);
});
test('full and reduced canyon sand have distinct resident and horizon programs',()=>{
 for(const horizon of [false,true]){
  const keys=[];
  for(const full of [false,true]){
   const toon=new AfricanToon();toon.globalVisualLighting=true;
   const m=horizon?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();
   Object.assign(m.userData,{toonGround:true,groundBiome:'canyons',canyonSand:true,canyonSandFull:full,biomeGround:{uGroundLayered:{value:0}}});
   toon.material(m);const shader={...(horizon?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};m.onBeforeCompile(shader,{});
   assert.equal(shader.fragmentShader.includes('textureGrad(uCanyonSandBase,suv,sdx,sdy)'),full);
   assert.ok(shader.fragmentShader.includes('textureGrad(uCanyonSandNormal,suv,sdx,sdy)'));
   keys.push(m.customProgramCacheKey());m.dispose();toon.shadowUniforms.fallback.dispose();
  }
  assert.notEqual(keys[0],keys[1]);
 }
});

test('soft sand blend is explicitly gated and separates shader cache variants',()=>{
 for(const query of ['', '?canyonSandBlend=soft','?visualLab=global-lighting&canyonSandBlend=soft'])assert.equal(canyonSandSoft(query),false);
 assert.equal(canyonSandSoft('?visualLab=global-lighting&canyonSand=full&canyonSandBlend=soft'),true);
 const keys=[];
 for(const soft of [false,true]){
  const toon=new AfricanToon();toon.globalVisualLighting=true;const m=new THREE.MeshStandardMaterial();
  Object.assign(m.userData,{toonGround:true,groundBiome:'canyons',canyonSand:true,canyonSandFull:true,canyonSandSoft:soft,biomeGround:{uGroundLayered:{value:0}}});
  toon.material(m);const shader={...THREE.ShaderLib.standard,uniforms:{}};m.onBeforeCompile(shader,{});
  assert.equal(shader.fragmentShader.includes('mix(.35,1.,1.-smoothstep(.16,.65,footprint))'),soft);
  keys.push(m.customProgramCacheKey());m.dispose();toon.shadowUniforms.fallback.dispose();
 }
 assert.notEqual(keys[0],keys[1]);
});
