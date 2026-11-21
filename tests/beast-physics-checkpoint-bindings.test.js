import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {BeastRagdollSolver} from '../src/simulation/beast-ragdoll.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {BeastPhysicsEnvironment} from '../src/rendering/beast-physics-environment.js';
import {beastSkin} from './helpers/beast-skin.js';
await R.init();

test('binding checkpoint preserves applied and restored poses on a fresh rig',()=>{
 const solver=new BeastRagdollSolver(R);try{
  const model=beastSkin('hyena'),binding=new BeastRagdollBinding(model),actor=solver.add('hyena',{pose:binding.capture(),colliders:binding.colliders()});for(let i=0;i<20;i++)solver.step();binding.apply(actor.pose);
  const copy=new BeastRagdollBinding(beastSkin('hyena'));copy.restoreCheckpoint(structuredClone(binding.checkpoint()));
  assert.deepEqual(copy.checkpoint(),binding.checkpoint());binding.restore();copy.restore();assert.deepEqual(copy.checkpoint(),binding.checkpoint());
  const invalid=copy.checkpoint(),before=copy.checkpoint();invalid.entries[2].name='wrong';assert.throws(()=>copy.restoreCheckpoint(invalid),/Invalid ragdoll binding pose/);assert.deepEqual(copy.checkpoint(),before);
 }finally{solver.dispose();}
});

test('environment checkpoint reconnects terrain and removed structures to restored solver',()=>{
 const solver=new BeastRagdollSolver(R),state={structures:[{id:'wall',kind:'wall',material:'zarzas',status:'intact',x:0,z:0,yaw:0,hp:100,maxHp:100}]},world={state,objects:new Map(),nav:{field:{surface:()=>0},propsAt:()=>[]}},env=new BeastPhysicsEnvironment(world,solver);let restored;
 try{
  env.sync([{x:0,z:0}]);const checkpoint=env.checkpoint();assert.ok(checkpoint.colliders.length>1);restored=BeastRagdollSolver.restoreCheckpoint(R,solver.checkpoint());const copy=new BeastPhysicsEnvironment(world,restored);copy.restoreCheckpoint(structuredClone(checkpoint));assert.deepEqual(copy.checkpoint(),checkpoint);
  state.structures[0].status='ruined';env.pruneDestroyed();copy.pruneDestroyed();assert.deepEqual(copy.checkpoint(),env.checkpoint());assert.equal(restored.obstacles.length,solver.obstacles.length);
 }finally{solver.dispose();restored?.dispose();}
});
