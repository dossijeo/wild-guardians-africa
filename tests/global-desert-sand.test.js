import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {desertSandEnabled,patchDesertSand} from '../src/rendering/global-desert-sand.js';

test('sand requires both the global laboratory and explicit sand opt-in',()=>{
 for(const [query,expected]of [['',false],['?sandRelief=1',false],['?visualLab=global-lighting',false],['?visualLab=global-lighting&sandRelief=0',false],['?visualLab=global-lighting&sandRelief=1',true]])assert.equal(desertSandEnabled(query),expected);
});
test('sand compiles resident and horizon recipes, with separate program identity',()=>{
 for(const horizon of [false,true]){
  const keys=[];
  for(const enabled of [false,true]){
   const toon=new AfricanToon();toon.globalVisualLighting=true;
   const material=horizon?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();
   Object.assign(material.userData,{toonGround:true,groundBiome:'desert',desertSand:enabled,biomeGround:{uGroundLayered:{value:0}}});
   toon.material(material);const shader={...(horizon?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};material.onBeforeCompile(shader,{});
   assert.equal(shader.fragmentShader.includes('vec3 sandGeometricNormal;'),enabled);
   assert.equal(shader.fragmentShader.includes('normalAmount=.65*up*(1.-wear*.85)'),enabled);
   keys.push(material.customProgramCacheKey());material.dispose();toon.shadowUniforms.fallback.dispose();
  }
  assert.notEqual(...keys);
 }
 assert.throws(()=>patchDesertSand('void main(){}'),/anchor missing/);
});
