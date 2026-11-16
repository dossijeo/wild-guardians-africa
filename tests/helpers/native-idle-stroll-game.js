import assert from 'node:assert/strict';
import {nativeIdleCycleGameFixture} from './native-idle-cycle-game.js';
import {tick} from '../../src/simulation/game.js';

// Actual Game21 and native WALK acquisition. The complete Game.tick cohort
// remains closed until moving Idle task/Home/rest source transitions exist.
export function nativeIdleStrollGameFixture(options={}){
 const f=nativeIdleCycleGameFixture({mode:'watch',remaining:.03,rng:1,...options});
 try{
  const cycle=f.commit();tick(f.state,.1,f.nav);assert.equal(f.planner.nativeIdleCycleNextRequest(f.actor).idleState.mode,'walk');
  const proposed=f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(proposed.status,'proposed');
  return {...f,cycle,proposal:proposed.proposal,commitStroll(){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),proposed.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.nativeIdleStrollBinding(f.actor);}};
 }catch(error){f.close();throw error;}
}
