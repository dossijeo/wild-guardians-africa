import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {WorldScene} from '../src/rendering/scene.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {CameraWallRegistry} from '../src/rendering/camera-wall-registry.js';
import {focusTerrainCamera,protectTerrainCamera,installTerrainCameraIntent} from '../src/rendering/terrain-camera.js';
test('wall volumes follow finite native part envelopes, gate hinge and deletion',()=>{
 const index=new CameraVolumeIndex(),registry=new CameraWallRegistry(index),root=new THREE.Group();root.userData.nativeWall=true;root.stageKey='gate';root.visual=0;root.gateOpen=0;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,4,.4));root.add(mesh);root.parts=[{mesh}];const objects=new Map([[1,root]]),entities=[{id:1}];
 registry.sync(objects,entities);assert.ok(index.sweep([0,2,0],[0,2,0],.3));assert.equal(index.sweep([0,5,0],[0,5,0],.3),null);
 mesh.position.x=4;root.gateOpen=1;registry.sync(objects,entities);assert.equal(index.sweep([0,2,0],[0,2,0],.3),null);
 assert.ok(index.sweep([4,2,0],[4,2,0],.3));registry.sync(objects,[]);assert.equal(index.records.size,0);mesh.geometry.dispose();
});
test('contextual height permits tall roof overflight and preserves intent leaving its neighborhood',async()=>{
 const field={surface:()=>0},camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null),root=new THREE.Group();
 root.userData.nativeBuilding=true;root.damage=0;const bounds=new THREE.Box3(new THREE.Vector3(-8,0,-8),new THREE.Vector3(8,35,8));root.template={culling:{boxes:{still:bounds,fall:bounds,ash:bounds}}};
 const world={camera,nav:{field},objects:new Map([[1,root]]),state:{villages:[],structures:[{id:1,kind:'center'}]}};
 WorldScene.prototype.setCameraExclusion.call(world,true);const release=installTerrainCameraIntent(camera,controls,()=>field);
 focusTerrainCamera(camera,controls,field,{x:0,z:0,distance:60});
 // OrbitControls receives an upward request; the terrain recipe must negotiate
 // the contextual ceiling before limiting the requested radius and height.
 camera.position.set(0,45,8);protectTerrainCamera(camera,controls,field);
 // An ordinary upward gesture converges smoothly; focus is the explicit reset.
 for(let i=0;i<100;i++){await new Promise(resolve=>setTimeout(resolve,8));camera.position.set(0,45,8);protectTerrainCamera(camera,controls,field);}
 assert.ok(camera.position.y>35);assert.equal(world.cameraExclusion.registry.index.sweep(camera.position.toArray(),camera.position.toArray(),.45),null);
 const before=camera.position.y;camera.position.x+=200;controls.target.x+=200;protectTerrainCamera(camera,controls,field);assert.ok(camera.position.y>=before-.001);
 for(let i=0;i<100;i++)protectTerrainCamera(camera,controls,field);assert.equal(world.cameraExclusion.motion.stats.unresolved,false);
 release();world.releaseCameraExclusion();
});
test('indexed neighborhood query excludes distant populations and retains large intersecting bounds',()=>{
 const index=new CameraVolumeIndex();for(let i=0;i<1000;i++)index.set(i,{min:[i*20,0,0],max:[i*20+3,8,3]});
 assert.deepEqual(index.queryXZ(-5,-5,5,5).map(x=>x.id),[0]);
});
