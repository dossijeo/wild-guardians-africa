import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import R from '@dimforge/rapier3d-compat';
let solverSource=fs.readFileSync(new URL('../../src/simulation/beast-ragdoll.js',import.meta.url),'utf8');
const variant=process.argv[4]??'baseline';
if(variant==='no-support')solverSource=solverSource.replace('supportTorque:1.8','supportTorque:0').replace('integralGain:3','integralGain:0');
if(variant==='support-2.5')solverSource=solverSource.replace('supportTorque:1.8','supportTorque:2.5');
if(variant==='support-3.6')solverSource=solverSource.replace('supportTorque:1.8','supportTorque:3.6');
if(variant==='passive')solverSource=solverSource.replace('this.driveRoll(a);','{};');
const {BeastRagdollSolver}=await import('data:text/javascript;base64,'+Buffer.from(solverSource).toString('base64'));
await R.init();
const bytes=fs.readFileSync(process.argv[2]),capture=JSON.parse(process.argv[2].endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8')),results=[];
for(const [index,row]of capture.rows.entries()){
 // Other actors can be driven by external recovery/impact inputs after capture.
 // Such snapshots cannot be claimed as exact standalone replays.
 if(!row.outcome||row.outcome==='interrupted'){results.push({index,skipped:'roll interrupted or actor removed before completion'});continue;}
 if(row.actors.length!==1||row.actors[0].kinematic){results.push({index,skipped:'external actor lifecycle not captured'});continue;}
 const solver=new BeastRagdollSolver(R,{step:row.stepSize});solver.world.free();solver.world=R.World.restoreSnapshot(Uint8Array.from(row.world));solver.recoveryColliders=new Set(row.recoveryColliders);
 if(variant==='no-terrain')solver.world.colliders.forEach(c=>{if(c.shapeType()===R.ShapeType.TriMesh)c.setCollisionGroups(0);});
 if(variant==='no-boxes')solver.world.colliders.forEach(c=>{if(c.shapeType()===R.ShapeType.Cuboid)c.setCollisionGroups(0);});
 if(variant==='reset-terrain')solver.world.colliders.forEach(c=>{if(c.shapeType()===R.ShapeType.TriMesh)c.setShape(new R.TriMesh(c.vertices(),c.indices()));});
 if(variant==='internal-edges')solver.world.colliders.forEach(c=>{if(c.shapeType()===R.ShapeType.TriMesh)c.setShape(new R.TriMesh(c.vertices(),c.indices(),R.TriMeshFlags.FIX_INTERNAL_EDGES));});
 if(variant==='no-motors')solver.world.impulseJoints.forEach(j=>j.configureMotorVelocity(0,0));
 if(variant==='no-limits')solver.world.impulseJoints.forEach(j=>j.setLimits(-Math.PI,Math.PI));
 if(variant==='no-contacts')solver.world.colliders.forEach(c=>c.setCollisionGroups(0));
 if(variant==='iterations32')solver.world.numSolverIterations=32;
 if(variant==='substep120'){solver.stepSize=1/120;solver.world.timestep=1/120;}
 for(const saved of row.actors){const a=structuredClone(saved);a.pose=new Float32Array(98);a.parts=a.parts.map(p=>({...p,body:solver.world.getRigidBody(p.handle)}));solver.actors.set(a.id,a);}
 try{
 const actor=solver.actors.get(row.id),trace=[];
 if(variant==='timeout5')actor.roll.timeout=5;
 for(let step=1;step<=600;step++){solver.step();if(step%6===0||actor.roll.done)trace.push({step,error:actor.roll.error,speed:actor.roll.speed,rootSpeed:Math.max(...actor.parts.slice(0,2).map(p=>{const w=p.body.angvel();return Math.hypot(w.x,w.y,w.z);} ))});if(actor.roll.done)break;}
 const result={index,id:row.id,captured:row.outcome,replayed:actor.roll,trace};results.push(result);console.log(JSON.stringify({index,id:row.id,error:actor.roll.error,speed:actor.roll.speed,timedOut:actor.roll.timedOut,seconds:actor.roll.age,capturedTimeout:row.outcome?.timedOut}));
 }finally{solver.dispose();}
}
fs.writeFileSync(process.argv[3]??'test-results/roll-replay.json',JSON.stringify(results,null,2));
