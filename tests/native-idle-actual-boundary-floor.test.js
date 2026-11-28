import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {nativeIdleFailedCycleGame} from './helpers/native-idle-failed-cycle-game.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';

for(const kind of ['initial-idle-body','idle-cycle'])test(`retimed ${kind} cannot submit before its actual boundary when the presentation projection lags`,async()=>{
 const f=kind==='idle-cycle'?await nativeIdleFailedCycleGame({retry:.25}):nativeInitialIdleRequestFixture({peer:true,mode:'watch'});let v,now=Date.now(),projected;
 try{
  if(kind==='initial-idle-body'){f.planner.requestNativeInitialIdleResources(f.state,f.worker);f.planner.commitNativeCausalClock();}
  const before=f.body(1);
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind,retainStaticBuffer:true,idleCycleIdlePhase:kind==='idle-cycle',absoluteNow:()=>now,
   onDrain(){f.state.elapsed+=.2;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));},
   onCommit({data,host}){
    const clock=host.inspect().nativeCausalClock;assert.equal(clock.rate,1);assert.equal(clock.paused,false);
    projected=data.worldBoundary.effectiveTime-.007;
    // Actual source clock/attestation, merely evaluate its projected time seven
    // milliseconds behind the retimed acquisition, as observed in hardware.
    now=clock.anchorAbsoluteMs+(projected-clock.anchorLogicalTime)*1000;
   }});
  const start=kind==='idle-cycle'?'startNativeIdleCycleAfterGpuQuiescence':'startNativeInitialIdleBodyAfterGpuQuiescence';
  const result=await v.run(o=>f.planner[start]({actorId:f.actor,...o}));assert.equal(result.status,'committed',JSON.stringify(result));await v.present();v.host.present();const view=v.host.inspect();assert.equal(view.failed,false,JSON.stringify(v.errors));
  const frame=view.nativeRouteFrame;assert(projected<result.worldBoundary.effectiveTime);assert.equal(view.nativeMutationFloor,result.worldBoundary.effectiveTime);assert(frame.clockElapsed>=result.worldBoundary.effectiveTime);assert(frame.clockElapsed<=view.nativeCausalClock.committedThrough);assert.deepEqual(frame.worldBoundary,result.worldBoundary);
  const binding=frame.bindings.find(b=>kind==='idle-cycle'?b.nativeIdleCycle&&b.semantic==='relative':b.nativeInitialIdleBody&&b.semantic==='relative');assert(binding);assert.equal(binding.executionEpoch,result.worldBoundary.effectiveTime);assert.equal(binding.relativeTime,0);assert.deepEqual(f.body(1),before);assert.deepEqual(v.errors,[]);
 }finally{await v?.close();if(f.close)f.close();else await f.dispose();}
});
