import assert from 'node:assert/strict';
import {nativeIdleStrollGraphicsFixture} from './native-idle-stroll-graphics.js';

// Original GLB, clip banks, terrain support and resident roster. Native source
// and Game readback are real; renderer/preparation remain component doubles.
export async function nativeIdleArrivalGraphicsFixture(options={}){
 const f=await nativeIdleStrollGraphicsFixture(options);let walk;
 try{
  walk=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});walk.activate();const strollData=f.commitStroll();walk.finalize(strollData);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();f.flush();
  f.advance(strollData.nativeIdleStrollBinding.reference.endTime-f.nativeState.elapsed+.01);const actual=f.planner.projectNativeIdleStroll(f.nativeState,f.worker);assert(actual.arrived);f.setPickTime(strollData.nativeIdleStrollBinding.reference.endTime);f.sync();
  const prepared=f.planner.prepareNativeIdleCycleProposal(f.nativeActor);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,support=f.terrain.prepareNativeIdleCycle(proposal.nativeIdleCycle);assert(support?.valid());f.setPickAge(0);
  return {...f,strollData,proposal,support,walk};
 }catch(error){walk?.cancel();f.close();throw error;}
}
