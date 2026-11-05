import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeCharacterPreview} from '../src/rendering/decode-character-preview.js';

function unpack(bytes){const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=data.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n))),binary=bytes.subarray(28+n);return {json,binary};}
async function parseWithoutTextures(bytes){const {json}=unpack(bytes),data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=data.getUint32(12,true);for(const material of json.materials??[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;delete material.extensions;}const text=Buffer.from(JSON.stringify(json)),size=Math.ceil(text.length/4)*4,bin=bytes.subarray(20+length),output=Buffer.alloc(20+size+bin.length,32);Buffer.from(bytes.subarray(0,20)).copy(output);output.writeUInt32LE(output.length,8);output.writeUInt32LE(size,12);text.copy(output,20);Buffer.from(bin).copy(output,20+size);return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength),'');}
test('decoded real previews preserve every view, rig, animation and material',async()=>{
 await MeshoptDecoder.ready;for(const name of ['hyena','youngMale']){const source=new Uint8Array(await readFile(`public/content/character-preview/${name}/preview.glb`)),output=await decodeCharacterPreview(source),a=unpack(source),b=unpack(output);assert.equal(b.json.extensionsUsed?.includes('EXT_meshopt_compression')??false,false);assert.equal(b.json.buffers.length,1);for(const key of ['nodes','meshes','skins','animations','accessors','materials','asset'])assert.deepEqual(b.json[key],a.json[key],`${name}: ${key}`);assert.equal(b.json.bufferViews.length,a.json.bufferViews.length);
  for(let i=0;i<a.json.bufferViews.length;i++){const view=a.json.bufferViews[i],out=b.json.bufferViews[i],ext=view.extensions?.EXT_meshopt_compression;let expected;if(ext){expected=new Uint8Array(ext.count*ext.byteStride);MeshoptDecoder.decodeGltfBuffer(expected,ext.count,ext.byteStride,a.binary.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength),ext.mode,ext.filter??'NONE');}else expected=a.binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);assert.deepEqual(b.binary.subarray(out.byteOffset,out.byteOffset+out.byteLength),expected,`${name}: view ${i}`);}
  const [original,decoded]=await Promise.all([parseWithoutTextures(source),parseWithoutTextures(output)]),describe=gltf=>{const meshes=[];gltf.scene.traverse(object=>{if(object.isMesh)meshes.push({name:object.name,positions:object.geometry.attributes.position.count,bones:object.skeleton?.bones.map(bone=>bone.name)??[]});});return {meshes,clips:gltf.animations.map(clip=>[clip.name,clip.duration,clip.tracks.length])};};assert.deepEqual(describe(decoded),describe(original),`${name}: GLTFLoader`);
 }
});
test('invalid and cancelled previews never reach the decoder',async()=>{
 const bad=new Uint8Array(28);await assert.rejects(decodeCharacterPreview(bad),/header/);const controller=new AbortController();controller.abort();await assert.rejects(decodeCharacterPreview(bad,{signal:controller.signal}),{name:'AbortError'});
});
