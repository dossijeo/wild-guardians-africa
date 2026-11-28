import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {BeastRagdollSolver} from '../src/simulation/beast-ragdoll.js';
import {BeastPhysicsEnvironment} from '../src/rendering/beast-physics-environment.js';
await R.init();

test('shared terrain and solids are unique, retained and pruned between encounters',()=>{
 const solver=new BeastRagdollSolver(R),world={state:{structures:[{id:'wall',kind:'wall',status:'intact',x:0,z:1}]},objects:new Map(),nav:{field:{surface:(x,z)=>.01*x+.02*z},propsAt:()=>[{slot:0,x:1,z:1,radius:.5}]}};
 const environment=new BeastPhysicsEnvironment(world,solver),animal={x:0,z:0};
 environment.sync([animal]);const count=solver.world.colliders.len(),handles=[...environment.colliders.values()].filter(Boolean).map(c=>c.handle);
 environment.sync([animal,{...animal},{...animal}]);assert.equal(solver.world.colliders.len(),count);assert.deepEqual([...environment.colliders.values()].filter(Boolean).map(c=>c.handle),handles);
 for(let i=0;i<30;i++){environment.sync([{x:i*30,z:i*30}]);assert.ok(solver.world.colliders.len()<=count);assert.equal(solver.obstacles.length,solver.world.colliders.len());}
 environment.sync([]);assert.equal(solver.world.colliders.len(),0);assert.equal(environment.colliders.size,0);assert.equal(solver.obstacles.length,0);solver.dispose();
});


test('destroyed structures stop colliding during an encounter without rebuilding terrain',()=>{
 const solver=new BeastRagdollSolver(R),wall={id:12,kind:'wall',status:'intact',x:0,z:1};
 const world={state:{structures:[wall]},objects:new Map(),nav:{field:{surface:()=>0}}};
 const environment=new BeastPhysicsEnvironment(world,solver);environment.sync([{x:0,z:0}]);
 const count=solver.world.colliders.len(),ground=[...environment.colliders].filter(([key])=>key.startsWith('ground:'));
 environment.pruneDestroyed();assert.equal(solver.world.colliders.len(),count);
 wall.status='destroyed';environment.pruneDestroyed();
 assert.equal(solver.world.colliders.len(),count-1);assert.equal(environment.colliders.has('structure:12'),false);
 for(const [key,collider] of ground)assert.equal(environment.colliders.get(key),collider);
 assert.equal(solver.obstacles.length,count-1);
 environment.pruneDestroyed();assert.equal(solver.world.colliders.len(),count-1);
 wall.status='intact';environment.sync([{x:0,z:0}]);assert.equal(solver.world.colliders.len(),count);
 world.state.structures=[];environment.pruneDestroyed();assert.equal(solver.world.colliders.len(),count-1);
 solver.dispose();
});
