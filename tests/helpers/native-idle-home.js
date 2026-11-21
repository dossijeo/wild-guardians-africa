import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './native-task-settlement.js';
import {prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence} from '../../src/simulation/game.js';

// The real preceding delivery is committed via the trusted source-only ABI.
// This never grants a graphical receipt or changes an existing body's pose.
export function nativeIdleHomeFixture(options={}){
 const f=nativeTaskSettlementFixture(options);
 try{
  const crate=f.state.crates.find(c=>c.id===f.worker.crateId),center=f.state.structures.find(c=>c.id===f.worker.centerId),preview=prepareCrateDeliveryConsequence(f.state,f.worker,crate,center);
  assert.equal(preview.status,'idle');const p=f.prepareSettlement();assert.equal(p.status,'proposed');assert.equal(f.commitSettlement(p.proposal),1);
  projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const idle=f.planner.nativeTaskSettlementBinding(f.actor);assert(idle);assert.equal(idle.reference.home,undefined);
  return {...f,idle};
 }catch(error){f.close();throw error;}
}
