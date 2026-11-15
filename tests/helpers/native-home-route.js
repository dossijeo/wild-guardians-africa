import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './native-task-settlement.js';
import {prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence} from '../../src/simulation/game.js';

// Trusted ABI setup of the real preceding delivery. This helper does not
// grant a GPU receipt or bypass the production Home resource transactor.
export function nativeHomeRouteFixture(options={}){
 const f=nativeTaskSettlementFixture(options);
 try{
  f.worker.contractDay=f.state.day-1;const crate=f.state.crates.find(c=>c.id===f.worker.crateId),center=f.state.structures.find(c=>c.id===f.worker.centerId),preview=prepareCrateDeliveryConsequence(f.state,f.worker,crate,center);
  assert.equal(preview.status,'returning');assert(preview.home);const p=f.prepareSettlement({home:preview.home});assert.equal(p.status,'proposed');assert.equal(f.commitSettlement(p.proposal),1);projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const held=f.planner.nativeTaskSettlementBinding(f.actor);assert(held.reference.home);
  return {...f,held,prepareHome:()=>f.planner.prepareNativeHomeRouteProposal(held),commitHome(proposal,prepared=proposal){return f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket);}};
 }catch(error){f.close();throw error;}
}
