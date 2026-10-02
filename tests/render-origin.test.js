import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RenderOrigin} from '../src/rendering/render-origin.js';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {NativeAssetGroups,nativeChunkBounds} from '../src/rendering/asset-groups.js';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import {cropSpec} from '../src/simulation/rules.js';

test('native origin keeps strict 144-unit hysteresis, snaps both axes to 48 and never changes target data',()=>{
  const origin=new RenderOrigin(),target={x:144,y:25,z:-144};
  assert.equal(origin.update(target),false);assert.equal(origin.revision,0);
  target.x+=.001;assert.equal(origin.update(target),true);assert.deepEqual([origin.x,origin.z,origin.revision],[144,-144,1]);
  assert.deepEqual(target,{x:144.001,y:25,z:-144});assert.equal(origin.update(target),false);
  assert.equal(origin.update({x:0,z:0}),false);assert.equal(origin.update({x:-.001,z:0}),true);
  assert.deepEqual([origin.x,origin.z,origin.revision],[-0,0,2]);
});

test('chunk-local and merged buffers preserve subunit positions far beyond Float32 world precision',()=>{
  const x=48_000_000,z=-48_000_000,scene=new THREE.Scene(),chunk=new THREE.Group();
  chunk.position.set(x,0,z);chunk.userData.nativeChunkOrigin=[x,z];scene.add(chunk);
  const geometry=new THREE.BoxGeometry(2,4,2);geometry.computeBoundingBox();const material=new THREE.MeshStandardMaterial(),levels=[new THREE.Mesh(geometry,material)];
  const instances=[{id:'far',x:x+.1875,y:3,z:z+.3125,yaw:.4,sx:1,sy:1,sz:1}],saved=structuredClone(instances);
  const batch=createAssetLod(chunk,levels,instances,{group:0,role:'prop'},0),chunks=new Map([['far',chunk]]),camera=new THREE.PerspectiveCamera();
  camera.position.set(x,10,z+25);camera.lookAt(x,3,z);camera.updateMatrixWorld(true);updateAssetLods(chunks,camera,'media');scene.updateMatrixWorld(true);
  const matrix=new THREE.Matrix4();batch.meshes[0].getMatrixAt(0,matrix);
  assert.equal(matrix.elements[12],.1875);assert.equal(matrix.elements[14],.3125);
  assert.notEqual(Math.fround(instances[0].x),instances[0].x,'old global Float32 buffer loses the authored offset');
  const world=matrix.clone().premultiply(chunk.matrixWorld);assert.equal(world.elements[12],instances[0].x);assert.equal(world.elements[14],instances[0].z);
  assert.ok(nativeChunkBounds(chunk).containsPoint(new THREE.Vector3(instances[0].x,3,instances[0].z)));
  const groups=new NativeAssetGroups(scene);groups.update(chunks,camera,{x,z});scene.updateMatrixWorld(true);
  const color=groups.colors.get('0:0').mesh,shadow=groups.shadows.get('0').mesh;
  for(const mesh of [color,shadow]){mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],.1875);assert.equal(matrix.elements[14],.3125);}
  assert.equal(groups.root.matrixWorld.elements[12],x);assert.equal(groups.shadowRoot.matrixWorld.elements[14],z);
  const versions=[color.instanceMatrix.version,shadow.instanceMatrix.version];assert.equal(groups.update(chunks,camera,{x,z}).uploads,0);
  groups.update(chunks,camera,{x:x+48,z});color.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],-47.8125);
  assert.ok(color.instanceMatrix.version>versions[0]);assert.ok(shadow.instanceMatrix.version>versions[1]);assert.deepEqual(instances,saved);
  groups.enabled=false;groups.update(chunks,camera,{x,z});assert.equal(batch.meshes[0].layers.mask,1);batch.meshes[0].getMatrixAt(0,matrix);assert.equal(matrix.elements[12],.1875);
  groups.dispose();batch.shadow.dispose();batch.meshes.forEach(m=>{m.dispose();if(m.geometry!==geometry)m.geometry.dispose();});geometry.dispose();material.dispose();
});

function cropsFixture(){
  const scene=new THREE.Scene(),source=new THREE.Group(),g=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),models=[],pairs=[];
  for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){
    const mesh=new THREE.Mesh(g,material);mesh.userData={cropIndex:crop,stage,crop:'fixture',height:stage,foliageRadius:.5};source.add(mesh);
    models.push({vertices:g.attributes.position.count,faces:g.index.count/3,faceLabels:Array(g.index.count/3).fill(0),regions:[{root:[0,0,0],direction:[0,1,0]}]});
    if(stage<5)pairs.push({a:crop*5+stage-1,b:crop*5+stage,a2b:[0],b2a:[0]});
  }
  const batch=createCropBatch(scene,{capabilities:{getMaxAnisotropy:()=>1}},{scene:source},{models,pairs});
  return {batch,scene,close:()=>{batch.dispose();g.dispose();material.dispose();}};
}

test('original crop stages and opaque bridges use the same origin while surface queries and plant state stay global',()=>{
  const f=cropsFixture(),origin={x:48_000_000,z:-48_000_000},matrix=new THREE.Matrix4(),queries=[];
  const plant={id:'p1',species:'maiz',alive:true,x:origin.x+.1875,z:origin.z+.3125,growth:0},saved=structuredClone(plant),duration=cropSpec('maiz').growth_seconds;
  for(const growth of [0,1,.065+(.27-.065)*.81]){
    plant.growth=growth*duration;const logical=structuredClone(plant);
    f.batch.update([plant],.5,(x,z)=>{queries.push([x,z]);return 2;},origin);
    const mesh=f.scene.children.find(o=>o.isInstancedMesh&&o.count);assert.ok(mesh);mesh.updateMatrixWorld(true);mesh.getMatrixAt(0,matrix);
    assert.equal(matrix.elements[12],.1875);assert.equal(matrix.elements[14],.3125);assert.equal(matrix.elements[13],2);
    const world=matrix.clone().premultiply(mesh.matrixWorld);assert.equal(world.elements[12],plant.x);assert.equal(world.elements[14],plant.z);assert.deepEqual(plant,logical);
    if(growth>0&&growth<1)assert.ok(mesh.name.startsWith('puente_'));
  }
  assert.ok(queries.every(([x,z])=>x===saved.x&&z===saved.z));f.close();
});
