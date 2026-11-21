import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {nearTreeGeometry,nearTreeLodBins,removeReviewedTreeTriangles,originalTreeLevels,originalTreeLevel} from '../src/rendering/near-tree-textures.js';
import {nativeAssetSurface,nativeAssetMaterial} from '../src/rendering/asset-surface.js';
import {blendNearTreeMaterial} from '../src/rendering/near-tree-material.js';
import {nativeDepthRecipe} from '../src/rendering/depth-recipes.js';

test('calibrated blend finishes before packing switches and does not promote native geometry LOD',()=>{
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons']){
  const pack=JSON.parse(fs.readFileSync(`public/content/biome-${biome}.json`));
  for(const [index,asset]of pack.assets.entries())if(asset.nearTextures){
   const n=asset.nearTextures,prototype={...nativeAssetSurface(pack,asset,index),nearTextureDistance:n.distance,size:[1,1,1],centerY:0};
   assert.ok(n.blendStart<n.blendEnd&&n.blendEnd+2<=n.distance);
   const instances=Array.from({length:161},(_,i)=>({x:i*.25,y:0,z:0,sx:1,sy:1,sz:1}));
   for(const quality of ['muy_baja','baja','media','alta']){
    const original=nativeLodBins(instances,prototype,prototype.group,[0,0,0],quality,3),near=nearTreeLodBins(instances,prototype,prototype.group,[0,0,0],quality,4);
    assert.ok(near[0].every(i=>original[0].includes(i)),`${biome}/${asset.slot}/${quality}`);
   }
  }
 }
});

test('near RGB and packed maps blend in linear space while normal and opaque depth recipes stay native',()=>{
 const pack=JSON.parse(fs.readFileSync('public/content/biome-savanna.json')),asset=pack.assets[0],bounds=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,10,2));
 const maps={baseColor:new THREE.Texture(),normal:new THREE.Texture(),metallicRoughness:new THREE.Texture()};
 const original=nativeAssetMaterial(pack,asset,0,maps,bounds),near=nativeAssetMaterial(pack,asset,0,{...maps,baseColor:new THREE.Texture(),metallicRoughness:new THREE.Texture()},bounds);
 blendNearTreeMaterial(near,original,bounds,asset.nearTextures);
 const shader={...THREE.ShaderLib.standard,uniforms:{}};near.onBeforeCompile(shader,{});
 assert.equal(near.normalMap,original.normalMap);assert.ok(nativeDepthRecipe(near));
 assert.deepEqual(shader.uniforms.uNearRange.value.toArray(),[18,26]);
 assert.ok(shader.fragmentShader.includes('sampledDiffuseColor.rgb=mix('));
 assert.ok(shader.fragmentShader.includes('texture2D(uNearOriginalPacked,vNearOriginalUV)'));
 assert.ok(shader.vertexShader.includes('instanceMatrix*nearCenter'));
 assert.ok(shader.vertexShader.includes('distance(nearCenter.xyz,cameraPosition)'));
 original.dispose();near.dispose();
});

test('distant standby uses original materials and translates native packing levels',()=>{
 const originals=[0,1,2].map(level=>({userData:{},level}));
 const near={userData:{nearTextureDistance:24}},levels=[near,...originals];
 assert.deepEqual(originalTreeLevels(levels),originals);
 assert.equal(originalTreeLevels(originals),originals);
 assert.deepEqual(levels.map((_,i)=>originalTreeLevel(i,{nearTextureDistance:24})),[0,0,1,2]);
 assert.deepEqual(originals.map((_,i)=>originalTreeLevel(i,{})),[0,1,2]);
 assert.equal(levels[0],near);
});
import {nativeLodBins} from '../src/rendering/lod-source.js';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';

