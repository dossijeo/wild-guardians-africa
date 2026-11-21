import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './native-initial-idle-game.js';
import {createPlant} from '../../src/simulation/crops.js';

// Real Game/native authority, no preceding task or delivery for A. The
// component fixture admits actual native proposals directly; GPU receipts
// remain the responsibility of the separate admission/consumer verticals.
export function nativeIdleCycleGameFixture({mode='rest',remaining=2.3,profile='youngMale',peer=true,core=null,rng=0x12345678}={}){
 const f=nativeInitialIdleGameFixture({mode,profile,peer,core,configureState(state){
  const worker=state.workers[0];Object.assign(worker.idleState,{anchorId:'farm-plant-900098',remaining,rng});
  const anchor=createPlant('plant-900098','mijo',worker.x,worker.z,worker.centerId);anchor.water[0].status='manual';state.plants.push(anchor);
 }});
 const tuple=()=>{assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));};
 try{
  const initial=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(f.actor));assert.equal(initial.status,'proposed');assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),initial.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeInitialIdleBody(f.state,f.worker);
  function prepare(){const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');return p.proposal;}
  function commit(proposal=prepare()){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeIdleCycle(f.state,f.worker);return f.planner.nativeIdleCycleBinding(f.actor);}
  return {...f,prepare,commit,tuple,initialBody:f.planner.nativeInitialIdleBodyBinding(f.actor)};
 }catch(error){f.close();throw error;}
}
