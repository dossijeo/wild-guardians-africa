import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {LoadingManager} from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerNativeBc7Glb} from '../src/rendering/native-bc7-glb.js';
import {prepareNativeBc7Data} from '../src/rendering/prepare-native-bc7-data.js';
import {createPreparsedBc7Loader} from '../src/rendering/preparsed-bc7-loader.js';
import {loadCharacterTextureData} from '../src/rendering/webgpu-progressive-character.js';

test('prepared BC7 reproduces native Three.js mipmaps and texture properties',async()=>{
 const base='public/content/character-preview/hyena/bc7/',files=(await readdir(base)).filter(name=>name.endsWith('.ktx2')),reference=new KTX2Loader().detectSupport({isWebGPURenderer:true,hasFeature:name=>name==='texture-compression-bc'}),manager=new LoadingManager(),prepared=createPreparsedBc7Loader(manager,{load(){throw Error('unexpected fallback');}});
 try{for(const name of files){const bytes=new Uint8Array(await readFile(base+name)),descriptor=await prepareNativeBc7Data(bytes),expected=await new Promise((resolve,reject)=>reference.parse(bytes.buffer,resolve,reject)),uri=prepared.add(descriptor),actual=await new Promise((resolve,reject)=>prepared.loader.load(uri,resolve,undefined,reject));for(const key of ['format','type','colorSpace','minFilter','magFilter','generateMipmaps'])assert.equal(actual[key],expected[key],`${name}: ${key}`);assert.deepEqual(actual.image,expected.image);assert.equal(actual.mipmaps.length,expected.mipmaps.length);for(let i=0;i<actual.mipmaps.length;i++){assert.equal(actual.mipmaps[i].width,expected.mipmaps[i].width);assert.equal(actual.mipmaps[i].height,expected.mipmaps[i].height);assert.deepEqual(actual.mipmaps[i].data,expected.mipmaps[i].data);}actual.dispose();expected.dispose();}}
 finally{prepared.dispose();reference.dispose();}
});
test('native BC7 preparation falls back to verified bytes without swallowing cancellation',async()=>{
 let calls=0;const bytes=new Map([['x',new Uint8Array([1])]]),stream={variant:'bc7',async loadCompressedTextures(){throw Error('unsupported native texture');},async loadTextures(){calls++;return bytes;}};assert.deepEqual(await loadCharacterTextureData(stream,{}),{useBitmaps:false,data:bytes});assert.equal(calls,1);stream.loadCompressedTextures=async()=>{throw new DOMException('cancelled','AbortError');};await assert.rejects(loadCharacterTextureData(stream,{}),{name:'AbortError'});assert.equal(calls,1);
});
test('GLTFLoader retains native BC7 texture mappings and samplers',async()=>{
 const oldSelf=globalThis.self;globalThis.self=globalThis;const base='public/content/character-preview/hyena/bc7/',json=JSON.parse(await readFile(base+'materials.gltf','utf8')),manager=new LoadingManager(),prepared=createPreparsedBc7Loader(manager,{load(){throw Error('unexpected fallback');}});
 try{for(const image of json.images){const bytes=new Uint8Array(await readFile(base+image.uri));image.uri=prepared.add(await prepareNativeBc7Data(bytes));}const loader=registerNativeBc7Glb(new GLTFLoader(manager),prepared.loader),asset=await loader.parseAsync(JSON.stringify(json),'https://example.test/'),materials=await Promise.all(json.materials.map((_,i)=>asset.parser.getDependency('material',i))),textures=materials.flatMap(material=>Object.values(material).filter(value=>value?.isTexture));assert.ok(textures.length);assert.ok(textures.every(texture=>texture.isCompressedTexture&&texture.mipmaps.length>0&&texture.flipY===false));for(const texture of new Set(textures))texture.dispose();}
 finally{prepared.dispose();if(oldSelf===undefined)delete globalThis.self;else globalThis.self=oldSelf;}
});
