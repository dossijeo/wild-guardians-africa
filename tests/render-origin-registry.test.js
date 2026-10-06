import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SceneMaterialRegistry} from '../src/rendering/material-registry.js';
import {renderOriginBounds,withRenderOrigin} from '../src/rendering/render-origin.js';

function fixture(){
 const scene=new THREE.Scene(),registry=new SceneMaterialRegistry(scene,{material(){}}),geometry=new THREE.BoxGeometry();
 const water=new THREE.MeshBasicMaterial(),horizon=new THREE.MeshBasicMaterial();
 water.userData.paintUniforms={uFluidBounds:{value:new THREE.Vector4(10,20,30,40)}};
 horizon.userData.horizonBounds=new THREE.Vector4(-20,-30,50,60);
 const group=new THREE.Group();group.visible=false;
 group.add(new THREE.Mesh(geometry,[water,horizon,water]),new THREE.Mesh(geometry,water));scene.add(group);
 return {scene,registry,geometry,water,horizon,group};
}
function same(f){
 const actual=renderOriginBounds(f.scene,f.registry.materials.keys()),expected=renderOriginBounds(f.scene);
 assert.equal(actual.length,expected.length);assert.ok(expected.every(bound=>actual.includes(bound)));
}

test('origin bounds retain shared hidden materials without walking the scene graph',()=>{
 const f=fixture();same(f);
 const original=f.scene.traverse;f.scene.traverse=()=>{throw Error('complete scene scan');};
 assert.deepEqual(new Set(renderOriginBounds(f.scene,f.registry.materials.keys())),new Set([f.water.userData.paintUniforms.uFluidBounds.value,f.horizon.userData.horizonBounds]));
 f.scene.traverse=original;f.registry.dispose();f.geometry.dispose();f.water.dispose();f.horizon.dispose();
});

test('streaming, replacement, reparenting and changed uniform objects follow the live registry',()=>{
 const f=fixture();const other=new THREE.Group();f.scene.add(other);other.add(f.group);same(f);
 const old=f.water.userData.paintUniforms.uFluidBounds.value,next=new THREE.Vector4(100,200,300,400);
 f.water.userData.paintUniforms.uFluidBounds.value=next;same(f);assert.ok(!renderOriginBounds(f.scene,f.registry.materials.keys()).includes(old));
 delete f.horizon.userData.horizonBounds;same(f);
 f.group.children[0].material=f.horizon;f.registry.refresh(f.group.children[0]);same(f);
 f.group.remove(f.group.children[1]);same(f);assert.ok(!f.registry.materials.has(f.water));
 f.scene.remove(other);same(f);assert.deepEqual(renderOriginBounds(f.scene,f.registry.materials.keys()),[]);
 f.registry.dispose();f.geometry.dispose();f.water.dispose();f.horizon.dispose();
});

test('live bound identities are offset once and restored after a failing recentered draw',()=>{
 const f=fixture(),camera=new THREE.PerspectiveCamera(),origin={x:48,z:-96},bounds=renderOriginBounds(f.scene,f.registry.materials.keys()),saved=bounds.map(b=>b.clone());
 assert.throws(()=>withRenderOrigin({scene:f.scene,camera,origin,minMax:bounds},()=>{
  for(let i=0;i<bounds.length;i++)assert.deepEqual(bounds[i].toArray(),[saved[i].x-48,saved[i].y+96,saved[i].z-48,saved[i].w+96]);
  throw Error('draw failure');
 }),/draw failure/);
 bounds.forEach((b,i)=>assert.deepEqual(b.toArray(),saved[i].toArray()));same(f);
 f.registry.dispose();f.geometry.dispose();f.water.dispose();f.horizon.dispose();
});
