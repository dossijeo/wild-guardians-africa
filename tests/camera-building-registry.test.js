import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CameraBuildingRegistry} from '../src/rendering/camera-building-registry.js';
import {installCameraPoseResolver,installTerrainCameraIntent,focusTerrainCamera,updateTerrainCamera} from '../src/rendering/terrain-camera.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const bounds=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,5,2));
const center=()=>{const root=new THREE.Group();root.userData.nativeBuilding=true;root.damage=0;root.template={culling:{boxes:{still:bounds,fall:bounds.clone().expandByScalar(2),ash:new THREE.Box3(new THREE.Vector3(-3,0,-3),new THREE.Vector3(3,1,3))}}};return root;};
test('registry updates native state, transform, replacement and removal without rebuilding idle volumes',()=>{
 const registry=new CameraBuildingRegistry({centerMargin:.1}),root=center(),objects=new Map([[1,root]]),entities=[{id:1}];
 registry.sync(objects,entities);const first=registry.index.records.get('1:center');
 for(let i=0;i<100;i++)registry.sync(objects,entities);assert.equal(registry.revisions,1);assert.equal(registry.index.records.get('1:center'),first);
 root.position.x=20;registry.sync(objects,entities);assert.equal(registry.revisions,2);assert.equal(registry.index.sweep([-10,2,0],[10,2,0]),null);
 root.damage=.9;registry.sync(objects,entities);assert.ok(registry.index.records.get('1:center').max[1]>7);
 root.damage=1;registry.sync(objects,entities);assert.ok(registry.index.records.get('1:center').max[1]<2);
 objects.set(1,center());registry.sync(objects,entities);assert.equal(registry.index.records.size,1);
 registry.sync(objects,[]);assert.equal(registry.index.records.size,0);assert.equal(registry.roots.size,0);
});
test('village registry uses independent unit boxes and excludes unrelated decorative meshes',()=>{
 const registry=new CameraBuildingRegistry({villageMargin:0}),root=new THREE.Group(),geometry=new THREE.BoxGeometry(100,100,100),material=new THREE.MeshBasicMaterial();
 for(let i=0;i<2;i++){const mesh=new THREE.Mesh(geometry,material);mesh.userData.unit={min:[-1,0,-1],max:[1,3,1]};mesh.position.x=i*20;mesh.scale.setScalar(16);root.add(mesh);}
 root.add(new THREE.Mesh(geometry,material));registry.sync(new Map([[1,root]]),[{id:1}]);assert.equal(registry.index.records.size,2);
 assert.equal(registry.index.sweep([0,60,0],[0,60,0]),null);registry.clear();assert.equal(registry.index.cells.size,0);geometry.dispose();material.dispose();
});
test('pose resolver keeps desired eye separate from correction through synchronous updates and focus',()=>{
 const camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null),field={surface:()=>0},contexts=[];
 const releaseIntent=installTerrainCameraIntent(camera,controls,()=>field);
 const release=installCameraPoseResolver(camera,(desired,previous,context)=>{contexts.push(context);return {...desired,eye:[desired.eye[0]+1,desired.eye[1],desired.eye[2]]};});
 focusTerrainCamera(camera,controls,field,{x:0,z:0});const expected=camera.position.clone();assert.equal(contexts.at(-1),'focus');
 for(let i=0;i<200;i++){updateTerrainCamera(camera,controls,field);assert.ok(camera.position.distanceTo(expected)<1e-9);}
 assert.throws(()=>installCameraPoseResolver(camera,()=>{}));release();updateTerrainCamera(camera,controls,field);assert.ok(Math.abs(camera.position.x-expected.x+1)<1e-9);releaseIntent();
});
