import assert from 'node:assert/strict';
import {nativeTaskConsequenceFixture} from './native-task-consequence.js';
import {projectNativeHarvestConsequence} from '../../src/simulation/game.js';

// Trusted native ABI setup only. It does not provide a GPU drain or authorize
// the production settlement transactor, which requires its own exact receipt.
export function nativeTaskSettlementFixture({arrived=true,...options}={}){
 const f=nativeTaskConsequenceFixture(options);
 try{const p=f.prepare();assert.equal(p.status,'proposed');assert.equal(f.commitSourceOnly(p.proposal),1);projectNativeHarvestConsequence(f.state,f.worker,f.preview,f.planner);const carry=f.planner.nativeTaskConsequenceBinding(f.actor);
  if(arrived){f.advance(carry.reference.endTime+.05-f.state.elapsed);assert(f.planner.projectNativeDeliveryExecution(f.state,f.worker).arrived);}
  return {...f,carry,prepareSettlement:()=>f.planner.prepareNativeTaskSettlementProposal(carry),commitSettlement(proposal,prepared=proposal){return f.w.nav_task_settlement_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket);}};
 }catch(error){f.close();throw error;}
}
