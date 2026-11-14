import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {uniform} from 'three/tsl';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {createConfirmedGpuMotion} from '../src/rendering/confirmed-gpu-motion.js';
import {createConfirmedGpuMotionPool} from '../src/rendering/confirmed-gpu-motion-pool.js';
import {bindWebGpuActorMotion} from '../src/rendering/webgpu-actor-motion-binding.js';

test('pooled actors share graphs while retaining independent paths and lifetimes',()=>{
 const deleted=[],clock=uniform(0),renderer={backend:{isWebGPUBackend:true},_attributes:{delete:value=>deleted.push(value)},library:{fromMaterial:()=>new MeshBasicNodeMaterial()}},pool=createConfirmedGpuMotionPool({renderer,clock,maxSegments:2,capacity:2}),motions=['a','b'].map(actorId=>createConfirmedGpuMotion({actorId,clock,maxSegments:2,pool})),material=new MeshBasicNodeMaterial(),geometry=new THREE.BoxGeometry(),roots=motions.map(()=>{const root=new THREE.Group();root.add(new THREE.Mesh(geometry,material));return root;});
 const bindings=[];try{
  for(const [index,motion] of motions.entries()){const distance=index+1;motion.install({actorId:motion.actorId,continuous:true,timed:true,start:{at:0,x:0,z:0},end:{at:1,x:distance,z:0},segments:[{t0:0,t1:1,x0:0,z0:0,x1:distance,z1:0}]},1);bindings.push(bindWebGpuActorMotion({root:roots[index],renderer,motion,actorId:motion.actorId,getPickTime:()=>.5}));}
  assert.notEqual(motions[0].objectState.slot,motions[1].objectState.slot);assert.equal(roots[0].children[0].material.positionNode,roots[1].children[0].material.positionNode);assert.ok(motions[1].sample(.5).x>motions[0].sample(.5).x);assert.equal(roots[0].children[0]._wgMotion,motions[0].objectState);
  motions[0].hold(.25);assert.ok(motions[0].sample(.8).x<.26);assert.ok(motions[1].sample(.8).x>1.5);pool.dispose();assert.equal(deleted.length,0);bindings[0].dispose();motions[0].dispose();assert.equal(deleted.length,0);bindings[1].dispose();motions[1].dispose();assert.equal(deleted.length,2);assert.equal(Object.hasOwn(roots[0].children[0],'_wgMotion'),false);
 }finally{for(const item of bindings)item.dispose();for(const item of motions)item.dispose();pool.dispose();material.dispose();geometry.dispose();}
});

test('capacity fallback and staged ownership never overwrite a replacement',()=>{
 const deleted=[],clock=uniform(0),renderer={backend:{isWebGPUBackend:true},_attributes:{delete:value=>deleted.push(value)},library:{fromMaterial:()=>new MeshBasicNodeMaterial()}},pool=createConfirmedGpuMotionPool({renderer,clock,maxSegments:1,capacity:1}),a=createConfirmedGpuMotion({actorId:'a',clock,maxSegments:1,pool}),b=createConfirmedGpuMotion({actorId:'b',clock,maxSegments:1,pool}),root=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new MeshBasicNodeMaterial(),mesh=new THREE.Mesh(geometry,material);root.add(mesh);
 const first={actorId:'a',continuous:true,timed:true,start:{at:0,x:0,z:0},end:{at:1,x:1,z:0},segments:[{t0:0,t1:1,x0:0,z0:0,x1:1,z1:0}]};a.install(first,1);assert.equal(b.objectState,null);assert.ok(b.texture?.isDataTexture);const binding=bindWebGpuActorMotion({root,renderer,motion:a,actorId:'a',getPickTime:()=>0,staged:true}),replacement={other:true};
 try{mesh._wgMotion=replacement;assert.throws(()=>binding.activate(),/ownership changed/);binding.dispose();assert.equal(mesh._wgMotion,replacement);assert.equal(mesh.material,material);}
 finally{binding.dispose();a.dispose();b.dispose();pool.dispose();geometry.dispose();material.dispose();}
 assert.equal(deleted.length,2);
});
