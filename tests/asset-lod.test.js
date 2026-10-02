import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {nativeLodBins,LOD_SOURCE_SHA256} from '../src/rendering/lod-source.js';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {updateObstructions} from '../src/rendering/obstruction.js';
import {WorldScene} from '../src/rendering/scene.js';

const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
const method=source.slice(source.indexOf(' updateAssetLods(cam){'),source.indexOf(' bindInstances(b,start){'));
const original=Function('state','prototypes','gl',"const mode='terrain';return ({"+method.trim()+"});");
const instance=(x,id=String(x))=>({x,y:0,z:0,sx:1,sy:1,sz:1,yaw:.4,id});

test('native distance selection matches the complete lab method across categories, qualities, size and three-dimensional eye poses',()=>{
 assert.equal(createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex'),LOD_SOURCE_SHA256);
 for(const group of [0,1,2,3,4,5])for(const role of ['prop','formation'])for(const quality of ['muy_baja','baja','media','alta'])for(const eye of [[0,0,0],[48,20,-48],[-96,12,96]]){
  const p={size:[8,10,6],centerY:5,role},instances=Array.from({length:240},(_,i)=>({...instance(i-60),sy:.5+i%3,sx:.7+i%2}));
  const b={instances,slot:0,group,variants:[0,1,2],drawSlices:[],order:new Uint32Array(240),baseData:new Float32Array(240*8),orderedData:new Float32Array(240*8)};
  const state={quality:quality==='alta'?'high':['muy_baja','baja'].includes(quality)?'eco':'normal',assetLOD:true};
  const engine=original(state,[p],{bindBuffer(){},bufferSubData(){}});engine.batches=[b];engine.updateAssetLods({eye});
  const expected=[[],[],[]];for(const s of b.drawSlices)expected[s.level]=Array.from(b.order.slice(s.start,s.start+s.count));
  assert.deepEqual(nativeLodBins(instances,p,group,eye,quality,3),expected);
 }
});

function fixture(groupId=0){
 const group=new THREE.Group(),instances=[instance(0),instance(45),instance(100)];
 const material=new THREE.MeshStandardMaterial(),levels=[8,6,4].map(n=>{const geometry=new THREE.BoxGeometry(4,10,4,n);geometry.translate(0,5,0);geometry.computeBoundingBox();return new THREE.Mesh(geometry,material);});
 const batch=createAssetLod(group,levels,instances,{group:groupId,role:'prop'},0),chunks=new Map([['0,0',group]]),camera=new THREE.PerspectiveCamera(60,1,.1,500);camera.position.set(0,8,0);
 return {batch,chunks,camera,group,instances,levels};
}

test('render bins preserve authored transforms and coverage through level changes, retaining full logical geometry',()=>{
 const {batch,chunks,camera,instances,levels}=fixture();
 let stats=updateAssetLods(chunks,camera,'media');assert.deepEqual(stats.counts,[1,1,1]);
 const target=new THREE.Vector3(0,8,-10);updateObstructions(chunks,camera,target,0,{snap:true});
 const saved=Array.from(batch.fade.attribute.array);assert.equal(saved[0],0);
 const geometry=batch.meshes.map(m=>m.geometry),versions=batch.meshes.map(m=>m.instanceMatrix.version);
 assert.equal(updateAssetLods(chunks,camera,'media').updates,0);assert.deepEqual(batch.meshes.map(m=>m.instanceMatrix.version),versions);
 camera.position.set(60,8,0);updateAssetLods(chunks,camera,'alta');assert.deepEqual(Array.from(batch.fade.attribute.array),saved);
 const m=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
 for(const [level,mesh] of batch.meshes.entries())for(const [j,i] of batch.orders[level].entries()){
  mesh.getMatrixAt(j,m);m.decompose(position,rotation,scale);assert.ok(Math.abs(position.x-instances[i].x)<1e-6);
  assert.equal(mesh.geometry,geometry[level]);assert.equal(mesh.geometry.attributes.position,levels[level].geometry.attributes.position);
  assert.equal(mesh.geometry.attributes.nativeVisibility.array[j],saved[i]);
 }
 const statsFade=updateObstructions(chunks,camera,target,.016,{enabled:false});assert.ok(statsFade.affected<=instances.length);
 let disposed=0;geometry.forEach(g=>g.addEventListener('dispose',()=>disposed++));batch.meshes.forEach(m=>{m.dispose();m.geometry.dispose();});assert.equal(disposed,3);
 assert.deepEqual(levels[0].geometry.boundingBox.min.toArray(),[-2,0,-2]);
 assert.deepEqual(levels[0].geometry.boundingBox.max.toArray(),[2,10,2]);
 const scene={chunks,handStaticBoxes:null,state:{villages:[],structures:[]},objects:new Map()};
 const boxes=WorldScene.prototype.handColliders.call(scene,{route:[[-10,0,0],[110,0,0]]});
 assert.equal(boxes.length,3);assert.deepEqual(boxes.map(b=>b.id),instances.map(p=>'0,0:prop:'+p.id));
 camera.position.set(1000,8,0);updateAssetLods(chunks,camera,'media');scene.handStaticBoxes=null;
 assert.deepEqual(WorldScene.prototype.handColliders.call(scene,{route:[[-10,0,0],[110,0,0]]}),boxes);
});

test('short vegetation distance culling does not remove logical instances and reappears when the camera returns',()=>{
 const {batch,chunks,camera,instances}=fixture(2);
 assert.equal(batch.fade,null);updateAssetLods(chunks,camera,'muy_baja');assert.equal(batch.meshes.reduce((s,m)=>s+m.count,0),2);
 camera.position.set(1000,8,0);assert.equal(updateAssetLods(chunks,camera,'muy_baja').culled,3);assert.equal(instances.length,3);
 camera.position.set(0,8,0);assert.deepEqual(updateAssetLods(chunks,camera,'media').counts,[1,0,1]);
});
