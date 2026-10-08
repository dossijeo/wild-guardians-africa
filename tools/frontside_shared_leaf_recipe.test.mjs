import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {preserveSharedLeafBackRecipe} from './lib/frontside-shared-leaf-reverse.mjs';
test('back draw retains real toon/native-shadow hooks and changes their face convention',()=>{
 const original=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),growth={value:new THREE.Vector4(1,1,1,0)};
 original.onBeforeCompile=shader=>{shader.uniforms.uGrowthContract=growth;};new AfricanToon().material(original);
 const makeShader=()=>({vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}});
 const reference=makeShader();original.onBeforeCompile(reference,{});
 const back=original.clone();back.onBeforeCompile=original.onBeforeCompile;back.customProgramCacheKey=original.customProgramCacheKey;preserveSharedLeafBackRecipe(back);
 const shader=makeShader();back.onBeforeCompile(shader,{});
 assert.equal(shader.vertexShader,reference.vertexShader);assert.deepEqual(Object.keys(shader.uniforms),Object.keys(reference.uniforms));for(const name of Object.keys(reference.uniforms))assert.deepEqual(shader.uniforms[name],reference.uniforms[name]);
 assert.equal(shader.uniforms.uGrowthContract,growth);assert.ok(shader.fragmentShader.includes('toonN'));assert.ok(shader.fragmentShader.includes('uNativeShadowOn'));assert.ok(reference.fragmentShader.includes('#include <normal_fragment_begin>'));assert.ok(THREE.ShaderChunk.normal_fragment_begin.includes('gl_FrontFacing'));assert.equal(shader.fragmentShader.includes('gl_FrontFacing'),false);assert.equal(shader.fragmentShader.includes('#include <normal_fragment_begin>'),false);
 assert.equal(back.side,THREE.FrontSide);assert.ok(Object.hasOwn(back.defines,'DOUBLE_SIDED'));assert.equal(original.side,THREE.DoubleSide);
 // Source text/hook verification only: no GLSL compilation, map parity or
 // perceptual approval is established by this CPU test.
});
