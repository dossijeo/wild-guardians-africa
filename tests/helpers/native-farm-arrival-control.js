import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './native-farm-arrival-route.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';

// Actual ordered native log/clock; trusted ABI commits, not graphical receipts.
export function controlledNativeFarmArrival(options={}){
 const f=fixture(options),events=[],clocks=[];let c,baseline,detach,pauseEvents=false,pauseClocks=false;
 const clock=r=>{const previous=c.status().clock;c.acceptClock({...r,anchorAbsoluteMs:r.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:r.reanchor?r.committedThrough:previous.anchorLogicalTime});};
 try{detach=f.planner.observeNativeIntentControl({onBaseline(b){baseline=b;c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingFarmArrivalRequests:b.pendingFarmArrivalRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){events.push(...changes);if(!pauseEvents)for(const e of changes)c.accept(e);},onClock(r){clocks.push(r);if(!pauseClocks)clock(r);}});
  return {...f,c,baseline,events,clocks,prepare(urgent=false){const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource,{urgent});assert.equal(p.status,'proposed');return p.proposal;},commit(p){assert.equal(f.commit({ticket:p.ticket.ticket}),1);f.planner.flushNativeIntentControl();return f.planner.nativeFarmArrivalRouteBinding(f.actor);},advance(t){f.move(t);f.planner.flushNativeIntentControl();},pauseEvents:v=>pauseEvents=v,pauseClocks:v=>pauseClocks=v,acceptClock:()=>clock(clocks.at(-1)),close(){detach?.();c?.dispose();f.close();}};
 }catch(error){detach?.();c?.dispose();f.close();throw error;}
}
