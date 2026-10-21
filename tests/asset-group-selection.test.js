import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NativeAssetGroups} from '../src/rendering/asset-groups.js';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';

function fixture(){
  const scene=new THREE.Scene(),groups=new NativeAssetGroups(scene),camera=new THREE.PerspectiveCamera(60,1,.1,500);
  camera.position.set(0,5,30);camera.lookAt(0,5,0);
  const geometry=new THREE.BoxGeometry(2,10,2);geometry.translate(0,5,0);geometry.computeBoundingBox();
  const level=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()),chunk=new THREE.Group();scene.add(chunk);
  const instances=[0,60,-60].map((x,i)=>({id:String(i),x,y:0,z:0,sx:1,sy:1,sz:1,yaw:0}));
  const batch=createAssetLod(chunk,[level],instances,{group:0,role:'prop'},0),chunks=new Map([['a',chunk]]);
  updateAssetLods(chunks,camera,'alta');
  return {scene,groups,camera,chunk,chunks,batch};
}
const render=f=>f.groups.update(f.chunks,f.camera);

test('instance selection removes color only and preserves baseline sorting bounds and source data',()=>{
  const f=fixture(),source=f.batch.meshes[0].instanceMatrix.array.slice();
  render(f);const g=f.groups.colors.get('0:0'),shadow=f.groups.shadows.get('0');
  assert.equal(g.mesh.count,1);assert.equal(shadow.mesh.count,3);
  const bounds=g.mesh.boundingSphere.clone(),selected=g.mesh.instanceMatrix.array.slice(0,16);
  f.groups.instanceCulling=false;render(f);assert.equal(g.mesh.count,3);
  g.mesh.boundingSphere=null;g.mesh.computeBoundingSphere();assert.deepEqual(g.mesh.boundingSphere,bounds);
  assert.deepEqual(g.mesh.instanceMatrix.array.slice(0,16),selected);
  assert.deepEqual(f.batch.meshes[0].instanceMatrix.array,source);assert.equal(f.batch.instances.length,3);
  f.groups.dispose();
});

test('small camera changes with identical output do not invalidate either buffer or shadows',()=>{
  const f=fixture();render(f);const g=f.groups.colors.get('0:0'),shadow=f.groups.shadows.get('0');
  const versions=[g.mesh.instanceMatrix.version,g.mesh.geometry.attributes.nativeVisibility.version,shadow.mesh.instanceMatrix.version];
  for(let i=0;i<12;i++){f.camera.position.x+=.001;assert.equal(render(f).uploads,0);}
  assert.deepEqual([g.mesh.instanceMatrix.version,g.mesh.geometry.attributes.nativeVisibility.version,shadow.mesh.instanceMatrix.version],versions);
  f.camera.lookAt(60,5,0);render(f);assert.equal(g.mesh.count,1);assert.equal(g.mesh.instanceMatrix.array[12],60);
  assert.ok(g.mesh.instanceMatrix.version>versions[0]);assert.equal(shadow.mesh.instanceMatrix.version,versions[2]);
  f.groups.dispose();
});

test('coverage-only changes update their own range, while identical producer revisions do not upload',()=>{
  const f=fixture();render(f);const g=f.groups.colors.get('0:0'),m=g.mesh.instanceMatrix,a=g.mesh.geometry.attributes.nativeVisibility;
  m.onUploadCallback();a.onUploadCallback();const version=m.version;
  const source=f.batch.meshes[0].geometry.attributes.nativeVisibility;source.setX(0,.25);source.needsUpdate=true;
  render(f);assert.equal(m.version,version);assert.deepEqual(m.updateRanges,[]);assert.deepEqual(a.updateRanges,[{start:0,count:1}]);
  a.onUploadCallback();source.needsUpdate=true;assert.equal(render(f).uploads,0);assert.deepEqual(a.updateRanges,[]);
  f.groups.dispose();
});

