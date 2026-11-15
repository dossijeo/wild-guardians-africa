import assert from 'node:assert/strict';
import {nativeTaskConsequenceGraphicsFixture} from './native-task-consequence-graphics.js';
import {projectNativeHarvestConsequence,prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence} from '../../src/simulation/game.js';

// Real source transitions and original authored assets on the same roster.
// Source ABI setup and simulated admission do not certify a hardware fence.
export async function nativeTaskSettlementGraphicsFixture({home=false}={}){
 const f=await nativeTaskConsequenceGraphicsFixture({idle:true});
 try{const carryPart=await f.roster.prepareNativeTaskConsequenceProposal(f.support,{getPickTime:f.getPickTime});carryPart.activate();const data=f.commit();carryPart.finalize(data);projectNativeHarvestConsequence(f.nativeState,f.worker,f.preview,f.planner);const carry=data.nativeTaskConsequenceBinding;
  f.advance(carry.reference.endTime+.05-f.nativeState.elapsed);assert(f.planner.projectNativeDeliveryExecution(f.nativeState,f.worker).arrived);
  if(home)f.worker.contractDay=f.nativeState.day-1;
  function sync(){f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();}
  sync();f.setPickTime(carry.reference.endTime);f.flush();const preview=prepareCrateDeliveryConsequence(f.nativeState,f.worker,f.nativeState.crates[0],f.center),prepared=f.planner.prepareNativeTaskSettlementProposal(carry,{home:preview.home});assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,support=f.terrain.prepareNativeTaskSettlement(proposal.nativeSettlement);assert(support?.valid());let age=0;
  return {...f,carry,preview,proposal,support,reference:proposal.nativeSettlement,sync,setPickAge(value){age=value;},getPickAge:()=>age,
   commit(prepared=proposal){assert.equal(f.w.nav_task_settlement_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);f.planner.commitNativeCausalClock();const proof=f.planner.nativeTaskSettlementBinding(f.actor);projectNativeCrateDeliveryConsequence(f.nativeState,f.worker,preview,f.planner);return {nativeTaskSettlementBinding:proof};}
  };
 }catch(error){f.close();throw error;}
}
