import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {obstructionRecord,obstructionFrame,obstructionVisibility,coverageThreshold,OBSTRUCTION_SOURCE_SHA256} from '../src/rendering/obstruction-source.js';
import {obstructionGeometry,obstructionMaterial,updateObstructions} from '../src/rendering/obstruction.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {WorldScene} from '../src/rendering/scene.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const reference=Function('const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));'+source.slice(source.indexOf('const smooth='),source.indexOf('const hex='))+source.slice(source.indexOf('function obstructionRecord('),source.indexOf('function syncVisibilityControls('))+'return {obstructionRecord,obstructionFrame,obstructionVisibility};')();
const prototype={min:[-2,0,-2],max:[2,10,2]};
const instance=(x=0,id='tree')=>({id,x,y:0,z:0,sx:1,sy:1,sz:1,yaw:0});

test('native volumes and viewing corridor match the original across rotation, scale, chunk offset and camera poses',()=>{
  assert.equal(createHash('sha256').update(source).digest('hex'),OBSTRUCTION_SOURCE_SHA256);
  assert.ok(source.includes(coverageThreshold));
  for(const yaw of [0,.7,Math.PI])for(const scale of [.5,1,2])for(const eye of [[0,8,0],[0,8,4],[0,8,30],[15,8,2],[0,14,4]]){
    const p={...instance(),yaw,sx:scale,sy:scale,sz:scale},rec=obstructionRecord(p,prototype),frame=obstructionFrame(eye,[0,8,-10],Math.PI/3,1.5,7);
    assert.deepEqual(rec,reference.obstructionRecord(p,prototype));assert.deepEqual(frame,reference.obstructionFrame(eye,[0,8,-10],Math.PI/3,1.5,7));
    assert.equal(obstructionVisibility(rec,frame),reference.obstructionVisibility(rec,frame));
    const shifted=obstructionFrame([eye[0]+96,eye[1],eye[2]-48],[96,8,-58],Math.PI/3,1.5,7);
    assert.equal(obstructionVisibility(rec,shifted,96,-48),obstructionVisibility(rec,frame));
  }
  const rec=obstructionRecord(instance(),prototype),frame=eye=>obstructionFrame(eye,[0,8,0],Math.PI/3,1.5,7);
  assert.equal(obstructionVisibility(rec,frame([0,8,0])),0);assert.equal(obstructionVisibility(rec,frame([0,8,4])),0);assert.equal(obstructionVisibility(rec,frame([0,8,30])),1);
});

test('coverage is independent per instance and chunk, excluding low vegetation, water and short props',()=>{
  const original=new THREE.BoxGeometry(4,10,4),a=obstructionGeometry(original,[instance(),instance(100,'far')],prototype,0),b=obstructionGeometry(original,[instance(48)],prototype,0);
  assert.notEqual(a.getAttribute('position'),original.getAttribute('position'));assert.equal(a.getAttribute('position').array,original.getAttribute('position').array);assert.notEqual(a.index,original.index);assert.equal(a.index.array,original.index.array);assert.equal(original.getAttribute('nativeVisibility'),undefined);
  assert.notEqual(a.getAttribute('nativeVisibility'),b.getAttribute('nativeVisibility'));
  for(const slot of [7,8,9,19])assert.equal(obstructionGeometry(original,[instance()],prototype,slot),original);
  assert.equal(obstructionGeometry(original,[instance()],{min:[0,0,0],max:[1,.72,1]},0),original);
  const group=new THREE.Group();group.add(new THREE.InstancedMesh(a,new THREE.MeshStandardMaterial(),2));group.add(new THREE.InstancedMesh(b,new THREE.MeshStandardMaterial(),1));
  const camera=new THREE.PerspectiveCamera(60,1.5);camera.position.set(0,8,0);
  const stats=updateObstructions(new Map([['0,0',group]]),camera,new THREE.Vector3(0,8,-10),.016);
  assert.deepEqual(stats,{hidden:1,fading:0,affected:1});assert.deepEqual([...a.getAttribute('nativeVisibility').array],[0,1]);assert.deepEqual([...b.getAttribute('nativeVisibility').array],[1]);
  a.dispose();assert.equal(b.getAttribute('nativeVisibility').array[0],1);b.dispose();original.dispose();
});

