import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,MeshBasicMaterial,DoubleSide,Mesh,BoxGeometry,PerspectiveCamera} from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {createNativeInitialIdleBodyGpuMotion} from '../src/rendering/native-initial-idle-body-gpu-motion.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {workerPose} from '../src/rendering/worker-actions.js';

function fixture({mode='rest',elapsed=.7}={}){
 const f=nativeInitialIdleRequestFixture({mode,peer:true,configureState(state){state.workers[0].idleState.elapsed=elapsed;}});
 try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);f.planner.commitNativeCausalClock();
  const scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material});
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'initial-body-motion');}
  const terrain=createConfirmedTerrainSupport({residency}),p=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(f.actor));assert.equal(p.status,'proposed');const proposal=p.proposal,reference=proposal.nativeInitialIdleBody,support=terrain.prepareNativeInitialIdleBody(reference);assert(support?.valid());
  return {...f,scene,terrain,residency,reference,support,proposal,close(){terrain.dispose();residency.dispose();material.dispose();f.close();}};
 }catch(error){f.close();throw error;}
}

for(const mode of ['rest','watch'])for(const elapsed of [.7,10000000000.125])test(`held ${mode} preserves its original private phase at ${elapsed} without advancing a policy`,()=>{
 const f=fixture({mode,elapsed});let motion;try{
  const worker=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,q=f.reference.sourceRequest,p=q.pose;
  motion=createNativeInitialIdleBodyGpuMotion({actorId:f.worker.id,support:f.support,anchorPosition:{x:2,y:3,z:4},anchorYaw:.2,heightOffset:.025});
  assert.deepEqual(motion.clipNames,['Idle','Alert']);const tag=motion.clockNode[Symbol.for('wild-guardians.remote-clock')];assert.deepEqual(tag.nativeInitialIdleBody,f.reference);assert.equal(tag.nativeAction,undefined);assert.equal(tag.nativeSettlement,undefined);assert.equal(tag.resourceEnd,undefined);assert.equal(motion.status().installed.end,undefined);
  for(const age of [0,Math.fround(.1),8192]){
   assert.equal(motion.sampleClip(age),mode==='rest'?'Idle':'Alert');
   for(const [clip,duration] of [['Idle',3.8],['Alert',4.04]]){const phase=motion.sampleForClip(age,clip,duration);assert.equal(phase,Math.fround(elapsed%duration));assert(motion.resolve(null,clip,duration).isNode);if(clip===(mode==='rest'?'Idle':'Alert')){const pose=workerPose(f.worker,null,999999,{actions:{[clip]:{duration,loop:true}}});assert(Math.abs(phase-pose.time)<.000001);}}
   const sample=motion.sample(age);assert.equal(sample.x,Math.fround(p.x));assert.equal(sample.z,Math.fround(p.z));assert.equal(sample.yaw,Math.fround(p.yaw));assert.equal(sample.currentSpeed,0);
  }
  assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  for(const age of [-1,.1,Infinity])assert.throws(()=>motion.sample(age),/submitted relative float/);assert.throws(()=>motion.resolve(null,'Harvest',2),/clip/);assert.throws(()=>motion.resolve(null,'Idle',Number.MIN_VALUE),/clip/);
 }finally{motion?.dispose();f.close();}
});

test('initial body retargeting preserves graph, material and held phase and rejects a different source',()=>{
 const f=fixture({mode:'watch'}),material=new MeshStandardNodeMaterial(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No compiled uniform');}});let motion;
 try{
  motion=createNativeInitialIdleBodyGpuMotion({actorId:f.worker.id,support:f.support});motion.bind(material);const position=material.positionNode,clock=motion.clockNode,clockKey=clock.getCacheKey(),clip=motion.clipNode,phase=motion.resolve(null,'Alert',4.04),phaseKey=phase.getCacheKey();
  f.advance(.3);const next=f.planner.revalidateNativeInitialIdleBodyProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');const support=f.terrain.prepareNativeInitialIdleBody(next.proposal.nativeInitialIdleBody);assert(support.valid());assert.equal(motion.retargetNativeInitialIdleBody(support,{retagClock:hook.retagNativeInitialIdleBody}).changedData,false);
  assert.equal(motion.clockNode,clock);assert.equal(clock.getCacheKey(),clockKey);assert.equal(motion.clipNode,clip);assert.equal(material.positionNode,position);assert.equal(motion.resolve(null,'Alert',4.04),phase);assert.equal(phase.getCacheKey(),phaseKey);assert.deepEqual(clock[Symbol.for('wild-guardians.remote-clock')].nativeInitialIdleBody,next.proposal.nativeInitialIdleBody);
  const changed=structuredClone(support.reference);changed.sourceRequest.pose.yaw+=.1;assert.equal(motion.retargetNativeInitialIdleBody({...support,reference:changed},{retagClock:hook.retagNativeInitialIdleBody}),false);motion.setExecutionEpoch(next.proposal.worldBoundary.effectiveTime+.25);assert.equal(motion.sampleForClip(0,'Alert',4.04),Math.fround(.7%4.04));motion.seal();assert.throws(()=>motion.retargetNativeInitialIdleBody(support,{retagClock:hook.retagNativeInitialIdleBody}),/published/);motion.dispose();assert.equal(material.positionNode,null);
 }finally{motion?.dispose();material.dispose();hook.dispose();f.close();}
});

test('the original terrain kernel invalidates an initial body whose held foot triangle changes',()=>{
 const f=fixture();try{
  assert.throws(()=>f.terrain.prepareNativeTaskSettlement(f.reference),/settlement reference/);assert.throws(()=>createNativeInitialIdleBodyGpuMotion({actorId:f.worker.id,support:{...f.support,point:{...f.support.point,at:f.support.point.at+1}}}),/support/);
  const p=f.reference.sourceRequest.pose,cx=Math.floor((p.x+24)/48),cz=Math.floor((p.z+24)/48);assert(f.support.unchangedBy({changedKeys:new Set(['4,4'])}));assert.equal(f.support.unchangedBy({changedKeys:new Set([`${cx},${cz}`]),get:()=>null}),false);f.residency.get(cx,cz).geometry.attributes.position.needsUpdate=true;assert.equal(f.support.valid(),false);
 }finally{f.close();}
});

test('the actual Three builder retains the typed body clock in a held stationary graph',()=>{
 const f=fixture(),geometry=new BoxGeometry(),material=new MeshStandardNodeMaterial(),mesh=new Mesh(geometry,material),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let motion;
 try{
  motion=createNativeInitialIdleBodyGpuMotion({actorId:f.worker.id,support:f.support});motion.bind(material);material.positionNode=material.positionNode.add(motion.resolve(null,'Idle',3.8).mul(0));f.scene.add(mesh);const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();builder.build();
  const tags=builder.getBindings().flatMap(g=>g.bindings??[]).flatMap(b=>b.uniforms??[]).map(u=>u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')]).filter(t=>t?.nativeInitialIdleBody);assert(tags.length>0);assert(tags.every(t=>t.nativeAction===undefined&&t.nativeSettlement===undefined&&t.nativeRoute===undefined));assert.doesNotMatch(builder.vertexShader,/textureLoad/);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
 }finally{motion?.dispose();geometry.dispose();material.dispose();f.close();}
});
