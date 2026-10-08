import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {nativeDepthRecipe,recordNativeDepthHook} from '../src/rendering/depth-recipes.js';
import {standardDepthMaterial} from '../src/rendering/standard-depth.js';
import {InvariantDepthShaders} from './browser/invariant-depth-shaders.js';

function fixture(){let calls=0;const renderer={renderBufferDirect(...args){assert.equal(this,renderer);calls++;return args;}};return {renderer,world:{renderer},calls:()=>calls};}
test('invariance preserves audited recipe features and applies to native and derived depth shaders',()=>{
 const f=fixture(),source=new THREE.MeshStandardMaterial({map:new THREE.Texture(),alphaTest:.35}),initial=source.onBeforeCompile;
 source.onBeforeCompile=function(shader){initial.call(this,shader);shader.vertexShader+='\n// native coverage';};recordNativeDepthHook(source,initial,'obstruction');
 const compile=source.onBeforeCompile,key=source.customProgramCacheKey,probe=new InvariantDepthShaders(f.world,'position-uv');
 assert.equal(f.renderer.renderBufferDirect(1,2,3,source,5,6)[3],source);assert.equal(f.calls(),1);
 assert.deepEqual([...nativeDepthRecipe(source).features],['obstruction']);
 const depth=standardDepthMaterial(source);assert.ok(depth);probe.wrap(depth);
 for(const material of [source,depth]){
  const shader={vertexShader:'#include <common>\n#include <uv_pars_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <clipping_planes_fragment>',uniforms:{}};
  material.onBeforeCompile(shader,f.renderer);assert.match(shader.vertexShader,/invariant gl_Position/);assert.match(shader.vertexShader,/#ifdef USE_MAP\ninvariant vMapUv;\n#endif/);
 }
 assert.equal(probe.report().compiles.length,2);assert.match(source.customProgramCacheKey(),/qa-invariant=position-uv/);
 probe.dispose();assert.equal(source.onBeforeCompile,compile);assert.equal(source.customProgramCacheKey,key);assert.deepEqual([...nativeDepthRecipe(source).features],['obstruction']);source.dispose();source.map.dispose();
});
test('position-only mode does not touch UV declarations and wraps a material once',()=>{
 const f=fixture(),material=new THREE.MeshBasicMaterial(),probe=new InvariantDepthShaders(f.world,'position');probe.wrap(material);const version=material.version;probe.wrap(material);assert.equal(material.version,version);
 const shader={vertexShader:'void main(){}'};material.onBeforeCompile(shader);assert.equal(shader.vertexShader,'invariant gl_Position;\nvoid main(){}');assert.equal(probe.report().compiles[0].mapUv,false);probe.dispose();material.dispose();
});
test('unknown silhouettes stay unaudited and external replacement hooks are not overwritten on release',()=>{
 const f=fixture(),unknown=new THREE.MeshStandardMaterial(),raw=new THREE.ShaderMaterial(),known=new THREE.MeshBasicMaterial();unknown.onBeforeCompile=()=>{};
 const probe=new InvariantDepthShaders(f.world,'position');probe.wrap(unknown);probe.wrap(raw);assert.equal(probe.report().wrappedMaterials,0);assert.equal(nativeDepthRecipe(unknown),null);
 probe.wrap(known);const other=()=>{};known.onBeforeCompile=other;probe.dispose();assert.equal(known.onBeforeCompile,other);assert.equal(nativeDepthRecipe(known),null);unknown.dispose();raw.dispose();known.dispose();
});
test('UV experiment refuses undeclared varying and preserves original renderer errors',()=>{
 const f=fixture(),material=new THREE.MeshBasicMaterial(),original=f.renderer.renderBufferDirect,probe=new InvariantDepthShaders(f.world,'position-uv');probe.wrap(material);
 assert.throws(()=>material.onBeforeCompile({vertexShader:'void main(){}'}),/stock UV declaration/);probe.dispose();assert.equal(f.renderer.renderBufferDirect,original);material.dispose();
 const failing=()=>{throw Error('native draw failure');};f.renderer.renderBufferDirect=failing;const second=new InvariantDepthShaders(f.world,'position');assert.throws(()=>f.renderer.renderBufferDirect(1,2,3,new THREE.MeshBasicMaterial()),/native draw failure/);second.dispose();assert.equal(f.renderer.renderBufferDirect,failing);
 assert.throws(()=>new InvariantDepthShaders(f.world,'unknown'),/mode/);
});
