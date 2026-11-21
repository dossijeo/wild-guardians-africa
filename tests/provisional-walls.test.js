import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ProvisionalWalls} from '../src/rendering/provisional-walls.js';

test('terrain revisions update all wall pieces atomically without replacing their mesh',()=>{
 let missing=false,height=0;const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),prototype=new THREE.Mesh(geometry,material),walls=new ProvisionalWalls(scene,{zarzas_intacto:prototype},x=>missing&&x>0?null:height+x),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
 try{walls.begin('w','zarzas',[{x:0,z:0,yaw:.2,scaleX:2},{x:1,z:0,yaw:.4}]);const mesh=walls.entries.get('w').mesh;const y=i=>{mesh.getMatrixAt(i,matrix);matrix.decompose(position,quaternion,scale);return position.y;};assert.ok(Math.abs(y(0)-.025)<1e-5);height=4;missing=true;walls.terrainChanged();assert.ok(Math.abs(y(0)-.025)<1e-5);missing=false;walls.terrainChanged();assert.equal(walls.entries.get('w').mesh,mesh);assert.ok(Math.abs(y(0)-4.025)<1e-5);assert.ok(Math.abs(y(1)-5.025)<1e-5);walls.remove('w');walls.terrainChanged();assert.equal(scene.children.length,0);}finally{walls.dispose();geometry.dispose();material.dispose();}
});

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
test('individual gate preview uses the gate prototype and scale',()=>{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),prototype=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
 const walls=new ProvisionalWalls(scene,{piedra_puerta:prototype},()=>0);assert.equal(walls.begin('gate','piedra',[{x:0,z:0}],{gate:true}),true);
 const matrix=new THREE.Matrix4();walls.entries.get('gate').mesh.getMatrixAt(0,matrix);const scale=new THREE.Vector3();matrix.decompose(new THREE.Vector3(),new THREE.Quaternion(),scale);assert.ok(Math.abs(scale.x-1.4)<1e-6);walls.dispose();geometry.dispose();prototype.material.dispose();
});
test('borrowed provisional material survives individual wall removal',()=>{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),original=new THREE.MeshBasicMaterial(),paint=new THREE.MeshBasicMaterial(),prototype=new THREE.Mesh(geometry,original);let disposed=0;paint.addEventListener('dispose',()=>disposed++);
 const walls=new ProvisionalWalls(scene,{piedra_intacto:prototype},()=>0,{materialFor:()=>paint});assert.equal(walls.begin('wall','piedra',[{x:0,z:0}]),true);assert.equal(walls.entries.get('wall').mesh.material,paint);walls.dispose();assert.equal(disposed,0);paint.dispose();assert.equal(disposed,1);geometry.dispose();original.dispose();
});
