import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ProvisionalWalls} from '../src/rendering/provisional-walls.js';

test('provisional wall instances share geometry and are released independently',()=>{
 let clock=0;const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),prototype=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
 const walls=new ProvisionalWalls(scene,{zarzas_intacto:prototype},()=>2,{now:()=>clock});
 assert.equal(walls.beginStroke('first','zarzas',[[0,0],[5,0]],[],4),true);
 assert.equal(walls.begin('second','zarzas',[{x:10,z:4,yaw:0}]),true);
 const first=walls.entries.get('first').mesh,second=walls.entries.get('second').mesh;assert.equal(first.geometry,geometry);assert.ok(first.count>1);assert.equal(second.count,1);
 const opacity=first.material.opacity;clock=300;walls.update();assert.notEqual(first.material.opacity,opacity);
 walls.remove('first');assert.equal(scene.children.includes(first),false);assert.equal(scene.children.includes(second),true);
 walls.dispose();assert.equal(scene.children.length,0);assert.equal(walls.entries.size,0);geometry.dispose();prototype.material.dispose();
});
