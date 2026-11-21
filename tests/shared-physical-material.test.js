import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSharedPhysicalMaterial,physicalFamilyKey} from '../src/labs/shared-physical-material.js';

test('physical family retains independent per-object optical values',()=>{
 const a=new THREE.MeshPhysicalMaterial({color:0xff0000,roughness:.2,metalness:.1,specularIntensity:.3,ior:1.3});
 const b=new THREE.MeshPhysicalMaterial({color:0x00ff00,roughness:.8,metalness:.7,specularIntensity:.9,ior:1.7});
 const geometry=new THREE.BoxGeometry(),one=new THREE.Mesh(geometry,a),two=new THREE.Mesh(geometry,b),family=createSharedPhysicalMaterial(a);
 assert.equal(physicalFamilyKey(a),physicalFamilyKey(b));assert.ok(family.bind(one,a));assert.ok(family.bind(two,b));assert.equal(family.parameters(one).specularIntensity,.3);assert.equal(family.parameters(two).ior,1.7);assert.notEqual(family.parameters(one).color.getHex(),family.parameters(two).color.getHex());family.dispose();
});

test('physical family rejects features and map layouts it cannot preserve',()=>{
 const base=new THREE.MeshPhysicalMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),base),family=createSharedPhysicalMaterial(base);
 for(const [key,value] of [['clearcoat',.5],['transmission',.5],['sheen',.5],['transparent',true],['alphaTest',.5],['normalMap',new THREE.Texture()]]){const changed=base.clone();changed[key]=value;assert.equal(family.supports(mesh,changed),false,key);}
 family.dispose();
});
