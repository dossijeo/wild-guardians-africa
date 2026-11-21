import assert from 'node:assert/strict';
import {initialIdleOutsideGame} from './native-initial-idle-outside-game.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';

// Attach before acquiring20. Installs are trusted consumer operations in a
// component fixture, never receipts of actual GPU preparation or presentation.
export async function initialIdleOutsideControl({installBody=true,...options}={}){
 let f,c,detach,paused=false,clockPaused=false,cursor=0;const events=[],clocks=[];
 try{
  f=await initialIdleOutsideGame({...options,acquireBody:false});
  const acceptClock=value=>{const old=c.status().clock;c.acceptClock({...value,anchorAbsoluteMs:value.reanchor?1000:old.anchorAbsoluteMs,anchorLogicalTime:value.reanchor?value.committedThrough:old.anchorLogicalTime});};
  detach=f.planner.observeNativeIntentControl({onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingHomeRequests:b.pendingHomeRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[],pendingIdleStrollRequests:b.pendingIdleStrollRequests??[],nativeIdleCycles:b.nativeIdleCycles??[],pendingIdleCycleRequests:b.pendingIdleCycleRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){events.push(...changes);if(!paused){for(const e of changes)c.accept(e);cursor=events.length;}},onClock(value){clocks.push(value);if(!clockPaused)acceptClock(value);}});
  const p=f.prepareBody(),initialLease=c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary});assert(initialLease.isPrepared());assert(!initialLease.isCurrent());const body20=f.commitBody(p);assert(!initialLease.isCurrent());if(installBody)assert.equal(c.installInitialIdleBodies(body20.reference.worldBoundary,[body20]),1);
  return {...f,c,body20,initialLease,events,clocks,pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,acceptEvents(){for(;cursor<events.length;cursor++)c.accept(events[cursor]);},acceptLastClock:()=>acceptClock(clocks.at(-1)),
   installCycle(binding=f.planner.nativeIdleCycleBinding(f.actor)){return c.installIdleCycles(binding.reference.worldBoundary,[binding]);},
   installStroll(binding=f.planner.nativeIdleStrollBinding(f.actor)){return c.installStrolls(binding.reference.worldBoundary,[binding]);},
   async dispose(){detach?.();c?.dispose();await f.dispose();}
  };
 }catch(error){detach?.();c?.dispose();await f?.dispose();throw error;}
}
