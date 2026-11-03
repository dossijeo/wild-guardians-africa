import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readGlb} from '../tools/glb-container.mjs';

test('QA native hyena preserves all non-image buffer views',async t=>{
 let output;try{output=await readFile('public/qa/ktx2-fixture/hyena-native.glb');}catch(error){if(error.code==='ENOENT'){t.skip('Generate the optional QA fixture first');return;}throw error;}
 const original=readGlb(await readFile('public/content/character-lod/hyena.glb')),native=readGlb(output);
 const imageViews=new Set(original.json.images.map(image=>image.bufferView));
 assert.deepEqual(native.json.nodes,original.json.nodes);assert.deepEqual(native.json.skins,original.json.skins);assert.deepEqual(native.json.meshes,original.json.meshes);assert.deepEqual(native.json.accessors,original.json.accessors);
 for(let i=0;i<original.json.bufferViews.length;i++){
  const a=original.json.bufferViews[i],b=native.json.bufferViews[i];
  if(imageViews.has(i)){assert.equal(native.bin[b.byteOffset],0xab);assert.equal(native.bin[b.byteOffset+1],0x4b);continue;}
  assert.deepEqual(native.bin.subarray(b.byteOffset,b.byteOffset+b.byteLength),original.bin.subarray(a.byteOffset??0,(a.byteOffset??0)+a.byteLength));
 }
 assert.ok(native.json.extensionsRequired.includes('WG_native_ktx2'));
 for(const texture of native.json.textures)assert.equal(typeof texture.extensions.WG_native_ktx2.source,'number');
});
