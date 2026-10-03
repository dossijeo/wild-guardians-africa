import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {standardDepthMaterial} from '../src/rendering/standard-depth.js';
import {nativeDepthRecipe} from '../src/rendering/depth-recipes.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {assetClipMaterial,nativeAssetClipFragment} from '../src/rendering/asset-clip.js';
import {obstructionMaterial} from '../src/rendering/obstruction.js';
import {withDepthCaptureMaterials} from '../src/rendering/depth-capture.js';

function compile(material){const shader={uniforms:{},vertexShader:THREE.ShaderLib.depth.vertexShader,fragmentShader:THREE.ShaderLib.depth.fragmentShader};material.onBeforeCompile(shader);return shader;}
test('stock depth retains opacity/alpha maps, transforms, displacement and built-in skin/morph while avoiding the color recipe',()=>{
 const source=new THREE.MeshStandardMaterial({map:new THREE.Texture(),alphaMap:new THREE.Texture(),opacity:.65,alphaTest:.35,alphaToCoverage:true,side:THREE.DoubleSide,vertexColors:true,displacementMap:new THREE.Texture(),displacementScale:.4,displacementBias:.2});new AfricanToon().material(source);
 const depth=standardDepthMaterial(source);assert.ok(depth?.isMeshDepthMaterial);assert.equal(depth.depthPacking,THREE.BasicDepthPacking);
 for(const key of ['map','alphaMap','opacity','alphaTest','alphaToCoverage','side','vertexColors','displacementMap','displacementScale','displacementBias'])assert.equal(depth[key],source[key]);
 const shader=compile(depth);assert.match(shader.vertexShader,/skinning_vertex/);assert.match(shader.vertexShader,/morphtarget_vertex/);assert.match(shader.vertexShader,/color_vertex/);assert.match(shader.fragmentShader,/alphatest_fragment/);assert.match(shader.fragmentShader,/color_fragment/);assert.doesNotMatch(shader.fragmentShader,/africanToon4|environment4|materialNoise/);
 source.opacity=.2;source.alphaTest=.6;assert.equal(standardDepthMaterial(source),depth);assert.equal(depth.opacity,.2);assert.equal(depth.alphaTest,.6);
 const version=depth.version;source.map.channel=1;source.needsUpdate=true;assert.equal(standardDepthMaterial(source),depth);assert.ok(depth.version>version,'Texture-channel recompilation follows source version even when the map object is shared');
});
test('recognized chunk clip, obstruction and toon chain preserves live uniforms and identical cut formulas',()=>{
 const source=new THREE.MeshStandardMaterial();assetClipMaterial(source);obstructionMaterial(source);new AfricanToon().material(source);
 assert.deepEqual([...nativeDepthRecipe(source).features].sort(),['clip','obstruction','toon']);const depth=standardDepthMaterial(source),shader=compile(depth);
 assert.equal(shader.uniforms.uNativeClip,source.userData.nativeChunkClip);assert.ok(shader.fragmentShader.includes(nativeAssetClipFragment));assert.match(shader.fragmentShader,/coverageThreshold\(gl_FragCoord.xy\)>=vNativeVisibility/);
 assert.match(shader.vertexShader,/nativeClipPosition=instanceMatrix\*nativeClipPosition/);assert.deepEqual(depth.defaultAttributeValues.nativeVisibility,[1]);assert.deepEqual(depth.defaultAttributeValues.nativeClipBounds,[-1e8,-1e8,1e8,1e8]);
 source.userData.nativeChunkClip.value=2;assert.equal(shader.uniforms.uNativeClip.value,2);
});
test('canyon horizon depth shares mutable render-origin bounds and the same half-open discard rectangle',()=>{
 const source=new THREE.MeshBasicMaterial({vertexColors:true});source.userData.toonGround=true;source.userData.horizonBounds=new THREE.Vector4(-72,-120,168,120);new AfricanToon().material(source);
 const shader=compile(standardDepthMaterial(source));assert.equal(shader.uniforms.uHorizonBounds.value,source.userData.horizonBounds);assert.match(shader.fragmentShader,/vDepthWorld.x>=uHorizonBounds.x.*vDepthWorld.x<uHorizonBounds.z/);source.userData.horizonBounds.x=-500;assert.equal(shader.uniforms.uHorizonBounds.value.x,-500);
});
test('unknown hooks invalidate a recipe even after a valid depth material was cached; clones cannot inherit hook authority',()=>{
 const source=new THREE.MeshStandardMaterial();new AfricanToon().material(source);assert.ok(standardDepthMaterial(source));source.onBeforeCompile=shader=>{shader.vertexShader='unknown displacement';};assert.equal(standardDepthMaterial(source),null);
 source.userData.worldDepthStandard=true;const clone=source.clone();clone.onBeforeCompile=source.onBeforeCompile;assert.equal(standardDepthMaterial(clone),null);
});
test('source disposal releases its cached depth material once; successive stable captures reuse it',()=>{
 const source=new THREE.MeshStandardMaterial(),depth=standardDepthMaterial(source);let disposed=0;depth.addEventListener('dispose',()=>disposed++);for(let i=0;i<10;i++)assert.equal(standardDepthMaterial(source),depth);
 let reads=0;Object.defineProperty(source,'opacity',{get(){reads++;return 1;}});const world=new THREE.Scene(),geometry=new THREE.BoxGeometry();for(let i=0;i<50;i++)world.add(new THREE.Mesh(geometry,source));
 const stats=withDepthCaptureMaterials(world,()=>{for(const mesh of world.children)assert.equal(mesh.material,depth);});assert.equal(stats.specialized,50);assert.ok(reads<=2,'Shared recipe synchronizes properties once per capture, not once per mesh');
 source.dispose();assert.equal(disposed,1);source.dispose();assert.equal(disposed,1);geometry.dispose();
});
