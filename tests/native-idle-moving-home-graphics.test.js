import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeIdleMovingHomeGraphicsFixture} from './helpers/native-idle-moving-home-graphics.js';

function meshes(root){const values=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)values.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return values;}
for(const profile of PROFILES)test(`${profile.id} original stopped22 actor remains pickable through Home preparation, rollback and acquisition`,async()=>{
 const f=await nativeIdleMovingHomeGraphicsFixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1);let restore=actor.preparePick();restore();
  part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();assert(part.valid());part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}restore=actor.preparePick();restore();
  f.advance(f.source.sourceReference.endTime-f.nativeState.elapsed+.2);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();assert(part.valid());restore=actor.preparePick();restore();assert.deepEqual(f.body(1),body);
  const next=f.planner.revalidateNativeHomeRouteProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);part.activate();assert(part.valid());const data=f.commitHome(next.proposal,f.proposal);part.finalize(data);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();f.flush();f.setPickTime(data.nativeHomeRouteBinding.reference.worldBoundary.effectiveTime);restore=actor.preparePick();restore();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.worker.nativeRouteAdmission,'native-home');for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.body(1),body);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
for(const mode of ['cancel','remove','changed-pose','changed-policy'])test(`stopped22 Home ${mode} preserves or invalidates only its existing owner`,async()=>{
 const f=await nativeIdleMovingHomeGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),owned=f.registry.status().owned.length;part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}const restore=actor.preparePick();restore();}
  else if(mode==='remove'){f.state.workers=[];f.roster.sync();assert(!part.valid());f.flush();assert.equal(f.registry.status().owned.length,0);}
  else{const worker=f.state.workers[0];if(mode==='changed-pose')worker.x+=.1;else worker.contractDay--;f.roster.sync();assert(!part.valid());}
  assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
