import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,MeshBasicMaterial,DoubleSide,Mesh,BoxGeometry,PerspectiveCamera} from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {createNativeIdleCycleGpuMotion} from '../src/rendering/native-idle-cycle-gpu-motion.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {floorFloat32,ceilFloat32} from '../src/float32-time.js';
import {nativeIdleCycleWatchKnot} from '../src/world/native-idle-cycle.js';

function fixture({mode='rest',elapsed=.7,remaining=2.3,profile='youngMale',epoch=null}={}){
 const f=nativeIdleCycleFixture({mode,remaining,profile,peer:epoch===null,configureState(state){state.workers[0].idleState.elapsed=elapsed;if(epoch!==null)state.elapsed=epoch;}});
 try{
  const scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material});
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'idle-cycle-motion');}
  const terrain=createConfirmedTerrainSupport({residency}),p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');const proposal=p.proposal,reference=proposal.nativeIdleCycle,support=terrain.prepareNativeIdleCycle(reference);assert(support?.valid());
  return {...f,scene,terrain,residency,reference,support,proposal,close(){terrain.dispose();residency.dispose();material.dispose();f.close();}};
 }catch(error){f.close();throw error;}
}

for(const mode of ['rest','watch'])for(const elapsed of [.7,10000000000.125])test(`finite ${mode} program keeps its native body and terminal clip loop at ${elapsed}`,()=>{
 const f=fixture({mode,elapsed});let motion;try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:f.support});const r=f.reference,body=f.body(1),rng=f.state.rng;
  const metadata=motion.clockNode[Symbol.for('wild-guardians.remote-clock')];assert.deepEqual(metadata.nativeIdleCycle,r);assert.equal(metadata.nativeInitialIdleBody,undefined);assert.equal(metadata.resourceEnd,undefined);assert.deepEqual(motion.clipNames,['Idle','Alert']);
  f.commit({ticket:f.proposal.ticket.ticket});
  const samples=[0,floorFloat32(r.watchStartOffset/2),floorFloat32(Math.max(0,r.watchStartOffset-1e-7)),ceilFloat32(r.watchStartOffset),floorFloat32(r.duration/2),floorFloat32(r.duration),ceilFloat32(r.duration),Math.fround(r.duration+1)].sort((a,b)=>a-b);
  for(const age of samples){
   const delta=r.worldBoundary.effectiveTime+age-f.state.elapsed;if(delta>0)f.advance(delta);const native=f.planner.nativeIdleCycleExecution(f.actor),clip=motion.sampleClip(age),duration=clip==='Idle'?r.durations.rest:r.durations.watch;
   assert.equal(clip,native.idleState.mode==='rest'?'Idle':'Alert',`mode at ${age}`);
   const sampled=motion.sampleForClip(age,clip,duration)%duration,expected=(native.idleState.elapsed+Math.max(0,age-floorFloat32(r.duration)))%duration;
   assert(Math.min(Math.abs(sampled-expected),Math.abs(Math.abs(sampled-expected)-duration))<.000005,JSON.stringify({age,sampled,expected,clip}));
   assert(motion.resolve(null,clip,duration).isNode);const pose=motion.sample(age);assert.equal(pose.currentSpeed,0);assert.equal(pose.x,Math.fround(f.worker.x));
  }
  assert.equal(motion.sampleForClip(Math.fround(r.duration+8),'Alert',r.durations.watch,0),motion.sampleForClip(ceilFloat32(r.duration),'Alert',r.durations.watch,0));assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
  for(const age of [-1,.1,Infinity,NaN]){assert.throws(()=>motion.sample(age));assert.throws(()=>motion.sampleClip(age));}assert.throws(()=>motion.resolve(null,'Harvest',1));assert.throws(()=>motion.resolve(null,'Idle',Number.MIN_VALUE));
 }finally{motion?.dispose();f.close();}
});

test('retiming a finite cycle preserves graph/material/phase identities and rejects another program',()=>{
 const f=fixture(),material=new MeshStandardNodeMaterial(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No physical uniform compiled');}});let motion;
 try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:f.support});motion.bind(material);const clock=motion.clockNode,clip=motion.clipNode,phase=motion.resolve(null,'Alert',4.04),position=material.positionNode,key=phase.getCacheKey(),clockKey=clock.getCacheKey();
  f.advance(.3);const next=f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');const support=f.terrain.prepareNativeIdleCycle(next.proposal.nativeIdleCycle);assert(support.valid());assert.equal(motion.retargetNativeIdleCycle(support,{retagClock:hook.retagNativeIdleCycle}).changedData,false);
  assert.equal(motion.clockNode,clock);assert.equal(motion.clipNode,clip);assert.equal(motion.resolve(null,'Alert',4.04),phase);assert.equal(phase.getCacheKey(),key);assert.equal(clock.getCacheKey(),clockKey);assert.equal(material.positionNode,position);assert.deepEqual(clock[Symbol.for('wild-guardians.remote-clock')].nativeIdleCycle,next.proposal.nativeIdleCycle);
  const changed=structuredClone(support.reference);changed.anchor.x+=.1;assert.equal(motion.retargetNativeIdleCycle({...support,reference:changed},{retagClock:hook.retagNativeIdleCycle}),false);motion.setExecutionEpoch(next.proposal.worldBoundary.effectiveTime);motion.seal();assert.throws(()=>motion.retargetNativeIdleCycle(support,{retagClock:hook.retagNativeIdleCycle}),/published/);motion.dispose();assert.equal(material.positionNode,null);assert.throws(()=>motion.sampleClip(0),/disposed/);
 }finally{motion?.dispose();material.dispose();hook.dispose();f.close();}
});

