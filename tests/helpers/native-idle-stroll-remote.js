import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './native-initial-idle-request.js';
import {createPlant} from '../../src/simulation/crops.js';
import {createNativeAdmissionVertical} from './native-admission-vertical.js';
import {flush} from './remote-webgpu-fixture.js';

// Source and complete direct transport/Host lifecycle, deterministic GPU double.
// The original actor/Surface and hardware acceptance are separate steps.
export async function nativeIdleStrollRemoteFixture({onPrepare=()=>{},onDrain=()=>{},onReady=()=>{}}={}){
 const f=nativeInitialIdleRequestFixture({mode:'watch',peer:true,configureState(state){const a=state.workers[0];Object.assign(a.idleState,{anchorId:'farm-plant-900098',remaining:.03,rng:1});state.plants.push(createPlant('plant-900098','mijo',a.x,a.z,a.centerId));}});let v;
 try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);f.planner.commitNativeCausalClock();v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body',retainStaticBuffer:true,onPrepare:e=>e.resources.kind==='native-idle-stroll-proposal'?onPrepare(f,e):undefined,onReady:e=>e.reference.kind==='native-idle-stroll-reference'?onReady(f,e):undefined,onDrain:e=>e.receipt.nativeIdleStrollVersion?onDrain(f,e):undefined});
  const body=await v.run(o=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...o}));assert.equal(body.status,'committed',JSON.stringify(body));await v.present();const cycle=await v.run(o=>f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,...o}),{kind:'idle-cycle'});assert.equal(cycle.status,'committed',JSON.stringify(cycle));await v.present();f.advance(cycle.nativeIdleCycleBinding.reference.duration);f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(f.planner.nativeIdleCycleNextRequest(f.actor).idleState.mode,'walk');
  return {...f,v,run:signal=>v.run(o=>f.planner.startNativeIdleStrollAfterGpuQuiescence({actorId:f.actor,...o}),{kind:'idle-stroll',signal}),async draw(){await flush();await v.host.idle();v.host.present();const state=v.host.inspect();assert.equal(state.failed,false,JSON.stringify(v.errors));return state;},async close(){await v.close();f.close();}};
 }catch(error){await v?.close();f.close();throw error;}
}
