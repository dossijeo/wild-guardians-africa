import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {prepareNativeBc7Data} from '../src/rendering/prepare-native-bc7-data.js';

const readBuffer=async url=>{const bytes=await readFile('public'+url);return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);};
for(const mode of ['bc7','unsupported','invalid'])test(`savanna near tree chooses ${mode} without downloading both successful variants`,async()=>{
 const pack=JSON.parse(await readFile('public/content/biome-savanna.json','utf8')),native=pack.assets[0].nearTextures.nativeTextures.baseColor,source=pack.assets[0].nearTextures.textures.baseColor;
 const [ktx,webp]=await Promise.all([readFile('public'+native.url),readFile('public'+source)]);assert.equal(createHash('sha256').update(ktx).digest('hex'),native.sha256);assert.equal(createHash('sha256').update(webp).digest('hex'),native.sourceSha256);
 const prepared=await prepareNativeBc7Data(new Uint8Array(ktx.buffer.slice(ktx.byteOffset,ktx.byteOffset+ktx.byteLength))),requests=[],scene=new THREE.Scene(),instances=Array.from({length:20},()=>[]);instances[0].push({id:'tree',slot:0,x:0,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});
 const props=createWebGpuBiomeProps({scene,state:{biome:'sabana',suppressed:[]},biomePack:pack,initialSlots:[0],nativeBc7:mode!=='unsupported',bc7Loader:async(url,{sha256})=>{requests.push(['bc7',url]);assert.equal(sha256,native.sha256);return mode==='invalid'?{...prepared,colorSpace:THREE.NoColorSpace}:prepared;},byteLoader:readBuffer,imageLoader:async url=>{requests.push(['image',url]);return {width:4,height:4,close(){}};}});
 try{props.replace({cx:0,cz:0,instances},1);assert.equal(await props.ready,true);assert.equal(scene.children[0].material.map.channel,0);for(let i=0;i<100&&scene.children[0]?.material.map.channel!==1;i++)await new Promise(resolve=>setTimeout(resolve,5));const map=scene.children[0].material.map;assert.equal(map.channel,1);assert.equal(map.colorSpace,THREE.SRGBColorSpace);if(mode==='bc7'){assert.equal(map.isCompressedTexture,true);assert.equal(map.image.width,1024);assert.equal(map.mipmaps.length,11);assert.equal(requests.filter(([kind])=>kind==='bc7').length,1);assert.equal(requests.some(([kind,url])=>kind==='image'&&url===source),false);}else{assert.notEqual(map.isCompressedTexture,true);assert.equal(requests.filter(([kind,url])=>kind==='image'&&url===source).length,1);assert.equal(requests.filter(([kind])=>kind==='bc7').length,mode==='unsupported'?0:1);}}finally{props.dispose();}
});
