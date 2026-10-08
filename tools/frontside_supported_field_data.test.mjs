// Small ownership/layout fixtures, not rendered asset acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {loadSupportedFieldData,createSupportedFieldTextures} from './lib/frontside-supported-field-data.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('field loader keeps exact span views and rejects a corrupt span',async()=>{
 const previousFetch=globalThis.fetch,previousLocation=globalThis.location;assert.ok(globalThis.crypto?.subtle);
 const bytes=new Uint16Array([2,4,6,8]),raw=new Uint8Array(bytes.buffer);
 const metadata={status:'EXPERIMENTAL_FIELD_TABLES_SHADER_AND_GATES_PENDING',payload:'fixture.bin',payloadBytes:raw.length,payloadSha256:sha(raw),arrays:{ids:{dtype:'Uint16',byteOffset:0,byteLength:raw.length,sha256:sha(raw)}}};
 try{
  globalThis.location={href:'http://qa.invalid/'};
  globalThis.fetch=async url=>new Response(String(url).endsWith('.bin')?raw:JSON.stringify(metadata));
  const loaded=await loadSupportedFieldData('/fixture.json');assert.deepEqual([...loaded.views.ids],[2,4,6,8]);assert.equal(loaded.views.ids.buffer,loaded.buffer);
  metadata.arrays.ids.sha256='0'.repeat(64);await assert.rejects(loadSupportedFieldData('/fixture.json'),/array hash mismatch/);
 }finally{globalThis.fetch=previousFetch;globalThis.location=previousLocation;}
});
test('source field textures borrow arrays and never dispose source geometry',async()=>{
 assert.ok(globalThis.crypto?.subtle);
 const geometry=new THREE.BufferGeometry(),sourceAccessors=[];let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
 for(const [semantic,name,size] of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]]){
  const array=new Float32Array(size*2).fill(.5);geometry.setAttribute(name,new THREE.BufferAttribute(array,size));sourceAccessors.push({name:semantic,count:2,runtimeDecodedSha256:sha(new Uint8Array(array.buffer))});
 }
 const data={metadata:{sourceAccessors,arrays:{}},views:{}};
 try{
  const owned=await createSupportedFieldTextures(geometry,data,{capabilities:{maxTextureSize:2}});
  for(const name of ['position','normal','uv'])assert.equal(owned.textures[name].image.data,geometry.attributes[name].array);
  assert.equal(owned.textures.position.internalFormat,'RGB32F');assert.equal(owned.textures.uv.internalFormat,'RG32F');
  owned.dispose();assert.equal(disposed,0);assert.ok(geometry.attributes.position.array.every(v=>v===.5));
  await assert.rejects(createSupportedFieldTextures(geometry,data,{capabilities:{maxTextureSize:1}}),/exceeds renderer capability/);
  geometry.attributes.normal.array[0]=.25;
  await assert.rejects(createSupportedFieldTextures(geometry,data,{capabilities:{maxTextureSize:2}}),/runtime field bits differ/);
  assert.equal(disposed,0);
 }finally{geometry.dispose();}
});
