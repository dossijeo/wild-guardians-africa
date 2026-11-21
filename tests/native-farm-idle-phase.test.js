import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeFarmArrivalGraphicsFixture} from './helpers/native-farm-arrival-route-graphics.js';
import {createNativeFarmArrivalGpuMotion} from '../src/rendering/native-gpu-motion.js';
import {nativeFarmIdlePhaseOffset,nativeDecodedClockAge} from '../src/rendering/native-farm-idle-phase.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {setup,admit,present} from './helpers/native-farm-arrival-remote.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {requestNativeIdleCurrentTask,nativeIdleCurrentTaskPolicy} from './helpers/native-idle-current-task.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

const phaseDistance=(a,b,period)=>Math.abs(((a-b+period*1.5)%period)-period*.5);
for(const profile of PROFILES)test(`${profile.id} terminal Farm keeps movement/facing/native phases fixed while Idle loops`,async()=>{
 const f=await nativeFarmArrivalGraphicsFixture({profile:profile.id,urgent:true});let motion;try{
  motion=createNativeFarmArrivalGpuMotion({actorId:f.actor,support:f.support});const p=f.support.presentation,end=p.endTime,duration=2.5,texture=motion.texture,data=texture.image.data,version=texture.version,first=motion.sample(end+.1),phase=motion.sampleForClip(end+.1,'Idle',duration);
  const later=motion.sample(end+1.1),next=motion.sampleForClip(end+1.1,'Idle',duration);for(const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining','running','currentSpeed'])assert.equal(later[key],first[key]);assert.equal(first.arrived,1);assert(phaseDistance(next,phase+1,duration)<2e-5);assert.equal(motion.texture,texture);assert.equal(texture.image.data,data);assert.equal(texture.version,version);
 }finally{motion?.dispose();f.close();}
});

for(const profile of PROFILES)for(const mode of ['exact','late'])test(`${profile.id} ${mode} Host publishes continuing Idle on the same completed23 and pending Task6`,async()=>{
 const f=await setup({profile:profile.id,idlePhaseCapability:true});let p;try{
  p=admit(f,{mode,urgent:true,idlePhase:true});const result=await p.promise;assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await present(f,p);const binding=f.planner.nativeFarmArrivalRouteBinding(f.actor),epoch=binding.reference.worldBoundary.effectiveTime,end=binding.reference.endTime;
  f.advance(end-f.state.elapsed+.1);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker).arrived);requestNativeIdleCurrentTask(f);f.planner.flushNativeIntentControl();await flush();f.host.present();
  const first=captureNativeRoutePickFrame(f.host.inspect()),age=first.getFarmArrivalElapsed(p.reference),physical=nativeDecodedClockAge(age,floorFloat32(p.reference.endTime-p.reference.worldBoundary.effectiveTime)),offset=first.getFarmArrivalIdleOffset(p.reference,p.reference.worldBoundary.effectiveTime,2.5),body=f.body(1);assert.equal(physical,floorFloat32(p.reference.endTime-p.reference.worldBoundary.effectiveTime));
  f.advance(1);await flush();f.host.present();const frame=f.host.inspect().nativeRouteFrame,next=captureNativeRoutePickFrame({nativeRouteFrame:frame}),nextAge=next.getFarmArrivalElapsed(p.reference),nextOffset=next.getFarmArrivalIdleOffset(p.reference,p.reference.worldBoundary.effectiveTime,2.5);assert.equal(nextAge,age);assert(phaseDistance(nextOffset+physical,offset+physical+1,2.5)<2e-5);assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);
  const facts=frame.bindings.filter(b=>b.semantic==='idle-offset');assert.equal(facts.length,1);assert.equal(facts[0].executionEpoch,epoch);const altered=structuredClone(frame);altered.bindings.find(b=>b.semantic==='idle-offset').phaseOffset+=.1;assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:altered}),/Idle phase/);assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{...frame,bindings:facts}}),/physical clock/);assert.deepEqual(f.errors,[]);assert.deepEqual(f.sourceErrors,[]);
 }finally{p?.prepared?.abort();await f.close();}
});

test('Farm Idle capability is required before retaining a new phase binding',async()=>{
 const f=await setup();let p;try{p=admit(f,{idlePhase:true});const r=await p.promise;assert.equal(r.status,'control-failed');assert.match(r.error,/Farm Idle phase/);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.gpu.submitted.length,0);}finally{p?.prepared?.abort();await f.close();}
});

test('Farm Idle phase cannot acquire without its certified terminal decoder clock',async()=>{
 const f=await setup({idlePhaseCapability:true});let p;try{const body=f.body(1);p=admit(f,{idlePhase:true,decoderClock:false});const r=await p.promise;assert.equal(r.status,'control-failed');assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.gpu.submitted.length,0);}finally{p?.prepared?.abort();await f.close();}
});

test('Idle phase arithmetic rejects invalid clocks',()=>{
 const base={elapsed:12,executionEpoch:10,relativeTime:1,duration:1,period:2.5};assert(Number.isFinite(nativeFarmIdlePhaseOffset(base)));for(const change of [{elapsed:9},{relativeTime:.1},{relativeTime:-1},{period:0},{duration:-1},{executionEpoch:NaN}])assert.throws(()=>nativeFarmIdlePhaseOffset({...base,...change}));
});

test('completed Farm can quiesce for its pending Task without extending the physical lease',async()=>{
 const f=await setup({idlePhaseCapability:true});let p,hold;try{
  p=admit(f,{idlePhase:true});assert.equal((await p.promise).status,'committed');await present(f,p);const original=f.planner.nativeFarmArrivalRouteBinding(f.actor);
  f.advance(original.reference.endTime-f.state.elapsed+.1);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker).arrived);requestNativeIdleCurrentTask(f);f.planner.flushNativeIntentControl();await flush();f.host.present();const body=f.body(1);
  hold=await f.source.quiesceGpuForMutation();assert(hold);f.source.releaseGpuAfterMutation(hold,{committed:false});hold=null;await flush();assert.deepEqual(f.body(1),body);assert.equal(original.reference.endTime,p.reference.endTime);
  const proposal=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),nativeIdleCurrentTaskPolicy(f));assert.equal(proposal.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),proposal.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.flushNativeIntentControl();await flush();const draws=f.gpu.submitted.length;f.host.present();assert.equal(f.gpu.submitted.length,draws);assert.deepEqual(f.errors,[]);assert.deepEqual(f.sourceErrors,[]);
 }finally{if(hold)f.source.releaseGpuAfterMutation(hold,{committed:false});p?.prepared?.abort();await f.close();}
});
