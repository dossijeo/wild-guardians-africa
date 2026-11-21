import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeIdleStrollGraphicsFixture} from './helpers/native-idle-stroll-graphics.js';
import {nativeFarmIdleApproachGraphicsFixture} from './helpers/native-farm-idle-approach-graphics.js';
import {createNativeIdleStrollGpuMotion} from '../src/rendering/native-gpu-motion.js';
import {nativeIdleStrollRemoteFixture} from './helpers/native-idle-stroll-remote.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeDecodedClockAge} from '../src/rendering/native-farm-idle-phase.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {flush} from './helpers/remote-webgpu-fixture.js';

const phaseDistance=(a,b,period)=>Math.abs(((a-b+period*1.5)%period)-period*.5);
for(const profile of PROFILES)for(const approach of [false,true])test(`${profile.id} ${approach?'Farm approach':'local stroll'} holds terminal movement while Idle continues`,async()=>{
 const f=await (approach?nativeFarmIdleApproachGraphicsFixture:nativeIdleStrollGraphicsFixture)({profile:profile.id});let motion;try{
  motion=createNativeIdleStrollGpuMotion({actorId:f.actor,support:f.support});const end=f.support.presentation.endTime,period=2.5,texture=motion.texture,data=texture.image.data,version=texture.version;
  const first=motion.sample(end+.1),later=motion.sample(end+1.1),phase=motion.sampleForClip(end+.1,'Idle',period),next=motion.sampleForClip(end+1.1,'Idle',period);
  for(const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining','running','currentSpeed'])assert.equal(later[key],first[key]);
  assert.equal(first.arrived,1);assert(phaseDistance(next,phase+1,period)<2e-5,'Idle froze on its finite movement clock');assert.equal(motion.texture,texture);assert.equal(texture.image.data,data);assert.equal(texture.version,version);
 }finally{motion?.dispose();f.close();}
});

for(const profile of PROFILES)for(const late of [false,true])test(`${profile.id} ${late?'late':'exact'} submitted Stroll Idle advances without extending its physical clock`,async()=>{
 const f=await nativeIdleStrollRemoteFixture({profile:profile.id,idleStrollIdlePhase:true,onDrain:late?f=>f.advance(.02):undefined});let hold;try{
  const admitted=await f.run();assert.equal(admitted.status,'committed',JSON.stringify(admitted));await f.v.present();const r=admitted.nativeIdleStrollBinding.reference,prepared=admitted.nativeIdleStrollBinding.preparedReference,epoch=prepared.worldBoundary.effectiveTime,duration=floorFloat32(prepared.endTime-epoch);
  f.advance(r.endTime-f.state.elapsed+.1);f.planner.projectNativeIdleStroll(f.state,f.worker);const before=await f.draw(),first=captureNativeRoutePickFrame(before),relative=first.getStrollElapsed(prepared),offset=first.getStrollIdleOffset(prepared,epoch,2.5),body=f.body(1);
  assert.equal(nativeDecodedClockAge(relative,duration),duration);
  f.advance(1);f.planner.projectNativeIdleStroll(f.state,f.worker);const after=await f.draw(),next=captureNativeRoutePickFrame(after),nextOffset=next.getStrollIdleOffset(prepared,epoch,2.5);
  assert.equal(next.getStrollElapsed(prepared),relative);assert(phaseDistance(nextOffset,offset+1,2.5)<2e-5);assert.deepEqual(f.body(1),body);assert(after.nativeRouteFrame.clockElapsed-before.nativeRouteFrame.clockElapsed>.99);
  const facts=after.nativeRouteFrame.bindings.filter(b=>b.semantic==='idle-offset');assert.equal(facts.length,1);assert.equal(facts[0].executionEpoch,r.worldBoundary.effectiveTime);
  const altered=structuredClone(after.nativeRouteFrame);altered.bindings.find(b=>b.semantic==='idle-offset').phaseOffset+=.1;assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:altered}),/Idle phase/);
  assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{...after.nativeRouteFrame,bindings:facts}}),/physical clock/);
  hold=await f.v.source.quiesceGpuForMutation();f.v.source.releaseGpuAfterMutation(hold,{committed:false});hold=null;await flush();assert.deepEqual(f.body(1),body);assert.deepEqual(f.v.errors,[]);
 }finally{if(hold)f.v.source.releaseGpuAfterMutation(hold,{committed:false});await f.close();}
});

for(const missing of ['capability','decoder'])test(`Stroll Idle rejects a missing ${missing} before acquiring22`,async()=>{
 const f=await nativeIdleStrollRemoteFixture({idleStrollIdlePhase:true,...(missing==='capability'?{idleStrollIdlePhaseCapability:false}:{idleStrollDecoderClock:false})});try{
  const body=f.body(1),result=await f.run();assert.equal(result.status,'control-failed');assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);
 }finally{await f.close();}
});
