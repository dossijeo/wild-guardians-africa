import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {mangroveSubstrateEnabled} from '../src/rendering/global-mangrove-substrate.js';
test('mangrove substrate requires explicit full laboratory option',()=>{
 for(const q of ['', '?mangroveSubstrate=full','?visualLab=global-lighting','?visualLab=global-lighting&mangroveSubstrate=1'])assert.equal(mangroveSubstrateEnabled(q),false);
 assert.equal(mangroveSubstrateEnabled('?visualLab=global-lighting&mangroveSubstrate=full'),true);
});
test('full substrate has separate cache and both terrain material paths compile its recipe',()=>{
 for(const horizon of [false,true]){
  const keys=[];
  for(const full of [false,true]){
   const toon=new AfricanToon();toon.globalVisualLighting=true;
   const m=horizon?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();
   Object.assign(m.userData,{toonGround:true,groundBiome:'mangrove',mangroveSubstrate:full,biomeGround:{uGroundLayered:{value:0}}});
   toon.material(m);const shader={...(horizon?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};m.onBeforeCompile(shader,{});
   assert.equal(shader.fragmentShader.includes('qaSoilWeight>0.'),full);
   assert.equal(shader.fragmentShader.includes('clamp((arh.b-186./255.)/(69./255.)'),full);
   keys.push(m.customProgramCacheKey());m.dispose();toon.shadowUniforms.fallback.dispose();
  }
  assert.notEqual(keys[0],keys[1]);
 }
});
