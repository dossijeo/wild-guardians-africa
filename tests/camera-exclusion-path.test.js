import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {WorldScene} from '../src/rendering/scene.js';
import {installTerrainCameraIntent,focusTerrainCamera,updateTerrainCamera} from '../src/rendering/terrain-camera.js';
import {runCameraExclusionPath} from './browser/camera-exclusion-path.js';
test('authored camera route drives native controls, preserves simulation and restores damping',async()=>{
 const camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null),field={surface:()=>0},root=new THREE.Group();
 controls.enableDamping=true;root.userData.nativeBuilding=true;root.damage=0;
 const bounds=new THREE.Box3(new THREE.Vector3(-5,0,-5),new THREE.Vector3(5,10,5));root.template={culling:{boxes:{still:bounds,fall:bounds,ash:bounds}}};
 const world={camera,controls,nav:{field},objects:new Map([[1,root]]),state:{biome:'fixture',culture:'fixture',elapsed:0,villages:[],structures:[{id:1,kind:'center',x:0,z:0}]}};
 world.focus=p=>focusTerrainCamera(camera,controls,field,p);world.render=()=>updateTerrainCamera(camera,controls,field);
 const release=installTerrainCameraIntent(camera,controls,()=>field);
 WorldScene.prototype.setCameraExclusion.call(world,true,{centerMargin:{horizontal:6,vertical:.6}});
 try{
  const report=await runCameraExclusionPath(world,{frame:async()=>{}});
  assert.equal(report.samples.length,218);assert.equal(report.simulationUnchanged,true);assert.equal(report.overlaps,0);assert.equal(report.unresolved,0);assert.equal(report.terrainConflicts,0);assert.equal(controls.enableDamping,true);
  const roof=report.samples.filter(s=>s.stage==='roof-orbit');assert.equal(roof.length,64);assert.ok(roof.every(s=>Math.abs(s.phi-.15)<1e-9));
  const start=report.samples.findLast(s=>s.stage==='ascend'),angles=[start,...roof].map(s=>s.theta);let angle=0;
  for(let i=1;i<angles.length;i++)angle+=Math.atan2(Math.sin(angles[i]-angles[i-1]),Math.cos(angles[i]-angles[i-1]));
  assert.ok(Math.abs(Math.abs(angle)-2*Math.PI)<1e-9);
  await assert.rejects(runCameraExclusionPath(world,{frame:async()=>{throw Error('interrupted QA frame');}}),/interrupted QA frame/);
  assert.equal(controls.enableDamping,true);
 }finally{WorldScene.prototype.setCameraExclusion.call(world,false);release();}
});
