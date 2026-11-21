import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LoadingManager,SRGBColorSpace} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createPredecodedImageLoader} from '../src/rendering/predecoded-image-loader.js';
import {loadCharacterTextureData} from '../src/rendering/webgpu-progressive-character.js';

test('GLTFLoader uses predecoded images and retains material sampler setup',async()=>{
 const previousSelf=globalThis.self;globalThis.self=globalThis;const manager=new LoadingManager(),handler=createPredecodedImageLoader(manager),json=JSON.parse(await readFile('public/content/character-preview/hyena/webp/materials.gltf','utf8')),images=json.images.map(()=>({width:4,height:4,close(){}}));json.images.forEach((image,index)=>{image.uri=handler.add(images[index]);});
 try{const asset=await new GLTFLoader(manager).parseAsync(JSON.stringify(json),'https://example.test/'),materials=await Promise.all(json.materials.map((_,index)=>asset.parser.getDependency('material',index))),textures=materials.flatMap(material=>Object.values(material).filter(value=>value?.isTexture));assert.ok(textures.length);assert.ok(textures.every(texture=>images.includes(texture.source.data)));assert.ok(textures.some(texture=>texture.colorSpace===SRGBColorSpace));assert.ok(textures.every(texture=>texture.flipY===false));for(const texture of new Set(textures))texture.dispose();}
 finally{handler.dispose();if(previousSelf===undefined)delete globalThis.self;else globalThis.self=previousSelf;}
});
test('unsupported bitmap transfer falls back to verified bytes without hiding cancellation',async()=>{
 let fallback=0;const bytes=new Map([['x',new Uint8Array([1])]]),stream={variant:'webp',async loadBitmaps(){throw new DOMException('Cannot transfer','DataCloneError');},async loadTextures(){fallback++;return bytes;}};assert.deepEqual(await loadCharacterTextureData(stream,{}),{useBitmaps:false,data:bytes});assert.equal(fallback,1);stream.loadBitmaps=async()=>{throw new DOMException('cancelled','AbortError');};await assert.rejects(loadCharacterTextureData(stream,{}),{name:'AbortError'});assert.equal(fallback,1);
});
