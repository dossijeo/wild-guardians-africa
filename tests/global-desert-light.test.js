import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {patchDesertLight} from '../src/rendering/global-desert-light.js';

test('soft desert lighting reaches resident and horizon shaders only when opted in',()=>{
 for(const enabled of [false,true])for(const groundBiome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert'])for(const terrain of [false,true])for(const horizon of [false,true]){
  const toon=new AfricanToon();toon.globalVisualLighting=enabled;
  const material=horizon?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();
  Object.assign(material.userData,{toonGround:terrain,groundBiome});
  if(terrain)material.userData.biomeGround={uGroundLayered:{value:0}};
  toon.material(material);
  const shader={...(horizon?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};
  material.onBeforeCompile(shader,{});
  assert.equal(shader.fragmentShader.includes('smoothstep(.13,.37,x)'),enabled&&terrain&&groundBiome==='desert',`${enabled}/${groundBiome}/${terrain}/${horizon}`);
  material.dispose();toon.shadowUniforms.fallback.dispose();
 }
});

test('unexpected shader changes fail visibly rather than silently omitting the treatment',()=>{
 assert.throws(()=>patchDesertLight('void main(){}'),/anchor missing/);
});
