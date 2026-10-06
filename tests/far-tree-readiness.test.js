import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
import {lodMix} from '../tools/experiments/far-impostor-math.js';
test('independent tree readiness preserves neighbours and follows packed slots across camera movement',()=>{
 const source=new THREE.Mesh(new THREE.BoxGeometry(2,4,2),new THREE.MeshBasicMaterial()),texture=new THREE.Texture(),metadata={impostorWidth:2,impostorHeight:4,localBase:[0,0,0]},trees=[{id:'a',x:0,y:0,z:0,yaw:0,scale:1},{id:'b',x:100,y:0,z:0,yaw:0,scale:1},{id:'c',x:10,y:0,z:0,yaw:0,scale:1}],p=createFarImpostorPrototype(source,texture,metadata,trees),camera=new THREE.PerspectiveCamera();camera.position.set(0,10,25);p.update(camera);
 assert.equal(p.models.count,2);assert.equal(p.setTreeReadiness('c',0),true);p.update(camera);
 assert.deepEqual([...p.impostors.geometry.attributes.aTreeReady.array],[1,1,0]);assert.deepEqual([...p.models.geometry.attributes.aTreeReady.array].slice(0,2),[1,0]);
 assert.equal(lodMix(25,40,60,p.impostors.geometry.attributes.aTreeReady.getX(2)),1);assert.equal(lodMix(25,40,60,p.impostors.geometry.attributes.aTreeReady.getX(0)),0);
 const matrices=p.stats().matrixUploads,version=p.models.geometry.attributes.aTreeReady.version;for(let i=0;i<180;i++){assert.equal(p.setTreeReadiness('c',0),false);p.update(camera);}assert.equal(p.stats().matrixUploads,matrices);assert.equal(p.models.geometry.attributes.aTreeReady.version,version);
 for(const value of [.25,.5,.75,1]){p.setTreeReadiness('c',value);p.update(camera);assert.equal(p.models.geometry.attributes.aTreeReady.getX(1),value);assert.equal(p.models.geometry.attributes.aTreeReady.getX(0),1);assert.equal(lodMix(25,40,60,value),1-value);}
 p.setTreeReadiness('c',0);camera.position.set(110,10,0);p.update(camera);assert.equal(p.models.count,1);assert.equal(p.models.geometry.attributes.aTreeReady.getX(0),1);
 const revision=p.stats().readinessRevision;assert.equal(p.setTreeReadiness('missing',0),false);for(const invalid of [-1,2,NaN,Infinity])assert.throws(()=>p.setTreeReadiness('a',invalid),/Invalid/);assert.equal(p.stats().readinessRevision,revision);
 p.dispose();source.geometry.dispose();source.material.dispose();
});