test('all supplied near variants preserve every original triangle, normal, UV and AO corner',()=>{
 let count=0;
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons']){
  const pack=JSON.parse(fs.readFileSync(`public/content/biome-${biome}.json`)),raw=fs.readFileSync(`public${pack.binary.url}`);
  for(const asset of pack.assets.filter(a=>a.nearTextures)){
   const source=new THREE.BufferGeometry();
   for(const [role,size]of [['position',3],['normal',3],['uv',2],['index',1]]){
    const d=asset.lods[0][role],Type={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array}[d.type];
    const values=new Type(raw.buffer.slice(raw.byteOffset+d.offset,raw.byteOffset+d.offset+d.count*Type.BYTES_PER_ELEMENT));
    const attribute=new THREE.BufferAttribute(values,size);if(role==='index')source.setIndex(attribute);else source.setAttribute(role,attribute);
   }
   source.setAttribute('ambientVisibility',new THREE.BufferAttribute(Uint8Array.from({length:source.attributes.position.count},(_,i)=>i%256),1,true));
   source.computeBoundingBox();source.computeBoundingSphere();
   const buffer=fs.readFileSync(`public${asset.nearTextures.cornerUV}`),uv=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length));
   const near=nearTreeGeometry(source,uv);assert.equal(near.index.count,source.index.count);
   for(let corner=0;corner<source.index.count;corner++){
    const a=source.index.array[corner],b=near.index.array[corner];
    for(const [name,attribute]of Object.entries(source.attributes))for(let k=0;k<attribute.itemSize;k++)assert.equal(near.attributes[name].array[b*attribute.itemSize+k],attribute.array[a*attribute.itemSize+k],`${biome}/${asset.slot}/${name}`);
    assert.equal(near.attributes.uv1.array[b*2],uv[corner*2]);assert.equal(near.attributes.uv1.array[b*2+1],uv[corner*2+1]);
   }
   assert.equal(near.attributes.ambientVisibility.normalized,true);
   for(const url of Object.values(asset.nearTextures.textures))assert.ok(fs.statSync(`public${url}`).size>0);
   near.dispose();source.dispose();count++;
  }
 }
 assert.equal(count,24);
});

test('near selection preserves original distant bins and the complete shadow population through camera moves',()=>{
 const geometry=new THREE.BoxGeometry(4,10,4);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const levels=Array.from({length:4},()=>new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));levels[0].userData.nearTextureDistance=24;
 const instances=Array.from({length:180},(_,x)=>({x,y:0,z:0,sx:1,sy:1,sz:1,yaw:0}));
 const group=new THREE.Group(),batch=createAssetLod(group,levels,instances,{group:0,role:'prop'},0),chunks=new Map([['test',group]]),camera=new THREE.PerspectiveCamera();
 for(const quality of ['muy_baja','media','alta'])for(const x of [0,60,180,0]){
  camera.position.set(x,0,0);const eye=camera.position.toArray(),native=nativeLodBins(instances,batch.prototype,0,eye,quality,3);
  const bins=nearTreeLodBins(instances,batch.prototype,0,eye,quality,4);
  assert.equal(new Set(bins.flat()).size,instances.length);
  for(let level=0;level<3;level++)assert.deepEqual(bins[level+1],native[level].filter(i=>!bins[0].includes(i)));
  const stats=updateAssetLods(chunks,camera,quality);assert.ok(stats.counts.every(Number.isFinite));assert.equal(batch.shadow.count,instances.length);
  assert.equal(batch.shadow.geometry,levels.at(-1).geometry);assert.equal(stats.culled,0);
 }
});

test('reviewed cleanup removes only selected triangles in all three LODs without mutating shared source buffers',()=>{
 let checked=0;
 for(const biome of ['savanna','grand_river']){
  const pack=JSON.parse(fs.readFileSync(`public/content/biome-${biome}.json`)),raw=fs.readFileSync(`public${pack.binary.url}`);
  for(const asset of pack.assets.filter(a=>a.geometryCleanup))for(const [level,lod]of asset.lods.entries()){
   const d=lod.index,Type=d.type==='<u2'?Uint16Array:Uint32Array,source=new Type(raw.buffer.slice(raw.byteOffset+d.offset,raw.byteOffset+d.offset+d.count*Type.BYTES_PER_ELEMENT));
   const before=source.slice(),geometry=new THREE.BufferGeometry();geometry.setIndex(new THREE.BufferAttribute(source,1));
   const removed=asset.geometryCleanup.removedTriangles[level],set=new Set(removed),expected=source.filter((_,i)=>!set.has(Math.floor(i/3)));
   removeReviewedTreeTriangles(geometry,removed);assert.deepEqual(geometry.index.array,expected);assert.deepEqual(source,before);assert.ok(removed.length>0);checked++;
  }
 }
 assert.equal(checked,9);
});
