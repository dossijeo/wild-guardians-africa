import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraModelVolume} from '../src/rendering/camera-model-volume.js';
import {sweepCameraVolume} from '../src/rendering/camera-volume-sweep.js';
const bounds=new THREE.Box3(new THREE.Vector3(2,0,-1),new THREE.Vector3(8,5,1));
test('model volume honors offset pivots, nonuniform scale, parent yaw and configurable margin',()=>{
 const root=new THREE.Group(),mesh=new THREE.Object3D();root.position.set(100,20,-30);root.rotation.y=.5;root.add(mesh);mesh.position.set(10,2,0);mesh.rotation.y=.2;mesh.scale.set(2,3,4);root.updateMatrixWorld(true);
 const volume=cameraModelVolume('house',bounds,mesh.matrixWorld,.7),center=bounds.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
 for(let i=0;i<3;i++)assert.ok(Math.abs((volume.min[i]+volume.max[i])/2-center.getComponent(i))<1e-10);
 assert.ok(Math.abs(volume.yaw-.7)<1e-10);
 assert.ok(Math.abs(volume.max[1]-volume.min[1]-16.4)<1e-10);
 for(const x of [2,8])for(const y of [0,5])for(const z of [-1,1]){
  const p=new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).toArray();assert.ok(sweepCameraVolume(p,p,volume));
 }
});
test('unsupported tilt, shear and invalid inputs fail rather than misrepresenting a model',()=>{
 for(const matrix of [new THREE.Matrix4().makeRotationX(.2),new THREE.Matrix4().makeShear(.2,0,0,0,0,0),new THREE.Matrix4().makeScale(0,1,1)])assert.throws(()=>cameraModelVolume('bad',bounds,matrix));
 assert.throws(()=>cameraModelVolume('bad',new THREE.Box3(),new THREE.Matrix4()));
 assert.throws(()=>cameraModelVolume('bad',bounds,new THREE.Matrix4(),-1));
});
test('horizontal clearance does not inflate the roof or change scalar margin compatibility',()=>{
 const box=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,5,2)),matrix=new THREE.Matrix4().makeRotationY(.5);
 const split=cameraModelVolume('house',box,matrix,{horizontal:6,vertical:.6}),uniform=cameraModelVolume('house',box,matrix,6);
 for(const [actual,expected] of [[split.min,[-8,-.6,-8]],[split.max,[8,5.6,8]]])for(let i=0;i<3;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-12);
 assert.equal(sweepCameraVolume([-20,6.1,0],[20,6.1,0],split,.45),null);
 assert.ok(sweepCameraVolume([-20,6.1,0],[20,6.1,0],uniform,.45));
 assert.deepEqual(cameraModelVolume('same',box,matrix,.6),cameraModelVolume('same',box,matrix,{horizontal:.6,vertical:.6}));
 for(const margin of [null,{}, {horizontal:6},{vertical:.6},{horizontal:6,vertical:-1},{horizontal:NaN,vertical:.6},{horizontal:6,vertical:Infinity}])assert.throws(()=>cameraModelVolume('bad',box,matrix,margin));
});
