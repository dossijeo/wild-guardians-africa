import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,MeshBasicMaterial,DoubleSide,BoxGeometry,Mesh,PerspectiveCamera} from 'three';
import {MeshBasicNodeMaterial,WebGPURenderer} from 'three/webgpu';
import NodeUniformsGroup from 'three/src/renderers/common/nodes/NodeUniformsGroup.js';
import NodeUniform from 'three/src/nodes/core/NodeUniform.js';
import {NumberNodeUniform} from 'three/src/renderers/common/nodes/NodeUniform.js';
import {nativeIdleStrollFixture} from './helpers/native-idle-stroll.js';
import {nativeHomeRouteFixture} from './helpers/native-home-route.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {createNativeIdleStrollGpuMotion,createNativeHomeRouteGpuMotion} from '../src/rendering/native-gpu-motion.js';
import {installRemoteClockBindings,markRemoteClockNode} from '../src/rendering/remote-clock-bindings.js';

function terrainFixture(f){
 const scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material}),chunks=[];
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'stroll-motion');chunks.push({cx:x,cz:z,revision:1});}
 const terrain=createConfirmedTerrainSupport({residency});return {scene,terrain,residency,manifest:{epoch:'stroll-motion',chunks},close(){terrain.dispose();residency.dispose();material.dispose();}};
}
const close=(a,b,tolerance=3e-5)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
for(const profile of PROFILES)test(`${profile.id} stroll GPU table follows the actual native body and original gait accumulators`,()=>{
 const f=nativeIdleStrollFixture({profile:profile.id}),t=terrainFixture(f);let motion;try{
  const p=f.prepare().proposal,support=t.terrain.prepareNativeIdleStrollProposal(p,{terrainManifest:t.manifest});assert(support?.valid());motion=createNativeIdleStrollGpuMotion({actorId:f.worker.id,support,anchorYaw:.3});const body=f.body(1),metadata=motion.clockNode[Symbol.for('wild-guardians.remote-clock')];assert.deepEqual(metadata.nativeStroll,p.nativeIdleStroll);assert.equal(metadata.nativeHome,undefined);assert.equal(metadata.nativeRoute,undefined);assert.deepEqual(f.body(1),body);f.commitStroll(p);
  for(let i=0;i<40;i++){const at=p.startTime+(p.endTime-p.startTime)*i/39;if(at>f.state.elapsed)f.advance(at-f.state.elapsed);const native=f.planner.nativeIdleStrollExecution(f.actor),actual=motion.sample(at);for(const [a,b] of [['x','x'],['z','z'],['runPhase','runPhase'],['walkPhase','walkPhase'],['carryPhase','carryPhase'],['runRemaining','runRemaining']])close(actual[a],native.pose[b]);close(actual.y,t.residency.surface(actual.x,actual.z),3e-6);close(actual.yawDelta,native.pose.yaw-.3,1e-6);assert.equal(actual.running,0);}
  assert.equal(motion.status().installed.nativeStroll.kind,'native-idle-stroll-reference');assert.equal(motion.status().installed.nativeHome,undefined);assert.equal(motion.texture.generateMipmaps,false);
 }finally{motion?.dispose();t.close();f.close();}
});

test('stroll retiming retags its existing scalar and texture without changing the shader cache key',()=>{
 const f=nativeIdleStrollFixture(),t=terrainFixture(f);let motion,hook;try{
  const p=f.prepare().proposal,support=t.terrain.prepareNativeIdleStrollProposal(p,{terrainManifest:t.manifest});motion=createNativeIdleStrollGpuMotion({actorId:f.worker.id,support});const node=motion.clockNode,key=node.getCacheKey(),keys=Object.keys(node),texture=motion.texture,group=new NodeUniformsGroup('stroll-time',node.groupNode);group.addUniform(new NumberNodeUniform(new NodeUniform('age','float',node)));void group.buffer;const calls=[],buffer={};let uploads=0;const backend={get:()=>({buffer}),updateBinding(){uploads++;}};hook=installRemoteClockBindings({backend},{registerClockBinding:(target,binding)=>calls.push({target,binding})});backend.updateBinding(group);assert.deepEqual(calls[0].binding.nativeStroll,p.nativeIdleStroll);f.advance(.2);const next=f.planner.revalidateNativeIdleStrollProposal(p.ticket).proposal,result=motion.retargetNativeIdleStroll(t.terrain.prepareNativeIdleStrollProposal(next,{terrainManifest:t.manifest}),{retagClock:hook.retagNativeIdleStroll});assert(result);assert.equal(motion.texture,texture);assert.equal(motion.status().dataReferences,1);assert.equal(calls[1].target,buffer);assert.deepEqual(calls[1].binding.nativeStroll,next.nativeIdleStroll);assert.equal(uploads,1);assert.equal(node.getCacheKey(),key);assert.deepEqual(Object.keys(node),keys);assert.throws(()=>hook.retagNativeIdleStroll(node,p.nativeIdleStroll,next.nativeIdleStroll,next.endTime),/cannot be retagged/);motion.setExecutionEpoch(next.startTime);motion.seal();assert.throws(()=>motion.retargetNativeIdleStroll(support,{retagClock:hook.retagNativeIdleStroll}),/published or shared/);
 }finally{hook?.dispose();motion?.dispose();t.close();f.close();}
});

