import assert from 'node:assert/strict';
import {nativeSettledIdleFixture} from './native-settled-idle.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';

// Actual acquired source and original control, using trusted ABI setup.
// Actual native17 and original control. Trusted installation is not a GPU fence.
export function controlledNativeSettledIdle(options={}){
 const f=nativeSettledIdleFixture(options);let c;
 try{
  f.planner.intentChanges();const b=f.planner.nativeIntentControlBaseline();
  c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[]});
  const clock=(value,baseline=false)=>{const prior=c.status().clock,reanchor=baseline||value.reanchor;c.acceptClock({...value,anchorLogicalTime:reanchor?value.committedThrough:prior.anchorLogicalTime,anchorAbsoluteMs:reanchor?1000:prior.anchorAbsoluteMs},{baseline});};
  clock(b.clock,true);c.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});c.installActions(b.worldBoundary,b.nativeActions??[],{bootstrap:true});c.installConsequences(b.worldBoundary,b.nativeConsequences??[],{bootstrap:true});c.installSettlements(b.worldBoundary,b.nativeSettlements??[],{bootstrap:true});
  const source=c.admitSettlement(f.settlement.reference);assert(source.isCurrent());
  const acceptClock=()=>{const next=f.planner.nativeCausalClock();if(c.status().clock.clockSequence!==next.clockSequence)clock(next);};
  const sync=({withClock=true}={})=>{for(const event of f.planner.intentChanges())c.accept(event);if(withClock)acceptClock();};
  return {...f,c,source,sync,acceptClock,advance(dt){f.advance(dt);sync();},close(){c.dispose();f.close();}};
 }catch(error){c?.dispose();f.close();throw error;}
}