test('packages without explicit bounds use the full original mesh across reduced LODs and honor original group overrides',()=>{
  const full=new THREE.BoxGeometry(4,10,4).translate(0,5,0),reduced=new THREE.BoxGeometry(1,1,1),view=obstructionGeometry(reduced,[instance()],{},0,full);
  assert.deepEqual(view.userData.obstruction.records[0].center,[0,5,0]);assert.deepEqual(view.userData.obstruction.records[0].half,[2,5,2]);
  assert.equal(obstructionGeometry(reduced,[instance()],{group:2},0,full),reduced);
  view.dispose();full.dispose();reduced.dispose();
});

test('native fade rates clamp wall time, restore independently and do not dirty static frames',()=>{
  const geometry=obstructionGeometry(new THREE.BoxGeometry(),[instance()],prototype,0),group=new THREE.Group(),mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial(),1);group.add(mesh);
  const chunks=new Map([['0,0',group]]),camera=new THREE.PerspectiveCamera(60,1.5),target=new THREE.Vector3(0,8,0),attribute=geometry.getAttribute('nativeVisibility');
  camera.position.set(0,8,30);updateObstructions(chunks,camera,target,.016);const version=attribute.version;updateObstructions(chunks,camera,target,.016);assert.equal(attribute.version,version);
  camera.position.set(0,8,4);updateObstructions(chunks,camera,target,.05);assert.ok(Math.abs(attribute.array[0]-Math.exp(-.05*16))<1e-7);
  const previous=attribute.array[0];updateObstructions(chunks,camera,target,10,{enabled:false});assert.ok(Math.abs(attribute.array[0]-(previous+(1-previous)*(1-Math.exp(-.12*7))))<1e-7);
  updateObstructions(chunks,camera,target,.016,{enabled:false,snap:true});assert.equal(attribute.array[0],1);
});

test('streaming releases the private coverage geometry once while retaining another chunk and the source arrays',()=>{
  const original=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),kept=obstructionGeometry(original,[instance()],prototype,0),retired=obstructionGeometry(original,[instance(48000)],prototype,0);
  const group=geometry=>{const g=new THREE.Group();g.add(new THREE.InstancedMesh(geometry,material,1));return g;},a=group(kept),b=group(retired),scene=new THREE.Scene();scene.add(a,b);
  let releases=0,sourceReleases=0;retired.addEventListener('dispose',()=>releases++);original.addEventListener('dispose',()=>sourceReleases++);
  const world={syncResidentProps(){},nav:{config:{},field:{seed:42}},prototypes:[],pack:{profile:{colors:{water:'#88bbcc'}}},camera:new THREE.PerspectiveCamera(),quality:'media',horizon:{update(){}},contacts:{update(){}},chunkRevision:0,chunks:new Map([['0,0',a],['999,999',b]]),terrainMeshes:[],scene,terrain:()=>new THREE.Group()};
  WorldScene.prototype.syncChunks.call(world);WorldScene.prototype.syncChunks.call(world);
  assert.equal(releases,1);assert.equal(sourceReleases,0);assert.equal(world.chunks.get('0,0'),a);assert.equal(b.parent,null);assert.equal(kept.getAttribute('nativeVisibility').count,1);assert.notEqual(kept.getAttribute('position'),original.getAttribute('position'));assert.equal(kept.getAttribute('position').array,original.getAttribute('position').array);
  kept.dispose();original.dispose();material.dispose();
});

test('native ordered discard composes with cel shader and preserves opaque depth and original full shadows',()=>{
  const material=new THREE.MeshStandardMaterial(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),material,2),toon=new AfricanToon();obstructionMaterial(material);toon.apply(mesh);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
  assert.ok(shader.vertexShader.includes('vNativeVisibility=nativeVisibility'));assert.ok(shader.fragmentShader.includes(coverageThreshold));assert.ok(shader.fragmentShader.includes('africanToon4'));
  assert.ok(shader.fragmentShader.includes('coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility'));
  assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.deepEqual(material.defaultAttributeValues.nativeVisibility,[1]);assert.equal(mesh.customDepthMaterial,undefined);
  const key=material.customProgramCacheKey();obstructionMaterial(material);assert.equal(material.customProgramCacheKey(),key);assert.ok(key.includes('native-obstruction'));
});
