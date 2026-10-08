import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cloneRuntimeMaterial} from '../src/rendering/clone-runtime-material.js';
test('runtime clone copies native fields without serializing borrowed texture uniforms',()=>{
 const material=new THREE.MeshStandardMaterial({color:'#c9865e',roughness:.9,side:THREE.DoubleSide}),map=new THREE.Texture(),vector=new THREE.Vector4(1,2,3,4);let serializations=0;map.toJSON=()=>{serializations++;throw Error('Unexpected texture image encoding');};
 const data={biomeGround:{uGroundDetailMap:{value:map},uGroundRect:{value:vector}},label:'native-ground'};material.userData=data;material.map=map;const clone=cloneRuntimeMaterial(material);
 assert.equal(serializations,0);assert.equal(material.userData,data);assert.notEqual(clone.userData,data);assert.equal(clone.userData.biomeGround,data.biomeGround);assert.equal(clone.map,map);assert.equal(clone.roughness,material.roughness);assert.equal(clone.side,material.side);assert.deepEqual(clone.color,material.color);assert.notEqual(clone.color,material.color);clone.dispose();material.dispose();map.dispose();
});
test('runtime clone retains the ground borrower until both material owners close',()=>{
 const material=new THREE.MeshBasicMaterial();let owners=0,released=0;const retain=next=>{owners++;next.addEventListener('dispose',()=>{if(--owners===0)released++;});};material.userData={retainBiomeGround:retain};retain(material);const clone=cloneRuntimeMaterial(material);assert.equal(owners,2);material.dispose();assert.equal(released,0);clone.dispose();assert.equal(owners,0);assert.equal(released,1);
});
