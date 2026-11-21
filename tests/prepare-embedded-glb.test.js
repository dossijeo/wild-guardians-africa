import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LoadingManager} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareEmbeddedGlb} from '../src/rendering/prepare-embedded-glb.js';
import {createPredecodedImageLoader} from '../src/rendering/predecoded-image-loader.js';
import {createWebGpuCropRoster} from '../src/rendering/webgpu-crop-roster.js';
import {Scene} from 'three';

const path='public/assets/8f6c9ef7472a2d7f8ffda7f08a78f8027f91d14a8f92b8eeca4084b0f379da36.glb';
function parts(bytes){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=view.getUint32(12,true),offset=28+n;return {json:JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n))),binary:bytes.subarray(offset)};}
test('real crop GLB preserves geometry and materials while transferring decoded images',async()=>{
 const source=new Uint8Array(readFileSync(path)),before=parts(source),created=[],prepared=await prepareEmbeddedGlb(source,{decode:async blob=>{const image={type:blob.type,close(){this.closed=true;}};created.push(image);return image;}}),after=parts(new Uint8Array(prepared.buffer));
 assert.deepEqual(after.binary,before.binary);assert.equal(prepared.images.length,before.json.images.length);assert.deepEqual(after.json.images.map(image=>image.uri),prepared.images.map((_,i)=>`data:application/x-wg-bitmap,${i}`));assert.deepEqual(after.json.meshes,before.json.meshes);assert.deepEqual(after.json.materials,before.json.materials);
 const manager=new LoadingManager(),decoded=createPredecodedImageLoader(manager),previousSelf=globalThis.self;globalThis.self=globalThis;try{for(const image of prepared.images)decoded.add(image);const gltf=await new GLTFLoader(manager).parseAsync(prepared.buffer,'');let meshes=0,textured=0;gltf.scene.traverse(node=>{if(node.isMesh){meshes++;if(node.material.map)textured++;node.geometry.dispose();node.material.dispose();}});assert.equal(meshes,40);assert.equal(textured,40);}finally{globalThis.self=previousSelf;decoded.dispose();for(const image of created)image.close();}
});
test('a failed or cancelled decode closes all successfully created images',async()=>{
 const source=new Uint8Array(readFileSync(path)),images=[],controller=new AbortController();let calls=0;
 await assert.rejects(prepareEmbeddedGlb(source,{signal:controller.signal,decode:async()=>{const image={close(){this.closed=true;}};images.push(image);if(++calls===2)controller.abort();return image;}}),{name:'AbortError'});assert.ok(images.every(image=>image.closed));
});
test('crop roster adopts prepared images and releases them on shutdown',async()=>{
 const source=new Uint8Array(readFileSync(path)),images=[],prepared=await prepareEmbeddedGlb(source,{decode:async()=>{const image={count:0,close(){this.count++;}};images.push(image);return image;}}),previousSelf=globalThis.self,previousFetch=globalThis.fetch;globalThis.self=globalThis;globalThis.fetch=async()=>({ok:true,json:async()=>[{source:'Cultivos',url:'/crops.glb'}]});let requests=0;
 const roster=createWebGpuCropRoster({scene:new Scene(),state:{elapsed:0,plants:[]},residency:{},renderer:{backend:{isWebGPUBackend:true}},characterData:{async prepareEmbeddedGlb(url){requests++;assert.equal(url,'/crops.glb');return prepared;}}});
 try{await roster.prepare();assert.equal(requests,1);assert.equal(roster.status().ready,true);}finally{roster.dispose();globalThis.self=previousSelf;globalThis.fetch=previousFetch;}assert.ok(images.every(image=>image.count===1));
});
