import assert from 'node:assert/strict';
import {nativeIdleStrollGameFixture} from './native-idle-stroll-game.js';
import {tick} from '../../src/simulation/game.js';

// Native source acquisition for Game tests. Direct commits here do not stand
// in for GPU receipts; the graphical admission vertical is tested separately.
export function nativeIdleStrollStopGameFixture(options={}){
 const f=nativeIdleStrollGameFixture(options);
 try{
  const stroll=f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);tick(f.state,.12,f.nav);
  const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');
  const moving=f.body(1);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),moving);
  const fresh=f.planner.revalidateNativeIdleStrollStopProposal(stop.ticket);assert.equal(fresh.status,'revalidated');
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const held=f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(held.kind,'native-idle-stroll-held-execution');
  return {...f,stroll,stop,held};
 }catch(error){f.close();throw error;}
}
