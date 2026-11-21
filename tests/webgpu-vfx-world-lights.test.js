import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuVfxWorldLights} from '../src/rendering/webgpu-vfx-world-lights.js';

test('confirmed effects share stable light slots and retain world transforms',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),owner=createWebGpuVfxWorldLights({scene,count:2}),lights=[...owner.lights],root=new THREE.Group();root.position.set(2,0,3);root.scale.setScalar(2);scene.add(root);const effect={root,family:'combat',native:{lights:{positions:[[1,2,0],[0,0,0]],colors:[[.5,.25,.1],[0,0,0]]}}};
 try{owner.update(camera,[effect]);assert.deepEqual(owner.lights,lights);assert.ok(lights.every(light=>light.visible&&light.parent===scene));const active=lights.find(light=>light.intensity>0);assert.ok(active);assert.deepEqual(active.position.toArray(),[4,4,3]);assert.ok(Math.abs(active.intensity-4/2.2)<1e-10);assert.deepEqual(active.color.toArray(),[.5,.25,.1]);root.visible=false;owner.update(camera,[effect]);assert.ok(lights.every(light=>light.intensity===0&&light.visible));root.visible=true;effect.family='agriculture';owner.update(camera,[effect]);assert.ok(lights.every(light=>light.intensity===0));assert.deepEqual(owner.lights,lights);}finally{owner.dispose();assert.ok(lights.every(light=>!light.parent));}
});

test('light selection favours nearby sources and never grows the slot set',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),owner=createWebGpuVfxWorldLights({scene,count:1});function effect(x){const root=new THREE.Group();root.position.x=x;scene.add(root);return {root,family:'shield',native:{lights:{positions:[[0,0,0],[0,0,0]],colors:[[1,1,1],[0,0,0]]}}};}const near=effect(1),far=effect(20),light=owner.lights[0];
 try{owner.update(camera,[far,near]);assert.equal(light.position.x,1);near.disposed=true;owner.update(camera,[far,near]);assert.equal(light.position.x,20);assert.equal(scene.children.filter(item=>item.isPointLight).length,1);}finally{owner.dispose();}
});
