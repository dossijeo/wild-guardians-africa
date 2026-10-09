import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {buildNativeChunk} from '../src/rendering/chunk-data.js';
import {BIOME_IDS} from '../src/world/navigation.js';
import {nativeAssetSurface} from '../src/rendering/asset-surface.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CameraTreeRegistry} from '../src/rendering/camera-tree-registry.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {sweepCameraVolume} from '../src/rendering/camera-volume-sweep.js';

function fixture(){
 const index=new CameraVolumeIndex(),registry=new CameraTreeRegistry(index,{minimumSize:4,margin:0});
 const scene=new THREE.Group(),chunk=new THREE.Group();chunk.position.set(48,0,-48);chunk.userData.nativeChunkOrigin=[48,-48];scene.add(chunk);
 const geometry=new THREE.BufferGeometry();geometry.boundingBox=new THREE.Box3(new THREE.Vector3(1,0,-1),new THREE.Vector3(3,8,1));
 const plant={id:'acacia',x:48,y:2,z:-48,yaw:.5,sx:2,sy:1,sz:3};
 const batch={group:0,levels:[{geometry}],instances:[plant],chunkOrigin:[48,-48]};chunk.userData.lodBatches=[batch];
 const chunks=new Map([['1,-1',chunk]]);return {scene,chunk,geometry,plant,batch,chunks,index,registry};
}

test('tree volume matches native chunk transform, authored pivot, scale and finite roof',()=>{
 const f=fixture();f.scene.position.set(10,4,20);f.scene.rotation.y=.3;f.registry.sync(f.chunks,1);
 const volume=f.index.records.get('camera-tree:1,-1:acacia'),dummy=new THREE.Object3D();
 dummy.position.set(0,2,0);dummy.rotation.y=.5;dummy.scale.set(2,1,3);dummy.updateMatrix();
 const matrix=new THREE.Matrix4().multiplyMatrices(f.chunk.matrixWorld,dummy.matrix);
 for(const x of [1,3])for(const y of [0,8])for(const z of [-1,1]){
  const point=new THREE.Vector3(x,y,z).applyMatrix4(matrix).toArray();assert.ok(sweepCameraVolume(point,point,volume,.00001));
 }
 const center=f.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(matrix);
 assert.ok(Math.abs(volume.yaw-.8)<1e-10);
 assert.equal(sweepCameraVolume([center.x-30,volume.max[1]+1,center.z],[center.x+30,volume.max[1]+1,center.z],volume,.45),null);
});

test('unchanged revision does no scene work; streaming and suppression rebuild only changed chunks',()=>{
 const f=fixture();f.registry.sync(f.chunks,1);const first=f.index.records.values().next().value;
 let updates=0;const original=f.chunk.updateWorldMatrix;f.chunk.updateWorldMatrix=function(...args){updates++;return original.apply(this,args);};
 for(let i=0;i<1000;i++)f.registry.sync(f.chunks,1);
 assert.equal(updates,0);assert.equal(f.registry.rebuilds,1);assert.equal(f.index.records.values().next().value,first);
 const other=new THREE.Group();other.userData.lodBatches=[];f.chunks.set('2,-1',other);f.registry.sync(f.chunks,2);
 assert.equal(f.registry.rebuilds,2);assert.equal(f.index.records.values().next().value,first);
 f.chunk.userData.lodBatches=[{...f.batch,instances:[]}];f.registry.sync(f.chunks,3);assert.equal(f.index.records.size,0);
 f.chunk.userData.lodBatches=[f.batch];f.registry.sync(f.chunks,4);assert.equal(f.index.records.size,1);
 f.chunks.delete('1,-1');f.registry.sync(f.chunks,5);assert.equal(f.index.records.size,0);assert.equal(f.registry.chunks.size,1);
});

