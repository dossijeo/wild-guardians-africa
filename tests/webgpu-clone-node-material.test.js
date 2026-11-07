import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshBasicNodeMaterial,MeshStandardNodeMaterial} from 'three/webgpu';
import {positionLocal} from 'three/tsl';
import {cloneWebGpuNodeMaterial} from '../src/rendering/webgpu-clone-node-material.js';

test('cloned node surfaces retain texture, surface parameters and node graph',()=>{
 const map=new THREE.Texture(),original=new MeshStandardNodeMaterial({map,color:0x48753f,roughness:.31,metalness:.42});original.positionNode=positionLocal.mul(2);original.normalScale.set(.5,.6);
 const copy=cloneWebGpuNodeMaterial(original);assert.notEqual(copy,original);assert.equal(copy.map,map);assert.equal(copy.color.getHex(),original.color.getHex());assert.equal(copy.roughness,.31);assert.equal(copy.metalness,.42);assert.deepEqual(copy.normalScale.toArray(),[.5,.6]);assert.equal(copy.positionNode,original.positionNode);copy.dispose();original.dispose();map.dispose();
});
test('basic node materials retain map and surface color',()=>{const map=new THREE.Texture(),material=new MeshBasicNodeMaterial({map,color:0x127843}),copy=cloneWebGpuNodeMaterial(material);assert.equal(copy.map,map);assert.equal(copy.color.getHex(),material.color.getHex());copy.dispose();material.dispose();map.dispose();});
