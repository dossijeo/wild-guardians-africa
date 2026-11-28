import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture,MeshStandardMaterial,SRGBColorSpace,LinearSRGBColorSpace,NoColorSpace} from 'three';
import {normalizeGltfDataTextures,placeholderImageUri} from '../src/rendering/webgpu-gltf-texture-semantics.js';

test('placeholder sources remain distinct in GLTFLoader URI/sampler cache',()=>{
 const uri='data:image/png;base64,abc';assert.notEqual(placeholderImageUri(uri,0),placeholderImageUri(uri,1));assert.equal(placeholderImageUri(uri,0).split('#')[0],uri);
});
test('linear KTX data bindings match ordinary glTF without changing color images',()=>{
 const material=new MeshStandardMaterial(),color=new Texture(),normal=new Texture();color.colorSpace=SRGBColorSpace;normal.colorSpace=LinearSRGBColorSpace;material.map=color;material.normalMap=normal;normalizeGltfDataTextures([material]);assert.equal(color.colorSpace,SRGBColorSpace);assert.equal(normal.colorSpace,NoColorSpace);assert.equal(material.normalMap,normal);
});
test('a shared linear color/data source keeps the color binding and owns exactly one data clone',()=>{
 const source=new Texture(),a=new MeshStandardMaterial(),b=new MeshStandardMaterial(),owned=[];source.colorSpace=LinearSRGBColorSpace;a.map=a.normalMap=source;b.roughnessMap=source;normalizeGltfDataTextures([a,b],value=>owned.push(value));assert.equal(a.map,source);assert.equal(source.colorSpace,LinearSRGBColorSpace);assert.equal(a.normalMap,b.roughnessMap);assert.notEqual(a.normalMap,source);assert.equal(a.normalMap.colorSpace,NoColorSpace);assert.deepEqual(owned,[a.normalMap]);normalizeGltfDataTextures([a,b],value=>owned.push(value));assert.equal(owned.length,1);
});
