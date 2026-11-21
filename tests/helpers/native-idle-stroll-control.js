import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './native-idle-cycle.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';

export function controlledNativeIdleStroll({installCycle=true,...options}={}){
 let c,detach,paused=false,clockPaused=false;const events=[],clocks=[];
 const clock=record=>{const previous=c.status().clock;c.acceptClock({...record,anchorAbsoluteMs:record.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:record.reanchor?record.committedThrough:previous.anchorLogicalTime});};
 const f=nativeIdleCycleFixture({mode:'watch',remaining:.03,rng:1,peer:true,...options,beforeBodyCommit(native){
  detach=native.planner.observeNativeIntentControl({onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){events.push(...changes);if(!paused)changes.forEach(e=>c.accept(e));},onClock(record){clocks.push(record);if(!clockPaused)clock(record);}});
 }});
 try{
  c.installInitialIdleBodies(f.bodyBinding.reference.worldBoundary,[f.bodyBinding]);const raw=f.propose();assert.equal(raw.status,1);const cycle=f.planner.captureNativeIdleCycleProposal({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:f.bodyBinding.reference.worldBoundary.authorityEpoch,session:f.w.nav_intent_session(),ticket:raw.ticket}),cycleLease=c.admitIdleCycle(cycle.nativeIdleCycle,{preparingWorldBoundary:cycle.worldBoundary});f.commit(raw);const cycleBinding=f.planner.nativeIdleCycleBinding(f.actor);if(installCycle)c.installIdleCycles(cycleBinding.reference.worldBoundary,[cycleBinding]);f.planner.projectNativeIdleCycle(f.state,f.worker);f.advance(raw.header[23]);f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(c.pendingIdleCycleRequest(f.actor).idleState.mode,'walk');
  return {...f,c,events,clocks,cycleLease,cycleBinding,next:f.planner.nativeIdleCycleNextRequest(f.actor),prepare(){const p=f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');return p.proposal;},commitStroll(p){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.nativeIdleStrollBinding(f.actor);},pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,acceptLastClock:()=>clock(clocks.at(-1)),close(){detach?.();c.dispose();f.close();}};
 }catch(error){detach?.();c?.dispose();f.close();throw error;}
}
