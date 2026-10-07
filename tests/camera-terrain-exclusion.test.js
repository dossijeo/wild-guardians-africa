import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {CameraExclusionMotion} from '../src/rendering/camera-exclusion-motion.js';
import {constrainCameraToTerrain} from '../src/rendering/camera-terrain-exclusion.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {WorldScene} from '../src/rendering/scene.js';
import {focusTerrainCamera,protectTerrainCamera} from '../src/rendering/terrain-camera.js';
const fixture=box=>{const index=new CameraVolumeIndex();index.set('house',box);return new CameraExclusionMotion(index);};
const safe=(result,motion,field)=>{
 assert.equal(result.resolved,true);assert.equal(motion.index.sweep(result.point,result.point,motion.radius),null);
 const altitude=result.point[1]-field.surface(result.point[0],result.point[2]);assert.ok(altitude>=2&&altitude<=20);
};
test('terrain floor and a tall house cannot bounce recovery below ground forever',()=>{
 const motion=fixture({min:[-20,0,-20],max:[20,30,20]}),field={surface:()=>0};
 let old=[0,1,0];for(let i=0;i<3;i++){old[1]=2;old=motion.recover(old).point;}
 assert.ok(old[1]<2,'reproduces the previous floor/nearest-face conflict');
 const result=constrainCameraToTerrain([0,1,0],motion,field);safe(result,motion,field);assert.ok(Math.abs(result.point[0])>20);
});
test('recovery respects ceiling and finite roofs still allow overflight',()=>{
 const field={surface:()=>0},tall=fixture({min:[-20,0,-20],max:[20,30,20]});
 safe(constrainCameraToTerrain([0,40,0],tall,field),tall,field);
 const short=fixture({min:[-20,0,-20],max:[20,15,20]}),result=constrainCameraToTerrain([0,14,0],short,field);
 safe(result,short,field);assert.ok(result.point[1]>15);assert.equal(result.point[0],0);
});
test('candidate terrain height is resampled after lateral recovery on a cliff',()=>{
 const motion=fixture({min:[-20,0,-20],max:[20,40,20],yaw:.35}),field={surface:(x,z)=>Math.abs(x)>20||Math.abs(z)>20?50:0};
 const result=constrainCameraToTerrain([0,2,0],motion,field);safe(result,motion,field);assert.equal(result.point[1],52);
});
test('overlapping buildings expand the encountered envelope without scanning the scene',()=>{
 const motion=fixture({min:[-1,0,-1],max:[1,30,1]});motion.index.set('right',{min:[-20,0,-20],max:[20,30,20]});
 const result=constrainCameraToTerrain([0,2,0],motion,{surface:()=>0});safe(result,motion,{surface:()=>0});assert.ok(result.iterations>1);
});
test('clear poses remain stable and retain the native altitude range',()=>{
 const motion=fixture({min:[-2,0,-2],max:[2,5,2]}),field={surface:()=>10};
 for(const y of [0,12,20,40]){
  const result=constrainCameraToTerrain([30,y,0],motion,field);safe(result,motion,field);assert.equal(result.iterations,0);
  assert.deepEqual(constrainCameraToTerrain(result.point,motion,field).point,result.point);
 }
 assert.throws(()=>constrainCameraToTerrain([30,2,0],motion,{surface:()=>NaN}));
});
test('bounded recovery reports unresolved pathological nesting rather than claiming safety',()=>{
 const motion=fixture({min:[-1,0,-1],max:[1,30,1]});
 for(let i=2;i<=14;i++)motion.index.set('nested'+i,{min:[-i,0,-i],max:[i,30,i]});
 const result=constrainCameraToTerrain([0,1,0],motion,{surface:()=>0});
 assert.equal(result.resolved,false);assert.equal(result.iterations,12);assert.equal(result.point[1],2);
 assert.ok(motion.index.sweep(result.point,result.point,.45));
});
test('scene resolver reconciles terrain after focus recovery and remains stable while idle',()=>{
 const camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null),field={surface:()=>0},root=new THREE.Group();
 root.userData.nativeBuilding=true;root.damage=0;
 const bounds=new THREE.Box3(new THREE.Vector3(-100,0,-100),new THREE.Vector3(100,30,100));
 root.template={culling:{boxes:{still:bounds,fall:bounds,ash:bounds}}};
 const scene={camera,nav:{field},objects:new Map([[1,root]]),state:{villages:[],structures:[{id:1,kind:'center'}]}};
 WorldScene.prototype.setCameraExclusion.call(scene,true,{centerMargin:0});
 focusTerrainCamera(camera,controls,field,{x:0,z:0});
 const first=camera.position.clone();assert.ok(first.y>=2&&first.y<=20);
 assert.equal(scene.cameraExclusion.registry.index.sweep(first.toArray(),first.toArray(),.45),null);
 for(let i=0;i<200;i++)protectTerrainCamera(camera,controls,field);
 assert.ok(camera.position.distanceTo(first)<.001,JSON.stringify({first:first.toArray(),last:camera.position.toArray(),stats:scene.cameraExclusion.motion.stats}));assert.equal(scene.cameraExclusion.motion.stats.terrainConflict,false);
 WorldScene.prototype.setCameraExclusion.call(scene,false);assert.equal(scene.cameraExclusion,null);
});
