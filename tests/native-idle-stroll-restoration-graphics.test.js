import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollRestorationGraphicsFixture} from './helpers/native-idle-stroll-restoration-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {copyNativeIdleStrollResources} from '../src/world/native-idle-stroll.js';
import {PerspectiveCamera,Vector3} from 'three';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
for(const profile of PROFILES)test(`${profile.id} restored WALK acquires its original actor without any invented20/21 presentation`,async()=>{
 const f=await nativeIdleStrollRestorationGraphicsFixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),position=actor.root.position.clone(),body=f.body(1),worker=structuredClone(f.worker);assert(f.proposal.nativeIdleStroll.sourceRequest);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.nativeActor),null);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);part.activate();const data=f.commitStroll();assert.deepEqual(copyNativeIdleStrollResources(data.resources),data.resources);part.finalize(data);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert(actor.root.position.equals(position));for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);f.advance(.1);f.setPickTime(f.proposal.startTime+.1);const restore=actor.preparePick();restore();assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('cancelled cold restoration restores resident materials and removal retires the prepared owner',async()=>{
 for(const remove of [false,true]){const f=await nativeIdleStrollRestorationGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),owned=f.registry.status().owned.length,body=f.body(1);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();if(remove){f.state.workers=[];f.roster.sync();assert.equal(part.valid(),false);part.cancel();f.flush();assert.equal(f.registry.status().owned.length,0);}else{assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);assert.equal(item.mesh.geometry,item.geometry);}}assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}}
});

test('restored preparation rejects another saved phase, destination, private stream or owner marker',async()=>{
 const f=await nativeIdleStrollRestorationGraphicsFixture();try{
  const saved=structuredClone(f.state.workers[0]);for(const mutate of [w=>w.nativeRouteAdmission='native-idle',w=>w.walkPhase+=.1,w=>w.idleState.rng++,w=>w.idleState.destination.x+=.001,w=>w.idleState.anchorId='farm-plant-999999',w=>w.idleState.approachRetry+=.1,w=>w.path=[]]){f.state.workers=[structuredClone(saved)];mutate(f.state.workers[0]);f.roster.sync();await assert.rejects(f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime}),/source worker/);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);}assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a changed retained Game source invalidates a prepared cold variant before activation',async()=>{
 const f=await nativeIdleStrollRestorationGraphicsFixture();let part;try{part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});f.state.workers[0].idleState.rng++;f.roster.sync();assert.equal(part.valid(),false);assert.throws(()=>part.activate(),/activation unavailable/);assert(part.cancel());assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);}finally{part?.cancel();f.close();}
});

test('retimed restored preparation preserves one resident actor and one new route-data owner',async()=>{
 const f=await nativeIdleStrollRestorationGraphicsFixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No compiled physical binding');}});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();part.rollback();f.advance(.3);const next=f.planner.revalidateNativeIdleStrollProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(part.retarget(f.supportFor(next.proposal),{retagClock:hook.retagNativeIdleStroll}));assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);part.activate();const data=f.commitStroll(next.proposal);part.finalize(data);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);for(const item of before)assert.equal(item.mesh.geometry,item.geometry);assert.deepEqual(data.nativeIdleStrollBinding.reference,next.proposal.nativeIdleStroll);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();hook.dispose();f.close();}
});

test('saved arrival acquires a genuine zero22 graphical program without changing its held body',async()=>{
 const f=await nativeIdleStrollRestorationGraphicsFixture({advance:'arrival'});let part;try{const body=f.body(1);assert.equal(f.proposal.distance,0);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll();part.finalize(data);f.sync();f.flush();f.setPickTime(f.proposal.endTime);const restore=f.roster.get(f.actor).preparePick();restore();f.advance(.1);assert.deepEqual(f.body(1),body);assert(f.planner.nativeIdleStrollBinding(f.nativeActor));assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});

test('restored on-demand picking follows the actual native route on the retained authored geometry',async()=>{
 const f=await nativeIdleStrollRestorationGraphicsFixture();let part;try{part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll();part.finalize(data);f.sync();f.flush();const camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});for(const fraction of [.1,.5,1]){const at=f.proposal.startTime+(f.proposal.endTime-f.proposal.startTime)*fraction;f.setPickTime(at);const pose=f.planner.sampleNativeRoute(data.resources.nativeRoute.routeHandle,at),y=f.residency.surface(pose.x,pose.z);camera.position.set(pose.x,y+3,pose.z+6);camera.lookAt(pose.x,y+.8,pose.z);camera.updateMatrixWorld(true);let hit=null;for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(pose.x,y+height,pose.z).project(camera),result=picker.pick({x:point.x,y:point.y});if(result.entityId===f.actor){hit=result;break;}}assert(hit,'Restored stroll fraction '+fraction+' had no body hit');}assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});