test('stroll ownership compiles the same movement program as a genuine Home route',()=>{
 const f=nativeIdleStrollFixture(),h=nativeHomeRouteFixture(),t=terrainFixture(f),u=terrainFixture(h),renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}}),geometry=new BoxGeometry(),camera=new PerspectiveCamera(),materials=[];let stroll,home;renderer.hasFeature=()=>true;
 const shader=motion=>{const material=new MeshBasicNodeMaterial(),mesh=new Mesh(geometry,material);materials.push(material);motion.bind(material);const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=t.scene;builder.camera=camera;builder.build();return builder.vertexShader;};
 try{const p=f.prepare().proposal,q=h.prepareHome().proposal;stroll=createNativeIdleStrollGpuMotion({actorId:f.worker.id,support:t.terrain.prepareNativeIdleStrollProposal(p,{terrainManifest:t.manifest})});home=createNativeHomeRouteGpuMotion({actorId:h.worker.id,support:u.terrain.prepareNativeHomeRouteProposal(q,{terrainManifest:u.manifest})});assert.equal(shader(stroll),shader(home));}finally{stroll?.dispose();home?.dispose();materials.forEach(m=>m.dispose());geometry.dispose();t.close();u.close();f.close();h.close();}
});

test('stroll clock metadata cannot borrow Home authority or an absolute phase',()=>{
 const f=nativeIdleStrollFixture(),t=terrainFixture(f);let motion;try{
  const p=f.prepare().proposal,support=t.terrain.prepareNativeIdleStrollProposal(p,{terrainManifest:t.manifest});motion=createNativeIdleStrollGpuMotion({actorId:f.worker.id,support});const args=Array(14).fill(null);args[5]=p.endTime;args[13]=p.nativeIdleStroll;assert.throws(()=>markRemoteClockNode(motion.clockNode,'relative',p.startTime,...args),/redefine/);assert.throws(()=>markRemoteClockNode({isNode:true},'absolute',p.startTime,...args),/stroll clock/);args[10]=p.nativeIdleStroll;assert.throws(()=>markRemoteClockNode({isNode:true},'relative',p.startTime,...args),/Conflicting/);assert.equal(t.terrain.prepareNativeHomeRouteProposal(p),null);assert.throws(()=>createNativeHomeRouteGpuMotion({actorId:f.worker.id,support}),/Home requires/);
 }finally{motion?.dispose();t.close();f.close();}
});


test('suspending a retimed stroll exposes the epoch actually tagged on its retained physical clock',()=>{
 const f=nativeIdleStrollFixture(),t=terrainFixture(f);let motion,held;
 try{
  const original=f.prepare().proposal;motion=createNativeIdleStrollGpuMotion({actorId:f.worker.id,support:t.terrain.prepareNativeIdleStrollProposal(original,{terrainManifest:t.manifest})});f.advance(.2);const next=f.planner.revalidateNativeIdleStrollProposal(original.ticket).proposal;assert(motion.retargetNativeIdleStroll(t.terrain.prepareNativeIdleStrollProposal(next,{terrainManifest:t.manifest}),{retagClock:()=>true}));assert.notEqual(motion.clockEpoch,original.startTime);assert.equal(motion.clockEpoch,next.startTime);
  const binding=f.commitStroll(next);motion.setExecutionEpoch(binding.reference.worldBoundary.effectiveTime);motion.seal();f.advance(.12);const split=n=>[Number(BigInt(n)&0xffffffffn)|0,Math.floor(n/4294967296)],h=binding.reference.expectedRouteHandle,input=[...split(h.session),...split(f.actor),h.slot|0,h.generation|0,...split(binding.assignmentSequence)];new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_int_ptr(input.length),input.length).set(input);assert.equal(f.w.spatial_world_proposal_stage_resources(12,0,0,input.length),1);const tuple=f.tuple(),boundary={version:1,authorityEpoch:h.authorityEpoch,nativeSession:tuple[0],ticket:tuple[1],effectiveTime:tuple[3]};assert.equal(f.w.nav_intent_world_proposal_route_effects(...tuple.slice(0,2)),1);const row=Float64Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_world_proposal_route_effects_ptr(),26)),reference={kind:'native-suspended-body',version:1,nativeRoute:{actorId:f.actor,assignmentSequence:binding.assignmentSequence,routeHandle:h},worldBoundary:boundary,bodyId:row[4],resumeGeneration:row[7],suspendedAt:row[6]};
  held=motion.prepareSuspended({reference,nativePose:row.slice(8),height:t.residency.surface(row[8],row[9]),isCurrent:()=>true});const metadata=held.clockNode[Symbol.for('wild-guardians.remote-clock')];assert.equal(held.clockEpoch,metadata.epoch);assert.equal(held.clockEpoch,next.startTime);assert.notEqual(held.clockEpoch,original.startTime);assert.deepEqual(metadata.nativeSuspended,reference);assert.equal(held.texture,motion.texture);const pose=held.sample(f.state.elapsed);motion.dispose();assert.equal(held.valid(),true);assert.equal(held.clockEpoch,metadata.epoch);assert.deepEqual(held.sample(f.state.elapsed),pose);
 }finally{held?.dispose();motion?.dispose();t.close();f.close();}
});
