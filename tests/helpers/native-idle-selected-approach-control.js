import {selectedApproachGame} from './native-idle-selected-approach-game.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';

// Connect before acquisition. No bootstrap of an already moving route and no
// graphical receipt: explicit installs here represent the trusted consumer.
export async function selectedApproachControl({restored=false,installCycle=true,...options}={}){
 let f,c,detach;const events=[],clocks=[];let paused=false,clockPaused=false,cursor=0;
 try{
  if(restored){const old=await selectedApproachGame(options);try{old.select();old.commit(old.prepare());old.advance(.1);f=await selectedApproachGame({...options,saved:old.save()});}finally{await old.dispose();}}
  else f=await selectedApproachGame(options);
  const acceptClock=value=>{const previous=c.status().clock;c.acceptClock({...value,anchorAbsoluteMs:value.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:value.reanchor?value.committedThrough:previous.anchorLogicalTime});};
  detach=f.planner.observeNativeIntentControl({onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingHomeRequests:b.pendingHomeRequests??[],pendingIdleStrollRequests:b.pendingIdleStrollRequests??[],nativeIdleCycles:b.nativeIdleCycles??[],pendingIdleCycleRequests:b.pendingIdleCycleRequests??[]});if(b.clock)c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){events.push(...changes);if(!paused){for(const e of changes)c.accept(e);cursor=events.length;}},onClock(value){clocks.push(value);if(!clockPaused)acceptClock(value);}});
  let cycle,cycleLease,next;
  if(!restored){const p=f.prepareFailedCycle();cycleLease=c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});cycle=f.commitFailedCycle(p);if(installCycle)c.installIdleCycles(cycle.reference.worldBoundary,[cycle]);next=f.finishFailedCycle(p);}
  return {...f,c,events,clocks,cycle,cycleLease,next,restored,pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,acceptEvents(){for(;cursor<events.length;cursor++)c.accept(events[cursor]);},acceptLastClock:()=>acceptClock(clocks.at(-1)),install(binding=f.planner.nativeIdleStrollBinding(f.actor)){return c.installStrolls(binding.reference.worldBoundary,[binding]);},async dispose(){detach?.();c?.dispose();await f.dispose();}};
 }catch(error){detach?.();c?.dispose();await f?.dispose();throw error;}
}
