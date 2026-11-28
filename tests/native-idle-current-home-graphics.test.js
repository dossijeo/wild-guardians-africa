import {nativeIdleArrivalGraphicsFixture} from './helpers/native-idle-arrival-graphics.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCurrentHomeGraphicsFixture} from './helpers/native-idle-current-home-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
function meshes(root){const result=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)result.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return result;}
for(const profile of PROFILES)test(`${profile.id} original post-stroll actor retains geometry/banks while preparing and acquiring Home`,async()=>{
 const f=await nativeIdleCurrentHomeGraphicsFixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),worker=structuredClone(f.worker),rng=f.nativeState.rng,motionMaterials=f.registry.status().owned.filter(r=>r.namespace==='motion-material').length;
  part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);
  f.advance(.2);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();const next=f.planner.revalidateNativeHomeRouteProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);assert(part.valid());part.activate();const data=f.commitHome(next.proposal,f.proposal);part.finalize(data);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();f.flush();assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.roster.releaseNativeIdleCycle(f.actor,f.idleData.nativeIdleCycleBinding),false);for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='motion-material').length,motionMaterials);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
for(const mode of ['cancel','remove'])test(`prepared current-cycle Home ${mode} preserves the previous phase or retires its actual actor`,async()=>{
 const f=await nativeIdleCurrentHomeGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),owned=f.registry.status().owned.length,body=f.body(1);part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);assert.equal(f.roster.get(f.actor),actor);for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}}
  else{f.state.workers=[];f.roster.sync();assert(!part.valid());f.flush();assert.equal(f.registry.status().owned.length,0);assert.equal(part.cancel(),false);}
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
test('current-cycle Home rejects a substituted source pose or premature executed Home marker',async()=>{
 const f=await nativeIdleCurrentHomeGraphicsFixture();try{
  const p=structuredClone(f.proposal);p.sourceRequest.pose.yaw+=.1;p.nativeHome.sourceRequest.pose.yaw+=.1;await assert.rejects(()=>f.roster.prepareNativeHomeRouteProposal({...f.support,presentation:p},{getPickTime:f.getPickTime}),/source worker/);
  f.state.workers[0].nativeRouteAdmission='native-home';await assert.rejects(()=>f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime}),/source worker/);assert.equal(f.planner.nativeHomeRouteBinding(f.nativeActor),null);
 }finally{f.close();}
});


test('repeated native stroll/rest programmes retain bounded material sets and retire each changed motion texture',async()=>{
 const f=await nativeIdleArrivalGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),geometry=meshes(actor.root).map(m=>m.geometry);
  async function rest(){const p=f.planner.prepareNativeIdleCycleProposal(f.nativeActor);assert.equal(p.status,'proposed');part=await f.roster.prepareNativeIdleCycleProposal(f.terrain.prepareNativeIdleCycle(p.proposal.nativeIdleCycle),{getPickAge:f.getPickAge});part.activate();const data=f.commit(p.proposal);part.finalize(data);f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();}
  // The fixture already owns an uncommitted REST draft from its actual arrival.
  part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();part.finalize(f.commit(f.proposal));f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();const bound=f.registry.status().owned.filter(r=>r.namespace==='motion-material').length;
  for(let i=0;i<3;i++){
   let next;for(let cycles=0;cycles<20;cycles++){const view=f.planner.nativeIdleCycleExecution(f.nativeActor);f.advance(Math.max(0,view.endTime-f.nativeState.elapsed));f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();next=f.planner.nativeIdleCycleNextRequest(f.nativeActor);if(next.idleState.mode==='walk')break;await rest();}
   assert.equal(next.idleState.mode,'walk');const p=f.planner.prepareNativeIdleStrollProposal(f.nativeActor);assert.equal(p.status,'proposed');f.setPickTime(p.proposal.startTime);part=await f.roster.prepareNativeIdleStrollProposal(f.terrain.prepareNativeIdleStrollProposal(p.proposal,{terrainManifest:f.manifest}),{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll(p.proposal);part.finalize(data);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();f.flush();f.advance(data.nativeIdleStrollBinding.reference.endTime-f.nativeState.elapsed+.01);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();await rest();assert.equal(f.registry.status().owned.filter(r=>r.namespace==='motion-material').length,bound);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);assert.equal(f.roster.get(f.actor),actor);assert.deepEqual(meshes(actor.root).map(m=>m.geometry),geometry);assert.equal(f.acquires,1);
  }
  f.state.workers=[];f.roster.sync();f.flush();assert.equal(f.registry.status().owned.length,0);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
