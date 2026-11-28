import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeIdleCycleGraphicsFixture} from './helpers/native-idle-cycle-graphics.js';
import {createNativeIdleCycleGpuMotion} from '../src/rendering/native-idle-cycle-gpu-motion.js';
import {nativeIdleCycleRemoteFixture} from './helpers/native-idle-cycle-remote.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeIdleCyclePhaseOffset} from '../src/rendering/native-farm-idle-phase.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {Scene,PerspectiveCamera} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import {vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {cancelIdle} from '../src/simulation/idle.js';

const distance=(a,b,period)=>Math.abs(((a-b+period*1.5)%period)-period*.5);
for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} ${mode} Idle21 retains its finite body while its terminal Alert clip continues`,async()=>{
 const f=await nativeIdleCycleGraphicsFixture({profile:profile.id,mode});let motion;try{
  motion=createNativeIdleCycleGpuMotion({actorId:f.actor,support:f.support});const first=Math.fround(f.support.reference.duration+.1),later=Math.fround(first+1),period=2.5,worker=structuredClone(f.worker),rng=f.nativeState.rng;
  assert.equal(motion.sampleClip(first),'Alert');assert.equal(motion.sampleClip(later),'Alert');assert.deepEqual(motion.sample(first),motion.sample(later));assert(distance(motion.sampleForClip(later,'Alert',period),motion.sampleForClip(first,'Alert',period)+1,period)<2e-5,'Alert froze at the finite Idle21 endpoint');assert.deepEqual(f.worker,worker);assert.equal(f.nativeState.rng,rng);
 }finally{motion?.dispose();f.close();}
});

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} ${mode} submitted Idle21 keeps a finite physical clock and continuous terminal clip`,async()=>{
 const f=await nativeIdleCycleRemoteFixture({profile:profile.id,mode});try{
  const admitted=await f.run();assert.equal(admitted.status,'committed',JSON.stringify(admitted));await f.v.present();const r=admitted.nativeIdleCycleBinding.reference,prepared=admitted.nativeIdleCycleBinding.preparedReference;
  f.advance(r.worldBoundary.effectiveTime+r.duration-f.state.elapsed+.1);f.planner.projectNativeIdleCycle(f.state,f.worker);const body=f.body(1),worker=structuredClone(f.worker),rng=f.state.rng,first=await f.draw(),pick=captureNativeRoutePickFrame(first),relative=pick.getIdleCycleElapsed(prepared),offset=pick.getIdleCyclePhaseOffset(prepared,2.5);
  assert.equal(relative,floorFloat32(prepared.duration));f.advance(1);f.planner.projectNativeIdleCycle(f.state,f.worker);const after=await f.draw(),next=captureNativeRoutePickFrame(after);assert.equal(next.getIdleCycleElapsed(prepared),relative);assert(distance(next.getIdleCyclePhaseOffset(prepared,2.5),offset+1,2.5)<2e-5);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);
  const altered=structuredClone(after.nativeRouteFrame);altered.bindings.find(b=>b.nativeIdleCycle&&b.semantic==='idle-offset').phaseOffset+=.1;assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:altered}),/Idle phase/);
  assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{...after.nativeRouteFrame,bindings:after.nativeRouteFrame.bindings.filter(b=>b.semantic==='idle-offset')}}),/physical clock/);assert.deepEqual(f.v.errors,[]);const held=await f.v.source.quiesceGpuForMutation();f.v.source.releaseGpuAfterMutation(held,{committed:false});assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);
 }finally{await f.close();}
});

for(const mode of ['rest','watch'])test(`${mode} late Idle21 acquisition keeps the actual origin for its terminal phase`,async()=>{
 const f=await nativeIdleCycleRemoteFixture({mode,onDrain:f=>f.advance(.02)});try{
  const admitted=await f.run();assert.equal(admitted.status,'committed',JSON.stringify(admitted));await f.v.present();const r=admitted.nativeIdleCycleBinding.reference,prepared=admitted.nativeIdleCycleBinding.preparedReference;assert(r.worldBoundary.effectiveTime>prepared.worldBoundary.effectiveTime);f.advance(r.worldBoundary.effectiveTime+r.duration-f.state.elapsed+.1);f.planner.projectNativeIdleCycle(f.state,f.worker);
  const result=await f.draw(),frame=captureNativeRoutePickFrame(result);assert.equal(frame.getIdleCycleElapsed(prepared),floorFloat32(prepared.duration));assert(Number.isFinite(frame.getIdleCyclePhaseOffset(prepared,2.5)));assert.equal(result.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle&&b.semantic==='idle-offset').executionEpoch,r.worldBoundary.effectiveTime);
 }finally{await f.close();}
});

