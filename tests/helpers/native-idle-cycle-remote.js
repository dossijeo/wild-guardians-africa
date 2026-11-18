import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './native-initial-idle-request.js';
import {createPlant} from '../../src/simulation/crops.js';
import {createNativeAdmissionVertical} from './native-admission-vertical.js';
import {flush} from './remote-webgpu-fixture.js';

// Real source/ports/Host with the existing deterministic GPU double. Hardware,
// original actor and shader execution remain separate acceptance scopes.
export async function nativeIdleCycleRemoteFixture({profile='youngMale',mode='rest',idleCycleDecoderClock=true,idleCycleIdlePhaseCapability=true,onDrain=()=>{}}={}){
 const f=nativeInitialIdleRequestFixture({profile,mode,peer:true,configureState(state){const a=state.workers[0];a.idleState.anchorId='farm-plant-900098';state.plants.push(createPlant('plant-900098','mijo',a.x,a.z,a.centerId));}});let v;
 try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);f.planner.commitNativeCausalClock();v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body',retainStaticBuffer:true,idleCycleIdlePhase:true,idleCycleDecoderClock,idleCycleIdlePhaseCapability,onDrain:e=>e.receipt.nativeIdleCycleVersion?onDrain(f,e):undefined});
  const initial=await v.run(o=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...o}));assert.equal(initial.status,'committed',JSON.stringify(initial));await v.present();
  return {...f,v,run:signal=>v.run(o=>f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,...o}),{kind:'idle-cycle',signal}),async draw(){await flush();await v.host.idle();v.host.present();const result=v.host.inspect();assert.equal(result.failed,false,JSON.stringify(v.errors));return result;},async close(){await v.close();f.close();}};
 }catch(error){await v?.close();f.close();throw error;}
}
