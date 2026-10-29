import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import R from '@dimforge/rapier3d-compat';
import {BeastRagdollSolver} from '../src/simulation/beast-ragdoll.js';
await R.init();
const captures=JSON.parse(gunzipSync(fs.readFileSync(new URL('../docs/guardian/phase2/roll-timeout/capture.json.gz',import.meta.url))).toString()).rows;
for(const [index,row]of captures.entries())test(`captured night roll ${index} completes with production terrain contacts`,()=>{
 const solver=new BeastRagdollSolver(R,{step:row.stepSize});solver.world.free();solver.world=R.World.restoreSnapshot(Uint8Array.from(row.world));
 try{
 const terrain=[];solver.world.colliders.forEach(c=>{if(c.shapeType()===R.ShapeType.TriMesh)terrain.push(c);});
 for(const c of terrain){const replacement=solver.terrain(c.vertices(),c.indices());c.setShape(replacement.shape);solver.world.removeCollider(replacement,true);}
 solver.obstacles.length=0;
 for(const saved of row.actors){const a=structuredClone(saved);a.pose=new Float32Array(98);a.parts=a.parts.map(p=>({...p,body:solver.world.getRigidBody(p.handle)}));solver.actors.set(a.id,a);}
 const actor=solver.actors.get(row.id);
 for(let i=0;i<300&&!actor.roll.done;i++)solver.step();
 assert.equal(actor.roll.done,true);assert.equal(actor.roll.timedOut,false,JSON.stringify({error:actor.roll.error,speed:actor.roll.speed}));
 assert.ok(actor.roll.error<.45);assert.ok(actor.roll.speed<.65);
 }finally{solver.dispose();}
});

test('progress grace does not disguise the captured unstable terrain roll',()=>{
 const row=captures[2],solver=new BeastRagdollSolver(R,{step:row.stepSize});solver.world.free();solver.world=R.World.restoreSnapshot(Uint8Array.from(row.world));
 try{
 for(const saved of row.actors){const a=structuredClone(saved);a.pose=new Float32Array(98);a.parts=a.parts.map(p=>({...p,body:solver.world.getRigidBody(p.handle)}));solver.actors.set(a.id,a);}
 const actor=solver.actors.get(row.id);
 for(let i=0;i<360&&!actor.roll.done;i++)solver.step();
 assert.equal(actor.roll.timedOut,true);assert.ok(actor.roll.age<=5.02);assert.ok(actor.roll.error>.45);
 }finally{solver.dispose();}
});
