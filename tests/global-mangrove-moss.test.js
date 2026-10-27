import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {mangroveMossEnabled} from '../src/rendering/global-mangrove-moss.js';

test('layered moss needs explicit lab option',()=>{
 assert.equal(mangroveMossEnabled('?visualLab=global-lighting&mangroveMoss=layered'),true);
 for(const q of ['', '?mangroveMoss=layered','?visualLab=global-lighting'])assert.equal(mangroveMossEnabled(q),false);
});
test('two-scale moss composes with independent soil lighting in both ground material paths',()=>{
 for(const basic of [false,true])for(const substrate of [false,true]){
  const keys=[];
  for(const moss of [false,true]){
   const toon=new AfricanToon();toon.globalVisualLighting=true;const m=basic?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();Object.assign(m.userData,{toonGround:true,groundBiome:'mangrove',mangroveSubstrate:substrate,mangroveMoss:moss,biomeGround:{uGroundLayered:{value:0}}});toon.material(m);
   const shader={...(basic?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};m.onBeforeCompile(shader,{});
   assert.equal(shader.fragmentShader.includes('float qaHeight=arh.b-arh2.b'),moss);assert.equal(shader.fragmentShader.includes('qaSoilWeight>0.'),substrate);
   if(moss){assert.ok(shader.fragmentShader.includes('normal2.xy=vec2(-normal2.y,normal2.x)'));assert.ok(shader.fragmentShader.indexOf('arh=mix(arh2,arh,qaMix)')<shader.fragmentShader.indexOf('float fade='));}
   keys.push(m.customProgramCacheKey());m.dispose();toon.shadowUniforms.fallback.dispose();
  }
  assert.notEqual(keys[0],keys[1]);
 }
});
