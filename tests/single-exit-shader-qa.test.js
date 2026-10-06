import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {environmentFunctions,fluidLightingFunctions} from '../src/rendering/fluid-lighting-source.js';
import {endpointEnvironment} from '../src/rendering/environment-endpoints.js';
import {singleExitEnvironment, singleExitEnvironmentRecipe as recipe,applySingleExitEnvironmentQA} from './browser/single-exit-shader.js';

test('QA return replacement preserves every byte outside the two authored HDR bodies',()=>{
 for(const source of [environmentFunctions,fluidLightingFunctions]){
  const baseline=endpointEnvironment(source),candidate=singleExitEnvironment(baseline);
  assert.notEqual(candidate,baseline);
  assert.equal(candidate.replace(recipe.replacement,recipe.received),baseline);
  assert.equal(singleExitEnvironment(candidate),candidate);
 }
 const unknown=endpointEnvironment(environmentFunctions).replace('rough*7.','rough*6.');
 assert.equal(singleExitEnvironment(unknown),unknown);
});

test('QA toggle restores both native hooks and ShaderMaterial text with stable distinct cache keys',()=>{
 const standard=new THREE.MeshStandardMaterial(),custom=new THREE.ShaderMaterial({fragmentShader:endpointEnvironment(environmentFunctions)});
 const original=custom.fragmentShader,uniforms={sentinel:{value:7}};
 standard.onBeforeCompile=shader=>{shader.uniforms=uniforms;shader.fragmentShader=original+'\n// alpha/depth sentinel';};
 const scene=new THREE.Group(),geometry=new THREE.BoxGeometry();
 scene.add(new THREE.Mesh(geometry,[standard,custom]));
 applySingleExitEnvironmentQA(scene,true);
 const enabledKey=standard.customProgramCacheKey(),shader={uniforms:{},fragmentShader:''};
 standard.onBeforeCompile(shader,{});assert.equal(shader.uniforms,uniforms);
 assert.equal(shader.fragmentShader.replace(recipe.replacement,recipe.received),original+'\n// alpha/depth sentinel');
 const hook=standard.onBeforeCompile;applySingleExitEnvironmentQA(scene,true);
 assert.equal(standard.onBeforeCompile,hook);assert.equal(standard.customProgramCacheKey(),enabledKey);
 applySingleExitEnvironmentQA(scene,false);standard.onBeforeCompile(shader,{});
 assert.equal(shader.fragmentShader,original+'\n// alpha/depth sentinel');assert.equal(custom.fragmentShader,original);
 assert.notEqual(standard.customProgramCacheKey(),enabledKey);
 assert.equal(standard.depthWrite,true);assert.equal(standard.alphaTest,0);
 geometry.dispose();standard.dispose();custom.dispose();
});