for(const missing of ['capability','decoder'])test(`Idle21 phase rejects missing ${missing} before acquisition`,async()=>{
 const f=await nativeIdleCycleRemoteFixture({...(missing==='capability'?{idleCycleIdlePhaseCapability:false}:{idleCycleDecoderClock:false})});try{const body=f.body(1),worker=structuredClone(f.worker),result=await f.run();assert.equal(result.status,'control-failed');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);}finally{await f.close();}
});

test('Idle21 phase arithmetic respects early revocation, period wrapping and large epochs',()=>{
 assert.equal(nativeIdleCyclePhaseOffset({elapsed:15,executionEpoch:10,relativeTime:1,duration:2,period:2.5}),0);
 assert.equal(nativeIdleCyclePhaseOffset({elapsed:15,executionEpoch:10,relativeTime:2,duration:2,period:2.5}),.5);
 const epoch=1e12,duration=Math.fround(2.3),elapsed=epoch+duration;assert.equal(nativeIdleCyclePhaseOffset({elapsed,executionEpoch:epoch,relativeTime:duration,duration,period:2.5}),0);
 assert.throws(()=>nativeIdleCyclePhaseOffset({elapsed:11,executionEpoch:10,relativeTime:2,duration:2,period:2.5}));
});

test('a pending Home cut before the Idle21 endpoint freezes both its physical and looping phase',async()=>{
 const f=await nativeIdleCycleRemoteFixture();try{
  const admitted=await f.run();assert.equal(admitted.status,'committed',JSON.stringify(admitted));await f.v.present();f.advance(.125);const first=captureNativeRoutePickFrame(await f.draw()),reference=admitted.nativeIdleCycleBinding.preparedReference,body=f.body(1),binding=f.planner.nativeInitialIdleBodyBinding(f.actor),village=f.state.villages.find(v=>v.id===f.worker.villageId),goal=village.entry;
  assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,f.w.nav_intent_session(),binding.bodySequence,Number(village.id.split('-').at(-1)),goal.x,goal.z),1);cancelIdle(f.worker);Object.assign(f.worker,{status:'returning',nativeRouteAdmission:'pending-home-resources'});f.planner.commitNativeCausalClock();f.advance(.3);
  const after=captureNativeRoutePickFrame(await f.draw());assert.equal(after.getIdleCycleElapsed(reference),first.getIdleCycleElapsed(reference));assert.equal(after.getIdleCyclePhaseOffset(reference,2.5),0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('original Idle21 color and shadow banks bind the same two typed looping phases',async()=>{
 const f=await nativeIdleCycleGraphicsFixture(),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;
 try{
  part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});let checked=0;
  for(const {mesh,material} of part.request.options.materialAlternatives){const previous=mesh.material;try{
   const build=(scene,selected)=>{mesh.material=selected;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);const bindings=builder.getBindings().flatMap(g=>g.bindings??[]),textures=bindings.filter(b=>b.isSampledTexture).map(b=>b.texture);for(const clip of ['Idle','Alert'])assert(textures.includes(f.bakes.get(clip).texture));const tags=bindings.flatMap(b=>b.uniforms??[]).map(u=>u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')]).filter(Boolean);assert(tags.every(t=>!t.nativeInitialIdleBody&&!t.nativeStroll&&!t.nativeFarmArrival));const phases=tags.filter(t=>t.semantic==='idle-offset');assert.equal(new Set(phases.map(t=>t.period)).size,2);for(const tag of phases)assert.deepEqual(tag.nativeIdleCycle,f.proposal.nativeIdleCycle);checked++;};
   build(f.scene,material);const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(_object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);build(scene,selected);}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
  }finally{mesh.material=previous;}}
  assert(checked>0);assert.deepEqual(f.errors,[]);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);
 }finally{part?.cancel();f.close();}
});
