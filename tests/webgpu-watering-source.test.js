import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuWateringSource} from '../src/rendering/webgpu-watering-source.js';
import {WorldScene} from '../src/rendering/scene.js';
import {createWateringEmitter} from '../src/rendering/watering-emitter.js';

test('watering source matches the legacy transform while the legacy root is stale',()=>{
 const profile={frames:1,positions:[.2,1,.4,.3,1.2,.5],directions:[0,0,1,0,0,1]},worker={id:'w',profile:'youngMale',x:3,z:4,heading:.8},state={workers:[worker]},effect=new THREE.Group(),root=new THREE.Group(),scene=new THREE.Scene();scene.add(root,effect);effect.position.set(5,2,7);effect.rotation.y=.3;effect.surfaceInverse=new THREE.Matrix4();const headings=new Map([['w',.8]]),world={state,mixers:new Map([['w',{profile:'youngMale'}]]),objects:new Map([['w',root]]),wateringEmitters:new Map([['youngMale',createWateringEmitter(profile)]]),waterMouth:new THREE.Vector3(),waterDirection:new THREE.Vector3(),nav:{actorSurface:()=>2},legacyActorRootsDeferred:true,trackedWorkerVisualYaw:()=>.8};
 const legacy=WorldScene.prototype.wateringSource.call(world,'w',1,effect),sample=createWebGpuWateringSource({state,surface:()=>2,profiles:{youngMale:profile},headings}),gpu=sample('w',1,effect);for(let i=0;i<3;i++){assert.ok(Math.abs(legacy.position[i]-gpu.position[i])<1e-10);assert.ok(Math.abs(legacy.direction[i]-gpu.direction[i])<1e-10);}assert.deepEqual(root.position.toArray(),[0,0,0]);assert.equal(sample('missing',1,effect),null);
});
