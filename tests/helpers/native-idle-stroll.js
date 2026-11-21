import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './native-idle-cycle.js';

// Source adapter fixture. Acquisition remains a trusted raw ABI call until
// the prepared graphical22 consumer is integrated in the next increment.
export function nativeIdleStrollFixture(options={}){
 const f=nativeIdleCycleFixture({mode:'watch',remaining:.03,rng:1,...options});
 try{
  const p=f.propose();assert.equal(p.status,1);f.commit(p);f.planner.projectNativeIdleCycle(f.state,f.worker);f.advance(p.header[23]);f.planner.projectNativeIdleCycle(f.state,f.worker);const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert.equal(next.idleState.mode,'walk');
  return {...f,next,prepare:()=>f.planner.prepareNativeIdleStrollProposal(f.actor),
   commitStroll(proposal){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.nativeIdleStrollBinding(f.actor);}
  };
 }catch(error){f.close();throw error;}
}
