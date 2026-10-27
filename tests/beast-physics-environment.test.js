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
