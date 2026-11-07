import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSharedCharacterFallback} from '../src/labs/shared-character-material.js';

test('compatible actors share one material but retain independent parameter values',()=>{
 const first=new THREE.MeshStandardMaterial({color:0xff0000,roughness:.2,metalness:.1,side:THREE.DoubleSide}),second=new THREE.MeshStandardMaterial({color:0x00ff00,roughness:.8,metalness:.4,side:THREE.DoubleSide});
 const a=new THREE.Mesh(new THREE.BoxGeometry(),first),b=new THREE.Mesh(new THREE.BoxGeometry(),second),shared=createSharedCharacterFallback(first);
 assert.equal(shared.bind(a,first),true);assert.equal(shared.bind(b,second),true);assert.equal(shared.parameters(a).roughness,.2);assert.equal(shared.parameters(b).roughness,.8);assert.notEqual(shared.parameters(a).color,first.color);shared.parameters(a).color.setRGB(0,0,1);assert.equal(first.color.r,1);assert.equal(shared.parameters(b).color.g,1);assert.notEqual(shared.parameters(a),shared.parameters(b));shared.release(a);assert.equal(shared.parameters(a),undefined);assert.ok(shared.parameters(b));shared.dispose();
});
test('incompatible rendering features stay on their existing material path',()=>{
 const source=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),source),shared=createSharedCharacterFallback(source),other=source.clone();other.transparent=true;assert.equal(shared.bind(mesh,other),false);other.transparent=false;other.side=THREE.FrontSide;assert.equal(shared.bind(mesh,other),false);shared.dispose();
});
