import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StepRipples} from '../src/rendering/step-ripples.js';
import {LocomotionVfx} from '../src/rendering/locomotion-vfx.js';
import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
import {Navigation} from '../src/world/navigation.js';

test('ripples stay on the water, share one draw, freeze on pause and release resources',()=>{
 const scene=new THREE.Scene(),ripples=new StepRipples(scene,4),matrix=new THREE.Matrix4();
 for(let i=0;i<7;i++)ripples.add(i,3,5,0);
 ripples.update(.2);assert.equal(ripples.mesh.count,4);assert.equal(scene.children.length,1);
 assert.equal(ripples.mesh.castShadow,false);assert.equal(ripples.material.depthWrite,false);
 ripples.mesh.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[13]-5.015)<1e-6);
 const before=[...ripples.mesh.instanceMatrix.array],version=ripples.alpha.version;
 ripples.update(.2);assert.deepEqual([...ripples.mesh.instanceMatrix.array],before);assert.equal(ripples.alpha.version,version);
 ripples.update(.9);assert.equal(ripples.mesh.count,0);assert.equal(ripples.mesh.visible,false);
 let geometryDisposed=false,materialDisposed=false;
 ripples.geometry.addEventListener('dispose',()=>geometryDisposed=true);ripples.material.addEventListener('dispose',()=>materialDisposed=true);
 ripples.dispose();assert.equal(scene.children.length,0);assert.ok(geometryDisposed&&materialDisposed);
});
for(const id of Object.keys(FOOTSTEPS.sources))test(`${id}: measured water steps create ripples instead of dust; pause and reload create no extra steps`,()=>{
 const worker=/Male|Female/.test(id),name=worker?'Walk_Skip':'Walking',clip=FOOTSTEPS.sources[id].clips[name],marker=clip.contacts[0];
 const actor={id:'actor',x:0,z:0,...(worker?{profile:id,status:'walking',walkPhase:Math.max(0,marker.time-.02)}:{species:id,status:'walking',motionPhase:Math.max(0,marker.time-.02)})};
 const scene=new THREE.Scene(),library={create(){throw Error('Water contact must not create native dust');}};
 const manager=new LocomotionVfx(library,{},scene,()=>-8,()=>({inside:true,level:4})),state={elapsed:0,time:0,workers:worker?[actor]:[],raid:{animals:worker?[]:[actor]}};
 manager.update(state);actor.x=.1;actor[worker?'walkPhase':'motionPhase']=marker.time+.02;state.elapsed=.1;manager.update(state);
 assert.ok(manager.ripples?.mesh.count>0);assert.equal(manager.effects.size,0);
 assert.equal(manager.prepare(new THREE.PerspectiveCamera()),false,'no depth capture for ripples');
 const count=manager.ripples.contacts.length;manager.update(state);assert.equal(manager.ripples.contacts.length,count);
 state.elapsed=0;manager.update(state);assert.equal(scene.children.length,0,'reload/backwards time clears stale rings');manager.dispose();
});
test('canyon actors sink only their feet rather than standing on the river bed; routes use the water plane',()=>{
 const nav=new Navigation(712,'gran-canon',{}),z=0,x=nav.field.riverX(z),water=nav.field.waterInfo(x,z);
 assert.equal(water.inside,true);assert.equal(nav.workerSurface(x,z),water.level);
 assert.equal(nav.actorSurface(x,z),water.level-.1);
 assert.ok(nav.actorSurface(x,z)>nav.field.surface(x,z)+.5);
 for(const worker of [false,true])assert.equal(nav.terrainValid(x,z,0,worker),true);
 const dry=new Navigation(712,'volcanes',{});dry.field={surface:()=>2,waterInfo:()=>({inside:false}),slope:()=>0};
 assert.equal(dry.actorSurface(0,0),2);
});
