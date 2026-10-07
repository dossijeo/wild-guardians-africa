import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {environmentFunctions,fluidLightingFunctions} from '../src/rendering/fluid-lighting-source.js';
import {endpointEnvironment} from '../src/rendering/environment-endpoints.js';
import {singleExitEnvironment, singleExitEnvironmentRecipe as recipe,applySingleExitEnvironmentQA,singleExitEnvironmentQAReport} from './browser/single-exit-shader.js';

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

test('QA evidence distinguishes shared, uncompiled, matched and unknown sources across activation epochs',()=>{
 const matched=new THREE.MeshStandardMaterial(),unknown=new THREE.MeshBasicMaterial(),uncompiled=new THREE.MeshStandardMaterial();
 const custom=new THREE.ShaderMaterial({fragmentShader:endpointEnvironment(environmentFunctions)});
 const original=custom.fragmentShader;
 matched.onBeforeCompile=shader=>{shader.fragmentShader=original;};
 unknown.onBeforeCompile=shader=>{shader.fragmentShader='void main(){}';};
 const scene=new THREE.Group(),geometry=new THREE.BoxGeometry();
 scene.add(new THREE.Mesh(geometry,[matched,unknown,uncompiled,custom]),new THREE.Mesh(geometry,matched));
 assert.equal(applySingleExitEnvironmentQA(scene,true),5);
 matched.onBeforeCompile({fragmentShader:''},{});matched.onBeforeCompile({fragmentShader:''},{});
 unknown.onBeforeCompile({fragmentShader:''},{});custom.onBeforeCompile({fragmentShader:custom.fragmentShader},{});
 let report=singleExitEnvironmentQAReport(scene);
 assert.equal(report.uniqueMaterials,4);assert.equal(report.compileAttempts,4);assert.equal(report.matchedCompileAttempts,2);
 assert.equal(report.materials.find(m=>m.uuid===uncompiled.uuid).compileAttempts,0);
 assert.equal(report.materials.find(m=>m.uuid===unknown.uuid).matchedCompileAttempts,0);
 assert.equal(report.materials.find(m=>m.uuid===custom.uuid).shaderSourceMatched,true);
 applySingleExitEnvironmentQA(scene,true);assert.equal(singleExitEnvironmentQAReport(scene).compileAttempts,4);
 // Reports are copied observations, not references into the counters.
 applySingleExitEnvironmentQA(scene,false);assert.equal(singleExitEnvironmentQAReport(scene).uniqueMaterials,0);
 applySingleExitEnvironmentQA(scene,true);assert.equal(singleExitEnvironmentQAReport(scene).compileAttempts,0);
 assert.equal(report.compileAttempts,4);assert.equal(custom.fragmentShader,singleExitEnvironment(original));
 applySingleExitEnvironmentQA(scene,false);
 geometry.dispose();for(const material of [matched,unknown,uncompiled,custom])material.dispose();
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