test('small trees, shrubs and props are excluded; clear preserves shared building volumes and source ownership',()=>{
 const f=fixture();f.chunk.userData.lodBatches.push({...f.batch,group:1,instances:[{...f.plant,id:'shrub'}]}, {...f.batch,instances:[{...f.plant,id:'small',sx:.1,sy:.1,sz:.1}]});
 let disposed=0;f.geometry.addEventListener('dispose',()=>disposed++);
 f.index.set('building',{min:[0,0,0],max:[2,5,2]});const before=JSON.stringify(f.plant);
 f.registry.sync(f.chunks,1);assert.equal(f.index.records.size,2);assert.equal(JSON.stringify(f.plant),before);
 f.registry.clear();assert.equal(f.index.records.size,1);assert.ok(f.index.records.has('building'));assert.equal(f.registry.chunks.size,0);assert.equal(disposed,0);
});

test('explicit invalidation updates edited source data and malformed replacement preserves previous volume',()=>{
 const f=fixture();f.registry.sync(f.chunks,1);const old=f.index.records.values().next().value;
 const bad=f.geometry.clone();bad.boundingBox=new THREE.Box3();f.chunk.userData.lodBatches=[{...f.batch,levels:[{geometry:bad}]}];
 assert.throws(()=>f.registry.sync(f.chunks,2));assert.equal(f.index.records.values().next().value,old);
 f.chunk.userData.lodBatches=[f.batch];f.plant.sy=2;f.registry.invalidate('1,-1');f.registry.sync(f.chunks,2);
 assert.equal(f.index.records.values().next().value.max[1],18);
 for(const options of [{minimumSize:-1},{minimumSize:NaN},{margin:null},{margin:{horizontal:1,vertical:-1}}])assert.throws(()=>new CameraTreeRegistry(f.index,options));
 for(const revision of [undefined,NaN,-1,.5])assert.throws(()=>f.registry.sync(f.chunks,revision));
});

test('six native biome packs preserve deterministic tree IDs, world positions and metadata ownership',()=>{
 let total=0;
 for(const [biome,id] of Object.entries(BIOME_IDS)){
  const pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+id+'.json',import.meta.url),'utf8'));
  const {nav}=createOpeningWorld({biome,culture:'mapungubwe',seed:712}),data=buildNativeChunk(nav.config,pack.profile,0,0),before=JSON.stringify(data.instances);
  const binary=readFileSync(new URL('../public'+pack.binary.url,import.meta.url));
  const chunk=new THREE.Group();chunk.userData.lodBatches=pack.assets.map((asset,slot)=>{
   const desc=asset.lods[0].position,geometry=new THREE.BufferGeometry();
   assert.equal(desc.type,'<f4');
   geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary.buffer,binary.byteOffset+desc.offset,desc.count),3));geometry.computeBoundingBox();
   return {group:nativeAssetSurface(pack,asset,slot).group,levels:[{geometry}],instances:data.instances[slot],chunkOrigin:[0,0]};
  });
  const index=new CameraVolumeIndex(),registry=new CameraTreeRegistry(index,{minimumSize:0,margin:0});registry.sync(new Map([['0,0',chunk]]),1);
  let expected=0;
  for(const batch of chunk.userData.lodBatches)if(batch.group===0)for(const p of batch.instances){
   expected++;const volume=index.records.get('camera-tree:0,0:'+p.id);assert.ok(volume,biome);
   const center=batch.levels[0].geometry.boundingBox.getCenter(new THREE.Vector3());
   center.multiply(new THREE.Vector3(p.sx,p.sy,p.sz)).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw).add(new THREE.Vector3(p.x,p.y,p.z));
   for(let i=0;i<3;i++)assert.ok(Math.abs((volume.min[i]+volume.max[i])/2-center.getComponent(i))<1e-8,biome);
  }
  assert.equal(index.records.size,expected);assert.equal(JSON.stringify(data.instances),before);total+=expected;
  registry.clear();for(const b of chunk.userData.lodBatches)b.levels[0].geometry.dispose();
 }
 assert.ok(total>0);
});
