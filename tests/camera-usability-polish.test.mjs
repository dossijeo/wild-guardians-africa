import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {WorldScene} from '../src/rendering/scene.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {CameraWallRegistry} from '../src/rendering/camera-wall-registry.js';
import {focusTerrainCamera,protectTerrainCamera,installTerrainCameraIntent,nativeCameraPose} from '../src/rendering/terrain-camera.js';
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
test('building focus has a contextual visual distance with a gradual boundary and crops stay close',()=>{
 const field={surface:()=>0},camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null),root=new THREE.Group();
 root.userData.nativeBuilding=true;root.damage=0;const bounds=new THREE.Box3(new THREE.Vector3(-6,0,-6),new THREE.Vector3(6,10,6));root.template={culling:{boxes:{still:bounds,fall:bounds,ash:bounds}}};
 const world={camera,controls,nav:{field},objects:new Map([[1,root]]),state:{villages:[],structures:[{id:1,kind:'center'}]}};
 WorldScene.prototype.setCameraExclusion.call(world,true);focusTerrainCamera(camera,controls,field,{x:0,z:0,distance:4});
 assert.ok(camera.position.distanceTo(controls.target)>17,'Building zoom must remain outside problematic roof close-up');
 let previous=camera.position.distanceTo(controls.target);
 for(let x=7;x<=14;x+=.1){focusTerrainCamera(camera,controls,field,{x,z:0,distance:4});const distance=camera.position.distanceTo(controls.target);assert.ok(Math.abs(distance-previous)<5,'Boundary must not abruptly toggle the building radius');previous=distance;}
 focusTerrainCamera(camera,controls,field,{x:50,z:0,distance:4});const ordinary=nativeCameraPose(field,[50,0,0],controls.getAzimuthalAngle(),controls.getPolarAngle(),4);assert.ok(camera.position.distanceTo(new THREE.Vector3(...ordinary.eye))<.2,'Crops/NPC location retains ordinary terrain-safe close zoom');
 WorldScene.prototype.setCameraExclusion.call(world,false);assert.equal(controls.maxDistance,65);
});

test('partial wall refresh retains unrelated pieces and removes explicit destroyed pieces',()=>{
 const index=new CameraVolumeIndex(),registry=new CameraWallRegistry(index),objects=new Map(),entities=[];
 for(let id=0;id<3;id++){const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(3,4,.4));root.userData.nativeWall=true;root.gateOpen=0;root.stageKey='still';root.position.x=id*10;root.add(mesh);root.parts=[{mesh}];objects.set(id,root);entities.push({id});}
 registry.sync(objects,entities);objects.get(0).gateOpen=1;objects.get(0).parts[0].mesh.position.x=4;
 registry.sync(objects,[entities[0]],{partial:true});assert.equal(index.records.size,3);assert(index.sweep([10,2,0],[10,2,0],.3));
 registry.remove(0);registry.remove(2);assert.equal(index.records.size,1);assert(index.sweep([10,2,0],[10,2,0],.3));
 for(const root of objects.values())root.parts[0].mesh.geometry.dispose();
});
test('queued gate updates and multiple destruction keep other native camera records intact',()=>{
 const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),maxDistance:65},field={surface:()=>0},objects=new Map(),structures=[];
 for(let id=0;id<20;id++){const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(3,4,.4));root.userData.nativeWall=true;root.gateOpen=0;root.stageKey='still';root.position.set(id*6,0,20);root.add(mesh);root.parts=[{mesh}];objects.set(id,root);structures.push({id,kind:'wall'});}
 const world={camera,controls,nav:{field},objects,chunks:new Map(),chunkRevision:1,state:{villages:[],structures}};
 WorldScene.prototype.setCameraExclusion.call(world,true,{trees:true});focusTerrainCamera(camera,controls,field,{x:0,z:0,distance:25});assert.equal(world.cameraExclusion.registry.index.records.size,20);
 objects.get(0).gateOpen=1;objects.get(0).parts[0].mesh.position.x=4;world.cameraDirtyEntities.set(0,structures[0]);world.cameraVolumesDirty=true;protectTerrainCamera(camera,controls,field);assert.equal(world.cameraExclusion.registry.index.records.size,20);assert.equal(world.cameraDirtyEntities.size,0);
 for(const id of [2,3,4])world.cameraDirtyEntities.set(id,null);world.cameraVolumesDirty=true;protectTerrainCamera(camera,controls,field);assert.equal(world.cameraExclusion.registry.index.records.size,17);assert(world.cameraExclusion.walls.roots.has(10));
 WorldScene.prototype.setCameraExclusion.call(world,false);for(const root of objects.values())root.parts[0].mesh.geometry.dispose();
});
