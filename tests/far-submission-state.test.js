import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {activeAttributeHash,captureFarSubmissionState} from './browser/far-submission-state.js';
test('active CPU hash excludes unused instance capacity and observes active bytes',()=>{
 const a=new THREE.InstancedBufferAttribute(new Float32Array([1,2,3,4,5,6]),3),h=activeAttributeHash(a,1);a.setXYZ(1,9,8,7);assert.deepEqual(activeAttributeHash(a,1),h);a.setX(0,2);assert.notDeepEqual(activeAttributeHash(a,1),h);assert.equal(h.bytes,12);assert.equal(activeAttributeHash(null),null);
});
test('submission trace records actual counts/programs and restores nested hooks even on failure',()=>{
 const object=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),4);object.count=2;const renderer={info:{autoReset:true,render:{calls:0,triangles:0},reset(){this.render.calls=0;this.render.triangles=0;}},getRenderTarget:()=>null,properties:{get:()=>({currentProgram:{id:17}})},renderBufferDirect(){this.info.render.calls++;this.info.render.triangles+=24;}},original=renderer.renderBufferDirect;
 const world={renderer,state:{workers:[],plants:[],crates:[],villages:[],spells:[],structures:[]},destructionPass:{buildings:[],smokeDepth:{}},sun:{shadow:{map:{}}},sky:{scene:{}}};
 const result=captureFarSubmissionState(world,()=>renderer.renderBufferDirect(null,null,object.geometry,object.material,object,null));assert.equal(result.draws.length,1);assert.equal(result.draws[0].count,2);assert.equal(result.draws[0].program,17);assert.equal(result.draws[0].instanceMatrices.bytes,128);assert.equal(result.breakdown.totals.triangles,24);assert.equal(renderer.renderBufferDirect,original);assert.equal(renderer.info.autoReset,true);
 assert.throws(()=>captureFarSubmissionState(world,()=>{throw Error('sentinel');}),/sentinel/);assert.equal(renderer.renderBufferDirect,original);assert.equal(renderer.info.autoReset,true);object.geometry.dispose();object.material.dispose();
});
