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

test('capture keeps stock alpha-tested silhouettes native while retaining authored depth opt-in',()=>{
 const world=new THREE.Scene(),source=new THREE.MeshStandardMaterial({alphaTest:.35,map:new THREE.Texture()}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),source);world.add(mesh);
 const stats=withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,source));assert.equal(stats.specialized,0);assert.equal(stats.fallback,1);
 const depth=standardDepthMaterial(source);mesh.customDepthMaterial=depth;withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,depth));assert.equal(mesh.material,source);
});

test('native foliage alpha samples share the authored mip bias and separate depth programs from solid surfaces',async()=>{
 const {nativeAssetMaterial}=await import('../src/rendering/asset-surface.js');
 const {surfaceMapFragment}=await import('../src/rendering/surface-alpha.js');
 const pack=JSON.parse((await import('node:fs')).readFileSync('public/content/biome-volcanoes.json','utf8'));
 const bounds=new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,8,1)),textures={baseColor:new THREE.Texture(),normal:null,metallicRoughness:null};
 const foliage=nativeAssetMaterial(pack,pack.assets[0],0,textures,bounds);assert.ok(foliage.userData.nativeSurface.params[2]>.5);
 const native={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};foliage.onBeforeCompile(native);
 const rock=nativeAssetMaterial(pack,pack.assets[10],10,textures,bounds);assert.equal(rock.userData.nativeSurface.params[2],0);assert.notEqual(foliage.customProgramCacheKey(),rock.customProgramCacheKey());rock.dispose();
 const depth=standardDepthMaterial(foliage),shader=compile(depth);
 assert.ok(native.fragmentShader.includes(surfaceMapFragment(foliage.userData.nativeSurface)));assert.ok(shader.fragmentShader.includes(surfaceMapFragment(foliage.userData.nativeSurface)));assert.match(shader.fragmentShader,/texture2D\( map, vMapUv, \.65 \)/);
 assert.equal(depth.map,foliage.map);assert.equal(depth.alphaTest,foliage.alphaTest);assert.equal(depth.opacity,foliage.opacity);
 const firstKey=depth.customProgramCacheKey();let disposed=0;depth.addEventListener('dispose',()=>disposed++);
 foliage.userData.nativeSurface.params[2]=0;const solid=standardDepthMaterial(foliage);
 assert.notEqual(solid,depth);assert.equal(disposed,1);assert.notEqual(solid.customProgramCacheKey(),firstKey);assert.doesNotMatch(compile(solid).fragmentShader,/vMapUv, \.65/);
 foliage.dispose();
});

test('all 120 biome materials keep native and depth alpha mip recipes in distinct cache variants',async()=>{
 const {readFileSync}=await import('node:fs'),{nativeAssetMaterial}=await import('../src/rendering/asset-surface.js'),{surfaceMapBias,surfaceMapFragment}=await import('../src/rendering/surface-alpha.js');
 const bounds=new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,8,1)),textures={baseColor:new THREE.Texture(),normal:null,metallicRoughness:null},toon=new AfricanToon();let count=0;
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
  const pack=JSON.parse(readFileSync('public/content/biome-'+biome+'.json','utf8')),keys=new Map();
  for(const [index,asset] of pack.assets.entries()){
   const source=nativeAssetMaterial(pack,asset,index,textures,bounds);toon.material(source);const bias=surfaceMapBias(source.userData.nativeSurface),key=source.customProgramCacheKey();
   if(keys.has(key))assert.equal(keys.get(key),bias,'A shared native key cannot mix mip recipes');keys.set(key,bias);
   const shader=compile(standardDepthMaterial(source));
   if(bias)assert.ok(shader.fragmentShader.includes(surfaceMapFragment(source.userData.nativeSurface)));else assert.doesNotMatch(shader.fragmentShader,/vMapUv, \.65/);
   source.dispose();count++;
  }
  assert.equal(new Set(keys.values()).size,2,biome);
 }
 assert.equal(count,120);
});