test('count-only prefix changes preserve valid GPU data and pending ranges survive skipped draws',()=>{
  const f=fixture();f.groups.instanceCulling=false;render(f);const g=f.groups.colors.get('0:0'),m=g.mesh.instanceMatrix,version=m.version;
  f.groups.instanceCulling=true;render(f);assert.equal(g.mesh.count,1);assert.equal(m.version,version);
  f.groups.instanceCulling=false;render(f);assert.equal(g.mesh.count,3);assert.equal(m.version,version);
  m.onUploadCallback();const source=f.batch.meshes[0].instanceMatrix;
  source.array[12]=1;source.needsUpdate=true;render(f);
  assert.deepEqual(m.updateRanges,[{start:12,count:1}]);
  source.array[28]=61;source.needsUpdate=true;render(f);
  assert.deepEqual(m.updateRanges,[{start:12,count:1},{start:28,count:1}]);
  m.onUploadCallback();assert.deepEqual(m.updateRanges,[]);f.groups.dispose();
});

test('rebasing, removal, recreation and quality/LOD changes keep independent color and shadow data',()=>{
  const f=fixture();render(f);const shift=new THREE.Vector3(48_000_000,0,-48_000_000);
  f.chunk.position.add(shift);delete f.chunk.userData.nativeAssetBounds;f.camera.position.add(shift);f.camera.lookAt(shift.x,5,shift.z);
  f.groups.update(f.chunks,f.camera,{x:shift.x,z:shift.z});const g=f.groups.colors.get('0:0');
  assert.equal(g.mesh.count,1);assert.equal(g.mesh.instanceMatrix.array[12],0);assert.ok(Math.abs(g.mesh.boundingSphere.center.x)<1);
  f.chunks.clear();f.groups.update(f.chunks,f.camera);assert.equal(f.groups.colors.size,0);assert.equal(f.groups.shadows.size,0);
  for(const p of f.batch.instances){p.x+=shift.x;p.z+=shift.z;}f.batch.chunkOrigin=[shift.x,shift.z];
  f.chunks.set('a',f.chunk);updateAssetLods(f.chunks,f.camera,'muy_baja');f.groups.update(f.chunks,f.camera,{x:shift.x,z:shift.z});
  assert.equal(f.groups.colors.size,1);assert.equal(f.groups.shadows.get('0').mesh.count,3);f.groups.dispose();f.groups.dispose();
});


test('a local matrix or coverage change leaves other slots and shadow buffers intact',()=>{
 const f=fixture(),other=new THREE.Group();f.scene.add(other);f.chunks.set('other',other);
 createAssetLod(other,f.batch.levels,[8,12,16].map(x=>({x,y:0,z:0,sx:1,sy:1,sz:1,yaw:0})),{group:0,role:'prop'},1);
 updateAssetLods(f.chunks,f.camera,'alta');render(f);
 const g=f.groups.colors.get('1:0'),shadow=f.groups.shadows.get('1'),versions=[g.mesh.instanceMatrix.version,g.mesh.geometry.attributes.nativeVisibility.version,shadow.mesh.instanceMatrix.version];
 const source=f.batch.meshes[0];source.instanceMatrix.array[12]=1;source.instanceMatrix.needsUpdate=true;
 assert.equal(render(f).uploads,2);assert.equal(f.groups.colors.get('1:0'),g);
 assert.deepEqual([g.mesh.instanceMatrix.version,g.mesh.geometry.attributes.nativeVisibility.version,shadow.mesh.instanceMatrix.version],versions);
 const matrixVersion=f.groups.colors.get('0:0').mesh.instanceMatrix.version,shadowVersion=f.groups.shadows.get('0').mesh.instanceMatrix.version;
 source.geometry.attributes.nativeVisibility.setX(0,.4);source.geometry.attributes.nativeVisibility.needsUpdate=true;
 assert.equal(render(f).uploads,1);assert.equal(f.groups.colors.get('0:0').mesh.instanceMatrix.version,matrixVersion);assert.equal(f.groups.shadows.get('0').mesh.instanceMatrix.version,shadowVersion);f.groups.dispose();
});
