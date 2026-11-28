import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
import {bindWebGpuActorMotion} from '../src/rendering/webgpu-actor-motion-binding.js';

test('retired motion relinquishes all movement ownership while its actor retains only one compiled material set',()=>{
 const root=new Group(),source=new MeshStandardMaterial(),geometry=new BoxGeometry(),mesh=new Mesh(geometry,source),registry=createWebGpuResourceRegistry(),renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}};
 root.add(mesh);const raycast=mesh.raycast;let retained=null,bound=0,unbound=0,disposed=0;
 const motion={actorId:'worker-1',bind(){bound++;},unbind(){unbound++;},status:()=>({installed:{start:{at:0,x:0,y:0,z:0}}})},create=()=>bindWebGpuActorMotion({root,renderer,motion,actorId:'worker-1',getPickTime:()=>0,resourceRegistry:registry}),retain=release=>{retained?.();retained=release;};
 try{
  for(let i=0;i<8;i++){
   const binding=create(),material=mesh.material;material.addEventListener('dispose',()=>disposed++);assert(binding.current());binding.dispose({retainMaterials:retain});
   assert.equal(mesh.material,source);assert.equal(mesh.raycast,raycast);assert.equal(binding.current(),false);assert.throws(()=>binding.prepareReplacement({motion}),/unavailable/);assert.equal(unbound,bound);assert.equal(registry.status().owned.length,1);assert.equal(disposed,i);
  }
  const cancelled=create();cancelled.dispose();assert.equal(unbound,bound);assert.equal(registry.status().owned.length,1);assert.equal(mesh.material,source);
  assert.throws(()=>create().dispose({retainMaterials(){throw Error('retirement rejected');}}),/retirement rejected/);assert.equal(unbound,bound);assert.equal(registry.status().owned.length,1);
  retained();retained();retained=null;assert.equal(disposed,8);assert.equal(registry.status().owned.length,0);
 }finally{retained?.();registry.dispose();source.dispose();geometry.dispose();}
});
