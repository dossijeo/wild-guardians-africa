import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ProvisionalBuildings} from '../src/rendering/provisional-buildings.js';

test('provisional buildings use shared geometry and never enter the simulation',()=>{
 let clock=0;const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),source=new THREE.MeshBasicMaterial(),templates=new Map([['culture',{body:geometry,material:source,scale:2}]]);
 const buildings=new ProvisionalBuildings(scene,templates,()=>4,{now:()=>clock});
 assert.equal(buildings.begin('a','missing',0,0),false);assert.equal(buildings.begin('a','culture',3,5),true);
 const {mesh,material}=buildings.entries.get('a');assert.equal(mesh.geometry,geometry);assert.deepEqual(mesh.position.toArray(),[3,4.025,5]);assert.equal(mesh.scale.x,2);
 const opacity=material.opacity;clock=300;buildings.update();assert.notEqual(material.opacity,opacity);buildings.remove('a');assert.equal(scene.children.length,0);assert.equal(buildings.entries.size,0);geometry.dispose();source.dispose();
});
