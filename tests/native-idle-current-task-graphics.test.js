import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCurrentTaskGraphicsFixture} from './helpers/native-idle-current-task-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
function meshes(root){const result=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)result.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return result;}

for(const profile of PROFILES)test(`${profile.id} post-stroll actor retains its geometry and banks through prepared TaskStart`,async()=>{
 const f=await nativeIdleCurrentTaskGraphicsFixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),worker=structuredClone(f.worker),rng=f.nativeState.rng;
  part=await f.roster.prepareNativeTaskStartProposal(f.support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);
  f.advance(.2);f.sync();const next=f.planner.revalidateNativeTaskStartProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);assert(part.valid());part.activate();const data=f.commitTask(f.proposal);part.finalize(data);f.planner.reconcileWorkerRoutes(f.nativeState,{navVersion:1});f.sync();f.flush();assert.equal(f.worker.nativeRouteAdmission,'native-task');assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.roster.releaseNativeIdleCycle(f.actor,f.idleData.nativeIdleCycleBinding),false);for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
for(const mode of ['cancel','remove'])test(`prepared current-cycle TaskStart ${mode} retains the old phase or retires the actual actor`,async()=>{
 const f=await nativeIdleCurrentTaskGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),owned=f.registry.status().owned.length,body=f.body(1);part=await f.roster.prepareNativeTaskStartProposal(f.support,{getPickTime:f.getPickTime});part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);assert.equal(f.roster.get(f.actor),actor);for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}}
  else{f.state.workers=[];f.roster.sync();assert(!part.valid());f.flush();assert.equal(f.registry.status().owned.length,0);assert.equal(part.cancel(),false);}
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
test('current-cycle TaskStart rejects substituted gait rows and a premature executed Game marker',async()=>{
 const f=await nativeIdleCurrentTaskGraphicsFixture();try{
  const p=structuredClone(f.proposal);p.rows[8]+=1;await assert.rejects(()=>f.roster.prepareNativeTaskStartProposal({...f.support,presentation:p},{getPickTime:f.getPickTime}));
  f.state.workers[0].nativeRouteAdmission='native-task';await assert.rejects(()=>f.roster.prepareNativeTaskStartProposal(f.support,{getPickTime:f.getPickTime}),/source worker/);assert.equal(f.planner.nativeTaskStartBinding(f.nativeActor),null);
 }finally{f.close();}
});
