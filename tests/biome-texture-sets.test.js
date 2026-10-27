import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
test('biome replacement texture set changes selected assets only and remains owned',async t=>{
 t.mock.method(globalThis,'fetch',async url=>{const b=readFileSync(new URL('../public'+url,import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};});
 const owner=new Assets(),loaded=new Map();owner.textures={loadAsync:async url=>{const texture=new THREE.Texture();loaded.set(url,texture);return texture;}};
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-savanna.json',import.meta.url)));pack.assets=pack.assets.slice(0,2);for(const asset of pack.assets)delete asset.textureSet;pack.textureSets=[['baseColor','normal','metallicRoughness'].map(role=>({role,base64:{url:role==='baseColor'?'/qa-replacement.webp':'/qa-'+role+'.webp'}}))];pack.assets[0].textureSet=0;
 const models=await owner.biome(pack);assert.equal(models[0][0].material.map,loaded.get('/qa-replacement.webp'));assert.notEqual(models[1][0].material.map,loaded.get('/qa-replacement.webp'));assert.equal(models[0][0].material.map.colorSpace,THREE.SRGBColorSpace);
 const disposed=new Map([...loaded.values()].map(v=>[v,0]));for(const texture of disposed.keys())texture.addEventListener('dispose',()=>disposed.set(texture,disposed.get(texture)+1));owner.disposeModels();owner.disposeModels();assert.ok([...disposed.values()].every(n=>n===1));
});
