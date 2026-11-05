import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {createConfirmedCameraTreeIndex} from '../src/app/confirmed-camera-tree-index.js';
import {CameraTreeRegistry} from '../src/rendering/camera-tree-registry.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';

test('savanna effective Worker tree bounds match the legacy registry with real geometry',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,pack=JSON.parse(readFileSync('public/content/biome-savanna.json')),binary=readFileSync('public'+pack.binary.url),published=[];
 globalThis.fetch=async url=>({ok:true,json:async()=>pack,arrayBuffer:async()=>{const bytes=readFileSync('public'+String(url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},blob:async()=>new Blob(['stub'])});globalThis.createImageBitmap=async()=>({close(){}});
 try{const state={biome:'sabana',suppressed:[]},props=createWebGpuBiomeProps({scene:new THREE.Scene(),state,onCameraTreeChunk:message=>published.push(structuredClone(message))}),instances=Array.from({length:20},()=>[]),tree={id:'real-tree',slot:0,x:1,y:2,z:3,yaw:.4,sx:1,sy:1,sz:1};instances[0].push(tree);props.replace({cx:0,cz:0,instances},1,{epoch:'e',sequence:1});assert.equal(await props.ready,true);const message=published.at(-1),actual=createConfirmedCameraTreeIndex();actual.ingest(message);actual.confirm(1);
  const lod=pack.assets[0].lods[0],positions=new Float32Array(binary.buffer,binary.byteOffset+lod.position.offset,lod.position.count),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeBoundingBox();const group=new THREE.Group();group.userData.lodBatches=[{group:0,chunkOrigin:[0,0],instances:[tree],levels:[{geometry}]}];const index=new CameraVolumeIndex(),reference=new CameraTreeRegistry(index);reference.sync(new Map([['0,0',group]]),1);const normalized=value=>[...value.records.values()].map(({id,min,max,yaw})=>({id,min,max,yaw}));assert.deepEqual(normalized(actual.index),normalized(index));assert.ok(actual.status().volumes>0);reference.clear();actual.dispose();props.dispose();geometry.dispose();
 }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});
