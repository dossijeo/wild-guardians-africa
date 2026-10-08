import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {AlphaDiscardExperiment} from './browser/alpha-discard.js';
import {nativeDepthRecipe,recordNativeDepthHook} from '../src/rendering/depth-recipes.js';
import {standardDepthMaterial} from '../src/rendering/standard-depth.js';

test('QA discard uniform preserves audited native hooks, sampling and derived recipe',()=>{
 const renderer={renderBufferDirect(...args){assert.equal(this,renderer);return args;}},source=new THREE.MeshStandardMaterial({map:new THREE.Texture(),alphaTest:.35}),initial=source.onBeforeCompile;
 source.onBeforeCompile=function(shader){initial.call(this,shader);shader.fragmentShader+='\n// native tail';};recordNativeDepthHook(source,initial,'obstruction');
 const previous=source.onBeforeCompile,key=source.customProgramCacheKey,originalDraw=renderer.renderBufferDirect,qa=new AlphaDiscardExperiment({renderer});
 assert.equal(renderer.renderBufferDirect(1,2,3,source,5,6)[3],source);assert.deepEqual([...nativeDepthRecipe(source).features],['obstruction']);
 const depth=standardDepthMaterial(source);qa.wrap(depth);
 for(const material of [source,depth]){
  const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <clipping_planes_fragment>\n#include <alphatest_fragment>'};
  material.onBeforeCompile(shader,renderer);assert.equal(shader.uniforms.uQaAlphaDiscard,qa.uniform);assert.equal((shader.fragmentShader.match(/if\(uQaAlphaDiscard>\.5\)discard;/g)??[]).length,2);assert.ok(shader.fragmentShader.includes('#include <map_fragment>'));
 }
 const versions=[source.version,depth.version],hook=source.onBeforeCompile;qa.setEnabled(false);assert.equal(qa.uniform.value,0);assert.deepEqual([source.version,depth.version],versions);assert.equal(source.onBeforeCompile,hook);
 qa.setEnabled(true);assert.equal(qa.report().enabled,true);assert.equal(qa.report().compiles.length,2);qa.dispose();assert.equal(renderer.renderBufferDirect,originalDraw);assert.equal(source.onBeforeCompile,previous);assert.equal(source.customProgramCacheKey,key);assert.deepEqual([...nativeDepthRecipe(source).features],['obstruction']);source.dispose();source.map.dispose();
});
test('unknown, opaque and alpha-to-coverage materials are untouched and missing chunk rejects',()=>{
 const renderer={renderBufferDirect(){}},qa=new AlphaDiscardExperiment({renderer});
 for(const m of [new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial({alphaTest:.35,alphaToCoverage:true}),new THREE.ShaderMaterial()]){qa.wrap(m);assert.equal(qa.materials.size,0);m.dispose();}
 const unknown=new THREE.MeshStandardMaterial({alphaTest:.35});unknown.onBeforeCompile=()=>{};qa.wrap(unknown);assert.equal(qa.materials.size,0);assert.equal(nativeDepthRecipe(unknown),null);
 const known=new THREE.MeshBasicMaterial({alphaTest:.35});qa.wrap(known);assert.throws(()=>known.onBeforeCompile({uniforms:{},fragmentShader:'void main(){}'}),/stock alpha/);
 const external=()=>{};known.onBeforeCompile=external;qa.dispose();assert.equal(known.onBeforeCompile,external);unknown.dispose();known.dispose();
});
