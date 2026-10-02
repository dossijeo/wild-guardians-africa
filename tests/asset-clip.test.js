import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {nativeAssetClipFragment,nativeAssetClipRequired} from '../src/rendering/asset-clip.js';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {NativeAssetGroups} from '../src/rendering/asset-groups.js';
import {AfricanToon} from '../src/rendering/african-toon.js';

test('chunk clip preserves the original half-open FS predicate and biome exceptions',()=>{
 const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
 const original=source.match(/if\(uClip>\.5\)\{bool within=.*?discard;\}/)[0];
 assert.equal(nativeAssetClipFragment,original.replaceAll('uClip','uNativeClip').replaceAll('vWorld','vNativeClipWorld').replaceAll('uBounds','vNativeClipBounds'));
 const js=original.replace('bool within=','const within=').replace('discard;','return false;')+'return true;';
 const keep=Function('uClip','vWorld','uBounds',js),bounds={x:-24,y:-24,z:24,w:24};
 for(const [x,z,expected] of [[-24,-24,true],[0,0,true],[23.999,23.999,true],[24,0,false],[0,24,false],[-24.001,0,false],[0,-24.001,false]]){
  assert.equal(keep(1,{x,z},bounds),expected);assert.equal(keep(2,{x,z},bounds),!expected);assert.equal(keep(0,{x,z},bounds),true);
 }
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])for(let slot=0;slot<20;slot++)assert.equal(nativeAssetClipRequired(slot,biome),slot===19&&!['gran-canon','desierto'].includes(biome));
});

test('adjacent chunks carry independent bounds through LOD while retaining shared atlas material and solid shadow geometry',()=>{
 const scene=new THREE.Scene(),chunks=new Map(),material=new THREE.MeshStandardMaterial(),levels=[3,2,1].map(n=>{const g=new THREE.BoxGeometry(70,3,70,n,n,n);g.computeBoundingBox();return new THREE.Mesh(g,material);});
 for(const x of [0,48]){
  const group=new THREE.Group(),instances=[0,2,4].map(i=>({id:x+':'+i,x:x+i,y:0,z:0,sx:1,sy:1,sz:1,yaw:0}));
  const batch=createAssetLod(group,levels,instances,{group:5,role:'formation'},19,[x-24,-24,x+24,24]);scene.add(group);chunks.set(x,group);
  assert.equal(batch.clip,true);assert.equal(batch.shadow.geometry,levels.at(-1).geometry);assert.equal(batch.shadow.geometry.attributes.nativeClipBounds,undefined);
  for(const [i,m] of batch.meshes.entries()){
   assert.equal(m.material,material);assert.notEqual(m.geometry.attributes.position,levels[i].geometry.attributes.position);assert.equal(m.geometry.attributes.position.array,levels[i].geometry.attributes.position.array);
   assert.deepEqual(Array.from(m.geometry.attributes.nativeClipBounds.array),Array(3).fill([x-24,-24,x+24,24]).flat());
  }
 }
 const camera=new THREE.PerspectiveCamera(60,1,.1,500);camera.position.set(0,15,30);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 updateAssetLods(chunks,camera,'alta');const groups=new NativeAssetGroups(scene);groups.update(chunks,camera);
 assert.equal(groups.colors.size,0);assert.equal(groups.shadows.size,0);assert.equal(groups.shadowChunks.size,3);
 for(const g of chunks.values())for(const m of g.userData.lodBatches[0].meshes)assert.equal(m.layers.mask,1);
 camera.position.set(0,15,120);updateAssetLods(chunks,camera,'media');
 for(const [x,g] of chunks)for(const m of g.userData.lodBatches[0].meshes)assert.deepEqual(Array.from(m.geometry.attributes.nativeClipBounds.array.slice(0,4)),[x-24,-24,x+24,24]);
 groups.dispose();
});

test('clip shader composes once with coverage and African Toon without enabling clipping on shadow material',()=>{
 const material=new THREE.MeshStandardMaterial(),g=new THREE.BoxGeometry();g.computeBoundingBox();const group=new THREE.Group();
 createAssetLod(group,[0,1,2].map(()=>new THREE.Mesh(g,material)),[{x:0,y:0,z:0,sx:1,sy:1,sz:1,yaw:0}],{group:5},19,[-24,-24,24,24]);
 new AfricanToon().material(material);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
 assert.equal(shader.fragmentShader.split(nativeAssetClipFragment).length,2);assert.match(shader.vertexShader,/instanceMatrix\*nativeClipPosition/);assert.match(shader.fragmentShader,/africanToonEmission4|africanToon4/);assert.match(shader.fragmentShader,/vNativeVisibility/);
 assert.equal(shader.uniforms.uNativeClip,material.userData.nativeChunkClip);assert.match(material.customProgramCacheKey(),/native-chunk-clip/);
 assert.equal(material.customDepthMaterial,undefined);assert.equal(group.userData.lodBatches[0].shadow.geometry,g);
});
