import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleArrivalGraphicsFixture} from './helpers/native-idle-arrival-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {copyNativeIdleCycleResources,nativeIdleCyclePresentationMatches} from '../src/world/native-idle-cycle.js';
import {createNativeIdleCycleGpuMotion} from '../src/rendering/native-idle-cycle-gpu-motion.js';
import {nativeIdleCycleBodyState} from '../src/world/native-idle-cycle-body-source.js';

function meshes(root){const result=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)result.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return result;}

for(const profile of PROFILES)test(`${profile.id} prepared REST after WALK keeps the original actor, geometry and native endpoint`,async()=>{
 const f=await nativeIdleArrivalGraphicsFixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),worker=structuredClone(f.worker),rng=f.nativeState.rng,q=nativeIdleCycleBodyState(f.proposal.nativeIdleCycle.sourceBody);assert.notDeepEqual([q.pose.x,q.pose.z],[f.strollData.nativeIdleStrollBinding.reference.pose.x,f.strollData.nativeIdleStrollBinding.reference.pose.z]);assert.equal(f.support.point.x,q.pose.x);assert.equal(f.support.point.z,q.pose.z);
  part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});assert(part.valid());assert.deepEqual(f.worker,worker);part.activate();part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}
  part.activate();const data=f.commit(f.proposal);assert(part.validateCommit(data));assert(nativeIdleCyclePresentationMatches(f.proposal,data.resources,data.nativeIdleCycleBinding));assert.deepEqual(copyNativeIdleCycleResources(data.resources),data.resources);part.finalize(data);f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.carries,0);assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.roster.releaseNativeRoute(f.actor,f.strollData.resources.nativeRoute),false);for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('cancelling a prepared endpoint REST restores the actually presented WALK variant and body',async()=>{
 const f=await nativeIdleArrivalGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),worker=structuredClone(f.worker);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();assert(part.cancel());f.flush();assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.worker.idleState.mode,'walk');assert.equal(f.roster.get(f.actor),actor);for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('REST cannot prepare from a substituted live WALK, source association or premature desired phase',async()=>{
 for(const change of ['pose','rng','destination','rest','source']){const f=await nativeIdleArrivalGraphicsFixture();try{
  if(change==='pose')f.worker.heading+=.1;if(change==='rng')f.worker.idleState.rng^=1;if(change==='destination')f.worker.idleState.destination.x+=.1;if(change==='rest'){f.worker.nativeRouteAdmission='native-idle';f.worker.destinationId=null;f.worker.idleState=structuredClone(f.proposal.nativeIdleCycle.initialState);}f.sync();
  let support=f.support;if(change==='source'){const reference=structuredClone(f.proposal.nativeIdleCycle);reference.sourceBody.sourceSequence--;support={...support,reference};}
  await assert.rejects(()=>f.roster.prepareNativeIdleCycleProposal(support,{getPickAge:f.getPickAge}),/matching pending worker/);assert.equal(f.acquires,1);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);
 }finally{f.close();}}
});

test('a foreign committed pose cannot finalize REST and rollback keeps its previous materials',async()=>{
 const f=await nativeIdleArrivalGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();const data=f.commit(f.proposal),bad=structuredClone(data);bad.nativeIdleCycleBinding.reference.sourceBody.pose.yaw+=.1;bad.nativeIdleCycleBinding.preparedReference.sourceBody.pose.yaw+=.1;assert.throws(()=>part.validateCommit(bad));part.rollback();part.cancel();for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.geometry,item.geometry);}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('the stationary GPU kernel samples the executed endpoint and retags the same prepared graph',async()=>{
 const f=await nativeIdleArrivalGraphicsFixture();let motion;try{
  const reference=f.proposal.nativeIdleCycle,q=nativeIdleCycleBodyState(reference.sourceBody);motion=createNativeIdleCycleGpuMotion({actorId:f.actor,support:f.support});const a=motion.sample(0);assert.equal(a.x,q.pose.x);assert.equal(a.z,q.pose.z);assert.equal(a.yaw,Math.fround(q.pose.yaw));const clock=motion.clockNode,knot=motion.watchKnotNode,position=motion.bindingAnchor,phase=motion.resolve(0,'Idle',2);
  f.advance(.2);const renewed=f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket);assert.equal(renewed.status,'revalidated');const support=f.terrain.prepareNativeIdleCycle(renewed.proposal.nativeIdleCycle);assert(support?.valid());let retags=0;const result=motion.retargetNativeIdleCycle(support,{retagClock(){retags++;return true;}});assert.equal(result.changedData,false);assert.equal(retags,2);assert.equal(motion.clockNode,clock);assert.equal(motion.watchKnotNode,knot);assert.equal(motion.bindingAnchor,position);assert.equal(motion.resolve(0,'Idle',2),phase);assert.deepEqual(motion.sample(0),a);assert.deepEqual(f.errors,[]);
 }finally{motion?.dispose();f.close();}
});
