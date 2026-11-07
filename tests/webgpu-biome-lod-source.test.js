import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene} from 'three';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
for(const [biome,file] of [['sabana','savanna'],['volcanes','volcanoes']])test(`${biome} authored lower LODs can be requested without changing the visible scene`,async()=>{
 const pack=JSON.parse(await readFile(new URL(`../public/content/biome-${file}.json`,import.meta.url),'utf8')),scene=new Scene(),props=createWebGpuBiomeProps({scene,state:{biome,suppressed:[]},biomePack:pack,initialSlots:[],byteLoader:async url=>{const bytes=await readFile(new URL('../public'+url,import.meta.url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},imageLoader:async()=>({close(){}})});
 try{assert.equal(await props.ready,true);const asset=pack.assets[0];for(let level=1;level<asset.lods.length;level++){const source=await props.requestLodSource(0,level);assert.equal(source.level,level);assert.ok(source.geometry.getAttribute('position').count>0);assert.ok(source.geometry.index.count<=asset.lods[level].index.count);assert.ok(source.geometry.boundingBox);assert.equal(source.textureSet,asset.textureSet??null);assert.equal(await props.requestLodSource(0,level),source);}assert.equal(scene.children.length,0);}finally{props.dispose();}
});
