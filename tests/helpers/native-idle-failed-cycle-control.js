import {nativeIdleFailedCycleGame} from './native-idle-failed-cycle-game.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';
import {createNativeAdmissionVertical} from './native-admission-vertical.js';
import {flush} from './remote-webgpu-fixture.js';

function fromBaseline(b){
 const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingHomeRequests:b.pendingHomeRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[],pendingIdleStrollRequests:b.pendingIdleStrollRequests??[],nativeIdleCycles:b.nativeIdleCycles??[],pendingIdleCycleRequests:b.pendingIdleCycleRequests??[]});
 c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});return c;
}
// Actual source/Game/native kernel and ordered control events. Manual control
// installation represents a trusted prepared-resource consumer, not hardware.
export async function nativeIdleFailedCycleControl(options={}){
 const f=await nativeIdleFailedCycleGame(options);let c,detach,paused=false,clockPaused=false,cursor=0;const events=[],clocks=[];
 const clock=value=>{const old=c.status().clock;c.acceptClock({...value,anchorAbsoluteMs:value.reanchor?1000:old.anchorAbsoluteMs,anchorLogicalTime:value.reanchor?value.committedThrough:old.anchorLogicalTime});};
 try{
  detach=f.planner.observeNativeIntentControl({onBaseline(b){c=fromBaseline(b);},onChanges(changes){events.push(...changes);if(!paused){for(const e of changes)c.accept(e);cursor=events.length;}},onClock(value){clocks.push(value);if(!clockPaused)clock(value);}});
  return {...f,c,events,clocks,pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,
   acceptEvents(){for(;cursor<events.length;cursor++)c.accept(events[cursor]);},acceptLastClock:()=>clock(clocks.at(-1)),
   install(binding=f.planner.nativeIdleCycleBinding(f.actor)){return c.installIdleCycles(binding.reference.worldBoundary,[binding]);},
   async dispose(){detach?.();c.dispose();await f.dispose();}
  };
 }catch(error){detach?.();c?.dispose();await f.dispose();throw error;}
}

// Source, both real port protocols and Host. The existing deterministic GPU
// double has clocked buffers, without the actual GLB actor/Surface pipeline.
export async function nativeIdleFailedCycleRemote({onPrepare=()=>{},onReady=()=>{},onDrain=()=>{},idleCycleDecoderClock=true,idleCycleIdlePhaseCapability=true,...options}={}){
 const f=await nativeIdleFailedCycleGame(options);let v;
 try{
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'idle-cycle',retainStaticBuffer:true,idleCycleIdlePhase:true,idleCycleDecoderClock,idleCycleIdlePhaseCapability,onPrepare:e=>onPrepare(f,e),onReady:e=>onReady(f,e),onDrain:e=>onDrain(f,e)});
  return {...f,v,run:signal=>v.run(o=>f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,...o}),{kind:'idle-cycle',signal}),
   async draw(){await flush();await v.host.idle();v.host.present();return v.host.inspect();},
   async dispose(){await v.close();await f.dispose();}
  };
 }catch(error){await v?.close();await f.dispose();throw error;}
}