test('cycle terrain certification uses the same foot triangle and invalidates a real geometry change',()=>{
 const f=fixture();try{
  assert.throws(()=>f.terrain.prepareNativeInitialIdleBody(f.reference));assert.throws(()=>createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:{...f.support,point:{...f.support.point,at:f.support.point.at+1}}}));
  const p=f.reference.sourceBody.reference.sourceRequest.pose,cx=Math.floor((p.x+24)/48),cz=Math.floor((p.z+24)/48);assert(f.support.unchangedBy({changedKeys:new Set(['4,4'])}));assert.equal(f.support.unchangedBy({changedKeys:new Set([`${cx},${cz}`]),get:()=>null}),false);f.residency.get(cx,cz).geometry.attributes.position.needsUpdate=true;assert.equal(f.support.valid(),false);
 }finally{f.close();}
});

test('the actual Three WGSL builder retains one typed cycle clock and both data-selected clip phases',()=>{
 const f=fixture(),geometry=new BoxGeometry(),material=new MeshStandardNodeMaterial(),mesh=new Mesh(geometry,material),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let motion;
 try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:f.support});motion.bind(material);const selected=motion.clipNode.equal(0).select(motion.resolve(null,'Idle',3.8),motion.resolve(null,'Alert',4.04));material.positionNode=material.positionNode.add(selected.mul(.000001));f.scene.add(mesh);const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();builder.build();
  const tags=builder.getBindings().flatMap(g=>g.bindings??[]).flatMap(b=>b.uniforms??[]).map(u=>u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')]).filter(Boolean);assert(tags.some(t=>t.nativeIdleCycle));assert.deepEqual([...new Set(tags.filter(t=>t.semantic==='idle-offset').map(t=>t.period))].sort((a,b)=>a-b),[3.8,4.04]);assert(tags.every(t=>!t.nativeInitialIdleBody&&!t.nativeRoute&&!t.nativeAction));assert.match(builder.vertexShader,/select|if/);assert.doesNotMatch(builder.vertexShader,/textureLoad/);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
 }finally{motion?.dispose();geometry.dispose();material.dispose();f.close();}
});

for(const remaining of [5e-10,Math.fround(.1)+5e-10])test(`the native one-nanosecond rest boundary remains right-continuous at ${remaining}`,()=>{
 const f=fixture({remaining});let motion;try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:f.support});f.commit({ticket:f.proposal.ticket.ticket});
  const ages=[0,floorFloat32(remaining),ceilFloat32(remaining)].sort((a,b)=>a-b);
  for(const age of ages){const delta=f.reference.worldBoundary.effectiveTime+age-f.state.elapsed;if(delta>0)f.advance(delta);assert.equal(motion.sampleClip(age),f.planner.nativeIdleCycleExecution(f.actor).idleState.mode==='watch'?'Alert':'Idle');}
 }finally{motion?.dispose();f.close();}
});

test('an exhausted watch retains its physical endpoint and repeats only its terminal clip',()=>{
 const f=fixture({mode:'watch',remaining:0});let motion;try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:f.support});assert.equal(f.reference.duration,0);for(const age of [0,1,100]){assert.equal(motion.sampleClip(age),'Alert');assert.equal(motion.sampleForClip(age,'Alert',4.04,0),Math.fround(.7%4.04));const sampled=motion.sampleForClip(age,'Alert',4.04)%4.04;assert(Math.abs(sampled-(age+.7)%4.04)<2e-5);}
 }finally{motion?.dispose();f.close();}
});

for(const epoch of [1000000,1000000000,1000000000000])test(`the watch knot matches the actual native comparison at execution origin ${epoch}`,()=>{
 const age=Math.fround(.1),f=fixture({epoch,remaining:age+1.05e-9});let motion;try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.worker.id,support:f.support});f.commit({ticket:f.proposal.ticket.ticket});f.advance(age);
  assert.equal(motion.sampleClip(age),f.planner.nativeIdleCycleExecution(f.actor).idleState.mode==='watch'?'Alert':'Idle');assert.equal(motion.watchKnotNode.value,nativeIdleCycleWatchKnot(f.reference,epoch));assert.equal(motion.watchKnotNode[Symbol.for('wild-guardians.remote-clock')].semantic,'idle-cycle-watch-knot');
 }finally{motion?.dispose();f.close();}
});
