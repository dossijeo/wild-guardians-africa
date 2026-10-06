import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {depthPixelCandidates} from './browser/depth-pixel-candidates.js';
function fixture(){const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.z=5;camera.updateMatrixWorld();const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshBasicMaterial());mesh.name='wall';mesh.userData.entityId='center';scene.add(mesh);scene.updateMatrixWorld();return{scene,camera,mesh};}
test('GL bottom-origin pixel centers map to the geometry ray and preserve state',()=>{
 const {scene,camera,mesh}=fixture(),before=mesh.matrixWorld.elements.slice();
 const result=depthPixelCandidates(scene,camera,100,100,[{x:50,y:75},{x:50,y:75}],{recipe:()=>({features:new Set(['clip'])})});
 assert.equal(result.rows.length,1);const hit=result.rows[0].candidates[0];assert.ok(hit.point[1]>0);assert.ok(hit.point[0]>0);assert.equal(hit.entityId,'center');assert.equal(hit.name,'wall');assert.deepEqual(hit.features,['clip']);assert.deepEqual(mesh.matrixWorld.elements,before);
});
test('invisible subtrees, disabled depth, transparent surfaces and empty instances are excluded',()=>{
 const {scene,camera,mesh}=fixture();
 for(const kind of ['hidden-parent','hidden-material','no-depth','transparent']){
  const group=new THREE.Group();scene.add(group);group.add(mesh);group.visible=kind!=='hidden-parent';mesh.material.visible=kind!=='hidden-material';mesh.material.depthWrite=kind!=='no-depth';mesh.material.transparent=kind==='transparent';
  assert.deepEqual(depthPixelCandidates(scene,camera,100,100,[{x:50,y:50}]).rows[0].candidates,[],kind);scene.remove(group);
 }
 const empty=new THREE.InstancedMesh(mesh.geometry,new THREE.MeshBasicMaterial(),1);empty.count=0;scene.add(empty);
 assert.deepEqual(depthPixelCandidates(scene,camera,100,100,[{x:50,y:50}]).rows[0].candidates,[]);
});
test('alpha surfaces remain candidates and bounded queries reject invalid inputs',()=>{
 const {scene,camera,mesh}=fixture();mesh.material.alphaTest=.5;
 const report=depthPixelCandidates(scene,camera,100,100,[{x:50,y:50}],{limit:1});assert.equal(report.rows[0].candidates.length,1);assert.equal(report.rows[0].candidates[0].alphaTest,.5);assert.match(report.scope,/do not prove/);
 for(const pixels of [[{x:-1,y:0}],[{x:100,y:0}],[{x:.5,y:0}],Array(9).fill({x:0,y:0})])assert.throws(()=>depthPixelCandidates(scene,camera,100,100,pixels));
 assert.throws(()=>depthPixelCandidates(scene,camera,0,100,[]));assert.throws(()=>depthPixelCandidates(scene,camera,100,100,[],{limit:17}));
});
test('geometry beyond the camera clip planes cannot be a candidate',()=>{
 const {scene,camera,mesh}=fixture();mesh.position.z=-200;scene.updateMatrixWorld();
 assert.deepEqual(depthPixelCandidates(scene,camera,100,100,[{x:50,y:50}]).rows[0].candidates,[]);
});
